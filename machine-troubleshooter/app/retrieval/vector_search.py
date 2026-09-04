"""Vector similarity search against Qdrant."""

import logging
from typing import Optional

from app.embeddings.embedding_service import EmbeddingService
from app.vectorstore.qdrant_service import QdrantService
from app.models.schemas import SearchResult

logger = logging.getLogger(__name__)


class VectorSearch:
    """Performs vector similarity search by embedding the query and searching Qdrant."""

    def __init__(
        self,
        embedding_service: EmbeddingService,
        qdrant_service: QdrantService,
    ):
        self.embedding_service = embedding_service
        self.qdrant_service = qdrant_service

    def search(
        self,
        query: str,
        top_k: int = 5,
        machine: Optional[str] = None,
        model: Optional[str] = None,
        score_threshold: Optional[float] = None,
    ) -> list[SearchResult]:
        """
        Search for relevant document chunks matching the query.

        Args:
            query: Natural language search query.
            top_k: Number of results to return.
            machine: Optional machine name filter.
            model: Optional model number filter.
            score_threshold: Minimum similarity score.

        Returns:
            List of SearchResult objects sorted by relevance.
        """
        logger.info("Searching for: '%s' (top_k=%d)", query, top_k)

        # Embed the query with BGE query prefix
        query_vector = self.embedding_service.embed_query(query)

        # Search Qdrant
        results = self.qdrant_service.search(
            query_vector=query_vector,
            top_k=top_k,
            machine=machine,
            model=model,
            score_threshold=score_threshold,
        )

        logger.info("Found %d results for query: '%s'", len(results), query)
        return results
