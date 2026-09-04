"""Manual upload and management API routes."""

import logging
import re
import shutil
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.core.config import settings
from app.models.schemas import UploadResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/manuals", tags=["manuals"])

# Allowed extensions and MIME types
ALLOWED_EXTENSIONS = {".pdf"}
ALLOWED_CONTENT_TYPES = {"application/pdf"}

# Regex for safe filenames: alphanumeric, hyphens, underscores, dots
SAFE_FILENAME_PATTERN = re.compile(r"^[\w\-. ]+\.pdf$", re.IGNORECASE)


def _sanitize_filename(filename: str) -> str:
    """
    Sanitize the uploaded filename to prevent path traversal.

    Strips directory components, replaces unsafe characters, and ensures
    the result is a safe basename with .pdf extension.
    """
    # Take only the basename (prevent path traversal)
    basename = Path(filename).name

    # Replace any non-alphanumeric characters (except hyphen, underscore, dot, space)
    safe_name = re.sub(r"[^\w\-. ]", "_", basename)

    # Ensure it ends with .pdf
    if not safe_name.lower().endswith(".pdf"):
        safe_name += ".pdf"

    # Prevent empty names
    if not safe_name or safe_name == ".pdf":
        safe_name = "uploaded_manual.pdf"

    return safe_name


@router.post("/upload", response_model=UploadResponse)
async def upload_manual(file: UploadFile = File(...)):
    """
    Upload a PDF manual for ingestion into the RAG pipeline.

    Validates the file type and size, saves it to the upload directory,
    then runs the full ingestion pipeline (extract → chunk → embed → index).
    """
    # Validate file extension
    if file.filename:
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type '{ext}'. Only PDF files are accepted.",
            )

    # Validate content type
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content type '{file.content_type}'. Expected application/pdf.",
        )

    # Read file content and check size
    content = await file.read()
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.max_upload_size_mb} MB.",
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Sanitize filename and save
    safe_name = _sanitize_filename(file.filename or "manual.pdf")
    upload_dir = settings.upload_path
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / safe_name

    try:
        file_path.write_bytes(content)
        logger.info("Saved uploaded file: %s (%d bytes)", safe_name, len(content))
    except OSError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save file: {e}"
        ) from e

    # Run ingestion pipeline
    try:
        from app.main import get_ingestion_pipeline

        pipeline = get_ingestion_pipeline()
        result = pipeline.ingest(file_path)

        return UploadResponse(
            filename=result["filename"],
            pages_extracted=result["pages_extracted"],
            chunks_created=result["chunks_created"],
            chunks_indexed=result["chunks_indexed"],
            message=f"Successfully indexed {result['chunks_indexed']} chunks from '{safe_name}'.",
        )
    except Exception as e:
        logger.error("Ingestion failed for '%s': %s", safe_name, e)
        raise HTTPException(
            status_code=500,
            detail=f"Ingestion failed: {e}",
        ) from e
