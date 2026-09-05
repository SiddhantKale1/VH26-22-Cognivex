import React, { useState, useRef } from "react";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  ChevronRight,
  Loader2,
  Sparkles,
  HelpCircle,
  Send,
  Globe2,
  Languages,
  Mic,
  Radio
} from "lucide-react";
import { askQuestion, type DiagnosticResponse } from "../services/api";

const MACHINE_OPTIONS = [
  { id: "", label: "Auto-Detect Machine" },
  { id: "sinamics-drive", label: "SINAMICS G120 Drive" },
  { id: "s7-1200", label: "SIMATIC S7-1200 PLC" },
  { id: "s7-1500", label: "SIMATIC S7-1500 PLC" },
];

const LANGUAGE_OPTIONS = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिन्दी (Hindi)" },
  { id: "mr", label: "मराठी (Marathi)" },
  { id: "ja", label: "日本語 (Japanese)" },
  { id: "de", label: "Deutsch (German)" },
  { id: "es", label: "Español (Spanish)" },
  { id: "fr", label: "Français (French)" },
  { id: "zh", label: "中文 (Chinese)" },
  { id: "auto", label: "Auto-Detect" },
];

const SPEECH_LANG_MAP: Record<string, string> = {
  en: "en-US",
  hi: "hi-IN",
  mr: "mr-IN",
  ja: "ja-JP",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
  zh: "zh-CN",
  auto: "en-US",
};

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
    label: "Fault F07900 (हिन्दी)",
    query: "ड्राइव मोटर ब्लॉक होने पर फॉल्ट F07900 का क्या कारण है?",
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
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openSnippet, setOpenSnippet] = useState<number | null>(null);

  // Voice Input Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const toggleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Voice Speech Recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.debug("Speech stop:", e);
        }
      }
      setIsListening(false);
      setVoiceFeedback(null);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = SPEECH_LANG_MAP[selectedLanguage] || "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        setVoiceFeedback(`Listening (${LANGUAGE_OPTIONS.find(l => l.id === selectedLanguage)?.label.split(" ")[0]})... Speak now.`);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const recognizedText = finalTranscript || interimTranscript;
        if (recognizedText) {
          setQuery(recognizedText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        setVoiceFeedback(null);
        if (event.error === "not-allowed") {
          setError("Microphone access was denied. Please allow microphone permissions in your browser settings.");
        } else if (event.error === "no-speech") {
          setVoiceFeedback("No voice detected. Please try clicking the microphone and speaking again.");
          setTimeout(() => setVoiceFeedback(null), 3500);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setVoiceFeedback(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Speech recognition startup error:", err);
      setIsListening(false);
      setError("Failed to start microphone. Please check browser permissions.");
    }
  };

  const handleSearch = async (textToSearch?: string, machineOverride?: string, langOverride?: string) => {
    const q = (textToSearch !== undefined ? textToSearch : query).trim();
    if (!q) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const m = machineOverride !== undefined ? machineOverride : selectedMachine;
    const l = langOverride !== undefined ? langOverride : selectedLanguage;

    setLoading(true);
    setError(null);
    setOpenSnippet(null);

    try {
      const response = await askQuestion(q, m || null, [], l);
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

  const handleLanguageSwitch = (newLang: string) => {
    setSelectedLanguage(newLang);
    handleSearch(query, selectedMachine, newLang);
  };

  const getSeverityBadge = (severity: string) => {
    const s = (severity || "").toLowerCase();
    if (s.includes("insufficient") || s.includes("not found") || s.includes("refusal")) {
      return (
        <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-50 border border-amber-300 text-amber-900 flex items-center gap-1 shadow-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          {severity || "Insufficient Data"}
        </span>
      );
    }
    if (s.includes("fault") || s.includes("critical") || s.includes("danger") || s.includes("エラー") || s.includes("fehler") || s.includes("दोष") || s.includes("खराबी") || s.includes("फॉल्ट")) {
      return (
        <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-50 border border-red-200 text-red-700 flex items-center gap-1 shadow-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          {severity || "Critical Fault"}
        </span>
      );
    }
    if (s.includes("alarm") || s.includes("warn") || s.includes("警告") || s.includes("warnung") || s.includes("चेतावनी")) {
      return (
        <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-50 border border-amber-300 text-amber-800 flex items-center gap-1 shadow-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          {severity || "Warning / Alarm"}
        </span>
      );
    }
    return (
      <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center gap-1 shadow-xs">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        {severity || "Diagnostic Guide"}
      </span>
    );
  };

  const langInfo = result?.language_info;
  const isMultilingualDoc = langInfo && langInfo.document_language !== "en" && langInfo.document_language !== "";
  const isInsufficient =
    result?.status === "insufficient_data" ||
    result?.confidence?.level === "Insufficient" ||
    (result?.severity || "").toLowerCase().includes("insufficient");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Search Input Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-1.5">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Ask Diagnostic Question or Search Error Code
        </h2>

        <p className="text-sm text-slate-500 mb-5">
          Type or use the <strong>Voice button</strong> to ask a question in any language (e.g. <code className="text-amber-800 font-mono bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">Fault F07900</code>, <code className="text-amber-800 font-mono bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">8013</code>).
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="space-y-4"
        >
          {/* Active Listening Soundwave Banner */}
          {isListening && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 animate-pulse font-medium shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
                <span>Microphone Active • Listening in <strong>{LANGUAGE_OPTIONS.find(l => l.id === selectedLanguage)?.label || "English"}</strong>... speak your question or error code now.</span>
              </div>
              <button
                type="button"
                onClick={toggleVoiceInput}
                className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold text-[11px] hover:bg-red-700 cursor-pointer shadow-xs"
              >
                Stop
              </button>
            </div>
          )}

          {voiceFeedback && !isListening && (
            <div className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
              {voiceFeedback}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-2.5 items-center">
            {/* VOICE BUTTON: Compact, icon-only on the left of input */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs border shrink-0 ${
                isListening
                  ? "bg-red-600 hover:bg-red-700 text-white border-red-700 shadow-md shadow-red-200 ring-2 ring-red-400 animate-pulse"
                  : "bg-slate-100 hover:bg-amber-100 hover:border-amber-300 text-slate-700 hover:text-amber-950 border-slate-200"
              }`}
              title={isListening ? "Stop voice recording" : `Voice Query (${LANGUAGE_OPTIONS.find(l => l.id === selectedLanguage)?.label || "English"})`}
            >
              {isListening ? (
                <Radio className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Mic className="w-5 h-5 text-amber-600" />
              )}
            </button>

            {/* TEXT INPUT QUERY */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isListening ? "🎙️ Listening... speak your query now..." : "Type or speak: e.g. Fault F07900 or why is the motor humming?"}
                className={`w-full h-12 pl-10 pr-4 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200 transition-all text-sm shadow-inner ${
                  isListening ? "border-red-400 ring-2 ring-red-100 bg-red-50/20" : "border-slate-300"
                }`}
              />
            </div>

            {/* Machine Selector */}
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="h-12 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white cursor-pointer shrink-0 shadow-xs"
            >
              {MACHINE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-white text-slate-900">
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Clean, Simple & Compact Language Pull Down */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="h-12 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:border-amber-500 focus:bg-white cursor-pointer shrink-0 shadow-xs"
              title="Select Output Language"
            >
              {LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang.id} value={lang.id} className="bg-white text-slate-900">
                  🌐 {lang.label}
                </option>
              ))}
            </select>

            {/* Analyze Button */}
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="h-12 px-6 flex items-center justify-center gap-2 bg-[#FFBB00] hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md shadow-amber-200 border border-amber-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
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

      {/* INTERACTIVE MULTILINGUAL PREFERENCE BANNER */}
      {result && (isMultilingualDoc || (langInfo && langInfo.suggested_languages && langInfo.suggested_languages.length > 1)) && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-200/60 text-amber-900 shrink-0 mt-0.5">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                Multilingual Manual Detection
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Source manual is in <strong className="text-slate-900">{langInfo?.document_language_name}</strong>. Diagnostic analysis is currently in <strong className="text-slate-900">{langInfo?.target_language_name}</strong>. Which language do you prefer?
              </p>
            </div>
          </div>

          {/* Quick 1-Click Language Switch Buttons */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
            {langInfo?.suggested_languages?.map((s) => (
              <button
                key={s.code}
                onClick={() => handleLanguageSwitch(s.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs border ${
                  selectedLanguage === s.code
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 hover:bg-amber-100 hover:text-amber-950 border-amber-200"
                }`}
              >
                {s.code === "en" ? "Respond in English" : `Respond in ${s.name}`}
              </button>
            ))}
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
                {result.machine_detected && !isInsufficient && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 border border-amber-300 text-amber-900">
                    {result.machine_detected}
                  </span>
                )}
                {langInfo && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700 flex items-center gap-1">
                    <Globe2 className="w-3 h-3 text-amber-500" />
                    <span>{langInfo.target_language_name}</span>
                  </span>
                )}
              </div>
              {result.error_code && (
                <p className="text-xs font-mono text-amber-700 mt-1 font-bold">
                  Target Code: {result.error_code}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {getSeverityBadge(result.severity)}
              {result.confidence && !isInsufficient && (
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
