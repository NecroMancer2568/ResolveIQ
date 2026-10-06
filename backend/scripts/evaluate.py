import argparse
import asyncio
import json
import math
import statistics
import time
from pathlib import Path

from app.services.pipeline import ResolutionPipeline
from app.db.session import SessionLocal, init_db


# ------------------------------------------------------------
# Retrieval metrics
# ------------------------------------------------------------

def recall_at_k(retrieved, gold, k):
    if not gold:
        return None

    top_k = retrieved[:k]
    return len(set(top_k) & gold) / len(gold)


def precision_at_k(retrieved, gold, k):
    if k <= 0:
        return 0.0

    top_k = retrieved[:k]
    return len(set(top_k) & gold) / k


def reciprocal_rank(retrieved, gold):
    for rank, doc_id in enumerate(retrieved, start=1):
        if doc_id in gold:
            return 1.0 / rank

    return 0.0


def ndcg_at_k(retrieved, gold, k):
    if not gold:
        return None

    top_k = retrieved[:k]

    dcg = 0.0
    for rank, doc_id in enumerate(top_k, start=1):
        if doc_id in gold:
            dcg += 1.0 / math.log2(rank + 1)

    ideal_hits = min(len(gold), k)

    if ideal_hits == 0:
        return 0.0

    idcg = sum(
        1.0 / math.log2(rank + 1)
        for rank in range(1, ideal_hits + 1)
    )

    return dcg / idcg if idcg else 0.0


# ------------------------------------------------------------
# Text / response metrics
# ------------------------------------------------------------

def normalized_edit_distance(a, b):
    """
    Normalized Levenshtein distance.

    0.0 = identical
    1.0 = completely different
    """

    a = (a or "").lower().strip()
    b = (b or "").lower().strip()

    if a == b:
        return 0.0

    if not a:
        return 1.0

    if not b:
        return 1.0

    previous = list(range(len(b) + 1))

    for i, ca in enumerate(a, start=1):
        current = [i]

        for j, cb in enumerate(b, start=1):
            insertion = current[j - 1] + 1
            deletion = previous[j] + 1
            substitution = previous[j - 1] + (ca != cb)

            current.append(
                min(insertion, deletion, substitution)
            )

        previous = current

    distance = previous[-1]

    return distance / max(len(a), len(b))


# ------------------------------------------------------------
# Utility functions
# ------------------------------------------------------------

def safe_mean(values):
    values = [v for v in values if v is not None]

    if not values:
        return None

    return statistics.mean(values)


def percentage(value):
    if value is None:
        return None

    return round(value * 100, 2)


# ------------------------------------------------------------
# Main evaluation
# ------------------------------------------------------------

async def main(dataset_path):

    await init_db()

    pipeline = ResolutionPipeline()

    rows = [
        json.loads(line)
        for line in open(dataset_path, encoding="utf-8")
        if line.strip()
    ]

    results = []

    async with SessionLocal() as db:

        for index, row in enumerate(rows, start=1):

            question = row["question"]
            context = row.get("context", {})

            gold_ids = set(
                row.get("gold_evidence_ids", [])
            )

            expected_action = row.get(
                "expected_action"
            )

            gold_resolution = row.get(
                "gold_resolution",
                ""
            )

            start = time.perf_counter()

            output = await pipeline.run(
                db,
                question,
                context
            )

            elapsed = time.perf_counter() - start

            # --------------------------------------------
            # Actual ranked retrieval
            # --------------------------------------------

            retrieved = output.get(
                "retrieved_evidence_ids",
                []
            )

            # --------------------------------------------
            # Generated evidence
            # --------------------------------------------

            generated_evidence = set(
                output.get("evidence_ids", [])
            )

            # --------------------------------------------
            # Retrieval metrics
            # --------------------------------------------

            r1 = recall_at_k(
                retrieved,
                gold_ids,
                1
            )

            r3 = recall_at_k(
                retrieved,
                gold_ids,
                3
            )

            r5 = recall_at_k(
                retrieved,
                gold_ids,
                5
            )

            p3 = precision_at_k(
                retrieved,
                gold_ids,
                3
            )

            mrr = reciprocal_rank(
                retrieved,
                gold_ids
            )

            ndcg5 = ndcg_at_k(
                retrieved,
                gold_ids,
                5
            )

            # --------------------------------------------
            # Evidence coverage
            # --------------------------------------------

            if gold_ids:
                evidence_coverage = (
                    len(generated_evidence & gold_ids)
                    / len(gold_ids)
                )
            else:
                evidence_coverage = None

            # --------------------------------------------
            # Groundedness
            # --------------------------------------------

            groundedness = (
                output
                .get("verification", {})
                .get("groundedness", 0.0)
            )

            # --------------------------------------------
            # Decision accuracy
            # --------------------------------------------

            predicted_action = output.get(
                "decision"
            )

            decision_correct = (
                predicted_action == expected_action
                if expected_action
                else None
            )

            # --------------------------------------------
            # Per-action accuracy
            # --------------------------------------------

            clarify_correct = (
                predicted_action == "CLARIFY"
                if expected_action == "CLARIFY"
                else None
            )

            abstain_correct = (
                predicted_action == "ABSTAIN"
                if expected_action == "ABSTAIN"
                else None
            )

            escalate_correct = (
                predicted_action == "ESCALATE"
                if expected_action == "ESCALATE"
                else None
            )

            resolve_correct = (
                predicted_action == "RESOLVE"
                if expected_action == "RESOLVE"
                else None
            )

            # --------------------------------------------
            # Store result
            # --------------------------------------------

            results.append(
                {
                    "id": row.get("id", str(index)),
                    "question": question,
                    "gold_evidence_ids": list(gold_ids),
                    "retrieved_evidence_ids": retrieved,
                    "generated_evidence_ids": list(
                        generated_evidence
                    ),
                    "expected_action": expected_action,
                    "predicted_action": predicted_action,
                    "decision_correct": decision_correct,
                    "recall_at_1": r1,
                    "recall_at_3": r3,
                    "recall_at_5": r5,
                    "precision_at_3": p3,
                    "mrr": mrr,
                    "ndcg_at_5": ndcg5,
                    "evidence_coverage": evidence_coverage,
                    "groundedness": groundedness,
                    "clarify_correct": clarify_correct,
                    "abstain_correct": abstain_correct,
                    "escalate_correct": escalate_correct,
                    "resolve_correct": resolve_correct,
                    "latency_seconds": elapsed,
                    "draft_response": output.get(
                        "draft_response",
                        ""
                    ),
                    "gold_resolution": gold_resolution,
                    "confidence": output.get(
                        "confidence"
                    ),
                }
            )

            print(
                f"[{index:02d}/{len(rows)}] "
                f"{row.get('id', index)} "
                f"action={predicted_action} "
                f"retrieval={'HIT' if gold_ids & set(retrieved) else 'MISS'} "
                f"time={elapsed:.3f}s"
            )

    # --------------------------------------------------------
    # Aggregate metrics
    # --------------------------------------------------------

    def accuracy(field):
        values = [
            r[field]
            for r in results
            if r[field] is not None
        ]

        return safe_mean(
            [float(v) for v in values]
        )

    report = {
        "dataset": {
            "examples": len(results),
            "path": str(
                Path(dataset_path).resolve()
            ),
        },

        "retrieval": {
            "recall_at_1": percentage(
                safe_mean(
                    [r["recall_at_1"] for r in results]
                )
            ),

            "recall_at_3": percentage(
                safe_mean(
                    [r["recall_at_3"] for r in results]
                )
            ),

            "recall_at_5": percentage(
                safe_mean(
                    [r["recall_at_5"] for r in results]
                )
            ),

            "precision_at_3": percentage(
                safe_mean(
                    [r["precision_at_3"] for r in results]
                )
            ),

            "mrr": round(
                safe_mean(
                    [r["mrr"] for r in results]
                ) or 0.0,
                4,
            ),

            "ndcg_at_5": round(
                safe_mean(
                    [r["ndcg_at_5"] for r in results]
                ) or 0.0,
                4,
            ),

            "evidence_coverage": percentage(
                safe_mean(
                    [
                        r["evidence_coverage"]
                        for r in results
                    ]
                )
            ),
        },

        "generation": {
            "groundedness": percentage(
                safe_mean(
                    [
                        r["groundedness"]
                        for r in results
                    ]
                )
            ),
        },

        "decision_quality": {
            "overall_accuracy": percentage(
                accuracy("decision_correct")
            ),

            "resolution_accuracy": percentage(
                accuracy("resolve_correct")
            ),

            "clarify_accuracy": percentage(
                accuracy("clarify_correct")
            ),

            "abstention_accuracy": percentage(
                accuracy("abstain_correct")
            ),

            "conflict_escalation_accuracy": percentage(
                accuracy("escalate_correct")
            ),
        },

        "latency": {
            "mean_time_to_draft_seconds": round(
                safe_mean(
                    [
                        r["latency_seconds"]
                        for r in results
                    ]
                ) or 0.0,
                4,
            ),

            "min_seconds": round(
                min(
                    r["latency_seconds"]
                    for r in results
                ),
                4,
            ) if results else None,

            "max_seconds": round(
                max(
                    r["latency_seconds"]
                    for r in results
                ),
                4,
            ) if results else None,
        },

        "human_review": {
            "acceptance_rate": "N/A",
            "edit_distance": "N/A",
            "time_to_resolution": "N/A",
            "note": (
                "These metrics require human-review "
                "and ticket-resolution telemetry."
            ),
        },

        "per_example": results,
    }

    # --------------------------------------------------------
    # Save results
    # --------------------------------------------------------

    output_dir = Path("../evaluation/results")
    output_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    output_file = (
        output_dir /
        "resolveiq-evaluation.json"
    )

    output_file.write_text(
        json.dumps(
            report,
            indent=2,
            ensure_ascii=False
        ),
        encoding="utf-8"
    )

    # --------------------------------------------------------
    # Console report
    # --------------------------------------------------------

    retrieval = report["retrieval"]
    generation = report["generation"]
    decisions = report["decision_quality"]
    latency = report["latency"]

    print()
    print("=" * 64)
    print("                 ResolveIQ Evaluation")
    print("=" * 64)

    print()
    print("Dataset")
    print("-" * 64)
    print(
        f"Examples                         "
        f"{len(results)}"
    )

    print()
    print("Retrieval")
    print("-" * 64)

    print(
        f"Recall@1                         "
        f"{retrieval['recall_at_1']}%"
    )

    print(
        f"Recall@3                         "
        f"{retrieval['recall_at_3']}%"
    )

    print(
        f"Recall@5                         "
        f"{retrieval['recall_at_5']}%"
    )

    print(
        f"Precision@3                      "
        f"{retrieval['precision_at_3']}%"
    )

    print(
        f"MRR                              "
        f"{retrieval['mrr']}"
    )

    print(
        f"NDCG@5                           "
        f"{retrieval['ndcg_at_5']}"
    )

    print(
        f"Evidence coverage                "
        f"{retrieval['evidence_coverage']}%"
    )

    print()
    print("Generation / Grounding")
    print("-" * 64)

    print(
        f"Groundedness                     "
        f"{generation['groundedness']}%"
    )

    print()
    print("Decision Quality")
    print("-" * 64)

    print(
        f"Overall decision accuracy        "
        f"{decisions['overall_accuracy']}%"
    )

    print(
        f"Resolution accuracy              "
        f"{decisions['resolution_accuracy']}%"
    )

    print(
        f"CLARIFY accuracy                 "
        f"{decisions['clarify_accuracy']}%"
    )

    print(
        f"ABSTAIN accuracy                 "
        f"{decisions['abstention_accuracy']}%"
    )

    print(
        f"ESCALATE accuracy                "
        f"{decisions['conflict_escalation_accuracy']}%"
    )

    print()
    print("Latency")
    print("-" * 64)

    print(
        f"Mean time-to-draft               "
        f"{latency['mean_time_to_draft_seconds']} s"
    )

    print(
        f"Fastest                          "
        f"{latency['min_seconds']} s"
    )

    print(
        f"Slowest                           "
        f"{latency['max_seconds']} s"
    )

    print()
    print("Human Review")
    print("-" * 64)

    print(
        "Acceptance rate                  N/A"
    )

    print(
        "Edit distance                    N/A"
    )

    print(
        "Time-to-resolution               N/A"
    )

    print()
    print("=" * 64)

    print(
        f"\nDetailed results saved to: "
        f"{output_file}"
    )


if __name__ == "__main__":

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--dataset",
        required=True
    )

    args = parser.parse_args()

    asyncio.run(
        main(args.dataset)
    )