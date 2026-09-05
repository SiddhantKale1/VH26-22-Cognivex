import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from app.generation.generator import RAGGenerator

# Load environment variables
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("machine-assistant-api")

from contextlib import asynccontextmanager

# Pre-warm RAG Generator on server startup so first queries respond instantly
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Pre-warming RAG Generator and ChromaDB model...")
    get_generator()
    logger.info("RAG Generator is pre-warmed and ready.")
    yield

app = FastAPI(
    title="RAG Machine Troubleshooting Assistant API",
    description="Intelligent RAG assistant for industrial machinery manuals powered by Groq and ChromaDB.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend (Vite dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG Generator (lazily or at startup)
_rag_generator: RAGGenerator | None = None


def get_generator() -> RAGGenerator:
    global _rag_generator
    if _rag_generator is None:
        logger.info("Initializing RAG Generator...")
        _rag_generator = RAGGenerator()
    return _rag_generator


# ============================================================
# PYDANTIC REQUEST / RESPONSE SCHEMAS
# ============================================================

class QueryRequest(BaseModel):
    question: str
    machine_model: str | None = None
    history: list[dict] = []
    session_id: str | None = None


class ErrorRequest(BaseModel):
    machine_model: str | None = None
    error_code: str


# ============================================================
# API ROUTES
# ============================================================

@app.get("/health")
def health_check():
    gen = get_generator()
    return {
        "status": "ok",
        "groq_configured": gen.llm.is_configured(),
        "llm_configured": gen.llm.is_configured(),
        "model": gen.llm.model,
        "indexed_chunks": gen.search.collection.count()
    }


@app.get("/api/demo-scenarios")
def get_demo_scenarios():
    """Pre-configured demo cases matching hackathon evaluation criteria."""
    return [
        {
            "id": "exact_code",
            "category": "Exact Code",
            "title": "Fault F07900: Motor Blocked",
            "machine_model": "sinamics-drive",
            "machine_name": "SINAMICS G120 Drive",
            "query": "Fault F07900",
            "description": "Critical drive trip: checks parameters p2175, p2177, r1538 with exact manual page citations."
        },
        {
            "id": "natural_language",
            "category": "Natural Language",
            "title": "Drive Motor Humming & Overheating",
            "machine_model": "sinamics-drive",
            "machine_name": "SINAMICS G120 Drive",
            "query": "Why is the drive motor humming loudly and overheating at low speeds?",
            "description": "Diagnostic search across symptoms, current limits, and cooling procedures."
        },
        {
            "id": "cross_manual_ambiguity",
            "category": "Ambiguity Resolution",
            "title": "Overlapping Code 8013 across Manuals",
            "machine_model": None,
            "machine_name": "All Machines (Unscoped)",
            "query": "Error 8013",
            "description": "Code 8013 appears in S7-1200 (Connection error) and G120 (Rotation monitoring) — triggers clarifying question."
        },
        {
            "id": "insufficient_data",
            "category": "Hallucination Control",
            "title": "Unknown Error E9999 / Hydraulic Leak",
            "machine_model": None,
            "machine_name": "All Machines",
            "query": "Error E9999 hydraulic valve burst on production line",
            "description": "Deterministic refusal: verifies system refuses gracefully rather than inventing plausible fixes."
        },
        {
            "id": "follow_up",
            "category": "Conversational Memory",
            "title": "Follow-Up Troubleshooting Dialogue",
            "machine_model": "sinamics-drive",
            "machine_name": "SINAMICS G120 Drive",
            "query": "What if checking motor free rotation doesn't fix it?",
            "description": "Multi-turn context retention carrying active fault & machine context seamlessly."
        }
    ]


@app.post("/api/query")
def handle_query(req: QueryRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    gen = get_generator()
    return gen.generate_answer(
        question=req.question,
        machine_model=req.machine_model,
        history=req.history
    )


@app.post("/api/errors")
def handle_error_analysis(req: ErrorRequest):
    if not req.error_code.strip():
        raise HTTPException(status_code=400, detail="Error code cannot be empty.")
    gen = get_generator()
    return gen.generate_error_analysis(
        machine_model=req.machine_model or "",
        error_code=req.error_code
    )


@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a new PDF machine manual, extract text, generate embeddings, and index into ChromaDB."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF manual files (.pdf) are supported.")
    
    base_dir = Path(__file__).resolve().parents[1]
    raw_dir = base_dir / "data" / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    
    save_path = raw_dir / file.filename
    with open(save_path, "wb") as f:
        content = await file.read()
        f.write(content)
        
    try:
        from app.ingestion.pipeline import ingest_document
        new_chunks = ingest_document(str(save_path))
        gen = get_generator()
        if new_chunks:
            texts = [c["text"] for c in new_chunks]
            ids = [str(c["chunk_id"]) for c in new_chunks]
            metadatas = [gen.search.store.prepare_metadata(c) for c in new_chunks]
            embeddings = gen.search.store.embedder.encode(texts, batch_size=64, normalize_embeddings=True).tolist()
            gen.search.collection.upsert(ids=ids, documents=texts, embeddings=embeddings, metadatas=metadatas)
            gen.search._init_bm25_index()
            
        return {
            "status": "success",
            "filename": file.filename,
            "chunks_added": len(new_chunks),
            "message": f"Successfully ingested '{file.filename}' ({len(new_chunks)} chunks indexed)."
        }
    except Exception as e:
        logger.error(f"Failed to ingest uploaded document {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process PDF manual: {str(e)}")


@app.get("/api/documents")
def list_documents():
    """List all manuals found in data/raw with metadata and processing status."""
    base_dir = Path(__file__).resolve().parents[1]
    raw_dir = base_dir / "data" / "raw"
    
    known_metadata = {
        "G120_CU240BE2_op_instr_0117_en-US": {
            "name": "SINAMICS G120 CU240B-2 / CU240E-2 Operating Instructions",
            "manufacturer": "Siemens",
            "machine": "SINAMICS Drive",
            "version": "01/2017",
            "language": "English",
        },
        "G120_Safety_fct_man_0920_en-US": {
            "name": "SINAMICS G120 Safety Functions Manual",
            "manufacturer": "Siemens",
            "machine": "SINAMICS Drive",
            "version": "09/2020",
            "language": "English",
        },
        "s71200_system_manual_en-US": {
            "name": "SIMATIC S7-1200 Programmable Controller System Manual",
            "manufacturer": "Siemens",
            "machine": "S7-1200 PLC",
            "version": "2024",
            "language": "English",
        },
        "s71200_system_manual_en-US_en-US": {
            "name": "SIMATIC S7-1200 Manual (Revision)",
            "manufacturer": "Siemens",
            "machine": "S7-1200 PLC",
            "version": "2024",
            "language": "English",
        },
        "s71500_cpu1512c_1_pn_manual_en-US_en-US": {
            "name": "SIMATIC S7-1500 CPU 1512C-1 PN Manual",
            "manufacturer": "Siemens",
            "machine": "S7-1500 PLC",
            "version": "2024",
            "language": "English",
        }
    }

    documents = []
    if raw_dir.exists():
        for idx, pdf in enumerate(sorted(raw_dir.glob("*.pdf")), 1):
            stem = pdf.stem
            meta = known_metadata.get(stem, {
                "name": pdf.name,
                "manufacturer": "Siemens",
                "machine": "Industrial Machinery",
                "version": "2024",
                "language": "English"
            })
            documents.append({
                "id": str(idx),
                "name": meta["name"],
                "manufacturer": meta["manufacturer"],
                "machine": meta["machine"],
                "version": meta["version"],
                "language": meta["language"],
                "status": "Indexed & Ready",
                "filename": pdf.name
            })
    return documents


@app.delete("/api/documents/{filename}")
def delete_document(filename: str):
    """Delete a manual PDF file and remove all its vector embeddings and BM25 index entries."""
    base_dir = Path(__file__).resolve().parents[1]
    raw_dir = base_dir / "data" / "raw"
    target_pdf = raw_dir / filename

    if not target_pdf.exists() and not (raw_dir / f"{filename}.pdf").exists():
        # Check if file exists without extension
        if (raw_dir / f"{filename}.pdf").exists():
            target_pdf = raw_dir / f"{filename}.pdf"

    if target_pdf.exists():
        try:
            target_pdf.unlink()
        except Exception as e:
            logger.error(f"Failed to delete file {filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

    # Delete embeddings from ChromaDB
    gen = get_generator()
    deleted_chunks_count = 0
    try:
        data = gen.search.collection.get(include=["metadatas"])
        if data and data["ids"]:
            ids_to_del = []
            stem = Path(filename).stem
            for doc_id, meta in zip(data["ids"], data["metadatas"] or []):
                meta_src = meta.get("source_file", "") if meta else ""
                meta_fn = meta.get("filename", "") if meta else ""
                if (filename in meta_src) or (stem in meta_src) or (filename == meta_fn) or (stem == meta_fn):
                    ids_to_del.append(doc_id)
            if ids_to_del:
                gen.search.collection.delete(ids=ids_to_del)
                deleted_chunks_count = len(ids_to_del)
                logger.info(f"Deleted {deleted_chunks_count} vector chunks from ChromaDB for {filename}")
    except Exception as e:
        logger.warning(f"Error removing embeddings for {filename}: {e}")

    # Update chunks.json if present
    chunks_file = base_dir / "data" / "processed" / "chunks.json"
    if chunks_file.exists():
        try:
            import json
            with open(chunks_file, "r", encoding="utf-8") as f:
                chunks = json.load(f)
            stem = Path(filename).stem
            filtered = [
                c for c in chunks
                if filename not in str(c.get("source_file", "")) and stem not in str(c.get("source_file", ""))
            ]
            with open(chunks_file, "w", encoding="utf-8") as f:
                json.dump(filtered, f, indent=2)
        except Exception as e:
            logger.warning(f"Error updating chunks.json during deletion: {e}")

    # Re-init BM25 index
    try:
        gen.search._init_bm25_index()
    except Exception as e:
        logger.warning(f"Error re-indexing BM25: {e}")

    return {
        "status": "success",
        "filename": filename,
        "deleted_chunks": deleted_chunks_count,
        "message": f"Successfully deleted '{filename}' and purged vector index."
    }


@app.get("/api/stats")
def get_stats():
    """Returns real-time statistics about indexed manuals, chunks per machine, and retrieval health."""
    gen = get_generator()
    total_chunks = gen.search.collection.count()
    
    chunks_file = Path(__file__).resolve().parents[1] / "data" / "processed" / "chunks.json"
    manual_counts = {}
    machine_counts = {}
    
    if chunks_file.exists():
        try:
            import json
            with open(chunks_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    src = item.get("source_file") or item.get("manual_name") or "Unknown Manual"
                    # clean display name
                    clean_src = Path(src).name if "/" in src or "\\" in src else src
                    mach = item.get("machine_model") or item.get("machine_name") or "General Equipment"
                    if mach == "sinamics-drive":
                        mach = "SINAMICS G120"
                    elif mach == "s7-1200":
                        mach = "SIMATIC S7-1200"
                    elif mach == "s7-1500":
                        mach = "SIMATIC S7-1500"
                    manual_counts[clean_src] = manual_counts.get(clean_src, 0) + 1
                    machine_counts[mach] = machine_counts.get(mach, 0) + 1
        except Exception as e:
            logger.warning(f"Could not parse chunks.json for stats: {e}")

    if not manual_counts:
        docs = list_documents()
        per_doc = max(1, total_chunks // max(1, len(docs))) if total_chunks > 0 else 0
        for doc in docs:
            manual_counts[doc["filename"]] = per_doc
            mach = doc["machine"]
            machine_counts[mach] = machine_counts.get(mach, 0) + per_doc

    return {
        "total_documents": len(list_documents()),
        "total_chunks": total_chunks,
        "embedding_model": "paraphrase-multilingual-MiniLM-L12-v2",
        "vector_dimensions": 384,
        "manual_distribution": [{"manual": k, "chunks": v} for k, v in manual_counts.items()],
        "machine_distribution": [{"machine": k, "chunks": v} for k, v in machine_counts.items()],
        "system_status": "Operational",
        "llm_model": gen.llm.model if hasattr(gen.llm, "model") else "Groq LLaMA-3.3-70B",
    }


if __name__ == "__main__":
    import uvicorn
    import os
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
