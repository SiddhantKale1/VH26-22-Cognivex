import React, { useState, useEffect } from "react";
import {
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Layers,
  Database,
  Cpu,
  RefreshCw,
  CheckCircle2,
  TrendingUp
} from "lucide-react";
import { getStats, type SystemStats } from "../services/api";

export const GraphsSection: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await getStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const totalChunks = stats?.total_chunks || 6729;

  // Modern vibrant palette for light mode charts
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Chunks</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {stats ? stats.total_chunks.toLocaleString() : "..."}
          </p>
          <p className="text-xs text-slate-500 mt-1">Dense Vector Embeddings</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Manuals Indexed</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-200">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {stats ? stats.total_documents : "..."}
          </p>
          <p className="text-xs text-slate-500 mt-1">Multi-Document Coverage</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Vector Dimensions</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {stats?.vector_dimensions || 384}
          </p>
          <p className="text-xs text-slate-500 mt-1">ChromaDB Embedding Space</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">LLM Synthesis</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-200">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base font-bold text-slate-900 mt-2 truncate" title={stats?.llm_model}>
            {stats?.llm_model || "Groq LLaMA 3.3"}
          </p>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> System Operational
          </p>
        </div>
      </div>

      {/* Main Charts Row */}
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
            <button
              onClick={fetchStats}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200 shadow-xs"
              title="Refresh Graph"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
            </button>
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

      {/* RAG Retrieval & Hybrid Fusion Metrics */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          Hybrid Retrieval & Accuracy Architecture
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          How query processing, BM25 keyword boosting, and dense vector similarity ensure hallucination-free output.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-700">Dense Semantic Search</span>
              <span className="text-xs font-mono text-slate-500">Top-k: 10</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Cosine similarity over sentence transformer embeddings captures symptom descriptions and natural language.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-700">Sparse BM25 Index</span>
              <span className="text-xs font-mono text-slate-500">Exact Match</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Heavy 3.0x lexical boost for exact error codes (<code className="text-amber-800 font-bold">F07900</code>) and drive parameters (<code className="text-amber-800 font-bold">p2175</code>).
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-700">Hallucination Gatekeeper</span>
              <span className="text-xs font-mono text-slate-500">Score &gt; 0.65</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Deterministic threshold checks halt synthesis on unknown faults (<code className="text-amber-800 font-bold">E9999</code>) and output factory SOPs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
