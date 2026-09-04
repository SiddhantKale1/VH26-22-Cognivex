"""Embedding service using Sentence Transformers with BGE model."""

import logging
from sentence_transformers import SentenceTransformer

from app.core.config import settings

logger = logging.getLogger(__name__)

# BGE models recommend prepending "Represent this sentence: " for queries
BGE_QUERY_PREFIX = "Represent this sentence: "


class EmbeddingService:
    """
    Manages text embedding using Sentence Transformers.

    Loads the model once and reuses it for all embedding requests.
    Model name is configurable via the EMBEDDING_MODEL_NAME env var.
    """

    def __init__(self, model_name: str | None = None):
        self.model_name = model_name or settings.embedding_model_name
        logger.info("Loading embedding model: %s ...", self.model_name)
        self._model = SentenceTransformer(self.model_name)
        self._dimension = self._model.get_embedding_dimension()
        logger.info(
            "Embedding model loaded. Dimension: %d", self._dimension
        )

    @property
    def dimension(self) -> int:
        """Return the embedding vector dimension."""
        return self._dimension

    def embed_text(self, text: str) -> list[float]:
        """
        Embed a single text string.

        Args:
            text: The text to embed.

        Returns:
            Embedding vector as a list of floats.
        """
        embedding = self._model.encode(text, normalize_embeddings=True)
        return embedding.tolist()

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """
        Embed a batch of document texts.

        Args:
            texts: List of document texts to embed.

        Returns:
            List of embedding vectors.
        """
        if not texts:
            return []

        logger.info("Embedding %d documents...", len(texts))
        embeddings = self._model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=len(texts) > 10,
            batch_size=32,
        )
        return embeddings.tolist()

    def embed_query(self, query: str) -> list[float]:
        """
        Embed a search query with BGE-specific query prefix.

        BGE models perform better when queries are prefixed with
        "Represent this sentence: " to differentiate from documents.

        Args:
            query: The search query text.

        Returns:
            Embedding vector as a list of floats.
        """
        prefixed_query = BGE_QUERY_PREFIX + query
        embedding = self._model.encode(prefixed_query, normalize_embeddings=True)
        return embedding.tolist()
