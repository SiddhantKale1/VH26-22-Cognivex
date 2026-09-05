from pathlib import Path

from .pdf_loader import extract_text_from_pdf
from .ocr import needs_ocr, ocr_pdf
from .cleaner import clean_pages
from .metadata import create_document_metadata
from .chunker import create_chunks


def ingest_document(pdf_path: str):

    print(f"\nProcessing: {pdf_path}")

    # 1. Extract text
    pages = extract_text_from_pdf(pdf_path)

    # 2. OCR if necessary
    if needs_ocr(pages):

        print("  → OCR required")

        pages = ocr_pdf(pdf_path)

    else:

        print("  → Normal text extraction")

    # 3. Clean
    pages = clean_pages(pages)

    # 4. Metadata
    metadata = create_document_metadata(pdf_path)

    # 5. Chunk
    chunks = create_chunks(
        pages,
        metadata
    )

    print(f"  → Pages: {len(pages)}")
    print(f"  → Chunks: {len(chunks)}")

    return chunks