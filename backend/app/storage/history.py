"""
Query History & Telemetry Storage Module.
Persists user queries, retrieved chunks, and AI diagnostic outputs to disk and calculates
aggregated analytics (severity distributions, failure rates, confidence scores, error traces).
"""

import json
import logging
import time
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
HISTORY_FILE = DATA_DIR / "query_history.json"


class QueryHistoryLogger:
    def __init__(self, storage_path: Path = HISTORY_FILE):
        self.storage_path = storage_path
        self._ensure_storage()

    def _ensure_storage(self):
        """Ensure data directory and history file exist."""
        try:
            self.storage_path.parent.mkdir(parents=True, exist_ok=True)
            if not self.storage_path.exists():
                with open(self.storage_path, "w", encoding="utf-8") as f:
                    json.dump([], f)
        except Exception as e:
            logger.error(f"Failed to initialize query history storage: {e}")

    def log_query(
        self,
        question: str,
        machine_model: str | None,
        diagnostic_response: dict,
        latency_ms: float,
        retrieved_chunks: list[dict] | None = None
    ) -> dict:
        """
        Record a query transaction (input, output, confidence, severity, citations, retrieved chunks, latency).
        """
        citations = diagnostic_response.get("citations", [])
        conf_score = diagnostic_response.get("confidence", {}).get("score", 0.0)
        status = diagnostic_response.get("status", "success")
        meaning = diagnostic_response.get("meaning", "")
        code = diagnostic_response.get("error_code")

        # Determine Error Classification & Root Cause for Error Inspector
        if "insufficient" in meaning.lower() or "not contain" in meaning.lower() or "unable" in meaning.lower():
            outcome = "Unable to Answer"
            root_cause = "Unknown / Out of Scope"
            explanation = "Query code or symptom is outside active manufacturer documentation."
        elif conf_score >= 0.70 and len(citations) >= 1:
            outcome = "Successful"
            root_cause = "None"
            explanation = "High-confidence hybrid retrieval with verified document page citations."
        elif (0.45 <= conf_score < 0.70) or "ambiguous" in status:
            outcome = "Partially Correct"
            root_cause = "Retrieval Ambiguity"
            explanation = "Multiple machine contexts detected or partial match requiring clarification."
        elif len(citations) == 0 and conf_score > 0.60:
            outcome = "Hallucinated/Unsupported"
            root_cause = "Answer Generation"
            explanation = "Generated assertion lacks grounded citation backing."
        else:
            outcome = "Incorrect / Low Grounding"
            root_cause = "Retrieval"
            explanation = "Dense vector and BM25 similarity scores fell below threshold."

        # Format retrieved chunks for audit
        formatted_chunks = []
        if retrieved_chunks:
            for c in retrieved_chunks[:6]:
                formatted_chunks.append({
                    "chunk_id": str(c.get("chunk_id", "")),
                    "source_file": c.get("source_file") or c.get("document_id") or "Manual",
                    "page_number": c.get("page_number", 0),
                    "relevance_score": round(float(c.get("similarity", 0.0)), 3),
                    "snippet": (c.get("text") or "")[:280] + "...",
                    "match_type": c.get("match_type", "hybrid")
                })
        elif citations:
            for cit in citations:
                formatted_chunks.append({
                    "chunk_id": cit.get("filename", ""),
                    "source_file": cit.get("filename") or cit.get("manual_name", ""),
                    "page_number": cit.get("page_number", 0),
                    "relevance_score": round(float(cit.get("relevance_score", 0.8)), 3),
                    "snippet": cit.get("snippet", ""),
                    "match_type": cit.get("match_type", "citation")
                })

        record = {
            "query_id": f"diag_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{int(time.time() * 1000) % 10000:04d}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "question": question,
            "machine_model_filter": machine_model,
            "detected_machine": diagnostic_response.get("machine_detected") or "Industrial Equipment",
            "error_code": code,
            "severity": diagnostic_response.get("severity") or "Diagnostic Guide",
            "confidence_score": conf_score,
            "confidence_level": diagnostic_response.get("confidence", {}).get("level", "Medium"),
            "meaning": meaning,
            "possible_causes": diagnostic_response.get("possible_causes", []),
            "recommended_actions": diagnostic_response.get("recommended_actions", []),
            "causes_count": len(diagnostic_response.get("possible_causes", [])),
            "actions_count": len(diagnostic_response.get("recommended_actions", [])),
            "citations_count": len(citations),
            "citations": citations,
            "retrieved_chunks": formatted_chunks,
            "error_analysis": {
                "outcome": outcome,
                "root_cause": root_cause,
                "explanation": explanation,
                "is_grounded": len(citations) > 0,
            },
            "response_time_ms": round(latency_ms, 1)
        }

        try:
            records = self.get_all_records()
            records.insert(0, record)  # Most recent first
            records = records[:500]

            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to write query history: {e}")

        return record

    def get_all_records(self) -> list[dict]:
        """Fetch all stored query records."""
        if not self.storage_path.exists():
            return []
        try:
            with open(self.storage_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read query history: {e}")
            return []

    def get_query_by_id(self, query_id: str) -> dict | None:
        """Retrieve single query trace for Error Inspector."""
        records = self.get_all_records()
        for r in records:
            if r.get("query_id") == query_id:
                return r
        return None

    def clear_history(self) -> bool:
        """Clear all stored query logs."""
        try:
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump([], f)
            return True
        except Exception as e:
            logger.error(f"Failed to clear query history: {e}")
            return False

    def get_analytics_metrics(self) -> dict:
        """
        Aggregate stored query logs into chart-ready metrics.
        """
        records = self.get_all_records()

        if not records:
            return {
                "total_queries": 0,
                "avg_response_time_ms": 0,
                "severity_distribution": [
                    {"severity": "Critical Fault", "count": 0, "color": "#ef4444"},
                    {"severity": "Warning / Alarm", "count": 0, "color": "#f59e0b"},
                    {"severity": "Diagnostic Guide", "count": 0, "color": "#10b981"},
                    {"severity": "Insufficient Data", "count": 0, "color": "#64748b"}
                ],
                "machine_frequency": [
                    {"machine": "SINAMICS G120", "count": 0},
                    {"machine": "SIMATIC S7-1200", "count": 0},
                    {"machine": "SIMATIC S7-1500", "count": 0}
                ],
                "confidence_breakdown": {"high": 0, "medium": 0, "insufficient": 0},
                "top_error_codes": []
            }

        total_queries = len(records)
        avg_latency = round(sum(r.get("response_time_ms", 0) for r in records) / total_queries, 1)

        severity_counts = {}
        machine_counts = {}
        confidence_counts = {"high": 0, "medium": 0, "insufficient": 0}
        error_code_counts = {}

        for r in records:
            sev = (r.get("severity") or "Diagnostic Guide").lower()
            if "fault" in sev or "critical" in sev:
                clean_sev = "Critical Fault"
            elif "alarm" in sev or "warn" in sev:
                clean_sev = "Warning / Alarm"
            elif "insufficient" in sev:
                clean_sev = "Insufficient Data"
            else:
                clean_sev = "Diagnostic Guide"
            severity_counts[clean_sev] = severity_counts.get(clean_sev, 0) + 1

            mach = r.get("detected_machine") or "General Equipment"
            if "G120" in mach or "sinamics" in mach.lower():
                clean_mach = "SINAMICS G120"
            elif "S7-1200" in mach or "1200" in mach:
                clean_mach = "SIMATIC S7-1200"
            elif "S7-1500" in mach or "1500" in mach:
                clean_mach = "SIMATIC S7-1500"
            else:
                clean_mach = mach
            machine_counts[clean_mach] = machine_counts.get(clean_mach, 0) + 1

            conf = (r.get("confidence_level") or "Medium").lower()
            if conf == "high":
                confidence_counts["high"] += 1
            elif conf == "medium":
                confidence_counts["medium"] += 1
            else:
                confidence_counts["insufficient"] += 1

            code = r.get("error_code")
            if code:
                error_code_counts[code] = error_code_counts.get(code, 0) + 1

        color_map = {
            "Critical Fault": "#ef4444",
            "Warning / Alarm": "#f59e0b",
            "Diagnostic Guide": "#10b981",
            "Insufficient Data": "#64748b"
        }
        severity_list = [
            {"severity": k, "count": v, "color": color_map.get(k, "#3b82f6")}
            for k, v in severity_counts.items()
        ]

        machine_list = [{"machine": k, "count": v} for k, v in machine_counts.items()]
        sorted_codes = sorted(error_code_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        top_codes_list = [{"code": k, "count": v} for k, v in sorted_codes]

        return {
            "total_queries": total_queries,
            "avg_response_time_ms": avg_latency,
            "severity_distribution": severity_list,
            "machine_frequency": machine_list,
            "confidence_breakdown": confidence_counts,
            "top_error_codes": top_codes_list
        }


# Singleton instance
query_history_logger = QueryHistoryLogger()
