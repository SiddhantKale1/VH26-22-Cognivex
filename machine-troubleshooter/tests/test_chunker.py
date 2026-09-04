"""Tests for text chunking."""

import pytest

from app.ingestion.chunker import Chunker
from app.models.schemas import PageContent, ChunkData


@pytest.fixture
def chunker():
    """Return a Chunker with default settings."""
    return Chunker(chunk_size=200, chunk_overlap=30)


@pytest.fixture
def sample_pages():
    """Create sample page content for testing."""
    return [
        PageContent(
            page_number=1,
            text="Error E404 indicates spindle overload. "
            "Possible causes include excessive spindle load, "
            "insufficient lubrication, and abnormal motor current. "
            "Corrective action: reduce cutting parameters.",
            source_file="test_manual.pdf",
        ),
        PageContent(
            page_number=2,
            text="Motor troubleshooting: If the motor is not starting, "
            "check power supply voltage, motor contactor, and thermal "
            "overload relay. Measure winding resistance between phases.",
            source_file="test_manual.pdf",
        ),
    ]


class TestChunker:
    """Test suite for Chunker."""

    def test_chunk_pages_returns_chunks(self, chunker, sample_pages):
        """Test that chunking produces ChunkData objects."""
        chunks = chunker.chunk_pages(sample_pages)
        assert len(chunks) > 0
        for chunk in chunks:
            assert isinstance(chunk, ChunkData)

    def test_chunk_preserves_page_number(self, chunker, sample_pages):
        """Test that each chunk retains its source page number."""
        chunks = chunker.chunk_pages(sample_pages)
        page_numbers = {c.page_number for c in chunks}
        assert 1 in page_numbers
        assert 2 in page_numbers

    def test_chunk_preserves_source_file(self, chunker, sample_pages):
        """Test that each chunk retains the source filename."""
        chunks = chunker.chunk_pages(sample_pages)
        for chunk in chunks:
            assert chunk.source_file == "test_manual.pdf"

    def test_chunk_ids_are_unique(self, chunker, sample_pages):
        """Test that chunk IDs are unique."""
        chunks = chunker.chunk_pages(sample_pages)
        ids = [c.chunk_id for c in chunks]
        assert len(ids) == len(set(ids))

    def test_chunk_ids_are_deterministic(self, chunker, sample_pages):
        """Test that the same input produces the same chunk IDs."""
        chunks1 = chunker.chunk_pages(sample_pages)
        chunks2 = chunker.chunk_pages(sample_pages)
        ids1 = [c.chunk_id for c in chunks1]
        ids2 = [c.chunk_id for c in chunks2]
        assert ids1 == ids2

    def test_chunks_have_text(self, chunker, sample_pages):
        """Test that no chunk has empty text."""
        chunks = chunker.chunk_pages(sample_pages)
        for chunk in chunks:
            assert chunk.text.strip() != ""

    def test_empty_pages_produce_no_chunks(self, chunker):
        """Test that empty input produces no chunks."""
        chunks = chunker.chunk_pages([])
        assert chunks == []

    def test_custom_chunk_size(self, sample_pages):
        """Test that different chunk sizes produce different numbers of chunks."""
        small_chunker = Chunker(chunk_size=50, chunk_overlap=10)
        large_chunker = Chunker(chunk_size=5000, chunk_overlap=0)

        small_chunks = small_chunker.chunk_pages(sample_pages)
        large_chunks = large_chunker.chunk_pages(sample_pages)

        assert len(small_chunks) >= len(large_chunks)

    def test_page_boundaries_preserved(self):
        """Test that chunks from different pages don't mix content."""
        chunker = Chunker(chunk_size=5000, chunk_overlap=0)
        pages = [
            PageContent(
                page_number=10,
                text="Page 10 specific content about hydraulics.",
                source_file="test.pdf",
            ),
            PageContent(
                page_number=20,
                text="Page 20 specific content about electronics.",
                source_file="test.pdf",
            ),
        ]
        chunks = chunker.chunk_pages(pages)

        for chunk in chunks:
            if "hydraulics" in chunk.text:
                assert chunk.page_number == 10
            if "electronics" in chunk.text:
                assert chunk.page_number == 20
