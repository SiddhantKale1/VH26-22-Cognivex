"""
Comprehensive Analytics & Error Analysis Engine for Cognivex RAG.
Computes real data metrics for PDF/OCR health, document quality ranking,
query outcomes, root cause failure distribution, and machine-wise error breakdown.
"""

import json
import logging
import math
import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pymupdf

logger = logging.getLogger("cognivex.analytics")

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
CHUNKS_FILE = PROCESSED_DIR / "chunks.json"
HISTORY_FILE = DATA_DIR / "query_history.json"


class AnalyticsEngine:
    """Core analytical computation engine based on actual project files."""

    def __init__(self):
        self.raw_dir = RAW_DIR
        self.chunks_file = CHUNKS_FILE
        self.history_file = HISTORY_FILE

    def _load_chunks(self) -> List[dict]:
        """Load parsed chunk records from chunks.json."""
        if not self.chunks_file.exists():
            return []
        try:
            with open(self.chunks_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read chunks.json: {e}")
            return []

    def _load_history(self) -> List[dict]:
        """Load stored query history transactions."""
        if not self.history_file.exists():
            return []
        try:
            with open(self.history_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read query_history.json: {e}")
            return []

    def get_pdf_ocr_errors(self) -> Dict[str, any]:
        """
        1. PDF & OCR Errors Analysis.
        Inspects all raw PDF documents to detect corrupted files, OCR failures,
        low-confidence extraction, and incomplete/garbled text.
        """
        pdf_files = list(self.raw_dir.glob("*.pdf")) if self.raw_dir.exists() else []
        
        successful_docs = 0
        ocr_failures = 0
        low_confidence_ocr = 0
        garbled_extractions = 0
        corrupted_pdfs = 0

        doc_details = []

        total_pages_scanned = 0
        failed_pages = 0

        for pdf_path in pdf_files:
            filename = pdf_path.name
            try:
                doc = pymupdf.open(pdf_path)
                page_count = len(doc)
                total_pages_scanned += page_count
                
                empty_pages = 0
                garbled_pages = 0
                low_conf_pages = 0

                for p_idx, page in enumerate(doc):
                    text = page.get_text().strip()
                    char_len = len(text)

                    if char_len == 0:
                        empty_pages += 1
                    elif char_len < 40:
                        low_conf_pages += 1
                    
                    # Detect garbled or non-printable character noise (e.g. \ufffd or weird binary encoding)
                    if char_len > 0:
                        printable_count = sum(1 for c in text if c.isprintable() and ord(c) < 128)
                        printable_ratio = printable_count / char_len
                        if printable_ratio < 0.75:
                            garbled_pages += 1

                doc.close()

                # Categorize Document Health
                is_garbled = garbled_pages > max(1, int(page_count * 0.05))
                is_low_conf = low_conf_pages > max(2, int(page_count * 0.15))
                is_ocr_fail = empty_pages > max(2, int(page_count * 0.20))

                if is_ocr_fail:
                    ocr_failures += 1
                    status = "OCR Failure / High Blank Rate"
                elif is_low_conf:
                    low_confidence_ocr += 1
                    status = "Low-Confidence OCR"
                elif is_garbled:
                    garbled_extractions += 1
                    status = "Incomplete / Garbled Text"
                else:
                    successful_docs += 1
                    status = "Clean Extraction"

                failed_pages += (empty_pages + garbled_pages)

                doc_details.append({
                    "filename": filename,
                    "total_pages": page_count,
                    "empty_pages": empty_pages,
                    "low_conf_pages": low_conf_pages,
                    "garbled_pages": garbled_pages,
                    "status": status,
                })

            except Exception as e:
                logger.warning(f"Corrupted PDF detected: {filename} ({e})")
                corrupted_pdfs += 1
                doc_details.append({
                    "filename": filename,
                    "total_pages": 0,
                    "empty_pages": 0,
                    "low_conf_pages": 0,
                    "garbled_pages": 0,
                    "status": f"Corrupted PDF: {str(e)}",
                })

        total_docs = len(pdf_files)
        ocr_error_rate = (failed_pages / total_pages_scanned) if total_pages_scanned > 0 else 0.0

        return {
            "total_documents": total_docs,
            "total_pages_scanned": total_pages_scanned,
            "successful_documents": successful_docs,
            "ocr_failures": ocr_failures,
            "low_confidence_ocr": low_confidence_ocr,
            "incomplete_garbled_extraction": garbled_extractions,
            "corrupted_pdfs": corrupted_pdfs,
            "failed_pages_count": failed_pages,
            "ocr_error_rate_pct": round(ocr_error_rate * 100, 2),
            "chart_data": [
                {"category": "Successful Docs", "count": successful_docs, "color": "#10b981"},
                {"category": "OCR Failures", "count": ocr_failures, "color": "#ef4444"},
                {"category": "Low-Confidence OCR", "count": low_confidence_ocr, "color": "#f59e0b"},
                {"category": "Incomplete / Garbled", "count": garbled_extractions, "color": "#6366f1"},
                {"category": "Corrupted PDFs", "count": corrupted_pdfs, "color": "#94a3b8"}
            ],
            "document_breakdown": doc_details,
        }

    def get_document_quality_ranking(self) -> Dict[str, any]:
        """
        2. Document Quality Score & Ranking.
        Calculates composite quality scores (0–100%) for each document based on:
        - Text completeness (page coverage)
        - Clean character formatting
        - Chunk token size distribution balance
        - Extraction health
        """
        chunks = self._load_chunks()
        pdf_files = list(self.raw_dir.glob("*.pdf")) if self.raw_dir.exists() else []

        # Map chunks by document stem
        chunks_by_doc = {}
        for c in chunks:
            doc_id = c.get("document_id") or Path(c.get("source_file", "")).stem
            if doc_id:
                chunks_by_doc.setdefault(doc_id, []).append(c)

        document_scores = []

        for pdf_path in pdf_files:
            stem = pdf_path.stem
            filename = pdf_path.name
            doc_chunks = chunks_by_doc.get(stem, [])

            try:
                doc = pymupdf.open(pdf_path)
                total_pages = len(doc)
                
                text_pages = 0
                total_chars = 0
                clean_chars = 0

                for page in doc:
                    t = page.get_text().strip()
                    if len(t) >= 40:
                        text_pages += 1
                    total_chars += len(t)
                    clean_chars += sum(1 for ch in t if ch.isprintable() and ord(ch) < 128)

                doc.close()

                # 1. Text completeness (0.0 to 1.0)
                completeness = (text_pages / total_pages) if total_pages > 0 else 0.0
                
                # 2. Clean character ratio (0.0 to 1.0)
                clean_ratio = (clean_chars / total_chars) if total_chars > 0 else 0.85
                
                # 3. Chunk balance (0.0 to 1.0)
                chunk_count = len(doc_chunks)
                if chunk_count > 0:
                    avg_token_len = sum(len(c.get("text", "").split()) for c in doc_chunks) / chunk_count
                    # optimal average token length is around 150-400 words
                    chunk_balance = max(0.5, min(1.0, 1.0 - abs(avg_token_len - 250) / 500))
                else:
                    chunk_balance = 0.5

                # 4. Extraction Health
                extraction_health = 1.0 if chunk_count > 0 and total_pages > 0 else 0.0

                # Weighted Composite Quality Score (0 to 100)
                quality_score = (
                    0.35 * completeness +
                    0.30 * clean_ratio +
                    0.20 * chunk_balance +
                    0.15 * extraction_health
                ) * 100

                quality_score = round(min(100.0, max(0.0, quality_score)), 1)

                if quality_score >= 90:
                    tier = "Excellent"
                    tier_color = "emerald"
                elif quality_score >= 75:
                    tier = "Good"
                    tier_color = "amber"
                elif quality_score >= 50:
                    tier = "Moderate"
                    tier_color = "blue"
                else:
                    tier = "Needs Review"
                    tier_color = "red"

                document_scores.append({
                    "filename": filename,
                    "document_id": stem,
                    "quality_score": quality_score,
                    "total_pages": total_pages,
                    "text_pages": text_pages,
                    "chunk_count": chunk_count,
                    "completeness_pct": round(completeness * 100, 1),
                    "cleanliness_pct": round(clean_ratio * 100, 1),
                    "tier": tier,
                    "tier_color": tier_color
                })

            except Exception as e:
                logger.warning(f"Quality calculation error on {filename}: {e}")
                document_scores.append({
                    "filename": filename,
                    "document_id": stem,
                    "quality_score": 0.0,
                    "total_pages": 0,
                    "text_pages": 0,
                    "chunk_count": 0,
                    "completeness_pct": 0.0,
                    "cleanliness_pct": 0.0,
                    "tier": "Corrupted / Unreadable",
                    "tier_color": "red"
                })

        # Sort descending
        document_scores.sort(key=lambda x: x["quality_score"], reverse=True)
        top_quality = document_scores[:3]
        bottom_quality = document_scores[-3:] if len(document_scores) > 3 else []

        avg_quality = round(sum(d["quality_score"] for d in document_scores) / max(1, len(document_scores)), 1)

        return {
            "average_quality_score": avg_quality,
            "ranked_documents": document_scores,
            "top_quality": top_quality,
            "bottom_quality": bottom_quality
        }

    def get_query_outcome_analysis(self) -> Dict[str, any]:
        """
        3. Query Output Analysis.
        Classifies query results into:
        - Successful (grounded, high confidence, verified citations)
        - Partially correct (medium confidence, ambiguity resolution)
        - Incorrect (mismatched error code or machine model)
        - Hallucinated / Unsupported (unsupported claims without grounding)
        - Unable to answer (safe refusal)
        """
        history = self._load_history()
        total_queries = len(history)

        successful = 0
        partially_correct = 0
        incorrect = 0
        hallucinated = 0
        unable_to_answer = 0

        classified_queries = []

        for q in history:
            status = q.get("status", "").lower()
            conf_score = float(q.get("confidence_score", 0.0))
            conf_level = (q.get("confidence_level") or "").lower()
            citations_count = int(q.get("citations_count", 0))
            severity = (q.get("severity") or "").lower()
            meaning = q.get("meaning", "").lower()

            # Classification logic
            if "insufficient" in severity or "insufficient" in meaning or "not contain" in meaning or "unable" in meaning:
                outcome = "Unable to Answer"
                color = "#64748b"
                unable_to_answer += 1
            elif conf_score >= 0.70 and citations_count >= 1:
                outcome = "Successful"
                color = "#10b981"
                successful += 1
            elif (0.45 <= conf_score < 0.70) or "ambiguous" in status or q.get("clarifying_question"):
                outcome = "Partially Correct"
                color = "#f59e0b"
                partially_correct += 1
            elif citations_count == 0 and conf_score > 0.60:
                # Asserted answer with zero citations and high score -> hallucination indicator
                outcome = "Hallucinated/Unsupported"
                color = "#8b5cf6"
                hallucinated += 1
            else:
                outcome = "Incorrect / Low Grounding"
                color = "#ef4444"
                incorrect += 1

            classified_queries.append({
                "query_id": q.get("query_id"),
                "timestamp": q.get("timestamp"),
                "question": q.get("question"),
                "detected_machine": q.get("detected_machine"),
                "error_code": q.get("error_code"),
                "confidence_score": conf_score,
                "outcome": outcome,
                "citations_count": citations_count,
                "response_time_ms": q.get("response_time_ms", 0),
            })

        success_rate = round((successful / total_queries) * 100, 1) if total_queries > 0 else 0.0
        failure_rate = round(((incorrect + hallucinated + partially_correct) / total_queries) * 100, 1) if total_queries > 0 else 0.0

        return {
            "total_queries": total_queries,
            "successful_count": successful,
            "partially_correct_count": partially_correct,
            "incorrect_count": incorrect,
            "hallucinated_count": hallucinated,
            "unable_to_answer_count": unable_to_answer,
            "success_rate_pct": success_rate,
            "failure_rate_pct": failure_rate,
            "chart_data": [
                {"outcome": "Successful", "count": successful, "color": "#10b981"},
                {"outcome": "Partially Correct", "count": partially_correct, "color": "#f59e0b"},
                {"outcome": "Incorrect", "count": incorrect, "color": "#ef4444"},
                {"outcome": "Hallucinated/Unsupported", "count": hallucinated, "color": "#8b5cf6"},
                {"outcome": "Unable to Answer", "count": unable_to_answer, "color": "#64748b"}
            ],
            "classified_queries": classified_queries[:30]
        }

    def get_error_root_causes(self) -> Dict[str, any]:
        """
        4. Error Root Cause Analysis.
        Groups failures and suboptimal queries into:
        - OCR (scanned diagram, low-text page)
        - Retrieval (low BM25/cosine semantic match)
        - Chunking (table/context split across chunks)
        - Answer Generation (LLM synthesis/parsing anomaly)
        - Unknown / Out of Scope (unindexed error code)
        """
        history = self._load_history()
        
        ocr_count = 0
        retrieval_count = 0
        chunking_count = 0
        generation_count = 0
        unknown_count = 0

        for q in history:
            conf_score = float(q.get("confidence_score", 0.0))
            citations_count = int(q.get("citations_count", 0))
            meaning = (q.get("meaning") or "").lower()
            code = q.get("error_code")

            # Only analyze non-fully successful or refusal queries
            is_successful = (conf_score >= 0.70 and citations_count >= 1)
            if is_successful:
                continue

            if "e9999" in str(code).lower() or "not in manual" in meaning or "unscoped" in meaning:
                unknown_count += 1
            elif citations_count == 0 or conf_score < 0.40:
                retrieval_count += 1
            elif "diagram" in meaning or "schematic" in meaning or "figure" in meaning:
                ocr_count += 1
            elif citations_count > 0 and (len(q.get("possible_causes", [])) == 0 and len(q.get("recommended_actions", [])) == 0):
                chunking_count += 1
            else:
                generation_count += 1

        total_failures = ocr_count + retrieval_count + chunking_count + generation_count + unknown_count

        return {
            "total_failures_analyzed": total_failures,
            "root_causes": {
                "ocr": ocr_count,
                "retrieval": retrieval_count,
                "chunking": chunking_count,
                "answer_generation": generation_count,
                "unknown": unknown_count
            },
            "chart_data": [
                {"cause": "Retrieval Miss", "count": retrieval_count, "color": "#ef4444", "description": "Similarity score below retrieval threshold"},
                {"cause": "Answer Generation", "count": generation_count, "color": "#f59e0b", "description": "LLM synthesis or reasoning ambiguity"},
                {"cause": "Chunking Boundary", "count": chunking_count, "color": "#6366f1", "description": "Context split across chunk borders"},
                {"cause": "OCR Legibility", "count": ocr_count, "color": "#ec4899", "description": "Scanned schematic or low-contrast text"},
                {"cause": "Unknown / Out of Scope", "count": unknown_count, "color": "#64748b", "description": "Fault code outside active manual library"}
            ]
        }

    def get_machine_wise_errors(self) -> Dict[str, any]:
        """
        5. Machine-wise Errors Analysis.
        Groups error breakdown per industrial machine family.
        """
        history = self._load_history()
        
        machine_stats = {}
        # Pre-seed standard machine families
        for m in ["SINAMICS G120", "SIMATIC S7-1200", "SIMATIC S7-1500", "General Equipment"]:
            machine_stats[m] = {
                "machine": m,
                "total_queries": 0,
                "successful_queries": 0,
                "failed_queries": 0,
                "error_types": {"retrieval": 0, "generation": 0, "refusal": 0}
            }

        for q in history:
            raw_mach = q.get("detected_machine") or q.get("machine_model_filter") or "General Equipment"
            if "G120" in raw_mach or "sinamics" in raw_mach.lower():
                mach = "SINAMICS G120"
            elif "S7-1200" in raw_mach or "1200" in raw_mach:
                mach = "SIMATIC S7-1200"
            elif "S7-1500" in raw_mach or "1500" in raw_mach:
                mach = "SIMATIC S7-1500"
            else:
                mach = "General Equipment"

            entry = machine_stats.setdefault(mach, {
                "machine": mach,
                "total_queries": 0,
                "successful_queries": 0,
                "failed_queries": 0,
                "error_types": {"retrieval": 0, "generation": 0, "refusal": 0}
            })

            entry["total_queries"] += 1
            conf = float(q.get("confidence_score", 0.0))
            citations = int(q.get("citations_count", 0))

            if conf >= 0.70 and citations >= 1:
                entry["successful_queries"] += 1
            else:
                entry["failed_queries"] += 1
                if citations == 0:
                    entry["error_types"]["retrieval"] += 1
                elif "insufficient" in (q.get("severity") or "").lower():
                    entry["error_types"]["refusal"] += 1
                else:
                    entry["error_types"]["generation"] += 1

        chart_data = []
        for m, data in machine_stats.items():
            tot = data["total_queries"]
            succ = data["successful_queries"]
            fail = data["failed_queries"]
            err_rate = round((fail / tot) * 100, 1) if tot > 0 else 0.0

            chart_data.append({
                "machine": m,
                "total": tot,
                "successful": succ,
                "failed": fail,
                "error_rate_pct": err_rate,
                "error_types": data["error_types"]
            })

        return {
            "machine_statistics": chart_data
        }

    def get_comprehensive_analytics(self) -> Dict[str, any]:
        """Returns the unified multi-module analytics payload for the dashboard."""
        pdf_ocr = self.get_pdf_ocr_errors()
        doc_quality = self.get_document_quality_ranking()
        query_outcomes = self.get_query_outcome_analysis()
        root_causes = self.get_error_root_causes()
        machine_errors = self.get_machine_wise_errors()

        # Overall summary KPI cards
        tot_queries = query_outcomes.get("total_queries", 0)
        tot_docs = pdf_ocr.get("total_documents", 0)
        ocr_success_rate = round(100.0 - pdf_ocr.get("ocr_error_rate_pct", 0.0), 1) if tot_docs > 0 else 100.0
        avg_doc_quality = doc_quality.get("average_quality_score", 0.0)
        answer_success_rate = query_outcomes.get("success_rate_pct", 0.0)
        error_rate = query_outcomes.get("failure_rate_pct", 0.0)

        return {
            "summary_kpis": {
                "total_documents": tot_docs,
                "ocr_success_rate_pct": ocr_success_rate,
                "avg_document_quality": avg_doc_quality,
                "total_queries": tot_queries,
                "answer_success_rate_pct": answer_success_rate,
                "overall_error_rate_pct": error_rate
            },
            "pdf_ocr_errors": pdf_ocr,
            "document_quality": doc_quality,
            "query_outcomes": query_outcomes,
            "error_root_causes": root_causes,
            "machine_wise_errors": machine_errors
        }


# Global singleton instance
analytics_engine = AnalyticsEngine()

