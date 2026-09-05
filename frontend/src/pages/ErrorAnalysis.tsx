import { useState } from "react";
import { analyzeError, type DiagnosticResponse } from "../services/api";
import BackButton from "../components/backbutton";

const PRESET_CODES = [
    { code: "F07900", machine: "sinamics-drive", label: "F07900 (Motor Blocked)" },
    { code: "8013", machine: "", label: "8013 (Ambiguity Test)" },
    { code: "16#80C4", machine: "siemens-s7-1200", label: "16#80C4 (Comm Error)" },
    { code: "A07910", machine: "sinamics-drive", label: "A07910 (Motor Overheat)" },
    { code: "E9999", machine: "", label: "E9999 (Hallucination Test)" },
];

function ErrorAnalysis() {
    const [machineId, setMachineId] = useState("sinamics-drive");
    const [errorCode, setErrorCode] = useState("");
    const [result, setResult] = useState<DiagnosticResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [expandedSnippets, setExpandedSnippets] = useState<Record<string, boolean>>({});
    const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

    const toggleSnippet = (key: string) => {
        setExpandedSnippets((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleStep = (key: string) => {
        setCompletedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleAnalyze = async (overrideCode?: string, overrideMachine?: string) => {
        const code = (overrideCode !== undefined ? overrideCode : errorCode).trim();
        const machine = overrideMachine !== undefined ? overrideMachine : machineId;
        if (!code) return;

        setLoading(true);
        setResult(null);
        setErrorMessage("");

        try {
            const response = await analyzeError(machine, code);
            setResult(response);
        } catch (error: any) {
            console.error("Error analyzing machine:", error);
            setErrorMessage(error?.message || "Error analyzing machine fault code.");
        } finally {
            setLoading(false);
        }
    };

    const applyPreset = (preset: typeof PRESET_CODES[0]) => {
        setErrorCode(preset.code);
        setMachineId(preset.machine);
        handleAnalyze(preset.code, preset.machine);
    };

    return (
        <div className="error-page-container">
            <header className="error-header-nav">
                <BackButton />
                <div>
                    <h1>Equipment Error Code Decoder</h1>
                    <p>Enter an error code, fault identifier, or parameter to retrieve grounded causes and corrective actions.</p>
                </div>
            </header>

            {/* Quick preset chips */}
            <div className="presets-bar">
                <span className="presets-label">⚡ Quick Presets:</span>
                <div className="preset-buttons">
                    {PRESET_CODES.map((p, idx) => (
                        <button key={idx} className="preset-btn" onClick={() => applyPreset(p)}>
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Input Form */}
            <div className="error-form-card">
                <div className="form-row">
                    <div className="form-group flex-1">
                        <label htmlFor="machine">Target Equipment Scope</label>
                        <select
                            id="machine"
                            value={machineId}
                            onChange={(e) => setMachineId(e.target.value)}
                        >
                            <option value="">All Machines (Auto-Detect / Disambiguate)</option>
                            <option value="sinamics-drive">Siemens SINAMICS G120 Drive</option>
                            <option value="siemens-s7-1200">SIMATIC S7-1200 PLC</option>
                            <option value="siemens-s7-1500">SIMATIC S7-1500 PLC</option>
                        </select>
                    </div>

                    <div className="form-group flex-2">
                        <label htmlFor="errorCode">Error / Fault Code or Status</label>
                        <input
                            id="errorCode"
                            type="text"
                            placeholder="Example: F07900, 8013, 16#80C4, p2175"
                            value={errorCode}
                            onChange={(e) => setErrorCode(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleAnalyze();
                            }}
                        />
                    </div>

                    <div className="form-group-btn">
                        <button
                            className="analyze-submit-btn"
                            onClick={() => handleAnalyze()}
                            disabled={loading || !errorCode.trim()}
                        >
                            {loading ? "Decoding..." : "Decode Fault →"}
                        </button>
                    </div>
                </div>
            </div>

            {errorMessage && (
                <div className="error-alert-banner">
                    ⚠️ {errorMessage}
                </div>
            )}

            {/* Structured Result Display */}
            {result && (
                <div className="error-result-panel">
                    {/* Header Context Bar */}
                    <div className="result-header-bar">
                        <div className="result-title-group">
                            <span className="code-pill">Code: {result.error_code || errorCode}</span>
                            <span className="machine-pill-badge">
                                🏭 {result.machine_detected || "Siemens Automation"}
                            </span>
                        </div>
                        {result.confidence && (
                            <span className={`confidence-tag conf-${result.confidence.level.toLowerCase()}`}>
                                {result.confidence.level} Confidence ({Math.round(result.confidence.score * 100)}%)
                            </span>
                        )}
                    </div>

                    {/* CASE 1: AMBIGUITY */}
                    {result.status === "ambiguous" && (
                        <div className="result-ambiguity-box">
                            <div className="ambiguity-title">
                                <span>⚠️</span>
                                <div>
                                    <h3>Cross-Manual Disambiguation Required</h3>
                                    <p>{result.clarifying_question}</p>
                                </div>
                            </div>
                            <div className="ambiguity-options-list">
                                {result.clarification_options?.map((cand, i) => (
                                    <div key={i} className="cand-box">
                                        <div className="cand-box-header">
                                            <strong>{cand.machine_name}</strong>
                                            <span>Page {cand.page_number}</span>
                                        </div>
                                        <p>{cand.context_summary}</p>
                                        <button
                                            className="cand-select-btn"
                                            onClick={() => {
                                                setMachineId(cand.machine_model);
                                                handleAnalyze(result.error_code || errorCode, cand.machine_model);
                                            }}
                                        >
                                            Select {cand.machine_name} Procedure →
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* CASE 2: INSUFFICIENT DATA / REFUSAL */}
                    {result.status === "insufficient_data" && (
                        <div className="result-refusal-box">
                            <div className="refusal-title" style={{ margin: 0 }}>
                                <span>⚠️</span>
                                <div>
                                    <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f87171", margin: 0 }}>
                                        Insufficient data in manual.
                                    </h3>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CASE 3: SUCCESSFUL DIAGNOSIS */}
                    {result.status === "success" && (
                        <>
                            <div className="meaning-card">
                                <span className="severity-tag">{result.severity}</span>
                                <h3>{result.meaning}</h3>
                            </div>

                            <div className="analysis-columns">
                                <div className="column-card">
                                    <h4>🔍 Probable Causes</h4>
                                    <ul className="causes-list">
                                        {result.possible_causes.map((cause, i) => (
                                            <li key={i}>{cause}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="column-card">
                                    <h4>🛠️ Step-by-Step Corrective Actions</h4>
                                    <div className="actions-list">
                                        {result.recommended_actions.map((action, i) => {
                                            const stepKey = `err_step_${i}`;
                                            const isDone = completedSteps[stepKey] || false;
                                            return (
                                                <div
                                                    key={i}
                                                    className={`action-item ${isDone ? "done" : ""}`}
                                                    onClick={() => toggleStep(stepKey)}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isDone}
                                                        onChange={() => toggleStep(stepKey)}
                                                    />
                                                    <span>{action}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {result.citations.length > 0 && (
                                <div className="citations-container">
                                    <h4>📚 Verified Manual Citations ({result.citations.length})</h4>
                                    <div className="citations-grid">
                                        {result.citations.map((cite, i) => {
                                            const citeKey = `err_cite_${i}`;
                                            const isExpanded = expandedSnippets[citeKey] || false;
                                            return (
                                                <div key={i} className="citation-pill-card">
                                                    <div className="pill-header">
                                                        <span className="doc-name">📄 {cite.manual_name}</span>
                                                        <span className="sec-tag">{cite.section}</span>
                                                        <span className="page-tag">p. {cite.page_number}</span>
                                                        <button
                                                            className="toggle-snippet-btn"
                                                            onClick={() => toggleSnippet(citeKey)}
                                                        >
                                                            {isExpanded ? "Hide ▲" : "Excerpt ▼"}
                                                        </button>
                                                    </div>
                                                    {isExpanded && (
                                                        <div className="pill-body">
                                                            <p>"{cite.snippet}"</p>
                                                            <div className="pill-footer">
                                                                <span>Source: {cite.filename}</span>
                                                                <span>Relevance: {Math.round(cite.relevance_score * 100)}%</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default ErrorAnalysis;