"""Search API routes for querying indexed manuals."""

import logging

from fastapi import APIRouter, HTTPException

from app.models.schemas import SearchRequest, SearchResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["search"])


@router.post("/search", response_model=SearchResponse)
async def search_manuals(request: SearchRequest):
    """
    Search indexed manuals for relevant troubleshooting information.

    Accepts a natural language query and optional machine/model filters.
    Returns the top-k most relevant document chunks with metadata.
    """
    try:
        from app.main import get_retriever

        retriever = get_retriever()
        response = retriever.retrieve(
            query=request.query,
            top_k=request.top_k,
            machine=request.machine,
            model=request.model,
        )
        return response

    except Exception as e:
        logger.error("Search failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {e}",
        ) from e
