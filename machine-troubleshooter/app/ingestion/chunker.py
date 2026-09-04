"""Page-aware text chunking using LangChain text splitters."""

import hashlib
import logging

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.models.schemas import ChunkData, PageContent

logger = logging.getLogger(__name__)


class Chunker:
    """
    Splits page content into smaller chunks while preserving page boundaries.

    Each chunk retains its source page number and file origin. The architecture
    allows swapping in heading-aware or semantic chunking strategies later.
    """

    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 150):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def chunk_pages(self, pages: list[PageContent]) -> list[ChunkData]:
        """
        Split pages into chunks, preserving page-level metadata.

        Each page is chunked independently to preserve page boundaries.
        Chunks that span pages are avoided by design.

        Args:
            pages: List of PageContent objects from the PDF loader.

        Returns:
            List of ChunkData objects with deterministic IDs.
        """
        all_chunks: list[ChunkData] = []

        for page in pages:
            text_splits = self._splitter.split_text(page.text)

            for idx, text in enumerate(text_splits):
                chunk_id = self._generate_chunk_id(
                    source_file=page.source_file,
                    page_number=page.page_number,
                    chunk_index=idx,
                )

                all_chunks.append(
                    ChunkData(
                        chunk_id=chunk_id,
                        text=text,
                        page_number=page.page_number,
                        source_file=page.source_file,
                    )
                )

        logger.info(
            "Created %d chunks from %d pages.",
            len(all_chunks),
            len(pages),
        )

        return all_chunks

    @staticmethod
    def _generate_chunk_id(
        source_file: str, page_number: int, chunk_index: int
    ) -> str:
        """
        Generate a deterministic chunk ID based on source, page, and index.

        This prevents duplicate records when re-ingesting the same manual.
        """
        raw = f"{source_file}::page_{page_number}::chunk_{chunk_index}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]
