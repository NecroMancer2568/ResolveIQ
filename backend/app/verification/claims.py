import re

from app.embeddings import embed_texts, cosine


def extract_claims(text: str) -> list[str]:
    """
    Split a generated response into reasonably sized claims.
    """
    parts = re.split(
        r"(?<=[.!?])\s+",
        (text or "").strip()
    )

    return [
        p.strip()
        for p in parts
        if len(p.strip()) > 12
    ]


def verify_claims(text: str, evidence: list):
    claims = extract_claims(text)

    if not claims:
        return {
            "claims": [],
            "groundedness": 0.0,
            "passed": False,
        }

    if not evidence:
        return {
            "claims": [
                {
                    "claim": claim,
                    "status": "UNSUPPORTED",
                    "evidence_ids": [],
                    "entailment": 0.0,
                }
                for claim in claims
            ],
            "groundedness": 0.0,
            "passed": False,
        }

    evidence_text = [
        e.content
        for e in evidence
        if getattr(e, "content", None)
    ]

    evidence_vectors = embed_texts(
        evidence_text
    )

    results = []
    supported = 0.0

    # Thresholds for the current embedding-based verifier.
    #
    # NOTE:
    # These are semantic similarity thresholds, NOT NLI entailment.
    SUPPORT_THRESHOLD = 0.60
    PARTIAL_THRESHOLD = 0.45

    for claim in claims:

        claim_vector = embed_texts(
            [claim]
        )[0]

        candidates = [
            (
                cosine(claim_vector, vector),
                evidence[index].id,
            )
            for index, vector in enumerate(
                evidence_vectors
            )
        ]

        best_score, best_id = max(
            candidates,
            default=(0.0, None)
        )

        if best_score >= SUPPORT_THRESHOLD:

            status = "SUPPORTED"

            # Fully supported claim.
            supported += 1.0

        elif best_score >= PARTIAL_THRESHOLD:

            status = "PARTIALLY_SUPPORTED"

            # Partial support contributes half credit.
            supported += 0.5

        else:

            status = "UNSUPPORTED"

        results.append(
            {
                "claim": claim,
                "status": status,
                "evidence_ids": (
                    [best_id]
                    if best_id
                    else []
                ),
                "entailment": round(
                    best_score,
                    3
                ),
            }
        )

    groundedness = supported / len(claims)

    unsupported = any(
        result["status"] == "UNSUPPORTED"
        for result in results
    )

    return {
        "claims": results,
        "groundedness": round(
            min(1.0, groundedness),
            3
        ),
        "passed": (
            groundedness >= 0.80
            and not unsupported
        ),
    }