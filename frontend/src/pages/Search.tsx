import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import BackButton from "../components/backbutton";
import {
    askQuestion,
    type DiagnosticResponse,
    getDemoScenarios,
    type DemoScenario,
} from "../services/api";

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    machineModel?: string | null;
    diagnostic?: DiagnosticResponse;
    timestamp: string;
}

const MACHINE_OPTIONS = [
    { id: "", label: "All Machines (Auto-Detect)" },
    { id: "sinamics-drive", label: "SINAMICS G120 Drive" },
    { id: "siemens-s7-1200", label: "SIMATIC S7-1200 PLC" },
    { id: "siemens-s7-1500", label: "SIMATIC S7-1500 PLC" },
];

function Search() {
    const [searchParams] = useSearchParams();
    const [machineModel, setMachineModel] = useState<string>("");
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [demoScenarios, setDemoScenarios] = useState<DemoScenario[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [expandedSnippets, setExpandedSnippets] = useState<Record<string, boolean>>({});
    const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    // Load demo scenarios on mount
    useEffect(() => {
        getDemoScenarios().then(setDemoScenarios).catch(console.error);
    }, []);

    // Handle initial query from URL search params (e.g. from Dashboard quick action)
    useEffect(() => {
        const queryParam = searchParams.get("q");
        const machineParam = searchParams.get("machine");
        if (queryParam) {
            setQuestion(queryParam);
            if (machineParam) setMachineModel(machineParam);
            executeQuestion(queryParam, machineParam || "");
        }
    }, [searchParams]);

    const toggleSnippet = (key: string) => {
        setExpandedSnippets((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleStep = (key: string) => {
        setCompletedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    // Voice Dictation using Web Speech API
    const startVoiceInput = () => {
        const SpeechRecognition =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert(
                "Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari."
            );
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setQuestion((prev) => (prev ? `${prev} ${transcript}` : transcript));
            setIsListening(false);
        };

        recognition.onerror = () => {
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    const executeQuestion = async (
        queryText: string,
        targetMachine: string = machineModel
    ) => {
        const q = queryText.trim();
        if (!q || loading) return;

        const timestamp = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });

        const userMsg: ChatMessage = {
            id: `usr_${Date.now()}`,
            role: "user",
            content: q,
            machineModel: targetMachine || null,
            timestamp,
        };

        // Prepare history payload for multi-turn context
        const historyPayload = messages.map((m) => ({
            role: m.role,
            content: m.content,
        }));

        setMessages((prev) => [...prev, userMsg]);
        setQuestion("");
        setLoading(true);

        try {
            const diagnostic = await askQuestion(q, targetMachine, historyPayload);

            const assistantMsg: ChatMessage = {
                id: `ast_${Date.now()}`,
                role: "assistant",
                content: diagnostic.meaning || "Troubleshooting analysis complete.",
                machineModel: diagnostic.machine_model,
                diagnostic,
                timestamp: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            };

            setMessages((prev) => [...prev, assistantMsg]);
        } catch (error: any) {
            const errorMsg: ChatMessage = {
                id: `err_${Date.now()}`,
                role: "assistant",
                content:
                    error?.message ||
                    "Network error: Unable to contact the diagnostic assistant.",
                timestamp: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleClarificationSelect = (selectedMachine: string, originalCode?: string | null) => {
        setMachineModel(selectedMachine);
        const queryText = originalCode ? `Error ${originalCode}` : "Diagnose fault";
        executeQuestion(queryText, selectedMachine);
    };

    const clearChat = () => {
        setMessages([]);
    };

    return (
        <div className="search-page-cockpit">
            {/* Top Navigation */}
            <header className="cockpit-header">
                <div className="cockpit-title-group">
                    <BackButton />
                    <div>
                        <h1>Industrial Troubleshooting Assistant</h1>
                        <p className="subtitle">
                            Grounded Multi-Machine Diagnostics • S7-1200 / S7-1500 / SINAMICS G120
                        </p>
                    </div>
                </div>

                <div className="header-controls">
                    {messages.length > 0 && (
                        <button className="clear-btn" onClick={clearChat} title="Clear conversation history">
                            🗑️ Reset Thread
                        </button>
                    )}
                </div>
            </header>

            {/* Machine Filter Bar & Quick Demo Chips */}
            <div className="machine-selector-bar">
                <div className="selector-label">Target Equipment:</div>
                <div className="machine-pills">
                    {MACHINE_OPTIONS.map((opt) => (
                        <button
                            key={opt.id}
                            className={`machine-pill ${machineModel === opt.id ? "active" : ""}`}
                            onClick={() => setMachineModel(opt.id)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick Demo Scenarios Bar */}
            <div className="quick-demo-strip">
                <span className="demo-strip-label">⚡ Live Evaluation Scenarios:</span>
                <div className="demo-chips-container">
                    {demoScenarios.map((demo) => (
                        <button
                            key={demo.id}
                            className="demo-chip"
                            onClick={() => {
                                setMachineModel(demo.machine_model || "");
                                executeQuestion(demo.query, demo.machine_model || "");
                            }}
                            title={demo.description}
                        >
                            <strong>[{demo.category}]</strong> {demo.title}
                        </button>
                    ))}
                </div>
            </div>

            {/* Conversation Thread */}
            <main className="chat-thread-container">
                {messages.length === 0 ? (
                    <div className="empty-chat-hero">
                        <div className="hero-icon">⚙️</div>
                        <h2>Ready to Diagnose Industrial Equipment</h2>
                        <p>
                            Enter an error code (e.g. <code>F07900</code>, <code>8013</code>, <code>16#80C4</code>), a
                            symptom (<em>"drive motor is humming loudly and overheating"</em>), or select one of the
                            live demo scenarios above.
                        </p>

                        <div className="capabilities-grid">
                            <div className="capability-card">
                                <h3>🎯 Exact Code Retrieval</h3>
                                <p>Instant lookup across thousands of pages of Siemens technical registers and fault tables.</p>
                            </div>
                            <div className="capability-card">
                                <h3>🔀 Cross-Manual Disambiguation</h3>
                                <p>Identifies identical codes across different machine models and asks clarifying questions.</p>
                            </div>
                            <div className="capability-card">
                                <h3>🛡️ Hallucination Guardrails</h3>
                                <p>Algorithmic refusal gatekeeper that halts ungrounded guesses to protect equipment safety.</p>
                            </div>
                            <div className="capability-card">
                                <h3>🗣️ Hands-Free Voice Control</h3>
                                <p>Dictate machine noise and symptoms directly on the factory floor using voice input.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="messages-list">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`message-row ${msg.role}`}>
                                {msg.role === "user" ? (
                                    <div className="user-bubble">
                                        <div className="user-bubble-header">
                                            <span className="sender-tag">Technician</span>
                                            {msg.machineModel && (
                                                <span className="machine-tag">
                                                    Scope: {msg.machineModel}
                                                </span>
                                            )}
                                            <span className="time-tag">{msg.timestamp}</span>
                                        </div>
                                        <div className="user-bubble-text">{msg.content}</div>
                                    </div>
                                ) : (
                                    <div className="assistant-bubble">
                                        <div className="assistant-bubble-header">
                                            <span className="sender-tag">AI Troubleshooter</span>
                                            {msg.diagnostic?.machine_detected && (
                                                <span className="machine-tag-verified">
                                                    🏭 {msg.diagnostic.machine_detected}
                                                </span>
                                            )}
                                            {msg.diagnostic?.confidence && (
                                                <span
                                                    className={`confidence-pill confidence-${msg.diagnostic.confidence.level.toLowerCase()}`}
                                                    title={msg.diagnostic.confidence.explanation}
                                                >
                                                    {msg.diagnostic.confidence.level} Confidence (
                                                    {Math.round(msg.diagnostic.confidence.score * 100)}%)
                                                </span>
                                            )}
                                            <span className="time-tag">{msg.timestamp}</span>
                                        </div>

                                        {/* CASE 1: AMBIGUITY RESOLUTION */}
                                        {msg.diagnostic?.status === "ambiguous" && (
                                            <div className="diagnostic-ambiguity-card">
                                                <div className="ambiguity-alert-bar">
                                                    <span className="alert-icon">⚠️</span>
                                                    <div>
                                                        <h4>Cross-Manual Ambiguity Detected</h4>
                                                        <p>{msg.diagnostic.clarifying_question}</p>
                                                    </div>
                                                </div>

                                                <div className="clarification-options-grid">
                                                    {msg.diagnostic.clarification_options?.map((cand, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="clarification-option-card"
                                                            onClick={() =>
                                                                handleClarificationSelect(
                                                                    cand.machine_model,
                                                                    msg.diagnostic?.error_code
                                                                )
                                                            }
                                                        >
                                                            <div className="cand-header">
                                                                <h5>{cand.machine_name}</h5>
                                                                <span className="page-badge">p. {cand.page_number}</span>
                                                            </div>
                                                            <p className="cand-summary">{cand.context_summary}</p>
                                                            <button className="select-cand-btn">
                                                                Diagnose as {cand.machine_name} →
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* CASE 2: GRACEFUL REFUSAL / INSUFFICIENT DATA */}
                                        {msg.diagnostic?.status === "insufficient_data" && (
                                            <div className="diagnostic-refusal-card">
                                                <div className="refusal-alert-bar">
                                                    <span className="alert-icon">⚠️</span>
                                                    <div>
                                                        <h4 style={{ fontSize: "16px", fontWeight: "700", color: "#f87171", margin: 0 }}>
                                                            Insufficient data in manual.
                                                        </h4>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* CASE 3: SUCCESSFUL STRUCTURED DIAGNOSIS */}
                                        {msg.diagnostic?.status === "success" && (
                                            <div className="diagnostic-success-card">
                                                {/* Severity & Meaning Header */}
                                                <div className="diagnostic-banner">
                                                    <span className="severity-badge">{msg.diagnostic.severity}</span>
                                                    <h3 className="diagnostic-meaning">{msg.diagnostic.meaning}</h3>
                                                </div>

                                                {/* Possible Causes */}
                                                <div className="diagnostic-section">
                                                    <h4 className="section-title">🔍 Probable Causes</h4>
                                                    <ul className="causes-list">
                                                        {msg.diagnostic.possible_causes.map((cause, idx) => (
                                                            <li key={idx} className="cause-item">
                                                                {cause}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Recommended Step-by-Step Actions with interactive checklists */}
                                                <div className="diagnostic-section">
                                                    <h4 className="section-title">🛠️ Step-by-Step Corrective Actions</h4>
                                                    <div className="actions-checklist">
                                                        {msg.diagnostic.recommended_actions.map((action, idx) => {
                                                            const stepKey = `${msg.id}_step_${idx}`;
                                                            const isDone = completedSteps[stepKey] || false;
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className={`action-step-item ${isDone ? "completed" : ""}`}
                                                                    onClick={() => toggleStep(stepKey)}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isDone}
                                                                        onChange={() => toggleStep(stepKey)}
                                                                    />
                                                                    <span className="action-text">{action}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Verifiable Citations */}
                                                {msg.diagnostic.citations.length > 0 && (
                                                    <div className="diagnostic-section citations-section">
                                                        <h4 className="section-title">
                                                            📚 Verified Source Citations ({msg.diagnostic.citations.length})
                                                        </h4>
                                                        <div className="citations-list">
                                                            {msg.diagnostic.citations.map((cite, idx) => {
                                                                const citeKey = `${msg.id}_cite_${idx}`;
                                                                const isExpanded = expandedSnippets[citeKey] || false;
                                                                return (
                                                                    <div key={idx} className="citation-card">
                                                                        <div className="citation-header">
                                                                            <span className="manual-title">
                                                                                📄 {cite.manual_name}
                                                                            </span>
                                                                            <span className="section-pill">
                                                                                {cite.section}
                                                                            </span>
                                                                            <span className="page-pill">
                                                                                Page {cite.page_number}
                                                                            </span>
                                                                            <button
                                                                                className="snippet-toggle-btn"
                                                                                onClick={() => toggleSnippet(citeKey)}
                                                                            >
                                                                                {isExpanded ? "Hide Excerpt ▲" : "View Excerpt ▼"}
                                                                            </button>
                                                                        </div>
                                                                        {isExpanded && (
                                                                            <div className="citation-snippet">
                                                                                <blockquote>"{cite.snippet}"</blockquote>
                                                                                <div className="snippet-footer">
                                                                                    <span>File: {cite.filename}</span>
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
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="message-row assistant">
                                <div className="assistant-bubble loading-bubble">
                                    <div className="typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                    <span className="loading-text">
                                        Retrieving manual excerpts and verifying grounding...
                                    </span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                )}
            </main>

            {/* Input Bar with Hands-Free Voice Button */}
            <footer className="cockpit-input-tray">
                <form
                    className="input-form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        executeQuestion(question);
                    }}
                >
                    <button
                        type="button"
                        className={`voice-mic-btn ${isListening ? "listening" : ""}`}
                        onClick={startVoiceInput}
                        title={
                            isListening
                                ? "Listening... Speak your error code or symptom"
                                : "Click to speak (Hands-free voice input)"
                        }
                    >
                        {isListening ? "🔴 Listening..." : "🎙️ Voice"}
                    </button>

                    <input
                        type="text"
                        placeholder="Ask a code (e.g. F07900), symptom ('motor humming'), or follow-up question..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        disabled={loading}
                    />

                    <button
                        type="submit"
                        className="send-query-btn"
                        disabled={loading || !question.trim()}
                    >
                        {loading ? "Analyzing..." : "Diagnose →"}
                    </button>
                </form>
            </footer>
        </div>
    );
}

export default Search;