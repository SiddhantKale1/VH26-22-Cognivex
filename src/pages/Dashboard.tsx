import { Link } from "react-router-dom";

function Dashboard() {
    return (
        <div className="dashboard">
            <aside className="sidebar">
                <div className="logo">
                    ⚙️ Machine Assistant
                </div>

                <nav>
                    <Link to="/">Dashboard</Link>
                    <Link to="/documents">Documents</Link>
                    <Link to="/search">Search</Link>
                    <Link to="/errors">Error Analysis</Link>
                </nav>
            </aside>

            <main className="main-content">
                <header className="topbar">
                    <h2>Dashboard</h2>
                </header>

                <section className="welcome">
                    <h1>Machine Assistant</h1>
                    <p>
                        Search technical manuals, troubleshoot machines,
                        and find solutions quickly.
                    </p>
                </section>

                <section className="cards">
                    <div className="card">
                        <h3>📚 Documents</h3>
                        <p>Browse uploaded machine manuals.</p>
                        <Link to="/documents">View Documents →</Link>
                    </div>

                    <div className="card">
                        <h3>🔍 Ask a Question</h3>
                        <p>Search manuals using natural language.</p>
                        <Link to="/search">Start Searching →</Link>
                    </div>

                    <div className="card">
                        <h3>⚠️ Error Analysis</h3>
                        <p>Analyze machine error codes and find solutions.</p>
                        <Link to="/errors">Analyze Error →</Link>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default Dashboard;