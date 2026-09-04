"""Application configuration loaded from environment variables."""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    # Qdrant
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection_name: str = "machine_manuals"

    # Embedding Model
    embedding_model_name: str = "BAAI/bge-base-en-v1.5"

    # Upload Settings
    max_upload_size_mb: int = 50
    upload_dir: str = "data/manuals"

    # Retrieval
    default_top_k: int = 5
    similarity_threshold: float = 0.5

    # FastAPI
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    @property
    def upload_path(self) -> Path:
        """Return the upload directory as a Path object."""
        return Path(self.upload_dir)

    @property
    def max_upload_size_bytes(self) -> int:
        """Return the maximum upload size in bytes."""
        return self.max_upload_size_mb * 1024 * 1024

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


# Singleton settings instance
settings = Settings()
