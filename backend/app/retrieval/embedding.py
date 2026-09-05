"""
Embedding + ChromaDB indexing
for the RAG Machine Troubleshooting System.
"""

from pathlib import Path
import json
import os

import chromadb
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv


load_dotenv()


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

CHUNKS_FILE = (
    BASE_DIR
    / "data"
    / "processed"
    / "chunks.json"
)

VECTOR_DB_DIR = (
    BASE_DIR
    / "data"
    / "vector_db"
)

COLLECTION_NAME = "machine_manuals"


# ============================================================
# EMBEDDING MODEL
# ============================================================

EMBEDDING_MODEL = os.getenv(
    "EMBEDDING_MODEL",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
)


class ManualVectorStore:

    def __init__(self):

        # Create vector DB directory
        VECTOR_DB_DIR.mkdir(
            parents=True,
            exist_ok=True
        )

        # Load embedding model
        print(
            f"Loading embedding model: "
            f"{EMBEDDING_MODEL}"
        )

        self.embedder = SentenceTransformer(
            EMBEDDING_MODEL
        )

        # Create persistent ChromaDB
        self.chroma = chromadb.PersistentClient(
            path=str(VECTOR_DB_DIR)
        )

        # Create collection
        self.collection = (
            self.chroma.get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={
                    "hnsw:space": "cosine"
                }
            )
        )

    def reset_collection(self):
        """Reset and recreate the collection for fresh embedding indexing."""
        try:
            self.chroma.delete_collection(name=COLLECTION_NAME)
        except Exception:
            pass
        self.collection = self.chroma.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )

    # ========================================================
    # LOAD CHUNKS
    # ========================================================

    def load_chunks(self):

        if not CHUNKS_FILE.exists():

            raise FileNotFoundError(
                f"chunks.json not found:\n"
                f"{CHUNKS_FILE}\n\n"
                f"Run ingestion first."
            )

        with open(
            CHUNKS_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            chunks = json.load(file)

        if not chunks:

            raise ValueError(
                "chunks.json is empty."
            )

        return chunks

    # ========================================================
    # METADATA
    # ========================================================

    @staticmethod
    def prepare_metadata(chunk):

        metadata = (
            chunk
            .get("metadata", {})
            .copy()
        )

        return {

            "document_id":
                str(
                    metadata.get(
                        "document_id",
                        chunk.get(
                            "document_id",
                            "unknown"
                        )
                    )
                ),

            "source_file":
                str(
                    metadata.get(
                        "source_file",
                        "unknown"
                    )
                ),

            "page_number":
                int(
                    metadata.get(
                        "page_number",
                        0
                    )
                ),

            "file_type":
                str(
                    metadata.get(
                        "file_type",
                        "pdf"
                    )
                ),

            "machine_model":
                str(
                    metadata.get(
                        "machine_model",
                        "unknown"
                    )
                ),

            "machine_name":
                str(
                    metadata.get(
                        "machine_name",
                        "unknown"
                    )
                )
        }

    # ========================================================
    # BUILD VECTOR INDEX
    # ========================================================

    def build_index(self):

        self.reset_collection()
        chunks = self.load_chunks()

        print(
            f"\nTotal chunks: {len(chunks)}"
        )

        texts = [
            chunk["text"]
            for chunk in chunks
        ]

        ids = [
            str(chunk["chunk_id"])
            for chunk in chunks
        ]

        metadatas = [
            self.prepare_metadata(chunk)
            for chunk in chunks
        ]

        # ----------------------------------------------------
        # CREATE EMBEDDINGS
        # ----------------------------------------------------

        print("\nGenerating embeddings...")

        embeddings = self.embedder.encode(

            texts,

            batch_size=128,

            show_progress_bar=True,

            normalize_embeddings=True
        )

        embeddings = embeddings.tolist()

        print(
            f"Generated "
            f"{len(embeddings)} embeddings."
        )

        # ----------------------------------------------------
        # STORE IN CHROMADB
        # ----------------------------------------------------

        print(
            "\nStoring vectors in ChromaDB..."
        )

        # ChromaDB has a maximum batch size.
        # Store vectors in smaller batches.

        BATCH_SIZE = 5000

        total = len(ids)

        for start in range(0, total, BATCH_SIZE):

            end = min(
                start + BATCH_SIZE,
                total
            )

            print(
                f"Storing vectors "
                f"{start + 1}-{end} / {total}"
            )

            self.collection.upsert(

                ids=ids[start:end],

                documents=texts[start:end],

                embeddings=embeddings[start:end],

                metadatas=metadatas[start:end]
            )

        print(
            f"\nSuccessfully stored "
            f"{total} vectors in ChromaDB."
        )

        print(
            "\n================================"
        )

        print(
            "VECTOR DATABASE CREATED"
        )

        print(
            "================================"
        )

        print(
            f"Collection : "
            f"{COLLECTION_NAME}"
        )

        print(
            f"Vectors    : "
            f"{self.collection.count()}"
        )

        print(
            f"Database   : "
            f"{VECTOR_DB_DIR}"
        )


if __name__ == "__main__":

    store = ManualVectorStore()

    store.build_index()