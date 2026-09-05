import React, { useState, useEffect } from "react";
import {
  BarChart3,
  PieChart as PieChartIcon,
  Layers,
  RefreshCw,
  History,
  Clock,
  Search,
  RotateCcw,
  Sparkles
} from "lucide-react";
import {
  getStats,
  getQueryMetrics,
  getQueryHistory,
  clearQueryHistory,
  type SystemStats,
  type QueryAnalyticsMetrics,
  type QueryRecord
} from "../services/api";

interface GraphsSectionProps {
  onSelectQuery?: (queryText: string, machineModel?: string | null) => void;
}

export const GraphsSection: React.FC<GraphsSectionProps> = ({ onSelectQuery }) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [metrics, setMetrics] = useState<QueryAnalyticsMetrics | null>(null);
  const [history, setHistory] = useState<QueryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"knowledge_base" | "query_analytics">("query_analytics");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, metricsData, historyData] = await Promise.all([
        getStats(),
        getQueryMetrics(),
        getQueryHistory(25),
      ]);
      setStats(statsData);
      setMetrics(metricsData);
      setHistory(historyData);
    } catch (err) {
      console.error("Error loading analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalChunks = stats?.total_chunks || 6729;

  const chartColors = [
    { bg: "bg-amber-500", text: "text-amber-700", hex: "#f59e0b" },
    { bg: "bg-blue-500", text: "text-blue-700", hex: "#3b82f6" },
    { bg: "bg-indigo-500", text: "text-indigo-700", hex: "#6366f1" },
    { bg: "bg-emerald-500", text: "text-emerald-700", hex: "#10b981" },
    { bg: "bg-purple-500", text: "text-purple-700", hex: "#a855f7" },
  ];

  const maxManualChunks = Math.max(
    ...(stats?.manual_distribution?.map((m) => m.chunks) || [1]),
    1
  );

  // Severity Distribution Data for Donut Chart
  const sev = metrics?.severity_distribution || {
    critical_faults: 0,
    warnings_alarms: 0,
    guides_procedures: 0,
    insufficient_data: 0,
  };
  const totalQueriesCount = metrics?.total_queries || 0;

  const severityData = [
    { label: "Critical Faults", count: sev.critical_faults, color: "#ef4444", bg: "bg-red-500", text: "text-red-700" },
    { label: "Warnings & Alarms", count: sev.warnings_alarms, color: "#f59e0b", bg: "bg-amber-500", text: "text-amber-700" },
    { label: "Procedures & Guides", count: sev.guides_procedures, color: "#10b981", bg: "bg-emerald-500", text: "text-emerald-700" },
    { label: "Safe Refusals", count: sev.insufficient_data, color: "#64748b", bg: "bg-slate-500", text: "text-slate-700" },
  ];

  // Helper to calculate Donut SVG stroke offsets
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure you want to clear historical query logs?")) {
      await clearQueryHistory();
      await fetchData();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header & Tab Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-500" />
            Analytics & System Intelligence Cockpit
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time telemetry, historical query breakdowns, fault distributions, and vector knowledge coverage.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab("query_analytics")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "query_analytics"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Query Analytics & Charts
            </button>
            <button
              onClick={() => setActiveTab("knowledge_base")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "knowledge_base"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Document & Vector Stats
            </button>
          </div>

          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-300 cursor-pointer shadow-xs"
            title="Refresh All Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Metric Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Historical Queries</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200">
              <History className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {metrics ? metrics.total_queries.toLocaleString() : "..."}
          </p>
          <p className="text-xs text-slate-500 mt-1">Logged Input/Output Transactions</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Latency</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {metrics ? `${Math.round(metrics.average_response_time_ms)} ms` : "..."}
          </p>
          <p className="text-xs text-emerald-600 font-bold mt-1">⚡ Fast Groq Inference</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Confidence</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {metrics ? `${Math.round(metrics.average_confidence_score * 100)}%` : "..."}
          </p>
          <p className="text-xs text-slate-500 mt-1">Strict Document Grounding</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Vector Chunks</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-200">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {stats ? stats.total_chunks.toLocaleString() : "..."}
          </p>
          <p className="text-xs text-slate-500 mt-1">384-Dim ChromaDB Index</p>
        </div>
      </div>

      {/* TAB 1: QUERY ANALYTICS & VISUALIZATIONS */}
      {activeTab === "query_analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Fault Severity Donut / Pie Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <PieChartIcon className="w-5 h-5 text-amber-500" />
                      Fault Severity Distribution (Pie Chart)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Breakdown of logged industrial issues by severity classification
                    </p>
                  </div>
                </div>

                {totalQueriesCount === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <PieChartIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No query transactions recorded yet. Ask a question in the Query tab!</p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-4">
                    {/* SVG Donut / Pie */}
                    <div className="relative w-40 h-40 shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
                        {severityData.map((slice, idx) => {
                          const ratio = slice.count / Math.max(1, totalQueriesCount);
                          const strokeDash = ratio * circumference;
                          const offset = accumulatedOffset;
                          accumulatedOffset += strokeDash;

                          if (slice.count === 0) return null;

                          return (
                            <circle
                              key={idx}
                              cx="50"
                              cy="50"
                              r={radius}
                              fill="transparent"
                              stroke={slice.color}
                              strokeWidth="14"
                              strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
                              strokeDashoffset={-offset}
                              className="transition-all duration-700"
                            />
                          );
                        })}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold font-mono text-slate-900">{totalQueriesCount}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Queries</span>
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className="space-y-2.5 w-full max-w-[220px]">
                      {severityData.map((slice, idx) => {
                        const pct = totalQueriesCount > 0 ? ((slice.count / totalQueriesCount) * 100).toFixed(0) : "0";
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${slice.bg} shrink-0`} />
                              <span className="font-semibold text-slate-700">{slice.label}</span>
                            </div>
                            <span className="font-mono font-bold text-slate-900">
                              {slice.count} <span className="text-slate-400 font-normal">({pct}%)</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chart 2: Machine Failure Frequency (Vertical Bar Graph) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    Machine Failure Frequency (Bar Graph)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Query load and diagnostic incidence across equipment models
                  </p>
                </div>
              </div>

              {totalQueriesCount === 0 || Object.keys(metrics?.machine_distribution || {}).length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No machine-specific query load recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-3.5 my-2">
                  {Object.entries(metrics?.machine_distribution || {}).map(([mach, count], idx) => {
                    const maxVal = Math.max(...Object.values(metrics?.machine_distribution || {}), 1);
                    const pct = ((count / maxVal) * 100).toFixed(0);
                    const color = chartColors[idx % chartColors.length];

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-900 font-bold">{mach}</span>
                          <span className="text-slate-500 font-mono font-bold">{count} queries</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className={`h-full ${color.bg} transition-all duration-700 rounded-full`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Historical Query Transactions Log Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-500" />
                  Historical Query Transactions & 1-Click Replay
                </h3>
                <p className="text-xs text-slate-500">
                  Persistent log of input questions, detected machinery, severity, and AI confidence scores
                </p>
              </div>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors cursor-pointer"
                >
                  Clear History
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No historical queries recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px]">
                    <tr>
                      <th className="py-3 px-3">Time</th>
                      <th className="py-3 px-3">Question / Input</th>
                      <th className="py-3 px-3">Detected Machine</th>
                      <th className="py-3 px-3">Code</th>
                      <th className="py-3 px-3">Severity</th>
                      <th className="py-3 px-3">Confidence</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((record) => {
                      const timeStr = new Date(record.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      });

                      const isCritical = record.severity.toLowerCase().includes("critical");
                      const isWarning = record.severity.toLowerCase().includes("warn") || record.severity.toLowerCase().includes("alarm");

                      return (
                        <tr key={record.query_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">{timeStr}</td>
                          <td className="py-3 px-3 font-bold text-slate-900 max-w-xs truncate" title={record.question}>
                            {record.question}
                          </td>
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                            {record.machine_detected || record.selected_machine || "General"}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-amber-700 whitespace-nowrap">
                            {record.error_code || "—"}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isCritical
                                  ? "bg-red-100 text-red-800 border border-red-200"
                                  : isWarning
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {record.severity}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold whitespace-nowrap text-slate-700">
                            {Math.round(record.confidence_score * 100)}% ({record.confidence_level})
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            {onSelectQuery && (
                              <button
                                onClick={() => onSelectQuery(record.question, record.selected_machine)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
                                title="Re-run query in Diagnostic Search"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-700" />
                                Re-run
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DOCUMENT & VECTOR KNOWLEDGE BASE STATS */}
      {activeTab === "knowledge_base" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graph 1: Chunks Distribution per Manual */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-amber-500" />
                    Indexed Chunks per Manual
                  </h3>
                  <p className="text-xs text-slate-500">
                    Breakdown of semantic text passages extracted from each manual
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {stats?.manual_distribution?.map((item, idx) => {
                  const pct = ((item.chunks / maxManualChunks) * 100).toFixed(0);
                  const totalPct = ((item.chunks / totalChunks) * 100).toFixed(1);
                  const color = chartColors[idx % chartColors.length];

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-900 font-bold truncate max-w-[260px]" title={item.manual}>
                          {item.manual}
                        </span>
                        <span className="text-slate-500 font-mono font-medium">
                          {item.chunks.toLocaleString()} chunks ({totalPct}%)
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                        <div
                          className={`h-full ${color.bg} transition-all duration-700 rounded-full`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Graph 2: Machine Coverage Distribution */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <PieChartIcon className="w-5 h-5 text-blue-500" />
                      Machine Coverage Breakdown
                    </h3>
                    <p className="text-xs text-slate-500">
                      Knowledge base distribution by industrial equipment family
                    </p>
                  </div>
                </div>

                {/* Visual Segmented Progress Bar */}
                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200 mb-6 shadow-inner">
                  {stats?.machine_distribution?.map((item, idx) => {
                    const pct = (item.chunks / totalChunks) * 100;
                    const color = chartColors[idx % chartColors.length];
                    return (
                      <div
                        key={idx}
                        className={`h-full ${color.bg} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                        title={`${item.machine}: ${pct.toFixed(1)}%`}
                      />
                    );
                  })}
                </div>

                {/* Legend & Details */}
                <div className="space-y-3">
                  {stats?.machine_distribution?.map((item, idx) => {
                    const pct = ((item.chunks / totalChunks) * 100).toFixed(1);
                    const color = chartColors[idx % chartColors.length];

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-3.5 h-3.5 rounded-full ${color.bg} shrink-0`} />
                          <div>
                            <p className="text-sm font-bold text-slate-900">{item.machine}</p>
                            <p className="text-[11px] text-slate-500">Industrial Automation</p>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <p className="text-sm font-bold text-slate-900">{pct}%</p>
                          <p className="text-xs text-slate-500 font-medium">{item.chunks.toLocaleString()} chunks</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
