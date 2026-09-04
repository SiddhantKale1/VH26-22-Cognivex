"""Qdrant vector database service for storing and searching document embeddings."""

import logging
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models

from app.core.config import settings
from app.models.schemas import ChunkData, SearchResult

logger = logging.getLogger(__name__)


class QdrantService:
    """
    Manages interactions with the Qdrant vector database.

    Provides methods for collection management, upserting document chunks
    with their embeddings, and performing similarity searches with optional
    metadata filtering.
    """

    def __init__(
        self,
        url: str | None = None,
        collection_name: str | None = None,
    ):
        self.url = url or settings.qdrant_url
        self.collection_name = collection_name or settings.qdrant_collection_name
        logger.info("Connecting to Qdrant at %s ...", self.url)
        self._client = QdrantClient(url=self.url)
        logger.info("Qdrant client initialized.")

    @property
    def client(self) -> QdrantClient:
        """Return the underlying Qdrant client."""
        return self._client

    def is_connected(self) -> bool:
        """Check if Qdrant is reachable."""
        try:
            self._client.get_collections()
            return True
        except Exception:
            return False

    def ensure_collection(self, vector_dimension: int) -> None:
        """
        Create the collection if it doesn't exist.

        Args:
            vector_dimension: Size of the embedding vectors.
        """
        collections = self._client.get_collections().collections
        existing_names = [c.name for c in collections]

        if self.collection_name in existing_names:
            logger.info("Collection '%s' already exists.", self.collection_name)
            return

        logger.info(
            "Creating collection '%s' with dimension %d...",
            self.collection_name,
            vector_dimension,
        )
        self._client.create_collection(
            collection_name=self.collection_name,
            vectors_config=qdrant_models.VectorParams(
                size=vector_dimension,
                distance=qdrant_models.Distance.COSINE,
            ),
        )
        logger.info("Collection '%s' created.", self.collection_name)

    def upsert_chunks(
        self,
        chunks: list[ChunkData],
        embeddings: list[list[float]],
    ) -> None:
        """
        Upsert document chunks with their embeddings into Qdrant.

        Uses deterministic chunk IDs to prevent duplicates on re-ingestion.

        Args:
            chunks: List of ChunkData objects.
            embeddings: Corresponding embedding vectors.
        """
        if len(chunks) != len(embeddings):
            raise ValueError(
                f"Mismatch: {len(chunks)} chunks vs {len(embeddings)} embeddings."
            )

        points = []
        for chunk, embedding in zip(chunks, embeddings):
            # Convert hex chunk_id to integer for Qdrant point ID
            point_id = int(chunk.chunk_id, 16) % (2**63)

            payload = {
                "chunk_id": chunk.chunk_id,
                "text": chunk.text,
                "source_file": chunk.source_file,
                "page_number": chunk.page_number,
                "machine": chunk.machine,
                "model": chunk.model,
                "section": chunk.section,
                "error_code": chunk.error_code,
            }

            points.append(
                qdrant_models.PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload=payload,
                )
            )

        # Upsert in batches of 100
        batch_size = 100
        for i in range(0, len(points), batch_size):
            batch = points[i : i + batch_size]
            self._client.upsert(
                collection_name=self.collection_name,
                points=batch,
            )

        logger.info("Upserted %d points to '%s'.", len(points), self.collection_name)

    def search(
        self,
        query_vector: list[float],
        top_k: int = 5,
        machine: Optional[str] = None,
        model: Optional[str] = None,
        score_threshold: Optional[float] = None,
    ) -> list[SearchResult]:
        """
        Perform similarity search with optional metadata filtering.

        Args:
            query_vector: The query embedding vector.
            top_k: Number of results to return.
            machine: Optional machine name filter.
            model: Optional model number filter.
            score_threshold: Minimum similarity score.

        Returns:
            List of SearchResult objects sorted by relevance.
        """
        # Build filter conditions
        must_conditions = []

        if machine:
            must_conditions.append(
                qdrant_models.FieldCondition(
                    key="machine",
                    match=qdrant_models.MatchValue(value=machine),
                )
            )

        if model:
            must_conditions.append(
                qdrant_models.FieldCondition(
                    key="model",
                    match=qdrant_models.MatchValue(value=model),
                )
            )

        query_filter = None
        if must_conditions:
            query_filter = qdrant_models.Filter(must=must_conditions)

        results = self._client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            query_filter=query_filter,
            limit=top_k,
            score_threshold=score_threshold,
        )

        search_results = []
        for point in results.points:
            payload = point.payload or {}
            search_results.append(
                SearchResult(
                    text=payload.get("text", ""),
                    score=round(point.score, 4),
                    page=payload.get("page_number", 0),
                    source=payload.get("source_file", ""),
                    machine=payload.get("machine"),
                    model=payload.get("model"),
                    section=payload.get("section"),
                    error_code=payload.get("error_code"),
                )
            )

        return search_results

    def delete_by_source(self, source_file: str) -> None:
        """
        Delete all points associated with a specific source file.

        Args:
            source_file: The filename to delete data for.
        """
        self._client.delete(
            collection_name=self.collection_name,
            points_selector=qdrant_models.FilterSelector(
                filter=qdrant_models.Filter(
                    must=[
                        qdrant_models.FieldCondition(
                            key="source_file",
                            match=qdrant_models.MatchValue(value=source_file),
                        )
                    ]
                )
            ),
        )
        logger.info(
            "Deleted all points for source '%s' from '%s'.",
            source_file,
            self.collection_name,
        )

    def get_collection_info(self) -> dict:
        """Return information about the current collection."""
        try:
            info = self._client.get_collection(self.collection_name)
            return {
                "name": self.collection_name,
                "vectors_count": info.vectors_count,
                "points_count": info.points_count,
                "status": info.status.value if info.status else "unknown",
            }
        except Exception as e:
            logger.error("Failed to get collection info: %s", e)
            return {"name": self.collection_name, "error": str(e)}
