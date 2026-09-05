# Architecture Note: RAG-Based Intelligent Machine Troubleshooting System

**Event**: UCET 2026 HACK-A-THON: PIXELS TO POSSIBILITIES  
**Domain**: Application Data Management (RAG)  
**System**: Industrial AI Diagnostic Assistant for Siemens Equipment  

---

## 1. System Overview & Problem Formulation
On industrial manufacturing plant floors, machinery malfunctions generate cryptic indicators (e.g. flashing LEDs, three-digit hex codes, or motor acoustic anomalies). Technicians typically have to cross-reference multi-hundred-page technical manuals across multiple equipment types (PLCs vs. Frequency Inverters).

A naive "Chat with PDF" RAG fails in industrial environments due to:
1. **Cross-Document Ambiguity**: Identical error codes mean completely different things across equipment (e.g., Code `8013` is a PROFINET connection failure in an S7-1200 PLC, but refers to Function Diagram 8013 Load Rotation Monitoring in a SINAMICS G120 drive).
2. **Hallucination Risks**: LLMs invent plausible-sounding wiring or parameter adjustments when source documentation is sparse. In an industrial setting with high-voltage drives and 3-phase machinery, this is a severe safety hazard.
3. **Traceability Demands**: Technicians cannot trust unverified claims; every claim must cite the manual, section, and page number.

To solve this, our system implements a grounded, multi-stage pipeline:
```
[Raw Manuals (PDF)]
        │
        ▼
[PyMuPDF Page Extraction + Text Normalization]
        │
        ▼
[Recursive Character Chunking + Page/Section Metadata]
        │
        ▼
[Dual Indexing: ChromaDB Dense Vectors + BM25 Sparse Lexical Index]
        │
        ▼
[Hybrid Retrieval with Reciprocal Rank Fusion (RRF)]
        │
   ┌────┴────────────────────────┐
   ▼                             ▼
[Ambiguity Detector]    [Hallucination Guardrail]
 (Multi-machine check)   (Cosine/Keyword Threshold)
   │                             │
   ├─► Clarification Query       ├─► Graceful Refusal ("Insufficient Data")
   │                             │
   └───────────────┬─────────────┘
                   ▼
       [LLM Synthesis (Groq Qwen 27B)]
                   │
                   ▼
  [Structured Diagnostic Output with (Manual, Section, Page) Citations]
```

---

## 2. Ingestion & Chunking Strategy
- **Extraction Engine**: Uses `PyMuPDF` for high-fidelity page-by-page extraction with structural cleaning (`clean_pages` strips control characters, normalizes line endings, and preserves table structures).
- **Chunk Size & Overlap**: 
  - `chunk_size = 1500` characters (~300 tokens)
  - `chunk_overlap = 250` characters (~50 tokens)
  - `separators = ["\n\n", "\n", ". ", " ", ""]`
- **Metadata Association**: Each chunk retains:
  - `document_id`: Canonical document stem (e.g., `G120_CU240BE2_op_instr_0117_en-US`)
  - `source_file`: File basename
  - `machine_model`: Canonical model (`sinamics-drive`, `siemens-s7-1200`, `siemens-s7-1500`)
  - `page_number`: Exact 1-indexed PDF page number
  - `section`: Hierarchical chapter / section title (e.g., `11. Faults, Alarms & Diagnostic Messages`)

---

## 3. Hybrid Retrieval & RRF Fusion Engine
Industrial manuals require both conceptual semantic matching ("motor humming at low speed") and precise lexical matching (exact hex codes like `16#80C4` or Siemens parameter `p2175`).

1. **Dense Vector Search**:
   - Embedder: `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions, cosine space in ChromaDB).
   - Captures symptom descriptions, operational guidance, and natural language questions.
2. **Sparse Lexical Search**:
   - In-memory BM25 index (`rank_bm25.BM25Okapi`).
   - Heavily weights exact technical tokens:
     - Faults & Alarms: `[FA]\d{4,5}` (e.g. `F07900`, `A07910`)
     - Parameters: `[pr]\d{3,5}` (e.g. `p2175`, `r1538`)
     - Hex Status Words: `16#[0-9A-Fa-f]{4}` (e.g. `16#80C4`)
3. **Reciprocal Rank Fusion (RRF)**:
   $$\text{RRF Score}(d) = \sum_{m \in \{\text{semantic}, \text{bm25}\}} \frac{w_m}{60 + \text{rank}_m(d)}$$
   - Exact code matches receive an additional $2.0\times$ booster.
   - Chunks are deduplicated by text fingerprinting to avoid near-duplicate page header pollution.

---

## 4. Cross-Document Ambiguity Resolution Strategy
**The Problem**: A technician enters `8013` without selecting a machine. If the system simply averages chunks, it will mix PLC network instructions with motor drive speed monitoring.

**The Solution**:
1. When no explicit machine filter is provided, the system checks if the top retrieved chunks span **two or more distinct machine families** with high relevance.
2. If multi-machine collision occurs, the engine halts synthesis and returns `status: "ambiguous"`.
3. The response contains:
   - A friendly clarifying question: *"The code '8013' has different meanings across your machines. Which equipment are you troubleshooting?"*
   - Pre-formatted candidate options (`SINAMICS G120 Drive` vs `SIMATIC S7-1200 PLC`) with 1-line context summaries and page numbers.
4. If the technician specifies context clues in their question (e.g., *"motor"*, *"drive"*, *"PLC"*), the query-time classifier automatically routes to the right manual without requiring clarification.

---

## 5. Algorithmic Hallucination Control & Graceful Refusal
Prompt-only refusal ("please say you don't know") is unreliable when LLMs encounter thin evidence. Our system implements a **Dual-Gate Algorithmic Gatekeeper**:

1. **Retrieval Relevance Threshold**:
   - The engine computes the maximum retrieval similarity $\text{Sim}_{\max}$.
   - If $\text{Sim}_{\max} < 0.38$ and no exact technical token match exists in the BM25 index:
     - The LLM generation call is bypassed completely.
     - The system immediately returns `status: "insufficient_data"`.
2. **Safety-First Standard Operating Procedures**:
   - Instead of speculative fixes, the response renders factory-standard safety advisories (checking hardware LED diagnostic states, reviewing physical HMI alarms, verifying plant schematics).
3. **Confidence Scoring**:
   - Output includes an explicit confidence score and level (`High` $\ge 0.55$, `Medium` $\ge 0.38$, `Insufficient` $< 0.38$) displayed to the operator.

---

## 6. Multi-Turn Dialogue & Context Retention
Technicians frequently ask chained questions (e.g., *"My drive tripped with F07900"* followed by *"And what if checking motor rotation doesn't fix it?"*).

- The generator extracts the active machine model and prior error codes from the conversation history (`history: list[dict]`).
- For terse follow-ups, the retrieval query is automatically expanded with the active diagnostic context, enabling seamless deep troubleshooting without repetitive re-typing.

---

## 7. Traceability & Citation Schema
Every generated diagnosis returns structured citations:
- `manual_name`: Formal equipment title (e.g., *SINAMICS G120 Operating Instructions*)
- `filename`: PDF document source
- `section`: Manual chapter/section (e.g., *11. Faults, Alarms & Diagnostic Messages*)
- `page_number`: Exact manual page number
- `snippet`: Verbatim quote from the manual text
- `relevance_score`: Cosine/RRF retrieval confidence
