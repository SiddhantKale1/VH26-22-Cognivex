import { useState } from "react";
import { analyzeError } from "../services/api";
import BackButton from "../components/BackButton";

interface ErrorResult {
    error_code: string;
    possible_causes: string[];
    recommended_actions: string[];
    sources: {
        document: string;
        page: number;
    }[];
}

function ErrorAnalysis() {
    const [machineId, setMachineId] = useState("siemens-s7-1200");
    const [errorCode, setErrorCode] = useState("");
    const [result, setResult] = useState<ErrorResult | null>(null);
    const [loading, setLoading] = useState(false);

    const handleAnalyze = async () => {
        if (!errorCode.trim()) return;

        setLoading(true);
        setResult(null);

        try {
            const response = await analyzeError(
                machineId,
                errorCode
            );

            setResult(response);
        } catch (error) {
            console.error("Error analyzing machine:", error);
        } finally {
            setLoading(false);
        }
    };

    return (

        <div className="error-page">
            <BackButton />
            <div className="error-header">
                <h1>Error Analysis</h1>

                <p>
                    Enter a machine and error code to find possible causes
                    and recommended solutions.
                </p>
            </div>

            <div className="error-form">
                <div className="form-group">
                    <label htmlFor="machine">
                        Machine
                    </label>

                    <select
                        id="machine"
                        value={machineId}
                        onChange={(e) =>
                            setMachineId(e.target.value)
                        }
                    >
                        <option value="siemens-s7-1200">
                            Siemens S7-1200
                        </option>

                        <option value="sinamics-drive">
                            Siemens SINAMICS Drive
                        </option>

                        <option value="industrial-motor">
                            Industrial Motor
                        </option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="errorCode">
                        Error Code
                    </label>

                    <input
                        id="errorCode"
                        type="text"
                        placeholder="Example: E1024"
                        value={errorCode}
                        onChange={(e) =>
                            setErrorCode(e.target.value)
                        }
                    />
                </div>

                <button
                    className="analyze-button"
                    onClick={handleAnalyze}
                    disabled={loading || !errorCode.trim()}
                >
                    {loading ? "Analyzing..." : "Analyze Error"}
                </button>
            </div>

            {result && (
                <div className="error-result">
                    <div className="result-header">
                        <h2>
                            Error: {result.error_code}
                        </h2>
                    </div>

                    <div className="result-section">
                        <h3>Possible Causes</h3>

                        <ul>
                            {result.possible_causes.map(
                                (cause, index) => (
                                    <li key={index}>
                                        {cause}
                                    </li>
                                )
                            )}
                        </ul>
                    </div>

                    <div className="result-section">
                        <h3>Recommended Actions</h3>

                        <ol>
                            {result.recommended_actions.map(
                                (action, index) => (
                                    <li key={index}>
                                        {action}
                                    </li>
                                )
                            )}
                        </ol>
                    </div>

                    {result.sources.length > 0 && (
                        <div className="result-section sources">
                            <h3>Sources</h3>

                            {result.sources.map(
                                (source, index) => (
                                    <div
                                        className="source-item"
                                        key={index}
                                    >
                                        📄 {source.document} — Page{" "}
                                        {source.page}
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ErrorAnalysis;