import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDemoScenarios, type DemoScenario } from "../services/api";

function Dashboard() {
    const navigate = useNavigate();
    const [demoScenarios, setDemoScenarios] = useState<DemoScenario[]>([]);

    useEffect(() => {
        getDemoScenarios().then(setDemoScenarios).catch(console.error);
    }, []);

    const launchDemo = (scenario: DemoScenario) => {
        const query = encodeURIComponent(scenario.query);
        const machine = encodeURIComponent(scenario.machine_model || "");
        navigate(`/search?q=${query}&machine=${machine}`);
    };

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="logo-brand">
                    <span className="logo-icon">⚙️</span>
                    <div>
                        <span className="logo-title">RAG Assistant</span>
                        <span className="logo-badge">Industrial AI</span>
                    </div>
                </div>

                <nav className="nav-menu">
                    <Link to="/" className="nav-item active">
                        📊 Dashboard
                    </Link>
                    <Link to="/search" className="nav-item">
                        💬 Assistant Chat
                    </Link>
                    <Link to="/errors" className="nav-item">
                        ⚡ Error Analysis
                    </Link>
                    <Link to="/documents" className="nav-item">
                        📚 Knowledge Base
                    </Link>
                </nav>

                <div className="sidebar-footer">
                    <div className="system-health-pill">
                        <span className="status-dot online"></span>
                        <span>Vector Store Online</span>
                    </div>
                    <p className="system-info">6,729 Chunks • Groq Qwen 27B</p>
                </div>
            </aside>

            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-context">
                        <h2>Factory Diagnostic Cockpit</h2>
                        <span className="domain-tag">Domain: Application Data Management (RAG)</span>
                    </div>
                    <Link to="/search" className="launch-chat-btn">
                        Open Assistant Chat →
                    </Link>
                </header>

                <div className="dashboard-content-scroll">
                    {/* Welcome Hero */}
                    <section className="welcome-banner">
                        <div className="welcome-text">
                            <h1>RAG-Based Intelligent Machine Troubleshooting System</h1>
                            <p>
                                Grounded diagnostic assistant for factory floor technicians. Ingests complex
                                technical manuals, resolves cross-equipment error code ambiguity, maintains
                                multi-turn dialogue, and deterministically halts hallucinations.
                            </p>
                        </div>
                        <div className="welcome-tags">
                            <span className="spec-tag">🎯 Exact Code Match</span>
                            <span className="spec-tag">🔀 Ambiguity Resolution</span>
                            <span className="spec-tag">🛡️ Hallucination Guardrails</span>
                            <span className="spec-tag">🎙️ Hands-Free Voice</span>
                        </div>
                    </section>

                    {/* Live Evaluation Demo Panel (Hackathon Mandatory Deliverable 3) */}
                    <section className="live-demo-section">
                        <div className="section-header-row">
                            <div>
                                <h3>⚡ Live Hackathon Evaluation Scenarios</h3>
                                <p>Click any test case to run the live pipeline and demonstrate requirement compliance:</p>
                            </div>
                            <span className="eval-badge">Deliverable 3 Compliant</span>
                        </div>

                        <div className="demo-scenarios-grid">
                            {demoScenarios.map((demo) => (
                                <div key={demo.id} className="demo-card" onClick={() => launchDemo(demo)}>
                                    <div className="demo-card-top">
                                        <span className="demo-category-tag">{demo.category}</span>
                                        <span className="demo-machine-tag">{demo.machine_name}</span>
                                    </div>
                                    <h4>{demo.title}</h4>
                                    <p className="demo-query">
                                        Query: <code>"{demo.query}"</code>
                                    </p>
                                    <p className="demo-desc">{demo.description}</p>
                                    <button className="run-demo-btn">
                                        Run Test Scenario →
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Operational Metrics Bar */}
                    <section className="metrics-grid">
                        <div className="metric-card">
                            <div className="metric-value">5 Manuals</div>
                            <div className="metric-label">Siemens Technical Manuals Indexed</div>
                            <div className="metric-meta">S7-1200, S7-1500, SINAMICS G120</div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-value">6,729</div>
                            <div className="metric-label">Searchable Vector Chunks</div>
                            <div className="metric-meta">Recursive Splitting & BM25 In-Memory Index</div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-value">Hybrid RRF</div>
                            <div className="metric-label">Retrieval Strategy</div>
                            <div className="metric-meta">Dense MiniLM-L6-v2 + Sparse BM25 Fusion</div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-value">Deterministic</div>
                            <div className="metric-label">Hallucination Guardrail</div>
                            <div className="metric-meta">Algorithmic Refusal Gatekeeper</div>
                        </div>
                    </section>

                    {/* Quick Access Action Cards */}
                    <section className="action-cards-grid">
                        <div className="action-card">
                            <div className="action-card-header">
                                <span className="action-icon">💬</span>
                                <h3>Troubleshooting Chat</h3>
                            </div>
                            <p>Interactive multi-turn conversation with voice input and step-by-step repair checklists.</p>
                            <Link to="/search" className="action-link">Open Chat Assistant →</Link>
                        </div>

                        <div className="action-card">
                            <div className="action-card-header">
                                <span className="action-icon">⚠️</span>
                                <h3>Error Code Decoder</h3>
                            </div>
                            <p>Direct lookup for hex codes, Siemens F-codes, alarms, and LED flashing patterns.</p>
                            <Link to="/errors" className="action-link">Analyze Error Code →</Link>
                        </div>

                        <div className="action-card">
                            <div className="action-card-header">
                                <span className="action-icon">📚</span>
                                <h3>Manuals Library</h3>
                            </div>
                            <p>Browse indexed documentation metadata, hardware specifications, and page registries.</p>
                            <Link to="/documents" className="action-link">Browse Manuals →</Link>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default Dashboard;