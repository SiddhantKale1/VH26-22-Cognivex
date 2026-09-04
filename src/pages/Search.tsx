import BackButton from "../components/BackButton";
import { useState } from "react";
import { askQuestion } from "../services/api";


function Search() {
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [sources, setSources] = useState<
        { document: string; page: number }[]
    >([]);
    const [loading, setLoading] = useState(false);

    const handleAsk = async () => {
        if (!question.trim()) return;

        setLoading(true);
        setAnswer("");
        setSources([]);

        try {
            const result = await askQuestion(question);

            setAnswer(result.answer);
            setSources(result.sources || []);
        } catch (error) {
            console.error(error);
            setAnswer("Unable to get an answer. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="search-page">
            <BackButton />
            <div className="search-header">
                <h1>Ask Machine Assistant</h1>

                <p>
                    Ask questions about machine manuals and technical
                    documentation.
                </p>
            </div>

            <div className="search-box">
                <textarea
                    placeholder="Example: Why is the motor overheating?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={4}
                />

                <button onClick={handleAsk} disabled={loading}>
                    {loading ? "Analyzing..." : "Ask Question"}
                </button>
            </div>

            {answer && (
                <div className="answer-card">
                    <h2>Answer</h2>

                    <p>{answer}</p>

                    {sources.length > 0 && (
                        <div className="sources">
                            <h3>Sources</h3>

                            {sources.map((source, index) => (
                                <div
                                    className="source-item"
                                    key={index}
                                >
                                    📄 {source.document} — Page{" "}
                                    {source.page}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Search;