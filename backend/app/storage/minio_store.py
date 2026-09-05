"""
MinIO / S3-Compatible Object Storage Module for Cognivex RAG.
Stores and streams raw PDF technical manuals from S3 buckets (e.g. MinIO, AWS S3, Cloudflare R2).
Includes automatic local emulation fallback when MinIO server is not running.
"""

import hashlib
import io
import json
import logging
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import fitz  # PyMuPDF for page count inspection

logger = logging.getLogger("cognivex.minio")

try:
    from minio import Minio
    from minio.error import S3Error
    MINIO_SDK_AVAILABLE = True
except ImportError:
    MINIO_SDK_AVAILABLE = False
    Minio = None
    S3Error = Exception


class MinIOManualStore:
    """Manages raw PDF manual binaries and metadata in MinIO S3 Object Store."""

    def __init__(self):
        self.endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
        self.access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        self.secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
        self.bucket = os.getenv("MINIO_BUCKET", "cognivex-manuals")
        self.secure = os.getenv("MINIO_SECURE", "False").lower() in ("true", "1", "yes")

        # Local fallback emulation directory
        self.base_dir = Path(__file__).resolve().parents[2]
        self.fallback_dir = self.base_dir / "data" / "minio_bucket" / self.bucket
        self.fallback_dir.mkdir(parents=True, exist_ok=True)

        self._client: Optional[Minio] = None
        self._connected = False
        self._init_client()

    def _init_client(self):
        """Initializes the MinIO SDK client."""
        if not MINIO_SDK_AVAILABLE:
            logger.warning("minio package not installed; running in local S3 emulation mode.")
            self._connected = False
            return

        try:
            self._client = Minio(
                endpoint=self.endpoint,
                access_key=self.access_key,
                secret_key=self.secret_key,
                secure=self.secure,
            )
            # Probe bucket existence with short timeout
            if not self._client.bucket_exists(self.bucket):
                logger.info(f"Creating MinIO bucket '{self.bucket}'...")
                self._client.make_bucket(self.bucket)
            self._connected = True
            logger.info(f"Connected to MinIO at {self.endpoint} (Bucket: {self.bucket})")
        except Exception as e:
            logger.warning(f"MinIO at {self.endpoint} unreachable ({e}). Using Local S3 Emulation Store.")
            self._connected = False

    def test_connection(self) -> Dict[str, any]:
        """Tests connection status to MinIO."""
        if not self._connected:
            self._init_client()

        if self._connected and self._client:
            try:
                objects = list(self._client.list_objects(self.bucket))
                return {
                    "connected": True,
                    "storage_type": "MinIO S3 Object Store",
                    "endpoint": self.endpoint,
                    "bucket": self.bucket,
                    "manuals_count": len(objects),
                    "mode": "S3 Remote Bucket",
                }
            except Exception as e:
                self._connected = False
                return {
                    "connected": False,
                    "storage_type": "Local S3 Emulation",
                    "endpoint": self.endpoint,
                    "bucket": self.bucket,
                    "error": str(e),
                    "mode": "Local Fallback Active",
                }
        else:
            local_files = list(self.fallback_dir.glob("*.pdf"))
            return {
                "connected": False,
                "storage_type": "Local S3 Emulation",
                "endpoint": self.endpoint,
                "bucket": self.bucket,
                "manuals_count": len(local_files),
                "mode": "Local Fallback Active",
                "error": f"MinIO server at {self.endpoint} offline. Storing in local S3 emulation.",
            }

    def save_manual(
        self,
        filename: str,
        content: bytes,
        machine_family: str = "Industrial Equipment",
        total_pages: Optional[int] = None,
        status: str = "ingested",
    ) -> Dict[str, any]:
        """
        Saves a raw binary PDF manual into the MinIO `cognivex-manuals` bucket.
        """
        sha256 = hashlib.sha256(content).hexdigest()
        file_size = len(content)

        if total_pages is None or total_pages <= 0:
            try:
                doc = fitz.open(stream=content, filetype="pdf")
                total_pages = len(doc)
                doc.close()
            except Exception:
                total_pages = 0

        metadata = {
            "machine_family": machine_family,
            "total_pages": str(total_pages),
            "sha256": sha256,
            "uploaded_at": datetime.utcnow().isoformat(),
            "status": status,
        }

        # 1. Store in MinIO if online
        if self._connected and self._client:
            try:
                data_stream = io.BytesIO(content)
                self._client.put_object(
                    bucket_name=self.bucket,
                    object_name=filename,
                    data=data_stream,
                    length=file_size,
                    content_type="application/pdf",
                    metadata=metadata,
                )
                logger.info(f"Saved '{filename}' to MinIO bucket '{self.bucket}' ({file_size / (1024*1024):.2f} MB)")
            except Exception as e:
                logger.warning(f"MinIO put_object failed ({e}), writing to local emulation.")
                self._save_to_local_emulation(filename, content, metadata)
        else:
            self._save_to_local_emulation(filename, content, metadata)

        return {
            "id": sha256,
            "filename": filename,
            "machine_family": machine_family,
            "file_size_bytes": file_size,
            "total_pages": total_pages,
            "bucket": self.bucket,
            "storage_type": "minio_s3" if self._connected else "local_s3_emulation",
            "status": status,
        }

    def _save_to_local_emulation(self, filename: str, content: bytes, metadata: dict):
        """Saves file and metadata locally as fallback."""
        file_path = self.fallback_dir / filename
        with open(file_path, "wb") as f:
            f.write(content)
        meta_path = self.fallback_dir / f"{filename}.meta.json"
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

    def get_manual_bytes(self, object_name_or_id: str) -> Optional[Tuple[bytes, str, str]]:
        """
        Retrieves raw binary PDF bytes from MinIO S3 bucket or local emulation.
        Returns: (bytes_content, filename, mime_type)
        """
        # Try from MinIO
        if self._connected and self._client:
            try:
                # Find matching object name
                target_name = object_name_or_id
                if not target_name.lower().endswith(".pdf"):
                    # Check if searching by SHA256 or stem
                    for obj in self._client.list_objects(self.bucket):
                        if object_name_or_id in obj.object_name or Path(obj.object_name).stem == object_name_or_id:
                            target_name = obj.object_name
                            break

                response = self._client.get_object(self.bucket, target_name)
                content = response.read()
                response.close()
                response.release_conn()
                return (content, target_name, "application/pdf")
            except Exception as e:
                logger.debug(f"MinIO get_object notice for {object_name_or_id}: {e}")

        # Try from local emulation
        local_target = self.fallback_dir / object_name_or_id
        if not local_target.exists() and not (self.fallback_dir / f"{object_name_or_id}.pdf").exists():
            for p in self.fallback_dir.glob("*.pdf"):
                if object_name_or_id in p.name or Path(object_name_or_id).stem == p.stem:
                    local_target = p
                    break

        if local_target.exists():
            with open(local_target, "rb") as f:
                return (f.read(), local_target.name, "application/pdf")

        # Fallback to data/raw
        raw_dir = self.base_dir / "data" / "raw"
        for p in raw_dir.glob("*.pdf"):
            if object_name_or_id in p.name or Path(object_name_or_id).stem == p.stem:
                with open(p, "rb") as f:
                    return (f.read(), p.name, "application/pdf")

        return None

    def get_presigned_url(self, object_name: str, expiry_seconds: int = 3600) -> Optional[str]:
        """Generates a direct S3 presigned URL for downloading / streaming the PDF."""
        if self._connected and self._client:
            try:
                url = self._client.get_presigned_url(
                    method="GET",
                    bucket_name=self.bucket,
                    object_name=object_name,
                    expires=timedelta(seconds=expiry_seconds),
                    response_headers={
                        "response-content-disposition": f'inline; filename="{object_name}"',
                        "response-content-type": "application/pdf",
                    },
                )
                return url
            except Exception as e:
                logger.warning(f"Failed to generate presigned URL: {e}")
        return None

    def list_manuals(self) -> List[Dict[str, any]]:
        """Lists all manuals stored in the MinIO bucket or local emulation."""
        manuals = []

        # From MinIO
        if self._connected and self._client:
            try:
                objects = list(self._client.list_objects(self.bucket))
                for obj in objects:
                    stat = self._client.stat_object(self.bucket, obj.object_name)
                    meta = stat.metadata or {}
                    machine = meta.get("x-amz-meta-machine-family") or meta.get("machine_family") or "Industrial Equipment"
                    pages_str = meta.get("x-amz-meta-total-pages") or meta.get("total_pages") or "0"
                    
                    manuals.append({
                        "id": meta.get("x-amz-meta-sha256") or hashlib.sha256(obj.object_name.encode()).hexdigest(),
                        "filename": obj.object_name,
                        "machine_family": machine,
                        "file_size_bytes": obj.size,
                        "total_pages": int(pages_str) if pages_str.isdigit() else 0,
                        "mime_type": "application/pdf",
                        "status": "stored_in_minio",
                        "uploaded_at": obj.last_modified.isoformat() if obj.last_modified else datetime.utcnow().isoformat(),
                    })
                return manuals
            except Exception as e:
                logger.warning(f"Error listing MinIO bucket objects: {e}")

        # From Local Emulation or data/raw
        scan_dir = self.fallback_dir if any(self.fallback_dir.glob("*.pdf")) else (self.base_dir / "data" / "raw")
        for idx, p in enumerate(sorted(scan_dir.glob("*.pdf")), 1):
            meta_file = scan_dir / f"{p.name}.meta.json"
            meta = {}
            if meta_file.exists():
                try:
                    with open(meta_file, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                except Exception:
                    pass

            machine = meta.get("machine_family")
            if not machine:
                lower = p.name.lower()
                if "g120" in lower or "sinamics" in lower:
                    machine = "SINAMICS G120 Drive"
                elif "s71200" in lower or "s7-1200" in lower:
                    machine = "SIMATIC S7-1200 PLC"
                elif "s71500" in lower or "s7-1500" in lower:
                    machine = "SIMATIC S7-1500 PLC"
                else:
                    machine = "Siemens Equipment"

            manuals.append({
                "id": str(idx),
                "filename": p.name,
                "machine_family": machine,
                "file_size_bytes": p.stat().st_size,
                "total_pages": int(meta.get("total_pages", 0)),
                "mime_type": "application/pdf",
                "status": "local_s3_emulation",
                "uploaded_at": datetime.fromtimestamp(p.stat().st_mtime).isoformat(),
            })

        return manuals

    def delete_manual(self, object_name: str) -> bool:
        """Deletes manual from MinIO bucket and local emulation."""
        deleted = False
        if self._connected and self._client:
            try:
                self._client.remove_object(self.bucket, object_name)
                deleted = True
            except Exception as e:
                logger.warning(f"Failed to delete object {object_name} from MinIO: {e}")

        local_target = self.fallback_dir / object_name
        if local_target.exists():
            local_target.unlink()
            meta = self.fallback_dir / f"{object_name}.meta.json"
            if meta.exists():
                meta.unlink()
            deleted = True

        return deleted


# Global singleton instance
minio_store = MinIOManualStore()
