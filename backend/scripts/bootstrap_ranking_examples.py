"""
ResolveIQ — Resolution-Aware Ranking Dataset Bootstrap

Builds initial LambdaMART ranking supervision from:

    data/historical_resolutions.jsonl
    data/knowledge.jsonl

The historical dataset provides:

    question
    resolution
    category
    source_documents
    agent_approved
    resolution_success
    agent_edit_count
    resolution_tags
    context

The knowledge base contains chunk-level documents.

Important design:

    historical source_documents
            ↓
    map source filename → ALL matching chunks
            ↓
    resolution-aware semantic scoring
            ↓
    positive evidence selection
            ↓
    semantic hard-negative mining
            ↓
    feature-rich ranking examples
            ↓
    train / validation split

Features generated for every candidate:

    query_similarity
    resolution_similarity
    combined_similarity
    category_match
    source_match
    authority_score
    historical_supervision_weight
    edit_penalty
    success_signal
    approval_signal
    source_relevance
    candidate_quality

This is bootstrap supervision.

It is NOT live customer learning.

Real human feedback can later append examples using
the same ranking-example schema.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
import re
from pathlib import Path
from typing import Any


# ============================================================================
# Paths
# ============================================================================

BACKEND_ROOT = Path(__file__).resolve().parents[1]

DEFAULT_HISTORY = (
    BACKEND_ROOT
    / "data"
    / "historical_resolutions.jsonl"
)

DEFAULT_KNOWLEDGE = (
    BACKEND_ROOT
    / "data"
    / "knowledge.jsonl"
)

DEFAULT_OUTPUT = (
    BACKEND_ROOT
    / "artifacts"
    / "ranking_examples.jsonl"
)

DEFAULT_TRAIN_OUTPUT = (
    BACKEND_ROOT
    / "artifacts"
    / "ranking_train.jsonl"
)

DEFAULT_VALID_OUTPUT = (
    BACKEND_ROOT
    / "artifacts"
    / "ranking_valid.jsonl"
)


# ============================================================================
# Text utilities
# ============================================================================

STOPWORDS = {
    "the",
    "a",
    "an",
    "is",
    "are",
    "was",
    "were",
    "i",
    "my",
    "me",
    "to",
    "for",
    "of",
    "and",
    "or",
    "in",
    "on",
    "with",
    "can",
    "do",
    "does",
    "did",
    "how",
    "what",
    "why",
    "when",
    "where",
    "it",
    "this",
    "that",
    "have",
    "has",
    "had",
    "be",
    "been",
    "but",
    "not",
    "from",
    "within",
    "want",
    "get",
    "please",
    "customer",
    "you",
}


def normalize_text(text: Any) -> str:
    if text is None:
        return ""

    text = str(text).lower()

    text = re.sub(
        r"[^a-z0-9\s]",
        " ",
        text,
    )

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text.strip()


def tokenize(text: str) -> set[str]:
    words = re.findall(
        r"[a-z0-9]+",
        normalize_text(text),
    )

    return {
        word
        for word in words
        if word not in STOPWORDS
        and len(word) > 2
    }


def lexical_similarity(
    left: str,
    right: str,
) -> float:

    left_tokens = tokenize(left)
    right_tokens = tokenize(right)

    if not left_tokens or not right_tokens:
        return 0.0

    intersection = len(
        left_tokens & right_tokens
    )

    denominator = math.sqrt(
        len(left_tokens)
        * len(right_tokens)
    )

    if denominator == 0:
        return 0.0

    return intersection / denominator


# ============================================================================
# JSONL
# ============================================================================

def read_jsonl(
    path: Path,
) -> list[dict[str, Any]]:

    if not path.exists():
        raise FileNotFoundError(
            f"File not found: {path}"
        )

    rows: list[dict[str, Any]] = []

    with path.open(
        "r",
        encoding="utf-8",
    ) as file:

        for line_number, line in enumerate(
            file,
            start=1,
        ):

            line = line.strip()

            if not line:
                continue

            try:
                row = json.loads(line)

            except json.JSONDecodeError as exc:
                raise ValueError(
                    f"Invalid JSON at "
                    f"{path}:{line_number}\n"
                    f"{exc}"
                ) from exc

            if not isinstance(row, dict):
                raise ValueError(
                    f"Expected JSON object at "
                    f"{path}:{line_number}"
                )

            rows.append(row)

    return rows


def write_jsonl(
    path: Path,
    rows: list[dict[str, Any]],
) -> None:

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with path.open(
        "w",
        encoding="utf-8",
    ) as file:

        for row in rows:
            file.write(
                json.dumps(
                    row,
                    ensure_ascii=False,
                )
                + "\n"
            )


# ============================================================================
# Knowledge handling
# ============================================================================

def document_text(
    document: dict[str, Any],
) -> str:

    fields = [
        "title",
        "content",
        "source_type",
        "source",
        "product",
        "category",
        "policy_key",
        "policy_value",
    ]

    values = []

    for field in fields:

        value = document.get(
            field,
            "",
        )

        if value is not None:
            values.append(str(value))

    return " ".join(values)


def normalize_source(
    source: Any,
) -> str:

    value = str(
        source or ""
    ).strip().lower()

    value = value.replace(
        "\\",
        "/",
    )

    return Path(value).name


def source_stem(
    source: Any,
) -> str:

    value = normalize_source(source)

    if value.endswith(".md"):
        value = value[:-3]

    if value.endswith(".txt"):
        value = value[:-4]

    return value


def document_source(
    document: dict[str, Any],
) -> str:

    for field in (
        "source",
        "filename",
        "source_document",
        "file",
        "path",
    ):

        value = document.get(
            field
        )

        if value:
            return normalize_source(
                value
            )

    document_id = str(
        document.get(
            "id",
            "",
        )
    )

    # Fallback for IDs such as:
    #
    # refunds-0
    # refunds-1
    #
    # subscriptions-5

    if "-" in document_id:

        return normalize_source(
            document_id.split(
                "-"
            )[0]
            + ".md"
        )

    return ""


def resolve_source_chunks(
    source_documents: list[str],
    knowledge_documents: list[dict[str, Any]],
) -> set[str]:
    """
    Map historical source filenames to ALL matching
    chunk IDs.

    Example:

        refunds.md

    becomes:

        refunds-0
        refunds-1
        ...
        refunds-5
    """

    requested_sources = {
        normalize_source(source)
        for source in source_documents
        if normalize_source(source)
    }

    requested_stems = {
        source_stem(source)
        for source in requested_sources
    }

    positive_ids: set[str] = set()

    for document in knowledge_documents:

        document_id = str(
            document.get(
                "id",
                "",
            )
        )

        if not document_id:
            continue

        doc_source = document_source(
            document
        )

        doc_stem = source_stem(
            doc_source
        )

        if (
            doc_source in requested_sources
            or doc_stem in requested_stems
        ):
            positive_ids.add(
                document_id
            )
            continue

        # Final fallback: match source stem
        # against the chunk ID.

        normalized_id = (
            document_id
            .lower()
        )

        if any(
            normalized_id.startswith(
                stem + "-"
            )
            for stem in requested_stems
        ):
            positive_ids.add(
                document_id
            )

    return positive_ids


# ============================================================================
# Semantic scorer
# ============================================================================

class SemanticScorer:
    """
    Sentence-transformers semantic scorer.

    all-MiniLM-L6-v2 is intentionally used here because
    it is already part of the ResolveIQ local embedding stack.
    """

    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
    ) -> None:

        self.model = None
        self.model_name = model_name

        try:

            from sentence_transformers import (
                SentenceTransformer,
            )

            self.model = SentenceTransformer(
                model_name
            )

            print(
                "[INFO] Loaded embedding model: "
                f"{model_name}"
            )

        except Exception as exc:

            print(
                "[WARN] Could not load "
                "SentenceTransformer."
            )

            print(
                f"[WARN] Reason: {exc}"
            )

            print(
                "[WARN] Falling back to "
                "lexical similarity."
            )

    def encode(
        self,
        texts: list[str],
    ):

        if self.model is not None:

            return self.model.encode(
                texts,
                normalize_embeddings=True,
                show_progress_bar=False,
            )

        return None

    def score_pairs(
        self,
        queries: list[str],
        documents: list[str],
    ) -> list[float]:

        if not queries:
            return []

        if len(queries) != len(documents):
            raise ValueError(
                "queries and documents must "
                "have equal length"
            )

        if self.model is None:

            return [
                lexical_similarity(
                    query,
                    document,
                )
                for query, document
                in zip(
                    queries,
                    documents,
                )
            ]

        all_texts = (
            queries
            + documents
        )

        embeddings = self.model.encode(
            all_texts,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        n = len(queries)

        query_embeddings = embeddings[:n]
        document_embeddings = embeddings[n:]

        scores = []

        for q, d in zip(
            query_embeddings,
            document_embeddings,
        ):

            scores.append(
                float(q @ d)
            )

        return scores


# ============================================================================
# Supervision
# ============================================================================

def supervision_weight(
    record: dict[str, Any],
) -> float:

    approved = bool(
        record.get(
            "agent_approved"
        )
    )

    successful = bool(
        record.get(
            "resolution_success"
        )
    )

    try:
        edit_count = int(
            record.get(
                "agent_edit_count",
                0,
            )
            or 0
        )

    except (
        TypeError,
        ValueError,
    ):

        edit_count = 0

    if approved and successful:

        penalty = min(
            edit_count,
            5,
        ) * 0.08

        return max(
            0.60,
            1.00 - penalty,
        )

    if approved or successful:
        return 0.55

    return 0.25


def approval_signal(
    record: dict[str, Any],
) -> float:

    return (
        1.0
        if record.get(
            "agent_approved"
        )
        else 0.0
    )


def success_signal(
    record: dict[str, Any],
) -> float:

    return (
        1.0
        if record.get(
            "resolution_success"
        )
        else 0.0
    )


def edit_penalty(
    record: dict[str, Any],
) -> float:

    try:
        edits = int(
            record.get(
                "agent_edit_count",
                0,
            )
            or 0
        )

    except (
        TypeError,
        ValueError,
    ):

        edits = 0

    return min(
        edits / 5.0,
        1.0,
    )


# ============================================================================
# Category matching
# ============================================================================

CATEGORY_ALIASES = {
    "refund": {
        "refund",
        "refunds",
        "return",
        "returns",
    },
    "payment": {
        "payment",
        "payments",
        "charge",
        "charges",
        "billing",
    },
    "shipping": {
        "shipping",
        "shipment",
        "delivery",
        "package",
        "order",
    },
    "account": {
        "account",
        "accounts",
        "login",
        "password",
        "profile",
    },
    "subscription": {
        "subscription",
        "subscriptions",
        "cancel",
        "cancellation",
        "renewal",
    },
    "warranty": {
        "warranty",
        "repair",
        "replacement",
        "defect",
        "damaged",
    },
}


def category_match(
    historical_category: Any,
    document: dict[str, Any],
) -> float:

    category = normalize_text(
        historical_category
    )

    if not category:
        return 0.0

    document_blob = normalize_text(
        document_text(document)
    )

    aliases = CATEGORY_ALIASES.get(
        category,
        {category},
    )

    if any(
        alias in document_blob
        for alias in aliases
    ):
        return 1.0

    return 0.0


# ============================================================================
# Authority
# ============================================================================

def authority_score(
    document: dict[str, Any],
) -> float:

    authority = normalize_text(
        document.get(
            "authority",
            "",
        )
    )

    source_type = normalize_text(
        document.get(
            "source_type",
            "",
        )
    )

    # Strong policy / official sources.
    if authority in {
        "official",
        "authoritative",
        "policy",
        "internal_policy",
    }:
        return 1.0

    if source_type in {
        "policy",
        "official_policy",
        "faq",
    }:
        return 0.9

    if authority:
        return 0.7

    return 0.5


# ============================================================================
# Stable IDs
# ============================================================================

def stable_hash(
    *values: Any,
) -> str:

    payload = "||".join(
        str(value)
        for value in values
    )

    return hashlib.sha256(
        payload.encode(
            "utf-8"
        )
    ).hexdigest()[:20]


# ============================================================================
# Candidate feature generation
# ============================================================================

def build_candidate_features(
    record: dict[str, Any],
    document: dict[str, Any],
    query_similarity: float,
    resolution_similarity: float,
    combined_similarity: float,
    source_positive_ids: set[str],
) -> dict[str, float]:

    document_id = str(
        document.get(
            "id",
            "",
        )
    )

    source_match = (
        1.0
        if document_id
        in source_positive_ids
        else 0.0
    )

    category = category_match(
        record.get(
            "category"
        ),
        document,
    )

    authority = authority_score(
        document
    )

    supervision = supervision_weight(
        record
    )

    approval = approval_signal(
        record
    )

    success = success_signal(
        record
    )

    edit = edit_penalty(
        record
    )

    # ---------------------------------------------------------------
    # Resolution-aware candidate quality.
    #
    # The query similarity alone should NOT dominate.
    #
    # A document that matches the question but does not support the
    # actual historical resolution should be weaker.
    # ---------------------------------------------------------------

    candidate_quality = (
        0.30 * query_similarity
        + 0.30 * resolution_similarity
        + 0.20 * combined_similarity
        + 0.08 * category
        + 0.07 * authority
        + 0.05 * source_match
    )

    return {
        "query_similarity": round(
            query_similarity,
            6,
        ),
        "resolution_similarity": round(
            resolution_similarity,
            6,
        ),
        "combined_similarity": round(
            combined_similarity,
            6,
        ),
        "semantic_similarity": round(
            query_similarity,
            6,
        ),
        "category_match": round(
            category,
            6,
        ),
        "source_match": round(
            source_match,
            6,
        ),
        "authority_score": round(
            authority,
            6,
        ),
        "historical_supervision_weight": round(
            supervision,
            6,
        ),
        "approval_signal": round(
            approval,
            6,
        ),
        "success_signal": round(
            success,
            6,
        ),
        "edit_penalty": round(
            edit,
            6,
        ),
        "candidate_quality": round(
            candidate_quality,
            6,
        ),
    }


# ============================================================================
# Candidate mining
# ============================================================================

def mine_candidates(
    record: dict[str, Any],
    knowledge_documents: list[dict[str, Any]],
    scorer: SemanticScorer,
    hard_negative_count: int,
    easy_negative_count: int,
    max_positive_chunks: int,
) -> tuple[
    list[dict[str, Any]],
    set[str],
]:

    question = str(
        record.get(
            "question",
            "",
        )
    ).strip()

    resolution = str(
        record.get(
            "resolution",
            "",
        )
    ).strip()

    category = record.get(
        "category",
        "",
    )

    source_documents = (
        record.get(
            "source_documents"
        )
        or []
    )

    if not question or not resolution:
        return [], set()

    # ---------------------------------------------------------------
    # Resolve source filenames → ALL matching chunks.
    # ---------------------------------------------------------------

    source_positive_ids = (
        resolve_source_chunks(
            source_documents,
            knowledge_documents,
        )
    )

    if not source_positive_ids:
        return [], set()

    # ---------------------------------------------------------------
    # Build three semantic queries.
    #
    # 1. Customer intent
    # 2. What the historical agent actually resolved
    # 3. Combined problem + resolution
    # ---------------------------------------------------------------

    combined = (
        f"Customer issue: {question}\n"
        f"Successful resolution: {resolution}"
    )

    documents = [
        document_text(document)
        for document in knowledge_documents
    ]

    query_texts = [
        question
        for _ in knowledge_documents
    ]

    resolution_texts = [
        resolution
        for _ in knowledge_documents
    ]

    combined_texts = [
        combined
        for _ in knowledge_documents
    ]

    query_scores = scorer.score_pairs(
        query_texts,
        documents,
    )

    resolution_scores = scorer.score_pairs(
        resolution_texts,
        documents,
    )

    combined_scores = scorer.score_pairs(
        combined_texts,
        documents,
    )

    scored: list[dict[str, Any]] = []

    for index, document in enumerate(
        knowledge_documents
    ):

        document_id = str(
            document.get(
                "id",
                "",
            )
        )

        if not document_id:
            continue

        features = build_candidate_features(
            record=record,
            document=document,
            query_similarity=query_scores[index],
            resolution_similarity=resolution_scores[index],
            combined_similarity=combined_scores[index],
            source_positive_ids=source_positive_ids,
        )

        scored.append(
            {
                "document": document,
                "document_id": document_id,
                "features": features,
            }
        )

    # ---------------------------------------------------------------
    # Rank source chunks by resolution-aware quality.
    # ---------------------------------------------------------------

    source_candidates = [
        item
        for item in scored
        if item["features"]["source_match"] == 1.0
    ]

    source_candidates.sort(
        key=lambda item: (
            item["features"][
                "candidate_quality"
            ],
            item["features"][
                "resolution_similarity"
            ],
            item["features"][
                "combined_similarity"
            ],
        ),
        reverse=True,
    )

    if not source_candidates:
        return [], set()

    # ---------------------------------------------------------------
    # Positive selection.
    #
    # We do NOT label every chunk from refunds.md etc. positive.
    #
    # Instead:
    #
    #   best source chunk = positive
    #
    # Then additional source chunks are positive only if they are
    # close enough to the best resolution-aware score.
    # ---------------------------------------------------------------

    best_positive = source_candidates[0]

    best_quality = best_positive[
        "features"
    ]["candidate_quality"]

    positive_ids: set[str] = {
        best_positive["document_id"]
    }

    for item in source_candidates[1:]:

        quality = item[
            "features"
        ]["candidate_quality"]

        resolution_similarity = item[
            "features"
        ]["resolution_similarity"]

        relative_quality = (
            quality
            / max(
                best_quality,
                1e-6,
            )
        )

        if (
            relative_quality >= 0.90
            and resolution_similarity >= 0.35
        ):
            positive_ids.add(
                item["document_id"]
            )

    positive_ids = set(
        list(positive_ids)[
            :max_positive_chunks
        ]
    )

    # ---------------------------------------------------------------
    # Negative candidates.
    #
    # IMPORTANT:
    # Source chunks not selected as positives are NOT used as negatives.
    #
    # Why?
    #
    # Because source_documents only tells us that the historical
    # resolution came from that source. An unselected chunk from the
    # same source is "unknown", not necessarily wrong.
    # ---------------------------------------------------------------

    negative_candidates = [
        item
        for item in scored
        if (
            item["document_id"]
            not in source_positive_ids
        )
    ]

    # ---------------------------------------------------------------
    # Semantic hard negatives.
    # ---------------------------------------------------------------

    negative_candidates.sort(
        key=lambda item: (
            item["features"][
                "candidate_quality"
            ],
            item["features"][
                "query_similarity"
            ],
        ),
        reverse=True,
    )

    hard_negatives = (
        negative_candidates[
            :hard_negative_count
        ]
    )

    hard_ids = {
        item["document_id"]
        for item in hard_negatives
    }

    # ---------------------------------------------------------------
    # Easy negatives.
    # ---------------------------------------------------------------

    remaining = [
        item
        for item in negative_candidates
        if item["document_id"]
        not in hard_ids
    ]

    remaining.sort(
        key=lambda item: item[
            "features"
        ]["candidate_quality"]
    )

    easy_negatives = remaining[
        :easy_negative_count
    ]

    selected_ids = (
        positive_ids
        | {
            item["document_id"]
            for item in hard_negatives
        }
        | {
            item["document_id"]
            for item in easy_negatives
        }
    )

    selected = [
        item
        for item in scored
        if item["document_id"]
        in selected_ids
    ]

    # ---------------------------------------------------------------
    # Candidate JSON records.
    # ---------------------------------------------------------------

    candidates = []

    for item in selected:

        document = item[
            "document"
        ]

        document_id = item[
            "document_id"
        ]

        features = item[
            "features"
        ]

        label = (
            1
            if document_id
            in positive_ids
            else 0
        )

        candidates.append(
            {
                "document_id": document_id,
                "label": label,
                "title": document.get(
                    "title",
                    "",
                ),
                "source": document_source(
                    document
                ),
                "features": features,

                # --------------------------------------------------
                # Backward compatibility with the original ranking
                # learner.
                # --------------------------------------------------

                "semantic_similarity": features[
                    "semantic_similarity"
                ],
                "category_match": bool(
                    features[
                        "category_match"
                    ]
                ),

                # Useful diagnostics.
                "query_similarity": features[
                    "query_similarity"
                ],
                "resolution_similarity": features[
                    "resolution_similarity"
                ],
                "combined_similarity": features[
                    "combined_similarity"
                ],
                "source_match": features[
                    "source_match"
                ],
                "authority_score": features[
                    "authority_score"
                ],
                "candidate_quality": features[
                    "candidate_quality"
                ],
            }
        )

    return candidates, positive_ids


# ============================================================================
# Build ranking example
# ============================================================================

def build_ranking_example(
    record: dict[str, Any],
    candidates: list[dict[str, Any]],
    positives: set[str],
) -> dict[str, Any]:

    weight = supervision_weight(
        record
    )

    return {
        "example_id": stable_hash(
            record.get(
                "ticket_id"
            ),
            record.get(
                "question"
            ),
            record.get(
                "resolution"
            ),
        ),

        "query": record.get(
            "question",
            "",
        ),

        "context": (
            record.get(
                "context"
            )
            or {}
        ),

        "category": record.get(
            "category"
        ),

        "resolution": record.get(
            "resolution",
            "",
        ),

        "candidates": candidates,

        "positive_document_ids": sorted(
            positives
        ),

        "supervision": {
            "type": (
                "bootstrap_historical_resolution"
            ),

            "ticket_id": record.get(
                "ticket_id"
            ),

            "agent_approved": bool(
                record.get(
                    "agent_approved"
                )
            ),

            "resolution_success": bool(
                record.get(
                    "resolution_success"
                )
            ),

            "agent_edit_count": int(
                record.get(
                    "agent_edit_count",
                    0,
                )
                or 0
            ),

            "weight": round(
                weight,
                4,
            ),

            "source_documents": (
                record.get(
                    "source_documents"
                )
                or []
            ),

            "resolution_tags": (
                record.get(
                    "resolution_tags"
                )
                or []
            ),

            "created_at": record.get(
                "created_at"
            ),
        },
    }


# ============================================================================
# Deduplication
# ============================================================================

def deduplicate_examples(
    examples: list[dict[str, Any]],
) -> list[dict[str, Any]]:

    seen: set[str] = set()
    unique: list[dict[str, Any]] = []

    for example in examples:

        candidate_ids = tuple(
            sorted(
                candidate[
                    "document_id"
                ]
                for candidate
                in example.get(
                    "candidates",
                    [],
                )
            )
        )

        positive_ids = tuple(
            sorted(
                example.get(
                    "positive_document_ids",
                    [],
                )
            )
        )

        key = stable_hash(
            normalize_text(
                example.get(
                    "query",
                    "",
                )
            ),
            normalize_text(
                example.get(
                    "resolution",
                    "",
                )
            ),
            positive_ids,
            candidate_ids,
        )

        if key in seen:
            continue

        seen.add(key)

        unique.append(
            example
        )

    return unique


# ============================================================================
# Split
# ============================================================================

def split_examples(
    examples: list[dict[str, Any]],
    validation_ratio: float,
    seed: int,
) -> tuple[
    list[dict[str, Any]],
    list[dict[str, Any]],
]:

    if len(examples) < 2:
        return examples, []

    rng = random.Random(
        seed
    )

    shuffled = list(
        examples
    )

    rng.shuffle(
        shuffled
    )

    validation_count = max(
        1,
        round(
            len(shuffled)
            * validation_ratio
        ),
    )

    validation = shuffled[
        :validation_count
    ]

    train = shuffled[
        validation_count:
    ]

    return train, validation


# ============================================================================
# Validation
# ============================================================================

def validate_examples(
    examples: list[dict[str, Any]],
) -> None:

    if not examples:
        raise RuntimeError(
            "No ranking examples generated."
        )

    for index, example in enumerate(
        examples
    ):

        if not example.get(
            "query"
        ):
            raise ValueError(
                f"Example {index} "
                "has no query."
            )

        positives = set(
            example.get(
                "positive_document_ids",
                [],
            )
        )

        if not positives:
            raise ValueError(
                f"Example {index} "
                "has no positive document."
            )

        candidates = example.get(
            "candidates",
            [],
        )

        if not candidates:
            raise ValueError(
                f"Example {index} "
                "has no candidates."
            )

        candidate_ids = {
            candidate[
                "document_id"
            ]
            for candidate in candidates
        }

        missing = (
            positives
            - candidate_ids
        )

        if missing:
            raise ValueError(
                f"Example {index} "
                f"positive documents missing "
                f"from candidates: {missing}"
            )

        if not any(
            candidate["label"] == 0
            for candidate in candidates
        ):
            raise ValueError(
                f"Example {index} "
                "has no negative candidate."
            )

        # Every candidate must contain the
        # resolution-aware feature set.

        required_features = {
            "query_similarity",
            "resolution_similarity",
            "combined_similarity",
            "category_match",
            "source_match",
            "authority_score",
            "historical_supervision_weight",
            "approval_signal",
            "success_signal",
            "edit_penalty",
            "candidate_quality",
        }

        for candidate in candidates:

            missing_features = (
                required_features
                - set(
                    candidate.get(
                        "features",
                        {},
                    ).keys()
                )
            )

            if missing_features:
                raise ValueError(
                    f"Example {index}, "
                    f"candidate "
                    f"{candidate.get('document_id')} "
                    f"missing features: "
                    f"{missing_features}"
                )


# ============================================================================
# Statistics
# ============================================================================

def print_feature_statistics(
    examples: list[dict[str, Any]],
) -> None:

    feature_names = [
        "query_similarity",
        "resolution_similarity",
        "combined_similarity",
        "category_match",
        "source_match",
        "authority_score",
        "historical_supervision_weight",
        "approval_signal",
        "success_signal",
        "edit_penalty",
        "candidate_quality",
    ]

    print()
    print("=" * 72)
    print("FEATURE STATISTICS")
    print("=" * 72)

    for feature in feature_names:

        values = []

        for example in examples:

            for candidate in example[
                "candidates"
            ]:

                value = candidate[
                    "features"
                ].get(
                    feature
                )

                if value is not None:
                    values.append(
                        float(value)
                    )

        if not values:
            continue

        mean = sum(
            values
        ) / len(values)

        print(
            f"{feature:<35}"
            f"mean={mean:.4f} "
            f"min={min(values):.4f} "
            f"max={max(values):.4f}"
        )


# ============================================================================
# Main
# ============================================================================

def main() -> None:

    parser = argparse.ArgumentParser(
        description=(
            "Bootstrap ResolveIQ "
            "resolution-aware LambdaMART "
            "ranking examples."
        )
    )

    parser.add_argument(
        "--history",
        type=Path,
        default=DEFAULT_HISTORY,
    )

    parser.add_argument(
        "--knowledge",
        type=Path,
        default=DEFAULT_KNOWLEDGE,
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
    )

    parser.add_argument(
        "--train-output",
        type=Path,
        default=DEFAULT_TRAIN_OUTPUT,
    )

    parser.add_argument(
        "--valid-output",
        type=Path,
        default=DEFAULT_VALID_OUTPUT,
    )

    parser.add_argument(
        "--hard-negatives",
        type=int,
        default=3,
    )

    parser.add_argument(
        "--easy-negatives",
        type=int,
        default=1,
    )

    parser.add_argument(
        "--max-positive-chunks",
        type=int,
        default=2,
    )

    parser.add_argument(
        "--validation-ratio",
        type=float,
        default=0.20,
    )

    parser.add_argument(
        "--seed",
        type=int,
        default=42,
    )

    args = parser.parse_args()

    # ------------------------------------------------------------------
    # Header
    # ------------------------------------------------------------------

    print("=" * 72)
    print(
        "ResolveIQ Resolution-Aware Ranking Bootstrap"
    )
    print("=" * 72)

    print(
        f"[INFO] History:   {args.history}"
    )

    print(
        f"[INFO] Knowledge: {args.knowledge}"
    )

    # ------------------------------------------------------------------
    # Load
    # ------------------------------------------------------------------

    history = read_jsonl(
        args.history
    )

    knowledge = read_jsonl(
        args.knowledge
    )

    print(
        f"[INFO] Historical records: "
        f"{len(history)}"
    )

    print(
        f"[INFO] Knowledge documents: "
        f"{len(knowledge)}"
    )

    if not history:
        raise RuntimeError(
            "Historical resolution "
            "dataset is empty."
        )

    if not knowledge:
        raise RuntimeError(
            "Knowledge dataset is empty."
        )

    # ------------------------------------------------------------------
    # Show source distribution
    # ------------------------------------------------------------------

    source_counts: dict[str, int] = {}

    for document in knowledge:

        source = document_source(
            document
        )

        source_counts[source] = (
            source_counts.get(
                source,
                0,
            )
            + 1
        )

    print()
    print(
        "[INFO] Knowledge source distribution:"
    )

    for source, count in sorted(
        source_counts.items()
    ):

        print(
            f"        {source}: "
            f"{count} chunks"
        )

    # ------------------------------------------------------------------
    # Semantic model
    # ------------------------------------------------------------------

    scorer = SemanticScorer()

    # ------------------------------------------------------------------
    # Generate examples
    # ------------------------------------------------------------------

    examples = []

    skipped = []

    for index, record in enumerate(
        history,
        start=1,
    ):

        ticket_id = record.get(
            "ticket_id",
            f"unknown-{index}",
        )

        try:

            candidates, positives = (
                mine_candidates(
                    record=record,
                    knowledge_documents=knowledge,
                    scorer=scorer,
                    hard_negative_count=(
                        args.hard_negatives
                    ),
                    easy_negative_count=(
                        args.easy_negatives
                    ),
                    max_positive_chunks=(
                        args.max_positive_chunks
                    ),
                )
            )

            if not positives:

                skipped.append(
                    (
                        ticket_id,
                        "source could not "
                        "be mapped to "
                        "knowledge chunks",
                    )
                )

                continue

            if not candidates:

                skipped.append(
                    (
                        ticket_id,
                        "no candidates",
                    )
                )

                continue

            example = build_ranking_example(
                record,
                candidates,
                positives,
            )

            examples.append(
                example
            )

        except Exception as exc:

            skipped.append(
                (
                    ticket_id,
                    str(exc),
                )
            )

    # ------------------------------------------------------------------
    # Deduplicate
    # ------------------------------------------------------------------

    before_dedup = len(
        examples
    )

    examples = deduplicate_examples(
        examples
    )

    after_dedup = len(
        examples
    )

    # ------------------------------------------------------------------
    # Validate
    # ------------------------------------------------------------------

    validate_examples(
        examples
    )

    # ------------------------------------------------------------------
    # Split
    # ------------------------------------------------------------------

    train, validation = (
        split_examples(
            examples,
            validation_ratio=(
                args.validation_ratio
            ),
            seed=args.seed,
        )
    )

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    write_jsonl(
        args.output,
        examples,
    )

    write_jsonl(
        args.train_output,
        train,
    )

    write_jsonl(
        args.valid_output,
        validation,
    )

    # ------------------------------------------------------------------
    # Statistics
    # ------------------------------------------------------------------

    approved_count = sum(
        bool(
            example[
                "supervision"
            ][
                "agent_approved"
            ]
        )
        for example in examples
    )

    successful_count = sum(
        bool(
            example[
                "supervision"
            ][
                "resolution_success"
            ]
        )
        for example in examples
    )

    positive_count = sum(
        len(
            example[
                "positive_document_ids"
            ]
        )
        for example in examples
    )

    negative_count = sum(
        sum(
            candidate["label"] == 0
            for candidate
            in example[
                "candidates"
            ]
        )
        for example in examples
    )

    average_candidates = (
        sum(
            len(
                example[
                    "candidates"
                ]
            )
            for example in examples
        )
        / len(examples)
    )

    average_positives = (
        positive_count
        / len(examples)
    )

    print()
    print("=" * 72)
    print("BOOTSTRAP COMPLETE")
    print("=" * 72)

    print(
        f"Historical records:       "
        f"{len(history)}"
    )

    print(
        f"Usable examples:          "
        f"{len(examples)}"
    )

    print(
        f"Skipped records:          "
        f"{len(skipped)}"
    )

    print(
        f"Duplicates removed:       "
        f"{before_dedup - after_dedup}"
    )

    print(
        f"Approved examples:        "
        f"{approved_count}"
    )

    print(
        f"Successful examples:      "
        f"{successful_count}"
    )

    print(
        f"Positive labels:          "
        f"{positive_count}"
    )

    print(
        f"Negative labels:          "
        f"{negative_count}"
    )

    print(
        f"Average positives:        "
        f"{average_positives:.2f}"
    )

    print(
        f"Average candidates:       "
        f"{average_candidates:.2f}"
    )

    print(
        f"Training examples:        "
        f"{len(train)}"
    )

    print(
        f"Validation examples:      "
        f"{len(validation)}"
    )

    print()
    print(
        f"Full dataset: "
        f"{args.output}"
    )

    print(
        f"Training set: "
        f"{args.train_output}"
    )

    print(
        f"Validation set: "
        f"{args.valid_output}"
    )

    print_feature_statistics(
        examples
    )

    # ------------------------------------------------------------------
    # Skipped records
    # ------------------------------------------------------------------

    if skipped:

        print()
        print("=" * 72)
        print("SKIPPED RECORDS")
        print("=" * 72)

        for ticket_id, reason in skipped:

            print(
                f"{ticket_id}: {reason}"
            )


if __name__ == "__main__":
    main()