"""
PostgreSQL Storage Module for Cognivex RAG.
Stores and manages raw PDF manual binaries (BYTEA) and associated metadata.
"""

import hashlib
import io
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import psycopg2
from psycopg2 import sql
from psycopg2.extras import RealDictCursor
import fitz  # PyMuPDF for page count inspection

logger = logging.getLogger("cognivex.postgres")


class PostgresManualStore:
    """Manages raw PDF manual binaries and metadata in a PostgreSQL database."""

    def __init__(self):
        self.host = os.getenv("POSTGRES_HOST", "localhost")
        self.port = int(os.getenv("POSTGRES_PORT", "5432"))
        self.user = os.getenv("POSTGRES_USER", "postgres")
        self.password = os.getenv("POSTGRES_PASSWORD", "postgres")
        self.dbname = os.getenv("POSTGRES_DB", "cognivex_rag")
        self._initialized = False

    def _get_connection(self):
        """Creates a connection to target database."""
        return psycopg2.connect(
            host=self.host,
            port=self.port,
            user=self.user,
            password=self.password,
            dbname=self.dbname,
            connect_timeout=3,
        )

    def initialize_database(self) -> Dict[str, any]:
        """
        Initializes the PostgreSQL database and creates the `raw_manuals` table if missing.
        Returns connection status dictionary.
        """
        # Step 1: Ensure target database exists (connect to default 'postgres' db first)
        try:
            admin_conn = psycopg2.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                dbname="postgres",
                connect_timeout=3,
            )
            admin_conn.autocommit = True
            with admin_conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM pg_database WHERE datname = %s;", (self.dbname,)
                )
                if not cur.fetchone():
                    logger.info(f"Creating database '{self.dbname}' in PostgreSQL...")
                    cur.execute(
                        sql.SQL("CREATE DATABASE {};").format(
                            sql.Identifier(self.dbname)
                        )
                    )
            admin_conn.close()
        except Exception as e:
            logger.warning(f"Could not verify/create DB '{self.dbname}' via admin connection: {e}")

        # Step 2: Connect to target database and create table
        try:
            conn = self._get_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS raw_manuals (
                        id VARCHAR(64) PRIMARY KEY,
                        filename VARCHAR(255) NOT NULL,
                        machine_family VARCHAR(100) NOT NULL,
                        file_size_bytes BIGINT NOT NULL,
                        total_pages INTEGER NOT NULL DEFAULT 0,
                        mime_type VARCHAR(50) DEFAULT 'application/pdf',
                        pdf_data BYTEA NOT NULL,
                        status VARCHAR(30) DEFAULT 'ingested',
                        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                    CREATE INDEX IF NOT EXISTS idx_manuals_machine ON raw_manuals(machine_family);
                    CREATE INDEX IF NOT EXISTS idx_manuals_uploaded_at ON raw_manuals(uploaded_at);
                    """
                )
                conn.commit()
            conn.close()
            self._initialized = True
            return {"status": "connected", "database": self.dbname, "host": self.host}
        except Exception as e:
            self._initialized = False
            logger.error(f"Failed to initialize PostgreSQL table: {e}")
            return {"status": "disconnected", "error": str(e), "database": self.dbname}

    def test_connection(self) -> Dict[str, any]:
        """Tests active connection to PostgreSQL."""
        try:
            conn = self._get_connection()
            with conn.cursor() as cur:
                cur.execute("SELECT version();")
                version = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM raw_manuals;")
                count = cur.fetchone()[0]
            conn.close()
            return {
                "connected": True,
                "version": version,
                "manuals_count": count,
                "database": self.dbname,
            }
        except Exception as e:
            return {
                "connected": False,
                "error": str(e),
                "database": self.dbname,
                "host": f"{self.host}:{self.port}",
            }

    def save_manual(
        self,
        filename: str,
        content: bytes,
        machine_family: str = "General Equipment",
        total_pages: Optional[int] = None,
        status: str = "ingested",
    ) -> Dict[str, any]:
        """
        Saves a raw binary PDF manual into the PostgreSQL `raw_manuals` table.
        Uses SHA-256 for deterministic ID and deduplication.
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

        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO raw_manuals (
                        id, filename, machine_family, file_size_bytes, total_pages,
                        mime_type, pdf_data, status, uploaded_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (id) DO UPDATE SET
                        filename = EXCLUDED.filename,
                        machine_family = EXCLUDED.machine_family,
                        file_size_bytes = EXCLUDED.file_size_bytes,
                        total_pages = EXCLUDED.total_pages,
                        pdf_data = EXCLUDED.pdf_data,
                        status = EXCLUDED.status,
                        uploaded_at = NOW();
                    """,
                    (
                        sha256,
                        filename,
                        machine_family,
                        file_size,
                        total_pages,
                        "application/pdf",
                        psycopg2.Binary(content),
                        status,
                    ),
                )
                conn.commit()
        finally:
            conn.close()

        return {
            "id": sha256,
            "filename": filename,
            "machine_family": machine_family,
            "file_size_bytes": file_size,
            "total_pages": total_pages,
            "status": status,
        }

    def get_manual_bytes(self, doc_id: str) -> Optional[Tuple[bytes, str, str]]:
        """
        Retrieves raw binary PDF bytes from PostgreSQL.
        Returns: (bytes_content, filename, mime_type) or None
        """
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT pdf_data, filename, mime_type FROM raw_manuals WHERE id = %s;",
                    (doc_id,),
                )
                row = cur.fetchone()
                if row:
                    pdf_bytes = bytes(row[0])
                    filename = row[1]
                    mime_type = row[2] or "application/pdf"
                    return (pdf_bytes, filename, mime_type)
                return None
        finally:
            conn.close()

    def get_manual_metadata(self, doc_id: str) -> Optional[Dict[str, any]]:
        """Retrieves metadata of a single manual (without downloading full byte payload)."""
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, filename, machine_family, file_size_bytes, total_pages,
                           mime_type, status, uploaded_at
                    FROM raw_manuals
                    WHERE id = %s;
                    """,
                    (doc_id,),
                )
                row = cur.fetchone()
                if row and isinstance(row.get("uploaded_at"), datetime):
                    row["uploaded_at"] = row["uploaded_at"].isoformat()
                return dict(row) if row else None
        finally:
            conn.close()

    def list_manuals(self) -> List[Dict[str, any]]:
        """Lists all manuals in PostgreSQL with metadata (omitting binary blobs)."""
        try:
            conn = self._get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, filename, machine_family, file_size_bytes, total_pages,
                           mime_type, status, uploaded_at
                    FROM raw_manuals
                    ORDER BY uploaded_at DESC;
                    """
                )
                rows = cur.fetchall()
            conn.close()
            result = []
            for r in rows:
                item = dict(r)
                if isinstance(item.get("uploaded_at"), datetime):
                    item["uploaded_at"] = item["uploaded_at"].isoformat()
                result.append(item)
            return result
        except Exception as e:
            logger.error(f"Error querying raw_manuals table: {e}")
            return []

    def delete_manual(self, doc_id: str) -> bool:
        """Deletes a manual record from PostgreSQL by ID."""
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM raw_manuals WHERE id = %s;", (doc_id,))
                deleted = cur.rowcount > 0
                conn.commit()
            return deleted
        finally:
            conn.close()


# Global singleton instance
postgres_store = PostgresManualStore()
