"""Tests for retrieval pipeline and API validation.

Tests that require Qdrant are marked with @pytest.mark.integration
and can be skipped if Qdrant is not running.
"""

import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.models.schemas import (
    SearchRequest,
    SearchResponse,
    SearchResult,
    UploadResponse,
    HealthResponse,
    ChunkData,
)
from app.ingestion.metadata import MetadataProcessor


class TestSchemaValidation:
    """Test Pydantic schema validation."""

    def test_search_request_valid(self):
        """Test valid search request."""
        req = SearchRequest(query="What does E404 mean?", top_k=5)
        assert req.query == "What does E404 mean?"
        assert req.top_k == 5
        assert req.machine is None
        assert req.model is None

    def test_search_request_with_filters(self):
        """Test search request with machine/model filters."""
        req = SearchRequest(
            query="E404",
            machine="CNC-X200",
            model="X200-4A",
            top_k=3,
        )
        assert req.machine == "CNC-X200"
        assert req.model == "X200-4A"
        assert req.top_k == 3

    def test_search_request_empty_query_rejected(self):
        """Test that empty query is rejected."""
        with pytest.raises(Exception):
            SearchRequest(query="", top_k=5)

    def test_search_request_top_k_bounds(self):
        """Test top_k validation bounds."""
        with pytest.raises(Exception):
            SearchRequest(query="test", top_k=0)
        with pytest.raises(Exception):
            SearchRequest(query="test", top_k=100)

    def test_search_response_empty(self):
        """Test empty search response."""
        resp = SearchResponse(
            query="test",
            results=[],
            message="No results found.",
        )
        assert len(resp.results) == 0
        assert resp.message is not None

    def test_search_result_model(self):
        """Test SearchResult creation."""
        result = SearchResult(
            text="E404 indicates spindle overload",
            score=0.91,
            page=4,
            source="CNC_X200_Service_Manual.pdf",
            error_code="E404",
        )
        assert result.score == 0.91
        assert result.page == 4
        assert result.error_code == "E404"
        assert result.machine is None

    def test_upload_response(self):
        """Test UploadResponse creation."""
        resp = UploadResponse(
            filename="manual.pdf",
            pages_extracted=10,
            chunks_created=25,
            chunks_indexed=25,
            message="Success",
        )
        assert resp.pages_extracted == 10

    def test_health_response(self):
        """Test HealthResponse defaults."""
        resp = HealthResponse()
        assert resp.status == "ok"
        assert resp.qdrant_connected is False
        assert resp.embedding_model_loaded is False


class TestMetadataProcessor:
    """Test metadata extraction."""

    def test_error_code_detection(self):
        """Test that error codes are detected in text."""
        processor = MetadataProcessor()
        chunk = ChunkData(
            chunk_id="test123",
            text="Error E404 indicates spindle overload.",
            page_number=4,
            source_file="test.pdf",
        )
        enriched = processor.enrich_chunks([chunk])
        assert enriched[0].error_code == "E404"

    def test_no_error_code(self):
        """Test that chunks without error codes stay null."""
        processor = MetadataProcessor()
        chunk = ChunkData(
            chunk_id="test456",
            text="Check the oil level in the reservoir.",
            page_number=1,
            source_file="test.pdf",
        )
        enriched = processor.enrich_chunks([chunk])
        assert enriched[0].error_code is None

    def test_multiple_error_codes_takes_first(self):
        """Test that first error code is used when multiple exist."""
        processor = MetadataProcessor()
        chunk = ChunkData(
            chunk_id="test789",
            text="Error E404 and E405 are spindle-related errors.",
            page_number=4,
            source_file="test.pdf",
        )
        enriched = processor.enrich_chunks([chunk])
        assert enriched[0].error_code == "E404"

    def test_metadata_fields_default_null(self):
        """Test that machine, model, section default to null."""
        processor = MetadataProcessor()
        chunk = ChunkData(
            chunk_id="test000",
            text="Some technical content.",
            page_number=1,
            source_file="test.pdf",
        )
        enriched = processor.enrich_chunks([chunk])
        assert enriched[0].machine is None
        assert enriched[0].model is None
        assert enriched[0].section is None
