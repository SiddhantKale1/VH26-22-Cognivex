# 🔧 Machine Troubleshooter

**Intelligent RAG-based Machine Troubleshooting System**

Upload technical machine manuals and ask natural language troubleshooting questions. The system retrieves the most relevant manual sections with page numbers, error codes, and metadata — no hallucination, just real manual content.

---

## 🏗️ Architecture

```
┌──────────────────────┐
│   Technician/User    │
│   (CLI / API Client) │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│       FastAPI        │
│     Backend API      │
└──────────┬───────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌─────────┐ ┌──────────┐
│Ingestion│ │  Query   │
│Pipeline │ │ Pipeline │
└────┬────┘ └────┬─────┘
     │           │
     ▼           ▼
  PyMuPDF    Query Embedding
     │       (BGE v1.5)
     ▼           │
  Chunking       ▼
  (LangChain)  Qdrant
     │        Similarity
     ▼        Search
  BGE            │
  Embeddings     ▼
     │        Retrieved
     ▼        Chunks +
  Qdrant      Metadata
  (Upsert)
```

### RAG Pipeline

1. **PDF Extraction** — PyMuPDF extracts text page-by-page
2. **Chunking** — LangChain `RecursiveCharacterTextSplitter` with page boundary preservation
3. **Metadata Enrichment** — Error code detection, extensible for future NLP
4. **Embedding** — `BAAI/bge-base-en-v1.5` via Sentence Transformers
5. **Vector Storage** — Qdrant with cosine similarity
6. **Retrieval** — Query embedding → Qdrant search → ranked results with metadata

---

## 📁 Project Structure

```
machine-troubleshooter/
├── app/
│   ├── main.py                    # FastAPI application entry point
│   ├── api/routes/
│   │   ├── manuals.py             # PDF upload endpoint
│   │   └── search.py              # Search endpoint
│   ├── core/
│   │   └── config.py              # Settings from .env
│   ├── models/
│   │   └── schemas.py             # Pydantic models
│   ├── ingestion/
│   │   ├── pdf_loader.py          # PyMuPDF text extraction
│   │   ├── chunker.py             # Page-aware text splitting
│   │   ├── metadata.py            # Metadata extraction
│   │   └── pipeline.py            # End-to-end ingestion
│   ├── embeddings/
│   │   └── embedding_service.py   # BGE embedding model
│   ├── vectorstore/
│   │   └── qdrant_service.py      # Qdrant operations
│   └── retrieval/
│       ├── vector_search.py       # Similarity search
│       └── retriever.py           # High-level retrieval
├── data/manuals/                  # PDF storage
├── scripts/
│   ├── create_sample_manual.py    # Generate test PDF
│   ├── ingest_manual.py           # CLI ingestion
│   └── test_search.py             # CLI search
├── tests/                         # Pytest test suite
├── .env.example                   # Environment template
├── docker-compose.yml             # Qdrant container
├── requirements.txt               # Python dependencies
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Docker Desktop** (Windows) or **Podman** (Fedora)
- ~2 GB disk space for the embedding model (downloaded on first run)

---

### 1. Clone the Repository

```bash
git clone <repository-url>
cd machine-troubleshooter
```

### 2. Create Python Virtual Environment

**Fedora / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

**Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```cmd
python -m venv .venv
.venv\Scripts\activate.bat
```

### 3. Install Dependencies

```bash
pip install --upgrade pip

# Install PyTorch CPU (recommended for development)
pip install torch --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
pip install -r requirements.txt
```

> **Note:** Installing PyTorch CPU-only first avoids downloading ~2GB of CUDA libraries. If you have a GPU and want to use it, skip the `--index-url` line and just run `pip install -r requirements.txt`.

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` if you need to change any defaults. The defaults work out of the box for local development.

### 5. Start Qdrant

**Fedora (Podman):**
```bash
podman-compose up -d
```

**Fedora (Docker):**
```bash
sudo docker compose up -d
```

**Windows (Docker Desktop):**
```powershell
docker compose up -d
```

Verify Qdrant is running:
```bash
curl http://localhost:6333/healthz
```
You should see: `{"title":"qdrant - vectorass engine","version":"..."}`

### 6. Create Sample Manual & Ingest

```bash
# Generate a sample CNC service manual PDF
python scripts/create_sample_manual.py

# Ingest the manual into Qdrant
python scripts/ingest_manual.py data/manuals/CNC_X200_Service_Manual.pdf
```

Expected output:
```
Loading embedding model...
Connecting to Qdrant...
Ingesting: CNC_X200_Service_Manual.pdf
  Extracted 6 pages.
  Created N chunks.
  Generated N embeddings.
  Indexed N chunks.

INGESTION COMPLETE
  File:            CNC_X200_Service_Manual.pdf
  Pages extracted: 6
  Chunks created:  N
  Chunks indexed:  N
```

### 7. Test Search (CLI)

```bash
python scripts/test_search.py "What does E404 mean?"
```

Expected output:
```
RESULT 1
  Score:      0.85+
  Source:     CNC_X200_Service_Manual.pdf
  Page:       4
  Error Code: E404

  Error E404 indicates spindle overload...
```

Try more queries:
```bash
python scripts/test_search.py "Why is the spindle overheating?"
python scripts/test_search.py "What should I check if the motor is not starting?"
python scripts/test_search.py "coolant pump failure"
```

### 8. Start FastAPI Server

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

- **Swagger Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/api/health

### 9. Start Frontend Development Server

```bash
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### 10. Test API Endpoints

**Health Check:**
```bash
curl http://localhost:8000/api/health
```

**Search:**
```bash
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "What does E404 mean?", "top_k": 5}'
```

**Upload a Manual:**
```bash
curl -X POST http://localhost:8000/api/manuals/upload \
  -F "file=@data/manuals/CNC_X200_Service_Manual.pdf"
```

### 11. Run Tests

```bash
pytest tests/ -v
```

> **Note:** Embedding tests require the BGE model to be downloaded (~400MB on first run). Qdrant integration tests require Qdrant to be running.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check — reports Qdrant and embedding model status |
| `POST` | `/api/manuals/upload` | Upload a PDF manual for ingestion |
| `POST` | `/api/search` | Search indexed manuals |

### Search Request

```json
{
  "query": "What does E404 mean?",
  "machine": null,
  "model": null,
  "top_k": 5
}
```

### Search Response

```json
{
  "query": "What does E404 mean?",
  "results": [
    {
      "text": "Error E404 indicates spindle overload...",
      "score": 0.91,
      "page": 4,
      "source": "CNC_X200_Service_Manual.pdf",
      "machine": null,
      "model": null,
      "section": null,
      "error_code": "E404"
    }
  ],
  "message": null
}
```

### No Results Response

```json
{
  "query": "quantum flux capacitor error",
  "results": [],
  "message": "No sufficiently relevant information was found in the indexed manuals."
}
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `QDRANT_URL` | `http://localhost:6333` | Qdrant server URL |
| `QDRANT_COLLECTION_NAME` | `machine_manuals` | Qdrant collection name |
| `EMBEDDING_MODEL_NAME` | `BAAI/bge-base-en-v1.5` | Sentence Transformer model |
| `MAX_UPLOAD_SIZE_MB` | `50` | Maximum PDF upload size |
| `UPLOAD_DIR` | `data/manuals` | Directory for uploaded PDFs |
| `DEFAULT_TOP_K` | `5` | Default number of search results |
| `SIMILARITY_THRESHOLD` | `0.5` | Minimum similarity score |
| `APP_HOST` | `0.0.0.0` | FastAPI host |
| `APP_PORT` | `8000` | FastAPI port |

---

## 🐛 Troubleshooting

### Qdrant Connection Refused

```
Error: Connection refused at localhost:6333
```

**Fix:** Ensure Qdrant is running:
```bash
# Check container status
docker ps        # or: podman ps
# Restart if needed
docker compose up -d   # or: podman-compose up -d
```

### PyTorch Installation Fails (Large Download)

```
error: incomplete-download
```

**Fix:** Install CPU-only PyTorch first:
```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

### Embedding Model Download Slow

The BGE model (~400MB) is downloaded on first run. If it times out:
```bash
# Pre-download the model
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-base-en-v1.5')"
```

### Podman Compose Not Found (Fedora)

```bash
# Install podman-compose
sudo dnf install podman-compose
# Or via pip
pip install podman-compose
```

### Permission Denied on Upload Directory

```bash
mkdir -p data/manuals
chmod 755 data/manuals
```

### Windows: Python Not Found

Ensure Python is added to PATH during installation. Use:
```powershell
python --version
# If not found, try:
py --version
```

---

## 🧪 Testing

```bash
# Run all tests
pytest tests/ -v

# Run specific test modules
pytest tests/test_pdf_loader.py -v    # PDF extraction tests
pytest tests/test_chunker.py -v       # Chunking tests
pytest tests/test_retrieval.py -v     # Schema & metadata tests
pytest tests/test_embeddings.py -v    # Embedding tests (needs model)
```

---

## 🗺️ Roadmap (Not Yet Implemented)

- [x] React frontend dashboard
- [ ] LLM-generated answers with citations (OpenAI / Gemini / Claude)
- [ ] Hybrid retrieval (BM25 + vector search)
- [ ] Reranking with cross-encoders
- [ ] OCR support for scanned manuals
- [ ] Heading-aware semantic chunking
- [ ] User authentication
- [ ] Conversation memory
- [ ] Multi-language support

---

## 📄 License

This project is developed for hackathon purposes.
