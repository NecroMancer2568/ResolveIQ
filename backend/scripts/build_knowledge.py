from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

SOURCE_DIR = ROOT / "data" / "sources"
OUTPUT = ROOT / "data" / "knowledge.jsonl"


SOURCE_METADATA = {
    "refunds.md": {
        "title": "Refund Policy",
        "source_type": "FAQ",
        "category": "refund",
    },
    "payments.md": {
        "title": "Payments Policy",
        "source_type": "FAQ",
        "category": "payment",
    },
    "shipping.md": {
        "title": "Shipping Policy",
        "source_type": "FAQ",
        "category": "shipping",
    },
    "accounts.md": {
        "title": "Account Policy",
        "source_type": "FAQ",
        "category": "account",
    },
    "subscriptions.md": {
        "title": "Subscription Policy",
        "source_type": "FAQ",
        "category": "subscription",
    },
    "warranty.md": {
        "title": "Warranty Policy",
        "source_type": "FAQ",
        "category": "warranty",
    },
}


def clean_text(text: str) -> str:
    text = text.replace("\r\n", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_into_chunks(text: str) -> list[str]:
    """
    Split Markdown into useful semantic sections.

    Each heading starts a new chunk.
    If there are no headings, the entire document becomes one chunk.
    """

    text = clean_text(text)

    # Split before Markdown headings.
    parts = re.split(
        r"\n(?=#+\s+)",
        text,
    )

    parts = [
        part.strip()
        for part in parts
        if part.strip()
    ]

    return parts


def build_document_id(
    filename: str,
    index: int,
) -> str:
    stem = Path(filename).stem

    return f"{stem}-{index}"


def main() -> None:

    if not SOURCE_DIR.exists():
        raise FileNotFoundError(
            f"Source directory does not exist: {SOURCE_DIR}"
        )

    source_files = sorted(
        SOURCE_DIR.glob("*.md")
    )

    if not source_files:
        raise RuntimeError(
            f"No Markdown files found in {SOURCE_DIR}"
        )

    records = []

    print("=" * 70)
    print("ResolveIQ Knowledge Corpus Builder")
    print("=" * 70)

    for source_file in source_files:

        filename = source_file.name

        metadata = SOURCE_METADATA.get(
            filename,
            {
                "title": source_file.stem.replace(
                    "_",
                    " ",
                ).title(),
                "source_type": "FAQ",
                "category": source_file.stem,
            },
        )

        text = source_file.read_text(
            encoding="utf-8",
            errors="replace",
        )

        chunks = split_into_chunks(text)

        print(
            f"{filename}: {len(chunks)} chunk(s)"
        )

        for index, chunk in enumerate(
            chunks
        ):

            record = {
                "id": build_document_id(
                    filename,
                    index,
                ),

                "title": metadata["title"],

                "content": chunk,

                "source_type": metadata[
                    "source_type"
                ],

                "category": metadata[
                    "category"
                ],

                "source": filename,

                "filename": filename,

                "chunk_index": index,

                "total_chunks": len(chunks),

                "authority": "official",

                "updated_at": None,
            }

            records.append(record)

    OUTPUT.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with OUTPUT.open(
        "w",
        encoding="utf-8",
    ) as f:

        for record in records:

            f.write(
                json.dumps(
                    record,
                    ensure_ascii=False,
                )
                + "\n"
            )

    print()
    print("=" * 70)
    print("BUILD COMPLETE")
    print("=" * 70)

    print(
        f"Source files:       {len(source_files)}"
    )

    print(
        f"Knowledge records:  {len(records)}"
    )

    print(
        f"Output:             {OUTPUT}"
    )


if __name__ == "__main__":
    main()