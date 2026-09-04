"""End-to-end ingestion pipeline: PDF → Pages → Chunks → Metadata → Embeddings → Qdrant."""

import logging
from pathlib import Path

from app.ingestion.pdf_loader import PDFLoader
from app.ingestion.chunker import Chunker
from app.ingestion.metadata import MetadataProcessor
from app.embeddings.embedding_service import EmbeddingService
from app.vectorstore.qdrant_service import QdrantService

logger = logging.getLogger(__name__)


class IngestionPipeline:
    """Orchestrates the full manual ingestion pipeline."""

    def __init__(
        self,
        pdf_loader: PDFLoader | None = None,
        chunker: Chunker | None = None,
        metadata_processor: MetadataProcessor | None = None,
        embedding_service: EmbeddingService | None = None,
        qdrant_service: QdrantService | None = None,
    ):
        self.pdf_loader = pdf_loader or PDFLoader()
        self.chunker = chunker or Chunker()
        self.metadata_processor = metadata_processor or MetadataProcessor()
        self.embedding_service = embedding_service
        self.qdrant_service = qdrant_service

    def ingest(self, file_path: Path) -> dict:
        """
        Run the full ingestion pipeline for a PDF file.

        Args:
            file_path: Path to the PDF manual.

        Returns:
            Dict with ingestion statistics.

        Raises:
            RuntimeError: If embedding or Qdrant services are not configured.
        """
        if not self.embedding_service:
            raise RuntimeError("EmbeddingService not configured.")
        if not self.qdrant_service:
            raise RuntimeError("QdrantService not configured.")

        file_path = Path(file_path)

        # Step 1: Extract pages
        logger.info("Step 1/5: Extracting pages from '%s'...", file_path.name)
        pages = self.pdf_loader.load(file_path)
        logger.info("  Extracted %d pages.", len(pages))

        # Step 2: Chunk pages
        logger.info("Step 2/5: Chunking pages...")
        chunks = self.chunker.chunk_pages(pages)
        logger.info("  Created %d chunks.", len(chunks))

        # Step 3: Enrich metadata
        logger.info("Step 3/5: Enriching metadata...")
        chunks = self.metadata_processor.enrich_chunks(chunks)

        # Step 4: Generate embeddings
        logger.info("Step 4/5: Generating embeddings...")
        texts = [chunk.text for chunk in chunks]
        embeddings = self.embedding_service.embed_documents(texts)
        logger.info("  Generated %d embeddings.", len(embeddings))

        # Step 5: Upload to Qdrant
        logger.info("Step 5/5: Uploading to Qdrant...")
        self.qdrant_service.upsert_chunks(chunks, embeddings)
        logger.info("  Indexed %d chunks.", len(chunks))

        result = {
            "filename": file_path.name,
            "pages_extracted": len(pages),
            "chunks_created": len(chunks),
            "chunks_indexed": len(chunks),
        }

        logger.info(
            "Ingestion complete: %s — %d pages, %d chunks indexed.",
            file_path.name,
            len(pages),
            len(chunks),
        )

        return result
