#!/usr/bin/env python3
"""Ingest a PDF manual into the RAG pipeline.

Usage:
    python scripts/ingest_manual.py data/manuals/example_manual.pdf
    python scripts/ingest_manual.py path/to/any/manual.pdf
"""

import sys
import logging
from pathlib import Path

# Add project root to path so we can import app modules
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv

# Load .env from project root
load_dotenv(project_root / ".env")

from app.embeddings.embedding_service import EmbeddingService
from app.vectorstore.qdrant_service import QdrantService
from app.ingestion.pipeline import IngestionPipeline


def main():
    """Run the ingestion pipeline for a given PDF file."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(message)s",
        datefmt="%H:%M:%S",
    )
    logger = logging.getLogger(__name__)

    if len(sys.argv) < 2:
        print("Usage: python scripts/ingest_manual.py <path_to_pdf>")
        print("Example: python scripts/ingest_manual.py data/manuals/example_manual.pdf")
        sys.exit(1)

    pdf_path = Path(sys.argv[1])

    # Resolve relative paths from the project root
    if not pdf_path.is_absolute():
        pdf_path = project_root / pdf_path

    if not pdf_path.exists():
        print(f"Error: File not found: {pdf_path}")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"  Machine Troubleshooter — Manual Ingestion")
    print(f"{'='*60}\n")

    # Step 1: Initialize services
    print("Loading embedding model...")
    embedding_service = EmbeddingService()

    print("Connecting to Qdrant...")
    qdrant_service = QdrantService()

    # Ensure collection exists
    qdrant_service.ensure_collection(embedding_service.dimension)

    # Step 2: Build and run pipeline
    pipeline = IngestionPipeline(
        embedding_service=embedding_service,
        qdrant_service=qdrant_service,
    )

    print(f"\nIngesting: {pdf_path.name}")
    print("-" * 40)

    try:
        result = pipeline.ingest(pdf_path)

        print(f"\n{'='*60}")
        print(f"  INGESTION COMPLETE")
        print(f"{'='*60}")
        print(f"  File:            {result['filename']}")
        print(f"  Pages extracted: {result['pages_extracted']}")
        print(f"  Chunks created:  {result['chunks_created']}")
        print(f"  Chunks indexed:  {result['chunks_indexed']}")
        print(f"{'='*60}\n")

    except Exception as e:
        logger.error("Ingestion failed: %s", e)
        print(f"\nError: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
