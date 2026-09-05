"""
Migration Script: Sync all existing raw PDF manuals into MinIO / S3 Object Store bucket (cognivex-manuals).
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root))

load_dotenv(backend_root / ".env")

from app.storage.minio_store import minio_store


def classify_machine(filename: str) -> str:
    """Infers machine family from manual filename."""
    lower = filename.lower()
    if "g120" in lower or "sinamics" in lower or "cu240" in lower:
        return "SINAMICS G120 Drive"
    elif "s71200" in lower or "s7-1200" in lower:
        return "SIMATIC S7-1200 PLC"
    elif "s71500" in lower or "s7-1500" in lower:
        return "SIMATIC S7-1500 PLC"
    else:
        return "Siemens Industrial Equipment"


def migrate():
    print("=" * 65)
    print("   MinIO / S3-Compatible Object Store Migration Script")
    print("=" * 65)

    status = minio_store.test_connection()
    print(f"Target Bucket: {minio_store.bucket} at {minio_store.endpoint}")
    print(f"Connection Status: {status.get('storage_type')} ({status.get('mode')})")

    raw_dir = backend_root / "data" / "raw"
    if not raw_dir.exists():
        print(f"[WARN] Raw directory does not exist: {raw_dir}")
        return

    pdf_files = list(raw_dir.glob("*.pdf"))
    print(f"\nFound {len(pdf_files)} PDF manual(s) to store in S3 Object Store:\n")

    success_count = 0
    total_bytes = 0

    for pdf_path in pdf_files:
        try:
            filename = pdf_path.name
            machine = classify_machine(filename)
            with open(pdf_path, "rb") as f:
                content = f.read()

            record = minio_store.save_manual(
                filename=filename,
                content=content,
                machine_family=machine,
            )
            file_mb = len(content) / (1024 * 1024)
            total_bytes += len(content)
            success_count += 1
            print(f"  [OK] Stored '{filename}' ({file_mb:.2f} MB, {record['total_pages']} pages) -> Machine: {machine}")
        except Exception as e:
            print(f"  [FAIL] Failed to store '{pdf_path.name}': {e}")

    print("-" * 65)
    print(f"Migration completed: {success_count}/{len(pdf_files)} manuals stored in {minio_store.bucket}.")
    print(f"Total stored volume: {total_bytes / (1024 * 1024):.2f} MB.")
    print("=" * 65)


if __name__ == "__main__":
    migrate()
