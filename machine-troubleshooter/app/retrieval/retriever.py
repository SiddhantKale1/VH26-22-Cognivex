"""High-level retriever combining search strategies.

Currently uses vector search only. Designed to support hybrid retrieval
(BM25 + vector), reranking, and other strategies in the future.
"""

import logging
from typing import Optional

from app.core.config import settings
from app.models.schemas import SearchResult, SearchResponse
from app.retrieval.vector_search import VectorSearch

logger = logging.getLogger(__name__)


class Retriever:
    """
    High-level retriever that orchestrates search strategies.

    Currently wraps VectorSearch. In the future, can combine multiple
    search strategies (BM25, hybrid, reranking) without changing the API.
    """

    def __init__(self, vector_search: VectorSearch):
        self.vector_search = vector_search

    def retrieve(
        self,
        query: str,
        top_k: int | None = None,
        machine: Optional[str] = None,
        model: Optional[str] = None,
    ) -> SearchResponse:
        """
        Retrieve relevant document chunks for a query.

        Args:
            query: Natural language search query.
            top_k: Number of results (defaults to config value).
            machine: Optional machine name filter.
            model: Optional model number filter.

        Returns:
            SearchResponse with results and optional message.
        """
        top_k = top_k or settings.default_top_k

        results: list[SearchResult] = self.vector_search.search(
            query=query,
            top_k=top_k,
            machine=machine,
            model=model,
            score_threshold=settings.similarity_threshold,
        )

        message = None
        if not results:
            message = (
                "No sufficiently relevant information was found "
                "in the indexed manuals."
            )

        return SearchResponse(
            query=query,
            results=results,
            message=message,
        )
