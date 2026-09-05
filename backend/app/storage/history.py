"""
Query History & Telemetry Storage Module.
Persists user queries and AI diagnostic outputs to disk and calculates
aggregated analytics (severity distributions, failure rates, confidence scores).
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
        latency_ms: float
    ) -> dict:
        """
        Record a query transaction (input, output, confidence, severity, citations, latency).
        """
        record = {
            "query_id": f"diag_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{int(time.time() * 1000) % 10000:04d}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "question": question,
            "machine_model_filter": machine_model,
            "detected_machine": diagnostic_response.get("machine_detected") or "Industrial Equipment",
            "error_code": diagnostic_response.get("error_code"),
            "severity": diagnostic_response.get("severity") or "Diagnostic Guide",
            "confidence_score": diagnostic_response.get("confidence", {}).get("score", 0.0),
            "confidence_level": diagnostic_response.get("confidence", {}).get("level", "Medium"),
            "meaning": diagnostic_response.get("meaning", ""),
            "causes_count": len(diagnostic_response.get("possible_causes", [])),
            "actions_count": len(diagnostic_response.get("recommended_actions", [])),
            "citations_count": len(diagnostic_response.get("citations", [])),
            "response_time_ms": round(latency_ms, 1)
        }

        try:
            records = self.get_all_records()
            records.insert(0, record)  # Most recent first
            # Keep up to 500 recent queries
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
        Aggregate stored query logs into chart-ready metrics:
        1. Severity Breakdown (Pie Chart data)
        2. Machine Failure Frequency (Bar Graph data)
        3. Confidence Levels Distribution
        4. Top Error Codes
        """
        records = self.get_all_records()

        # Seed defaults if history is empty (e.g. initial demo metrics)
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
                "confidence_breakdown": {
                    "high": 0,
                    "medium": 0,
                    "insufficient": 0
                },
                "top_error_codes": []
            }

        total_queries = len(records)
        avg_latency = round(sum(r.get("response_time_ms", 0) for r in records) / total_queries, 1)

        severity_counts = {}
        machine_counts = {}
        confidence_counts = {"high": 0, "medium": 0, "insufficient": 0}
        error_code_counts = {}

        for r in records:
            # Severity
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

            # Machine
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

            # Confidence
            conf = (r.get("confidence_level") or "Medium").lower()
            if conf == "high":
                confidence_counts["high"] += 1
            elif conf == "medium":
                confidence_counts["medium"] += 1
            else:
                confidence_counts["insufficient"] += 1

            # Error code
            code = r.get("error_code")
            if code:
                error_code_counts[code] = error_code_counts.get(code, 0) + 1

        # Format Severity
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

        # Format Machine
        machine_list = [{"machine": k, "count": v} for k, v in machine_counts.items()]

        # Format Top Codes
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
