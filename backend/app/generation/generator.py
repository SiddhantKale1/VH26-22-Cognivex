"""
Industrial RAG Generator with Multi-Turn Conversational Memory,
Multilingual Sentence Alignment, Cross-Manual Ambiguity Handling,
and Algorithmic Groundedness / Hallucination Control.
"""

import re
import logging
from .llm_client import GroqClient, LLMClient
from app.retrieval.search import (
    ManualSearch,
    normalize_machine_model,
    detect_machine_from_text,
    MACHINE_DISPLAY_NAMES,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_DIAGNOSTIC = """
You are an expert industrial automation diagnostic assistant for Siemens factory equipment (S7-1200 PLC, S7-1500 PLC, SINAMICS G120 Drives).
Analyze the provided technical manual excerpts to assist a factory floor technician.

MANDATORY RULES:
1. SAME LANGUAGE RESPONSE: You MUST detect the language of the User / Technician Question and return ALL fields in the JSON response (`meaning`, `severity`, `possible_causes`, `recommended_actions`) in the EXACT SAME LANGUAGE as the user's question (e.g. German query -> German response, Spanish query -> Spanish response, French query -> French response, English query -> English response, etc.).
2. ORIGINAL MANUAL CONTENT UNCHANGED: Rely strictly on the provided technical manual excerpts regardless of the language they are written in. Treat the manual excerpt facts as authoritative ground truth.
3. STRICT GROUNDING & NO HALLUCINATION: Base all explanations, causes, and action steps STRICTLY and ONLY on the provided manual excerpts. Do NOT invent, assume, extrapolate, or add outside technical information, unverified parameters, or non-manual repair procedures.
4. INSUFFICIENT DATA REFUSAL: If the provided manual excerpts do not contain sufficient information to answer the user's question, set "meaning" to state clearly in the user's question language that the manual does not contain sufficient information for this query, and leave "possible_causes" and "recommended_actions" as empty arrays.
5. OPERATOR SAFETY: If dealing with high voltage, rotating machinery, or safety functions, include safety precautions (e.g. lockout-tagout, checking motor isolation) in the user's question language.
6. OUTPUT JSON FORMAT: Return a valid JSON object matching this exact structure:
{
  "detected_language": "Name of user's query language (e.g. German, Spanish, French, English)",
  "meaning": "Short, clear explanation in the exact same language as the user's question",
  "severity": "Fault / Alarm / Informational status in the exact same language as the user's question",
  "possible_causes": [
    "Cause 1 with specific component or condition in user's question language",
    "Cause 2 with parameter reference if applicable in user's question language"
  ],
  "recommended_actions": [
    "Step 1: Immediate physical check or measurement in user's question language",
    "Step 2: Parameter verification or reset procedure in user's question language",
    "Step 3: Verification test in user's question language"
  ]
}
Return ONLY valid JSON. No markdown fences.
""".strip()


class RAGGenerator:
    """Combines Multilingual Hybrid Vector/BM25 retrieval with Groq LLM synthesis and hallucination guardrails."""

    def __init__(self, search_engine: ManualSearch | None = None, llm_client: LLMClient | None = None):
        self.search = search_engine or ManualSearch()
        self.llm = llm_client or GroqClient()

    def _extract_context_from_history(self, history: list[dict] | None) -> tuple[str | None, str | None]:
        """
        Extract active machine model and active error code from previous conversation turns.
        Fulfills Requirement: 'Support follow-up conversation without repeating context'.
        """
        if not history:
            return None, None

        prior_machine = None
        prior_code = None

        for msg in reversed(history):
            content = msg.get("content", "")
            if not prior_machine:
                prior_machine = detect_machine_from_text(content)
            if not prior_code:
                prior_code = self.search.extract_error_code(content)
            if prior_machine and prior_code:
                break

        return prior_machine, prior_code

    def _build_citations(self, chunks: list[dict]) -> list[dict]:
        """Format unique, detailed citations with manual, section, page, and snippet."""
        seen = set()
        citations = []
        for chunk in chunks:
            doc = chunk.get("source_file") or chunk.get("document_id") or "Manual"
            page = chunk.get("page_number", 0)
            key = (doc, page)
            if key not in seen:
                seen.add(key)
                text = chunk.get("text", "").strip()
                first_sentences = " ".join(text.split("\n")[:3])[:220]
                citations.append({
                    "manual_name": chunk.get("machine_name", "Siemens Manual"),
                    "filename": doc,
                    "section": chunk.get("section", "Diagnostics"),
                    "page_number": page,
                    "snippet": f"{first_sentences}...",
                    "relevance_score": chunk.get("similarity", 0.0),
                    "match_type": chunk.get("match_type", "hybrid")
                })
        return citations

    def _get_refusal_in_query_language(self, question: str) -> str:
        """Synthesize refusal message in the exact language of the user's question."""
        if not self.llm.is_configured():
            return "Insufficient data in manual."
        
        prompt = (
            f"The user asked: '{question}'. The manual does not contain sufficient data to answer this query. "
            "Return a JSON object with key 'meaning' containing a 1-sentence refusal statement in the EXACT SAME LANGUAGE as the user's question."
        )
        sys_inst = "Return ONLY a valid JSON object: {\"meaning\": \"<refusal message in user's question language>\"}"
        try:
            res = self.llm.generate_json(prompt=prompt, system_instruction=sys_inst)
            return res.get("meaning") or "Insufficient data in manual."
        except Exception:
            return "Insufficient data in manual."

    def generate_answer(
        self,
        question: str,
        machine_model: str | None = None,
        history: list[dict] | None = None,
        top_k: int = 6
    ) -> dict:
        """
        Answer a troubleshooting query with full multi-turn context,
        multilingual embedding alignment, ambiguity resolution, and hallucination guardrails.
        """
        logger.info("Processing query: '%s' (model: %s)", question, machine_model)
        clean_q = question.strip()

        # 1. Multi-turn context resolution
        prior_machine, prior_code = self._extract_context_from_history(history)
        effective_machine = normalize_machine_model(machine_model) or prior_machine

        # Check if follow-up is terse
        search_query = clean_q
        if len(clean_q.split()) <= 8 and (prior_code or prior_machine):
            search_query = f"{prior_code or ''} {clean_q}".strip()

        # 2. Retrieve relevant manual sections using multilingual hybrid search
        search_res = self.search.search(
            query=search_query,
            machine_model=effective_machine,
            top_k=top_k
        )

        detected_machine = search_res.get("machine_detected") or (
            MACHINE_DISPLAY_NAMES.get(effective_machine, effective_machine) if effective_machine else None
        )
        error_code = search_res.get("error_code") or prior_code

        # ============================================================
        # 3. HALLUCINATION CONTROL / GRACEFUL REFUSAL GATEWAY
        # ============================================================
        confidence = search_res.get("confidence", {})
        chunks = search_res.get("results", [])

        if confidence.get("level") == "Insufficient" or confidence.get("score", 0.0) < 0.50 or not chunks:
            logger.warning("Graceful refusal triggered for query: %s", clean_q)
            target_name = detected_machine or "Siemens Industrial Equipment"
            refusal_msg = self._get_refusal_in_query_language(clean_q)
            return {
                "status": "insufficient_data",
                "error_code": error_code,
                "machine_model": effective_machine,
                "machine_detected": target_name,
                "meaning": refusal_msg,
                "severity": "Insufficient Data",
                "possible_causes": [],
                "recommended_actions": [],
                "citations": [],
                "confidence": {
                    "level": "Insufficient",
                    "score": confidence.get("score", 0.0),
                    "explanation": confidence.get("explanation", "Insufficient data in manual (confidence below 50%).")
                }
            }

        # ============================================================
        # 4. AMBIGUITY RESOLUTION GATEWAY
        # ============================================================
        ambiguity = search_res.get("ambiguity")
        if ambiguity and ambiguity.get("is_ambiguous"):
            logger.info("Ambiguity detected across manuals for query: %s", clean_q)
            return {
                "status": "ambiguous",
                "error_code": ambiguity.get("error_code"),
                "machine_model": None,
                "machine_detected": "Multiple Systems Detected",
                "meaning": f"Ambiguous Identifier: '{ambiguity.get('error_code')}' appears in multiple machine manuals.",
                "severity": "Disambiguation Required",
                "clarifying_question": ambiguity.get("clarifying_question"),
                "clarification_options": ambiguity.get("candidates", []),
                "possible_causes": [
                    f"The code '{ambiguity.get('error_code')}' has distinct technical definitions depending on whether you are working on a PLC or a Frequency Inverter / Drive."
                ],
                "recommended_actions": [
                    "Please select your target machine above to receive the exact, manufacturer-certified repair procedure."
                ],
                "citations": [],
                "confidence": {
                    "level": "Ambiguous",
                    "score": 0.50,
                    "explanation": "Multiple machine manuals match this code. User clarification required."
                }
            }

        # ============================================================
        # 5. CONTEXT ASSEMBLY & MULTILINGUAL GENERATION
        # ============================================================
        citations = self._build_citations(chunks)

        context_blocks = []
        for idx, c in enumerate(chunks, 1):
            doc = c.get("source_file") or c.get("document_id")
            page = c.get("page_number")
            section = c.get("section", "Manual Section")
            context_blocks.append(
                f"--- EXCERPT {idx} [Document: {doc} | Section: {section} | Page: {page}] ---\n{c.get('text', '')}"
            )
        context_str = "\n\n".join(context_blocks)

        prompt = f"""
Manual Excerpts (Ground Truth Documentation):
=============================================
{context_str}

Machine Context: {detected_machine or 'Siemens Automation Equipment'}
User / Technician Question: {clean_q}
Active Error / Fault Code: {error_code or 'Not specified'}

CRITICAL MULTILINGUAL & GROUNDING INSTRUCTIONS:
1. Detect the language of the User / Technician Question: "{clean_q}".
2. You MUST generate ALL fields in the JSON response (`meaning`, `severity`, `possible_causes`, `recommended_actions`) in the EXACT SAME LANGUAGE as the user's question.
3. Base all explanations, causes, and action steps STRICTLY and ONLY on the provided manual excerpts above. Do NOT invent, assume, or add unverified information or outside fixes.

Analyze the excerpts and return the diagnostic JSON:
""".strip()

        parsed_json = self.llm.generate_json(
            prompt=prompt,
            system_instruction=SYSTEM_PROMPT_DIAGNOSTIC
        )

        meaning = parsed_json.get("meaning") or f"Diagnostic procedure for {error_code or 'reported issue'}."
        severity = parsed_json.get("severity") or "Fault / Operational Issue"
        causes = parsed_json.get("possible_causes", [])
        actions = parsed_json.get("recommended_actions", [])

        meaning_lower = meaning.lower()
        if any(phrase in meaning_lower for phrase in ["not defined", "not found in the provided", "is not found", "does not exist", "not a standard", "insufficient data"]):
            refusal_msg = self._get_refusal_in_query_language(clean_q)
            return {
                "status": "insufficient_data",
                "error_code": error_code,
                "machine_model": effective_machine,
                "machine_detected": detected_machine or "Siemens Industrial Equipment",
                "meaning": refusal_msg,
                "severity": "Insufficient Data",
                "possible_causes": [],
                "recommended_actions": [],
                "citations": [],
                "confidence": {
                    "level": "Insufficient",
                    "score": 0.0,
                    "explanation": "Insufficient data in manual."
                }
            }

        return {
            "status": "success",
            "detected_language": parsed_json.get("detected_language", "Auto-detected"),
            "error_code": error_code,
            "machine_model": effective_machine,
            "machine_detected": detected_machine or "Siemens Industrial Equipment",
            "meaning": meaning,
            "severity": severity,
            "possible_causes": causes,
            "recommended_actions": actions,
            "citations": citations,
            "confidence": confidence
        }

    def generate_error_analysis(self, machine_model: str, error_code: str, top_k: int = 6) -> dict:
        """Diagnose a specific error code using the unified diagnostic pipeline."""
        clean_code = error_code.strip()
        query = f"Error {clean_code} fault cause remedy"
        return self.generate_answer(
            question=query,
            machine_model=machine_model,
            top_k=top_k
        )
