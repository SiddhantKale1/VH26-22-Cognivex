"""Tests for embedding service.

Note: These tests require the embedding model to be downloaded.
They test actual embedding functionality, not mocks.
"""

import pytest

from app.embeddings.embedding_service import EmbeddingService


@pytest.fixture(scope="module")
def embedding_service():
    """Load the embedding service once for all tests in this module."""
    return EmbeddingService()


class TestEmbeddingService:
    """Test suite for EmbeddingService."""

    def test_model_loads(self, embedding_service):
        """Test that the model loads successfully."""
        assert embedding_service is not None
        assert embedding_service.dimension > 0

    def test_embed_text(self, embedding_service):
        """Test embedding a single text string."""
        embedding = embedding_service.embed_text("test text")
        assert isinstance(embedding, list)
        assert len(embedding) == embedding_service.dimension
        assert all(isinstance(v, float) for v in embedding)

    def test_embed_documents(self, embedding_service):
        """Test embedding multiple documents."""
        texts = ["document one", "document two", "document three"]
        embeddings = embedding_service.embed_documents(texts)

        assert len(embeddings) == 3
        for emb in embeddings:
            assert len(emb) == embedding_service.dimension

    def test_embed_documents_empty(self, embedding_service):
        """Test that empty input returns empty output."""
        embeddings = embedding_service.embed_documents([])
        assert embeddings == []

    def test_embed_query(self, embedding_service):
        """Test embedding a query (with BGE prefix)."""
        embedding = embedding_service.embed_query("What does E404 mean?")
        assert isinstance(embedding, list)
        assert len(embedding) == embedding_service.dimension

    def test_similar_texts_have_high_similarity(self, embedding_service):
        """Test that semantically similar texts produce similar embeddings."""
        import numpy as np

        emb1 = embedding_service.embed_text("spindle overload error")
        emb2 = embedding_service.embed_text("spindle is overloaded")
        emb3 = embedding_service.embed_text("the weather is sunny today")

        # Cosine similarity (embeddings are normalized)
        sim_similar = np.dot(emb1, emb2)
        sim_different = np.dot(emb1, emb3)

        assert sim_similar > sim_different

    def test_dimension_matches_model(self, embedding_service):
        """Test that dimension property matches actual embedding size."""
        embedding = embedding_service.embed_text("test")
        assert len(embedding) == embedding_service.dimension
