import React, { useState } from "react";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  ChevronRight,
  Loader2,
  Sparkles,
  HelpCircle,
  Send
} from "lucide-react";
import { askQuestion, type DiagnosticResponse } from "../services/api";

const MACHINE_OPTIONS = [
  { id: "", label: "Auto-Detect Machine" },
  { id: "sinamics-drive", label: "SINAMICS G120 Drive" },
  { id: "s7-1200", label: "SIMATIC S7-1200 PLC" },
  { id: "s7-1500", label: "SIMATIC S7-1500 PLC" },
];

const PRESET_QUERIES = [
  {
    label: "Fault F07900 (Motor Blocked)",
    query: "Fault F07900",
    model: "sinamics-drive",
  },
  {
    label: "Drive Humming & Overheating",
    query: "Why is the drive motor humming loudly and overheating at low speeds?",
    model: "sinamics-drive",
  },
  {
    label: "Error 8013 (Ambiguity Test)",
    query: "Error 8013",
    model: "",
  },
  {
    label: "Unknown Error E9999 (Refusal Test)",
    query: "Error E9999 hydraulic valve burst",
    model: "",
  },
];

export const QuerySection: React.FC = () => {
  const [query, setQuery] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openSnippet, setOpenSnippet] = useState<number | null>(null);

  const handleSearch = async (textToSearch?: string, machineOverride?: string) => {
    const q = (textToSearch !== undefined ? textToSearch : query).trim();
    if (!q) return;

    const m = machineOverride !== undefined ? machineOverride : selectedMachine;

    setLoading(true);
    setError(null);
    setOpenSnippet(null);

    try {
      const response = await askQuestion(q, m || null);
      setResult(response);
    } catch (err: any) {
      setError(err.message || "Failed to process query.");
    } finally {
      setLoading(false);
    }
  };

  const handlePresetClick = (preset: typeof PRESET_QUERIES[0]) => {
    setQuery(preset.query);
    setSelectedMachine(preset.model);
    handleSearch(preset.query, preset.model);
  };

  const getSeverityBadge = (severity: string) => {
    const s = (severity || "").toLowerCase();
    if (s.includes("fault") || s.includes("critical") || s.includes("danger")) {
      return (
        <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-50 border border-red-200 text-red-700 flex items-center gap-1 shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          {severity || "Critical Fault"}
        </span>
      );
    }
    if (s.includes("alarm") || s.includes("warn")) {
      return (
        <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-50 border border-amber-300 text-amber-800 flex items-center gap-1 shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          {severity || "Warning / Alarm"}
        </span>
      );
    }
    return (
      <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center gap-1 shadow-sm">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        {severity || "Diagnostic Guide"}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Search Input Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Ask Diagnostic Question or Search Error Code
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Enter an industrial error code (e.g. <code className="text-amber-800 font-mono bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">F07900</code>, <code className="text-amber-800 font-mono bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">8013</code>) or describe a machine symptom in natural language.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="space-y-4"
        >
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Fault F07900 or Why is the inverter motor humming loudly?"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200 transition-all text-sm shadow-inner"
              />
            </div>

            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-amber-500 focus:bg-white cursor-pointer font-medium"
            >
              {MACHINE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-white text-slate-900">
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#FFBB00] hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md shadow-amber-200 border border-amber-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Analyze
                </>
              )}
            </button>
          </div>

          {/* Quick Preset Queries */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs text-slate-500 font-semibold mr-1">Quick Presets:</span>
            {PRESET_QUERIES.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePresetClick(p)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 border border-slate-200 text-slate-700 transition-all cursor-pointer font-medium shadow-xs"
              >
                {p.label}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-900">Analysis Failed</p>
            <p className="text-xs mt-1 text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Diagnostic Result Card */}
      {result && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-6">
          {/* Header & Badges */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Diagnostic Synthesis</h3>
                {result.machine_detected && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 border border-amber-300 text-amber-900">
                    {result.machine_detected}
                  </span>
                )}
              </div>
              {result.error_code && (
                <p className="text-xs font-mono text-amber-700 mt-1 font-bold">
                  Target Code: {result.error_code}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {getSeverityBadge(result.severity)}
              {result.confidence && (
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-100 border border-slate-300 text-slate-700">
                  Confidence: {result.confidence.level} ({(result.confidence.score * 100).toFixed(0)}%)
                </span>
              )}
            </div>
          </div>

          {/* Meaning / Summary */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Fault Meaning & Assessment
            </h4>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm leading-relaxed shadow-xs">
              {result.meaning}
            </div>
          </div>

          {/* Ambiguity Clarification Options (e.g. Code 8013) */}
          {result.clarification_options && result.clarification_options.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-300 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>{result.clarifying_question || "Ambiguous Code: Please select your specific machine:"}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {result.clarification_options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearch(query, opt.machine_model)}
                    className="text-left p-3.5 rounded-xl bg-white hover:bg-amber-50/50 border border-amber-200 hover:border-amber-400 transition-all text-xs cursor-pointer shadow-xs"
                  >
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>{opt.machine_name}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <p className="text-slate-600 mt-1 line-clamp-2">{opt.context_summary}</p>
                    <span className="text-[10px] text-amber-800 mt-1.5 block font-bold">
                      Source: {opt.source_file} (p. {opt.page_number})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Possible Causes */}
          {result.possible_causes && result.possible_causes.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Possible Causes
              </h4>
              <ul className="space-y-2">
                {result.possible_causes.map((cause, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{cause}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Actions */}
          {result.recommended_actions && result.recommended_actions.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Recommended Action Checklist
              </h4>
              <div className="space-y-2">
                {result.recommended_actions.map((act, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 text-sm text-slate-800 bg-slate-50 p-3 rounded-xl border border-emerald-200 shadow-xs"
                  >
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs shrink-0 mt-0.5 border border-emerald-300">
                      {idx + 1}
                    </span>
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Citations & Verified Sources */}
          {result.citations && result.citations.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-600" />
                Verified Manual Citations ({result.citations.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.citations.map((c, i) => (
                  <div
                    key={i}
                    className="bg-slate-50 border border-slate-200 hover:border-amber-300 rounded-xl p-3.5 transition-all text-xs shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-900 line-clamp-1" title={c.manual_name}>
                        {c.manual_name}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 font-mono text-[10px] shrink-0 font-bold">
                        Page {c.page_number}
                      </span>
                    </div>
                    {c.section && (
                      <p className="text-slate-600 text-[11px] mt-1">Section: {c.section}</p>
                    )}

                    <button
                      onClick={() => setOpenSnippet(openSnippet === i ? null : i)}
                      className="mt-2 text-amber-700 hover:text-amber-900 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {openSnippet === i ? "Hide manual snippet" : "Show manual snippet"}
                      <ChevronRight
                        className={`w-3 h-3 transition-transform ${
                          openSnippet === i ? "rotate-90" : ""
                        }`}
                      />
                    </button>

                    {openSnippet === i && (
                      <div className="mt-2 p-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-mono text-[11px] leading-relaxed max-h-40 overflow-y-auto shadow-inner">
                        {c.snippet}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
