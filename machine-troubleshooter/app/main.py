"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.models.schemas import HealthResponse
from app.embeddings.embedding_service import EmbeddingService
from app.vectorstore.qdrant_service import QdrantService
from app.retrieval.vector_search import VectorSearch
from app.retrieval.retriever import Retriever
from app.ingestion.pipeline import IngestionPipeline
from app.api.routes import manuals, search

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Singleton Services ────────────────────────────────────────────────
# Initialized at startup, shared across requests

_embedding_service: EmbeddingService | None = None
_qdrant_service: QdrantService | None = None
_retriever: Retriever | None = None
_ingestion_pipeline: IngestionPipeline | None = None


def get_embedding_service() -> EmbeddingService:
    """Return the shared EmbeddingService instance."""
    if _embedding_service is None:
        raise RuntimeError("EmbeddingService not initialized. Is the app started?")
    return _embedding_service


def get_qdrant_service() -> QdrantService:
    """Return the shared QdrantService instance."""
    if _qdrant_service is None:
        raise RuntimeError("QdrantService not initialized. Is the app started?")
    return _qdrant_service


def get_retriever() -> Retriever:
    """Return the shared Retriever instance."""
    if _retriever is None:
        raise RuntimeError("Retriever not initialized. Is the app started?")
    return _retriever


def get_ingestion_pipeline() -> IngestionPipeline:
    """Return the shared IngestionPipeline instance."""
    if _ingestion_pipeline is None:
        raise RuntimeError("IngestionPipeline not initialized. Is the app started?")
    return _ingestion_pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup, clean up on shutdown."""
    global _embedding_service, _qdrant_service, _retriever, _ingestion_pipeline

    logger.info("=" * 60)
    logger.info("  Machine Troubleshooter — Starting Up")
    logger.info("=" * 60)

    # Load embedding model (this takes a few seconds on first run)
    logger.info("Loading embedding model: %s", settings.embedding_model_name)
    _embedding_service = EmbeddingService()

    # Connect to Qdrant
    logger.info("Connecting to Qdrant at %s", settings.qdrant_url)
    _qdrant_service = QdrantService()

    # Ensure collection exists
    _qdrant_service.ensure_collection(_embedding_service.dimension)

    # Build retriever
    vector_search = VectorSearch(_embedding_service, _qdrant_service)
    _retriever = Retriever(vector_search)

    # Build ingestion pipeline
    _ingestion_pipeline = IngestionPipeline(
        embedding_service=_embedding_service,
        qdrant_service=_qdrant_service,
    )

    logger.info("All services initialized. Ready to serve requests.")
    logger.info("=" * 60)

    yield

    # Shutdown
    logger.info("Shutting down Machine Troubleshooter...")
    _embedding_service = None
    _qdrant_service = None
    _retriever = None
    _ingestion_pipeline = None


# ── FastAPI App ───────────────────────────────────────────────────────

app = FastAPI(
    title="Machine Troubleshooter",
    description="Intelligent RAG-based machine troubleshooting system. "
    "Upload technical manuals and ask troubleshooting questions.",
    version="0.1.0",
    lifespan=lifespan,
)

# Register routes
app.include_router(manuals.router)
app.include_router(search.router)


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    """Check the health status of all services."""
    qdrant_ok = False
    embedding_ok = False

    if _qdrant_service:
        qdrant_ok = _qdrant_service.is_connected()

    if _embedding_service:
        embedding_ok = True

    status = "ok" if (qdrant_ok and embedding_ok) else "degraded"

    return HealthResponse(
        status=status,
        qdrant_connected=qdrant_ok,
        embedding_model_loaded=embedding_ok,
    )
