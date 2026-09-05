import json
from pathlib import Path

from app.ingestion.pipeline import ingest_document


RAW_DIR = Path("data/raw")
OUTPUT_DIR = Path("data/processed")

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


def main():

    all_chunks = []

    pdf_files = list(
        RAW_DIR.glob("*.pdf")
    )

    print(f"Found {len(pdf_files)} PDF files")

    for pdf_file in pdf_files:

        try:

            chunks = ingest_document(
                str(pdf_file)
            )

            all_chunks.extend(chunks)

        except Exception as e:

            print(
                f"ERROR processing "
                f"{pdf_file.name}: {e}"
            )

    output_file = (
        OUTPUT_DIR / "chunks.json"
    )

    with open(
        output_file,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            all_chunks,
            f,
            ensure_ascii=False,
            indent=2
        )

    print(
        f"\nSaved {len(all_chunks)} chunks"
    )

    print(
        f"Output: {output_file}"
    )


if __name__ == "__main__":
    main()