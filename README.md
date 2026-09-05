# RAG-Based Intelligent Machine Troubleshooting System

**Hackathon**: Vidyavardhini's College of Engineering & Technology — UCET 2026 Hackathon: Pixels to Possibilities  
**Department**: Information Technology  
**Domain**: Application Data Management (RAG)  
**System**: Industrial AI Diagnostic Assistant for Siemens Equipment  

---

## Executive Summary
On factory floors, machines fail in cryptic ways (blinking LEDs, numeric status words, or humming noises). The solutions exist buried deep in multi-hundred-page technical manuals across disparate equipment types.

This project delivers an industrial-grade **RAG-based Troubleshooting Assistant** that goes beyond standard "chat-with-PDF" demos:
1. **Multi-Manual Ingestion with Overlaps**: Ingests 5 Siemens PDF manuals (~6,729 vector chunks) covering SINAMICS G120 Inverters, S7-1200 PLCs, and S7-1500 PLCs, including real overlapping codes (e.g. `8013`, `16#80C4`).
2. **Hybrid Reciprocal Rank Fusion (RRF)**: Combines dense semantic vector retrieval (`all-MiniLM-L6-v2` in ChromaDB) with sparse lexical BM25 (`BM25Okapi`) with heavy boosts for exact Siemens error codes and parameters (`p2175`, `r1538`).
3. **Cross-Document Disambiguation**: Detects when an unscoped code (like `8013`) has conflicting meanings across manuals and interactively prompts the technician with clear machine candidate cards.
4. **Deterministic Hallucination Guardrail**: Employs an algorithmic cosine similarity gatekeeper that halts speculative generation for unknown faults (`E9999`) and provides safe factory SOPs.
5. **Multi-Turn Context Retention**: Technicians can ask follow-ups (*"And what if that doesn't fix it?"*) without re-stating machine context.
6. **Traceable Citations**: All recommendations cite `(manual name, section, page number)` with clickable verbatim snippet previews.
7. **Hands-Free Voice Dictation**: Built-in speech recognition for technicians on the plant floor.

---

## Quick Start Instructions (Deliverable 1)

### Option A: One-Click Startup (Recommended)
From the project root:
```bat
start_all.bat
```
This automatically launches the FastAPI backend on port 8000 and the React/Vite frontend on port 5173.

### Option B: Manual Startup
1. **Backend**:
   ```bash
   cd backend
   .\venv\Scripts\activate.bat
   pip install -r requirements.txt
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

Open your browser at **`http://localhost:5173`**.

---

## Evaluation Test Scenarios (Deliverable 3)
The application has a dedicated **⚡ Live Hackathon Evaluation Bar** right on the Dashboard and Chat assistant for 1-click execution:

| Scenario | Query | Machine Scope | Expected Outcome |
|---|---|---|---|
| **1. Exact Code** | `Fault F07900` | SINAMICS G120 | Motor blocked fault, parameter `p2175`, `r1538` check, cited G120 manual p. 390. |
| **2. Natural Language** | `"Drive motor humming & overheating"` | Auto-Detect | Thermal motor overload diagnosis, cooling air checks, G120 load monitoring citations. |
| **3. Ambiguity Resolution** | `Error 8013` | All Machines | Triggers clarifying question between S7-1200 (Connection error) and G120 (Rotation monitoring). |
| **4. Hallucination Refusal** | `Error E9999 hydraulic burst` | All Machines | Algorithmic gatekeeper halts synthesis; outputs standard factory safety SOP. |
| **5. Follow-Up Dialogue** | `"What if checking motor rotation doesn't fix it?"` | G120 (Retained) | Multi-turn memory carries previous fault context into deeper parameter diagnostics. |

---

## Key Deliverables Documentation
- **Deliverable 2**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Deliverable 3**: [docs/LIVE_DEMO_GUIDE.md](docs/LIVE_DEMO_GUIDE.md)
- **Deliverable 4**: [docs/SAMPLE_OUTPUTS.md](docs/SAMPLE_OUTPUTS.md)
