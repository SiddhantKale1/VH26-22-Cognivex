"""Metadata extraction and enrichment for document chunks.

Currently stores null for machine/model/section/error_code fields that
cannot be reliably auto-detected. Designed for future enhancement with
NLP-based metadata extraction.
"""

import logging
import re

from app.models.schemas import ChunkData

logger = logging.getLogger(__name__)

# Simple regex patterns for potential future use
ERROR_CODE_PATTERN = re.compile(r"\b[A-Z]\d{3,4}\b")


class MetadataProcessor:
    """
    Processes and enriches chunk metadata.

    Currently performs minimal extraction. Designed so that more
    sophisticated metadata extraction (NLP, heading detection, etc.)
    can be plugged in later without changing the interface.
    """

    def enrich_chunks(self, chunks: list[ChunkData]) -> list[ChunkData]:
        """
        Enrich chunks with any detectable metadata.

        Args:
            chunks: List of ChunkData objects to process.

        Returns:
            List of ChunkData objects with enriched metadata.
        """
        enriched: list[ChunkData] = []

        for chunk in chunks:
            enriched_chunk = self._extract_metadata(chunk)
            enriched.append(enriched_chunk)

        detected_count = sum(
            1
            for c in enriched
            if c.error_code or c.machine or c.model or c.section
        )
        logger.info(
            "Metadata enrichment complete: %d/%d chunks have detected metadata.",
            detected_count,
            len(enriched),
        )

        return enriched

    def _extract_metadata(self, chunk: ChunkData) -> ChunkData:
        """
        Extract metadata from a single chunk.

        Currently attempts basic error code detection only.
        Machine, model, and section detection are left as null
        to avoid hallucinating metadata.
        """
        error_code = self._detect_error_code(chunk.text)

        return chunk.model_copy(
            update={
                "error_code": error_code,
                # Future: add machine, model, section detection here
                # "machine": self._detect_machine(chunk.text),
                # "model": self._detect_model(chunk.text),
                # "section": self._detect_section(chunk.text),
            }
        )

    @staticmethod
    def _detect_error_code(text: str) -> str | None:
        """
        Attempt to detect an error code in the text.

        Looks for patterns like E404, A123, F5001 etc.
        Returns the first match or None.
        """
        matches = ERROR_CODE_PATTERN.findall(text)
        if matches:
            return matches[0]
        return None
