"""
Hybrid (Semantic + BM25 Keyword) Search Engine
with Cross-Document Ambiguity Resolution & Citation Extraction
for Siemens Machine Manuals.
"""

import re
import json
import logging
from pathlib import Path
from rank_bm25 import BM25Okapi

from .embedding import ManualVectorStore, CHUNKS_FILE

logger = logging.getLogger(__name__)

# ============================================================
# MACHINE MODEL ALIAS MAPPING
# ============================================================

MACHINE_ALIASES: dict[str, str] = {
    # Siemens S7-1200 PLC
    "siemens-s7-1200": "siemens-s7-1200",
    "s7-1200": "siemens-s7-1200",
    "s71200": "siemens-s7-1200",
    "s7-1200 plc": "siemens-s7-1200",
    "siemens s7-1200": "siemens-s7-1200",
    "s7 1200": "siemens-s7-1200",
    "1214c": "siemens-s7-1200",
    "1212c": "siemens-s7-1200",
    "1215c": "siemens-s7-1200",
    
    # Siemens SINAMICS Drives & Inverters
    "sinamics-drive": "sinamics-drive",
    "sinamics": "sinamics-drive",
    "g120": "sinamics-drive",
    "sinamics g120": "sinamics-drive",
    "sinamics drive": "sinamics-drive",
    "cu240": "sinamics-drive",
    "cu240b-2": "sinamics-drive",
    "cu240e-2": "sinamics-drive",
    "industrial-motor": "sinamics-drive",
    "motor": "sinamics-drive",

    # Siemens S7-1500 PLC
    "siemens-s7-1500": "siemens-s7-1500",
    "s7-1500": "siemens-s7-1500",
    "s71500": "siemens-s7-1500",
    "s7-1500 plc": "siemens-s7-1500",
    "siemens s7-1500": "siemens-s7-1500",
    "s7 1500": "siemens-s7-1500",
    "1512c": "siemens-s7-1500",
    "1512c-1": "siemens-s7-1500",
    "cpu 1512c": "siemens-s7-1500",
}

MACHINE_DISPLAY_NAMES: dict[str, str] = {
    "siemens-s7-1200": "SIMATIC S7-1200 PLC",
    "sinamics-drive": "SINAMICS G120 Drive",
    "siemens-s7-1500": "SIMATIC S7-1500 PLC",
}

# ============================================================
# TECHNICAL TOKEN & CODE REGEX PATTERNS
# ============================================================

FAULT_ALARM_PATTERN = re.compile(r"\b([FA]\d{4,5})\b", re.IGNORECASE)
PARAM_PATTERN = re.compile(r"\b([pr]\d{3,5})\b", re.IGNORECASE)
HEX_CODE_PATTERN = re.compile(r"\b(?:16#|0x)?([0-9A-Fa-f]{4})\b")
HARDWARE_PATTERN = re.compile(r"\b(CU240[BE]-?2|S7-?1[25]00|CPU\s*1[25]\d{2}[A-Z]?)\b", re.IGNORECASE)
PREFIXED_ERROR_PATTERN = re.compile(r"(?:error|fault|alarm|code)[\s:#-]*([A-Za-z0-9_-]{3,10})", re.IGNORECASE)
LED_PATTERN = re.compile(r"\b(ERROR|RUN|STOP|MAINT|BF|SF)\s*(?:LED|indicator)\b", re.IGNORECASE)


def normalize_machine_model(model_str: str | None) -> str | None:
    """Normalize any user/frontend machine string to canonical identifier."""
    if not model_str:
        return None
    cleaned = model_str.strip().lower()
    if cleaned in ("all", "any", "none", ""):
        return None
    return MACHINE_ALIASES.get(cleaned, cleaned)


def detect_machine_from_text(text: str) -> str | None:
    """Infer machine model from natural language query text if present (multilingual aware)."""
    lower = text.lower()
    if re.search(r"\b(s7-?1200|1214c|1212c|1215c)\b", lower):
        return "siemens-s7-1200"
    if re.search(r"\b(s7-?1500|1512c|1511c|1516)\b", lower):
        return "siemens-s7-1500"
    if re.search(r"\b(sinamics|g120|cu240[be]?|inverter|drive|vfd|antrieb|variateur|convertidor|inversor|variador)\b", lower):
        return "sinamics-drive"
    return None


def infer_section_name(filename: str, page_number: int, text: str = "") -> str:
    """
    Extract or infer human-readable manual section/chapter for citations.
    Fulfills Requirement 5: '(manual name, section, page number)'.
    """
    # 1. Try to extract explicit section headings from chunk text
    heading_match = re.search(
        r"(?:^|\n)\s*(\d{1,2}(?:\.\d{1,2})*\s+[A-Z][A-Za-z0-9\s/-]{3,45})",
        text
    )
    if heading_match:
        cand = heading_match.group(1).strip()
        if len(cand) > 5 and not cand.startswith("0"):
            return cand

    # 2. Table heading check
    table_match = re.search(r"(Table\s+\d+-\s*\d+[^:\n]{3,40})", text, re.IGNORECASE)
    if table_match:
        return table_match.group(1).strip()

    # 3. Document-specific chapter mapping by page ranges
    fname = filename.lower()
    if "g120_cu240" in fname:
        if page_number <= 80:
            return "1. Fundamentals & Mechanical Installation"
        elif page_number <= 220:
            return "5. Commissioning & Parameter Configuration"
        elif page_number <= 350:
            return "6. Advanced Drive Control & Monitoring Functions"
        elif page_number <= 415:
            return "11. Faults, Alarms & Diagnostic Messages"
        else:
            return "13. Technical Specifications & Appendix"

    elif "g120_safety" in fname:
        if page_number <= 150:
            return "4. Safety Integrated Commissioning"
        elif page_number <= 280:
            return "6. Safety Diagnostics & Status Evaluation"
        else:
            return "7. Safety Faults, Alarms & Recovery"

    elif "s71200" in fname:
        if page_number <= 300:
            return "Hardware Properties & Wiring Overview"
        elif page_number <= 600:
            return "PLC Programming Concepts & Instructions"
        elif page_number <= 850:
            return "Communication Instructions (PROFINET / SFB)"
        else:
            return "Diagnostics, Status LEDs & Error Buffer"

    elif "s71500" in fname:
        if page_number <= 80:
            return "Product Overview, Wiring & Terminal Assignment"
        else:
            return "Interrupts, Diagnostics & Error Analysis"

    return "Technical Troubleshooting Section"


class ManualSearch:
    """
    Hybrid Search Engine combining:
    1. Dense Semantic Vector Search (SentenceTransformers + ChromaDB)
    2. Sparse Lexical BM25 Search (rank_bm25 for exact codes/parameters)
    3. Metadata Filtering on canonical machine models
    4. Cross-Document Ambiguity Resolution
    5. Grounded Confidence Scoring
    """

    def __init__(self):
        self.store = ManualVectorStore()
        self.collection = self.store.collection
        self.chunks: list[dict] = []
        self.bm25: BM25Okapi | None = None
        self._init_bm25_index()

    def _init_bm25_index(self):
        """Build BM25 index from chunks.json for fast exact keyword retrieval."""
        try:
            if CHUNKS_FILE.exists():
                with open(CHUNKS_FILE, "r", encoding="utf-8") as f:
                    self.chunks = json.load(f)
                
                tokenized_corpus = [
                    re.findall(r"\w+", chunk.get("text", "").lower())
                    for chunk in self.chunks
                ]
                self.bm25 = BM25Okapi(tokenized_corpus)
                logger.info("Initialized BM25 index with %d chunks", len(self.chunks))
            else:
                logger.warning("chunks.json not found at %s. BM25 indexing skipped.", CHUNKS_FILE)
        except Exception as e:
            logger.error("Failed to initialize BM25 index: %s", e)

    # ========================================================
    # CODE / TOKEN EXTRACTION
    # ========================================================

    @staticmethod
    def extract_error_code(query: str) -> str | None:
        """Extract primary error/fault code or parameter from user query."""
        # 1. Check explicit 'Error 1234' syntax
        prefixed = PREFIXED_ERROR_PATTERN.search(query)
        if prefixed:
            val = prefixed.group(1).strip().upper().replace("_", "-")
            if len(val) >= 3:
                return val

        # 2. Check F/A codes (e.g. F07900, A07910)
        match_fa = FAULT_ALARM_PATTERN.search(query)
        if match_fa:
            return match_fa.group(0).upper()

        # 3. Check Hex codes (e.g. 16#80C4 or 80C4)
        match_hex = HEX_CODE_PATTERN.search(query)
        if match_hex:
            raw = match_hex.group(0).upper().replace("16#", "").replace("0X", "")
            # Only treat as hex error code if prefixed or contains hex letters or is 80xx
            if "16#" in query.upper() or "0X" in query.upper() or any(c in "ABCDEF" for c in raw) or raw.startswith("80"):
                return f"16#{raw}" if not raw.startswith("16#") else raw

        # 4. Check parameters (p2175, r1538)
        match_param = PARAM_PATTERN.search(query)
        if match_param:
            return match_param.group(0).lower()

        # 5. Check LED patterns
        match_led = LED_PATTERN.search(query)
        if match_led:
            return f"{match_led.group(1).upper()} LED"

        return None

    def extract_technical_tokens(self, query: str) -> list[str]:
        """Extract all technical identifiers (faults, parameters, hardware) from query."""
        tokens = set()

        for match in FAULT_ALARM_PATTERN.finditer(query):
            tokens.add(match.group(0).upper())
            tokens.add(match.group(0).lower())

        for match in PARAM_PATTERN.finditer(query):
            tokens.add(match.group(0).lower())
            tokens.add(match.group(0).upper())

        for match in HARDWARE_PATTERN.finditer(query):
            tokens.add(match.group(0).upper())

        for match in HEX_CODE_PATTERN.finditer(query):
            raw = match.group(0).upper().replace("16#", "").replace("0X", "")
            tokens.add(raw)
            tokens.add(f"16#{raw}")

        prefixed = PREFIXED_ERROR_PATTERN.search(query)
        if prefixed:
            val = prefixed.group(1).strip()
            tokens.add(val.upper())
            tokens.add(val.lower())

        for match in LED_PATTERN.finditer(query):
            tokens.add(match.group(1).upper())
            tokens.add(f"{match.group(1).upper()} LED")

        return list(tokens)

    # ========================================================
    # SEMANTIC SEARCH (Dense Vector)
    # ========================================================

    def semantic_search(
        self,
        query: str,
        top_k: int = 8,
        machine_model: str | None = None,
        document_id: str | None = None
    ) -> list[dict]:
        """Dense semantic search using SentenceTransformers embeddings in ChromaDB."""
        if self.collection.count() == 0:
            return []

        norm_model = normalize_machine_model(machine_model)

        query_embedding = self.store.embedder.encode(
            [query],
            normalize_embeddings=True
        )[0].tolist()

        filters = []
        if norm_model:
            filters.append({"machine_model": norm_model})
        if document_id:
            filters.append({"document_id": document_id})

        where = None
        if len(filters) == 1:
            where = filters[0]
        elif len(filters) > 1:
            where = {"$and": filters}

        oversample = min(top_k * 3, self.collection.count())

        try:
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=oversample,
                where=where,
                include=["documents", "metadatas", "distances"]
            )
        except Exception as e:
            logger.warning("Filtered query error: %s. Falling back to global.", e)
            results = None

        if not results or not results.get("documents") or not results["documents"][0]:
            if where:
                results = self.collection.query(
                    query_embeddings=[query_embedding],
                    n_results=oversample,
                    include=["documents", "metadatas", "distances"]
                )

        if not results or not results.get("documents") or not results["documents"][0]:
            return []

        hits = []
        documents = results["documents"][0]
        metadatas = results["metadatas"][0]
        distances = results["distances"][0]

        for text, meta, dist in zip(documents, metadatas, distances):
            cleaned = text.strip()
            if len(cleaned) < 20:
                continue

            similarity = max(0.0, min(1.0, 1.0 - float(dist)))
            model_key = meta.get("machine_model", "unknown")
            src_file = meta.get("source_file", "manual.pdf")
            p_num = meta.get("page_number", 0)

            hits.append({
                "text": cleaned,
                "similarity": round(similarity, 4),
                "document_id": meta.get("document_id"),
                "source_file": src_file,
                "page_number": p_num,
                "section": infer_section_name(src_file, p_num, cleaned),
                "machine_model": model_key,
                "machine_name": meta.get("machine_name") or MACHINE_DISPLAY_NAMES.get(model_key, model_key),
                "match_type": "semantic"
            })

        return hits

    # ========================================================
    # BM25 KEYWORD SEARCH (Sparse Lexical)
    # ========================================================

    def keyword_search(
        self,
        query: str,
        top_k: int = 8,
        machine_model: str | None = None,
        document_id: str | None = None
    ) -> list[dict]:
        """Sparse lexical BM25 search over chunks."""
        if not self.bm25 or not self.chunks:
            return []

        norm_model = normalize_machine_model(machine_model)
        tech_tokens = self.extract_technical_tokens(query)
        query_words = re.findall(r"\w+", query.lower())

        weighted_query = list(query_words)
        for tt in tech_tokens:
            weighted_query.extend([tt.lower()] * 4)

        if not weighted_query:
            return []

        scores = self.bm25.get_scores(weighted_query)

        candidate_indices = []
        for idx, chunk in enumerate(self.chunks):
            meta = chunk.get("metadata", {})
            if norm_model:
                chunk_model = meta.get("machine_model")
                if chunk_model and chunk_model != norm_model:
                    continue
            if document_id:
                chunk_doc = meta.get("document_id")
                if chunk_doc and chunk_doc != document_id:
                    continue
            
            score = float(scores[idx])
            if score > 0.05:
                candidate_indices.append((idx, score))

        if not candidate_indices and norm_model:
            for idx, chunk in enumerate(self.chunks):
                score = float(scores[idx])
                if score > 0.05:
                    candidate_indices.append((idx, score))

        if not candidate_indices:
            return []

        candidate_indices.sort(key=lambda x: x[1], reverse=True)
        top_indices = candidate_indices[:top_k * 3]
        max_score = top_indices[0][1] if top_indices else 1.0

        hits = []
        for idx, score in top_indices:
            chunk = self.chunks[idx]
            meta = chunk.get("metadata", {})
            cleaned = chunk.get("text", "").strip()
            if len(cleaned) < 20:
                continue

            norm_score = round(min(1.0, score / (max_score + 1e-6)), 4)
            model_key = meta.get("machine_model", "unknown")
            src_file = meta.get("source_file", "manual.pdf")
            p_num = meta.get("page_number", 0)

            hits.append({
                "text": cleaned,
                "similarity": norm_score,
                "bm25_score": round(score, 2),
                "document_id": meta.get("document_id"),
                "source_file": src_file,
                "page_number": p_num,
                "section": infer_section_name(src_file, p_num, cleaned),
                "machine_model": model_key,
                "machine_name": meta.get("machine_name") or MACHINE_DISPLAY_NAMES.get(model_key, model_key),
                "match_type": "keyword (BM25)"
            })

        return hits

    # ========================================================
    # CROSS-DOCUMENT AMBIGUITY DETECTION
    # ========================================================

    def detect_ambiguity(
        self,
        query: str,
        hits: list[dict],
        explicit_machine: str | None
    ) -> dict | None:
        """
        Check if an error code or query has conflicting or distinct meanings
        across multiple machine manuals, requiring technician disambiguation.
        Fulfills Requirement 4: 'Disambiguate correctly'.
        """
        # If user explicitly specified the machine, no clarification is needed
        if explicit_machine:
            return None

        # If natural language query explicitly mentions machine, no clarification needed
        detected_in_text = detect_machine_from_text(query)
        if detected_in_text:
            return None

        error_code = self.extract_error_code(query)
        # Check if the query asks about a specific code or status
        if not error_code and len(query.split()) > 5:
            return None

        # Inspect candidate machine models in top hits
        models_found: dict[str, list[dict]] = {}
        for h in hits:
            m = h.get("machine_model")
            if m and m != "unknown":
                models_found.setdefault(m, []).append(h)

        # Ambiguity only applies if the code or keyword is actually present in at least 2 distinct models
        if error_code:
            clean_code = error_code.replace("16#", "").lower()
            matching_models = {
                m for m, m_hits in models_found.items()
                if any(clean_code in h["text"].lower() for h in m_hits[:4])
            }
            if len(matching_models) < 2:
                return None
            # Filter models_found to only those actually matching the code
            models_found = {m: hits for m, hits in models_found.items() if m in matching_models}

        # If hits span 2 or more distinct machine families with verified presence
        if len(models_found) >= 2:
            candidates = []
            for model_id, model_hits in models_found.items():
                best_hit = model_hits[0]
                # Provide a 1-line snippet highlighting the diagnostic context
                first_line = best_hit["text"].split("\n")[0][:110]
                candidates.append({
                    "machine_model": model_id,
                    "machine_name": MACHINE_DISPLAY_NAMES.get(model_id, model_id),
                    "context_summary": f"Section: {best_hit['section']} (p. {best_hit['page_number']}): {first_line}",
                    "source_file": best_hit["source_file"],
                    "page_number": best_hit["page_number"]
                })

            return {
                "is_ambiguous": True,
                "error_code": error_code or query[:20],
                "clarifying_question": (
                    f"The code or symptom '{error_code or query}' appears in manuals for multiple machines "
                    "with completely different meanings and repair procedures. "
                    "Which machine are you currently troubleshooting?"
                ),
                "candidates": candidates
            }

        return None

    # ========================================================
    # CONFIDENCE & GROUNDING SCORER
    # ========================================================

    def calculate_confidence(
        self,
        hits: list[dict],
        error_code: str | None,
        query: str
    ) -> dict:
        """
        Calculate an algorithmic groundedness and retrieval confidence score.
        Fulfills Hallucination Control requirement.
        """
        if not hits:
            return {
                "level": "Insufficient",
                "score": 0.0,
                "explanation": "No relevant manual excerpts found in the knowledge base."
            }

        top_hit = hits[0]
        top_sim = top_hit.get("similarity", 0.0)

        # Check if query contains an exact code
        if error_code:
            clean_code = error_code.replace("16#", "").lower()
            exact_match_found = any(
                clean_code in h["text"].lower()
                for h in hits[:4]
            )
            if exact_match_found:
                score = round(min(0.98, max(0.65, top_sim * 1.15)), 2)
                level = "High" if score >= 0.70 else ("Medium" if score >= 0.50 else "Insufficient")
                return {
                    "level": level,
                    "score": score,
                    "explanation": f"Exact code '{error_code}' identified in official manufacturer documentation."
                }
            else:
                return {
                    "level": "Insufficient",
                    "score": round(min(top_sim, 0.35), 2),
                    "explanation": f"Code '{error_code}' was not found in the indexed technical manuals."
                }

        if top_sim >= 0.70:
            return {
                "level": "High",
                "score": round(top_sim, 2),
                "explanation": "Strong semantic and lexical alignment with manufacturer documentation."
            }
        elif top_sim >= 0.50:
            return {
                "level": "Medium",
                "score": round(top_sim, 2),
                "explanation": "Relevant diagnostic procedures identified in technical documentation."
            }
        else:
            return {
                "level": "Insufficient",
                "score": round(top_sim, 2),
                "explanation": "Insufficient technical data found in manual excerpts (confidence below 50%)."
            }

    # ========================================================
    # HYBRID FUSION SEARCH (RRF)
    # ========================================================

    def search(
        self,
        query: str,
        machine_model: str | None = None,
        document_id: str | None = None,
        top_k: int = 6
    ) -> dict:
        """
        Execute Hybrid Search with Reciprocal Rank Fusion:
        1. Auto-detect machine from query text if not specified
        2. Run dense semantic search & sparse BM25 keyword search
        3. Fuse rankings and boost exact code matches
        4. Detect cross-document ambiguity
        5. Calculate grounding confidence score
        """
        query_clean = query.strip()
        if not query_clean:
            return {
                "query": query,
                "error_code": None,
                "machine_model": machine_model,
                "results": [],
                "ambiguity": None,
                "confidence": {"level": "Insufficient", "score": 0.0, "explanation": "Empty query."}
            }

        # Auto-detect machine from natural language if user selected 'All' or None
        inferred_machine = detect_machine_from_text(query_clean)
        active_model = normalize_machine_model(machine_model) or inferred_machine
        error_code = self.extract_error_code(query_clean)
        tech_tokens = self.extract_technical_tokens(query_clean)

        # 1. Run Semantic & Keyword searches
        semantic_hits = self.semantic_search(
            query=query_clean,
            top_k=top_k,
            machine_model=active_model,
            document_id=document_id
        )

        bm25_hits = self.keyword_search(
            query=query_clean,
            top_k=top_k,
            machine_model=active_model,
            document_id=document_id
        )

        # 2. Reciprocal Rank Fusion (RRF)
        RRF_K = 60
        fused_scores: dict[tuple, float] = {}
        chunk_map: dict[tuple, dict] = {}
        match_sources: dict[tuple, set[str]] = {}

        for rank, hit in enumerate(semantic_hits, 1):
            key = (hit["source_file"], hit["page_number"], hit["text"][:80])
            score = 1.0 / (RRF_K + rank)
            fused_scores[key] = fused_scores.get(key, 0.0) + score * 1.2
            chunk_map[key] = hit
            match_sources.setdefault(key, set()).add("semantic")

        for rank, hit in enumerate(bm25_hits, 1):
            key = (hit["source_file"], hit["page_number"], hit["text"][:80])
            score = 1.0 / (RRF_K + rank)
            fused_scores[key] = fused_scores.get(key, 0.0) + score
            if key not in chunk_map:
                chunk_map[key] = hit
            match_sources.setdefault(key, set()).add("keyword")

        # 3. Exact token match boost
        if tech_tokens:
            for key, hit in chunk_map.items():
                text_lower = hit["text"].lower()
                matched = [t for t in tech_tokens if t.lower() in text_lower]
                if matched:
                    fused_scores[key] = fused_scores.get(key, 0.0) * 2.0
                    match_sources.setdefault(key, set()).add(f"exact ({matched[0]})")

        # 4. Sort and Deduplicate
        sorted_keys = sorted(fused_scores.keys(), key=lambda k: fused_scores[k], reverse=True)

        final_hits = []
        seen_texts: set[str] = set()

        for key in sorted_keys:
            hit = chunk_map[key]
            text_sample = " ".join(hit["text"].split()[:12])
            if text_sample in seen_texts:
                continue
            seen_texts.add(text_sample)

            sources = match_sources.get(key, {"hybrid"})
            if "semantic" in sources and "keyword" in sources:
                hit["match_type"] = "hybrid (semantic + BM25)"
            elif any("exact" in s for s in sources):
                exact_s = [s for s in sources if "exact" in s][0]
                hit["match_type"] = exact_s
            elif "keyword" in sources:
                hit["match_type"] = "keyword (BM25)"
            else:
                hit["match_type"] = "semantic"

            final_hits.append(hit)
            if len(final_hits) >= top_k:
                break

        # 5. Detect ambiguity across manuals
        ambiguity = self.detect_ambiguity(
            query=query_clean,
            hits=final_hits,
            explicit_machine=normalize_machine_model(machine_model) or inferred_machine
        )

        # 6. Compute Grounding / Confidence
        confidence = self.calculate_confidence(final_hits, error_code, query_clean)

        return {
            "query": query_clean,
            "error_code": error_code,
            "machine_model": active_model,
            "machine_detected": MACHINE_DISPLAY_NAMES.get(active_model, active_model) if active_model else None,
            "results": final_hits,
            "ambiguity": ambiguity,
            "confidence": confidence
        }