import React, { useState, useEffect } from "react";
import {
  BarChart3,
  RefreshCw,
  Search,
  RotateCcw,
  Sparkles,
  FileCheck2,
  FileX2,
  X,
  ChevronRight,
  Database,
  Calculator,
  Sliders
} from "lucide-react";
import {
  getComprehensiveAnalytics,
  type ComprehensiveAnalytics,
  type QueryAuditDetail
} from "../services/api";

interface GraphsSectionProps {
  onSelectQuery?: (queryText: string, machineModel?: string | null) => void;
}

export const GraphsSection: React.FC<GraphsSectionProps> = ({ onSelectQuery }) => {
  const [analytics, setAnalytics] = useState<ComprehensiveAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAuditQuery, setSelectedAuditQuery] = useState<QueryAuditDetail | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"all" | "quality" | "errors" | "statistics">("all");

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await getComprehensiveAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error("Error loading comprehensive analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const kpi = analytics?.summary_kpis;
  const pdfStats = analytics?.pdf_ocr_errors;
  const docQuality = analytics?.document_quality;
  const queryOutcomes = analytics?.query_outcomes;
  const rootCauses = analytics?.error_root_causes;
  const machineErrors = analytics?.machine_wise_errors;
  const wilsonCI = analytics?.confidence_intervals;

  const maxPdfBar = Math.max(...(pdfStats?.chart_data.map(d => d.count) || [1]), 1);
  const maxQueryOutcome = Math.max(...(queryOutcomes?.chart_data.map(d => d.count) || [1]), 1);
  const maxRootCause = Math.max(...(rootCauses?.chart_data.map(d => d.count) || [1]), 1);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-500" />
            Analytics & Error Analysis Cockpit
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Empirical RAG telemetry computed directly from real PDF manuals, OCR pages, query outcomes, and 95% Wilson Confidence Intervals.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {/* Sub Tab Filter */}
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSubTab === "all" ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveSubTab("quality")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSubTab === "quality" ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              PDF & Quality
            </button>
            <button
              onClick={() => setActiveSubTab("errors")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSubTab === "errors" ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Error Causes
            </button>
            <button
              onClick={() => setActiveSubTab("statistics")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSubTab === "statistics" ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              95% Wilson CI
            </button>
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-300 cursor-pointer shadow-xs"
            title="Refresh All Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Documents</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1.5">{kpi?.total_documents ?? "..."}</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">{pdfStats?.total_pages_scanned ?? 0} total pages</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">OCR Success</span>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1.5">{kpi?.ocr_success_rate_pct ?? "..."}%</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Text Legibility</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Doc Quality</span>
          <p className="text-xl font-bold font-mono text-blue-700 mt-1.5">{kpi?.avg_document_quality ?? "..."}%</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Avg Quality Score</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Queries</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1.5">{kpi?.total_queries ?? "..."}</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Diagnostic Sessions</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Answer Success</span>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1.5">{kpi?.answer_success_rate_pct ?? "..."}%</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Verified Citations</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Error Rate</span>
          <p className="text-xl font-bold font-mono text-amber-700 mt-1.5">{kpi?.overall_error_rate_pct ?? "..."}%</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Suboptimal / Failed</span>
        </div>
      </div>

      {/* SECTION 1: PDF & OCR ERRORS + DOCUMENT QUALITY RANKING */}
      {(activeSubTab === "all" || activeSubTab === "quality") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: PDF & OCR Errors (Bar Chart) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-600" />
                  1. PDF & OCR Errors (Document Health)
                </h3>
                <p className="text-xs text-slate-500">
                  Real evaluation of all {pdfStats?.total_documents ?? 0} PDF manuals across {pdfStats?.total_pages_scanned ?? 0} scanned pages
                </p>
              </div>
            </div>

            <div className="space-y-3.5 my-2">
              {pdfStats?.chart_data.map((item, idx) => {
                const pct = ((item.count / maxPdfBar) * 100).toFixed(0);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-800 font-bold">{item.category}</span>
                      <span className="font-mono font-bold text-slate-900">
                        {item.count} <span className="text-slate-400 font-normal">doc(s)</span>
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Document Breakdown List */}
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Scanned Document Breakdown</span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {pdfStats?.document_breakdown.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="font-medium text-slate-800 truncate max-w-[240px]" title={doc.filename}>
                      📄 {doc.filename}
                    </span>
                    <span className="font-mono text-[11px] text-slate-600">
                      {doc.total_pages} pages ({doc.status})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 2: Document Quality Score & Ranking */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    2. Document Quality Score & Ranking
                  </h3>
                  <p className="text-xs text-slate-500">
                    Calculated from text completeness, character cleanliness, chunk balance & extraction health
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Avg Score</span>
                  <span className="text-lg font-bold font-mono text-slate-900">{docQuality?.average_quality_score ?? 0}%</span>
                </div>
              </div>

              {/* Quality Ranking List */}
              <div className="space-y-3">
                {docQuality?.ranked_documents.map((doc, idx) => {
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate max-w-[260px]">
                          <span className="font-mono text-slate-400 font-bold">#{idx + 1}</span>
                          <span className="font-bold text-slate-900 truncate" title={doc.filename}>{doc.filename}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            doc.quality_score >= 90 ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                            doc.quality_score >= 75 ? "bg-amber-100 text-amber-800 border border-amber-200" :
                            "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}>
                            {doc.tier}
                          </span>
                          <span className="font-mono font-bold text-slate-900">{doc.quality_score}%</span>
                        </div>
                      </div>

                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            doc.quality_score >= 90 ? "bg-emerald-500" :
                            doc.quality_score >= 75 ? "bg-amber-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${doc.quality_score}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>Coverage: {doc.completeness_pct}%</span>
                        <span>Clean Text: {doc.cleanliness_pct}%</span>
                        <span>{doc.chunk_count} Chunks</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: QUERY OUTPUT ANALYSIS + ERROR ROOT CAUSES */}
      {(activeSubTab === "all" || activeSubTab === "errors") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 3: Query Output Analysis (Bar Chart) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-blue-600" />
                  3. Query Output Analysis (Success vs Failure)
                </h3>
                <p className="text-xs text-slate-500">
                  Classification of {queryOutcomes?.total_queries ?? 0} logged query outputs
                </p>
              </div>
            </div>

            <div className="space-y-3.5 my-2">
              {queryOutcomes?.chart_data.map((item, idx) => {
                const pct = ((item.count / maxQueryOutcome) * 100).toFixed(0);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-800 font-bold">{item.outcome}</span>
                      <span className="font-mono font-bold text-slate-900">{item.count}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Grounding Precision:</span>
              <span className="font-mono font-bold text-emerald-700">{queryOutcomes?.success_rate_pct ?? 0}%</span>
            </div>
          </div>

          {/* Chart 4: Error Root Causes (Bar Chart) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileX2 className="w-5 h-5 text-red-500" />
                  4. Error Root Cause Breakdown
                </h3>
                <p className="text-xs text-slate-500">
                  Systematic attribution of suboptimal or failed queries
                </p>
              </div>
            </div>

            <div className="space-y-3.5 my-2">
              {rootCauses?.chart_data.map((item, idx) => {
                const pct = ((item.count / maxRootCause) * 100).toFixed(0);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-800 font-bold">{item.cause}</span>
                      <span className="font-mono font-bold text-slate-900">{item.count}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: MACHINE-WISE ERRORS (STACKED BAR CHART) */}
      {(activeSubTab === "all" || activeSubTab === "errors") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-500" />
                5. Machine-wise Error Distribution (Stacked Breakdown)
              </h3>
              <p className="text-xs text-slate-500">
                Performance, query volume, and failure rates partitioned by industrial machine family
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {machineErrors?.machine_statistics.map((m, idx) => {
              const succPct = m.total > 0 ? ((m.successful / m.total) * 100).toFixed(0) : "100";
              const failPct = m.total > 0 ? ((m.failed / m.total) * 100).toFixed(0) : "0";

              return (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-900 text-sm">{m.machine}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      m.error_rate_pct === 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {m.error_rate_pct}% Error
                    </span>
                  </div>

                  {/* Stacked Bar */}
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex border border-slate-300">
                    <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${succPct}%` }} title={`Successful: ${succPct}%`} />
                    <div className="h-full bg-amber-500 transition-all duration-700" style={{ width: `${failPct}%` }} title={`Failed: ${failPct}%`} />
                  </div>

                  <div className="flex justify-between text-xs font-mono pt-1 text-slate-600">
                    <span className="text-emerald-700 font-bold">✓ {m.successful} Pass</span>
                    <span className="text-amber-700 font-bold">✗ {m.failed} Fail</span>
                    <span className="text-slate-400 font-normal">Total: {m.total}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 4: 95% WILSON CONFIDENCE INTERVALS */}
      {(activeSubTab === "all" || activeSubTab === "statistics") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600" />
                6. 95% Wilson Confidence Intervals
              </h3>
              <p className="text-xs text-slate-500">
                Rigorous binomial confidence bounds (z=1.96) for measurable binary operational rates
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
              Method: Wilson Score (z=1.96)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-3">Metric Name</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Point Rate</th>
                  <th className="py-3 px-3">95% Confidence Interval</th>
                  <th className="py-3 px-3">Sample Size (n)</th>
                  <th className="py-3 px-3">Statistical Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wilsonCI?.metrics.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">{m.metric_name}</td>
                    <td className="py-3 px-3 text-slate-600">{m.description}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{m.rate_pct}%</td>
                    <td className="py-3 px-3 font-mono text-indigo-700 font-bold whitespace-nowrap">
                      {m.is_valid ? `[${m.ci_lower_pct}% – ${m.ci_upper_pct}%]` : "N/A"}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">{m.sample_size}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.is_valid
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {m.is_valid ? "Statistically Valid" : "N/A (n < 5)"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HISTORICAL QUERY AUDIT LOG TABLE & ERROR INSPECTOR TRIGGER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-amber-500" />
              Query Classification & Error Inspector Log
            </h3>
            <p className="text-xs text-slate-500">
              Click any query row to inspect the full trace: Query → Retrieved Chunks → Generated Answer → Root Cause
            </p>
          </div>
        </div>

        {(!queryOutcomes?.classified_queries || queryOutcomes.classified_queries.length === 0) ? (
          <div className="text-center py-10 text-slate-400">
            <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No historical queries recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-3">Question</th>
                  <th className="py-3 px-3">Machine</th>
                  <th className="py-3 px-3">Code</th>
                  <th className="py-3 px-3">Outcome</th>
                  <th className="py-3 px-3">Confidence</th>
                  <th className="py-3 px-3 text-right">Error Inspector</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queryOutcomes.classified_queries.map((q) => {
                  const isSuccess = q.outcome === "Successful";
                  const isPart = q.outcome === "Partially Correct";

                  return (
                    <tr
                      key={q.query_id}
                      onClick={async () => {
                        try {
                          const detail = await (await fetch(`http://127.0.0.1:8000/api/analytics/query/${encodeURIComponent(q.query_id)}`)).json();
                          setSelectedAuditQuery(detail);
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="hover:bg-amber-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3 font-bold text-slate-900 max-w-xs truncate" title={q.question}>
                        {q.question}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{q.detected_machine || "General"}</td>
                      <td className="py-3 px-3 font-mono font-bold text-amber-700 whitespace-nowrap">{q.error_code || "—"}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSuccess ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                          isPart ? "bg-amber-100 text-amber-800 border border-amber-200" :
                          "bg-red-100 text-red-800 border border-red-200"
                        }`}>
                          {q.outcome}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {Math.round(q.confidence_score * 100)}%
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 group-hover:underline">
                          Inspect Trace <ChevronRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ERROR INSPECTOR DRAWER */}
      {selectedAuditQuery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">Query Error & Execution Trace Inspector</h3>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    selectedAuditQuery.error_analysis?.outcome === "Successful"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}>
                    {selectedAuditQuery.error_analysis?.outcome || "Classified"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedAuditQuery.query_id}</p>
              </div>
              <button
                onClick={() => setSelectedAuditQuery(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Step 1: Query Input */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">1. User Query Input</span>
                <p className="font-bold text-slate-900 text-sm">{selectedAuditQuery.question}</p>
                <div className="flex gap-3 text-[11px] font-mono text-slate-500 pt-1">
                  <span>Detected Machine: <strong className="text-slate-800">{selectedAuditQuery.detected_machine}</strong></span>
                  <span>Fault Code: <strong className="text-amber-800">{selectedAuditQuery.error_code || "N/A"}</strong></span>
                </div>
              </div>

              {/* Step 2: Retrieved Chunks */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  2. Retrieved Chunks ({selectedAuditQuery.retrieved_chunks?.length || 0} passages)
                </span>
                {(!selectedAuditQuery.retrieved_chunks || selectedAuditQuery.retrieved_chunks.length === 0) ? (
                  <p className="text-slate-400 italic">No document chunks retrieved for this query.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedAuditQuery.retrieved_chunks.map((chunk, cIdx) => (
                      <div key={cIdx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                        <div className="flex justify-between items-center text-slate-600 font-mono">
                          <span className="font-bold text-slate-800 truncate max-w-[320px]">
                            📄 {chunk.source_file} (Page {chunk.page_number})
                          </span>
                          <span className="font-bold text-amber-700">Similarity: {chunk.relevance_score}</span>
                        </div>
                        <p className="text-slate-700 italic line-clamp-2">"{chunk.snippet}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 3: Generated Answer */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">3. Generated Diagnostic Output</span>
                <p className="font-bold text-slate-900">{selectedAuditQuery.meaning}</p>

                {selectedAuditQuery.possible_causes?.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-700">Possible Causes:</span>
                    <ul className="list-disc pl-4 space-y-0.5 mt-0.5 text-slate-600">
                      {selectedAuditQuery.possible_causes.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedAuditQuery.recommended_actions?.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-700">Recommended Remediation:</span>
                    <ul className="list-disc pl-4 space-y-0.5 mt-0.5 text-slate-600">
                      {selectedAuditQuery.recommended_actions.map((a, idx) => (
                        <li key={idx}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Step 4: Root Cause Attribution */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">4. Error Attribution & Grounding Analysis</span>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-700">Root Cause:</span>
                  <span className="font-mono font-bold text-amber-900">{selectedAuditQuery.error_analysis?.root_cause || "None"}</span>
                </div>
                <p className="text-xs text-slate-700">{selectedAuditQuery.error_analysis?.explanation}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              {onSelectQuery && (
                <button
                  onClick={() => {
                    onSelectQuery(selectedAuditQuery.question, selectedAuditQuery.machine_model_filter);
                    setSelectedAuditQuery(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-900 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Re-run in Diagnostic Query
                </button>
              )}
              <button
                onClick={() => setSelectedAuditQuery(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors cursor-pointer ml-auto"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
