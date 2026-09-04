import BackButton from "../components/BackButton";
import { useEffect, useState } from "react";
import { getDocuments } from "../services/api";


interface Document {
    id: string;
    name: string;
    manufacturer: string;
    machine: string;
    version: string;
    language: string;
    status: string;
}

function Documents() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDocuments = async () => {
            try {
                const result = await getDocuments();
                setDocuments(result);
            } catch (error) {
                console.error("Failed to load documents:", error);
            } finally {
                setLoading(false);
            }
        };

        loadDocuments();
    }, []);

    return (
        <div className="documents-page">
            <div className="documents-header">
                <BackButton />
                <div>
                    <h1>Documents</h1>
                    <p>
                        Browse machine manuals and technical documentation.
                    </p>
                </div>

                <button className="upload-button">
                    + Upload Document
                </button>
            </div>

            {loading ? (
                <div className="loading">
                    Loading documents...
                </div>
            ) : documents.length === 0 ? (
                <div className="empty-state">
                    <h2>No documents found</h2>
                    <p>
                        Upload a machine manual to start using the assistant.
                    </p>
                </div>
            ) : (
                <div className="documents-grid">
                    {documents.map((document) => (
                        <div className="document-card" key={document.id}>
                            <div className="document-icon">
                                📄
                            </div>

                            <div className="document-info">
                                <h2>{document.name}</h2>

                                <p>
                                    <strong>Manufacturer:</strong>{" "}
                                    {document.manufacturer}
                                </p>

                                <p>
                                    <strong>Machine:</strong>{" "}
                                    {document.machine}
                                </p>

                                <p>
                                    <strong>Version:</strong>{" "}
                                    {document.version}
                                </p>

                                <p>
                                    <strong>Language:</strong>{" "}
                                    {document.language}
                                </p>

                                <span className="document-status">
                                    ✓ {document.status}
                                </span>
                            </div>

                            <button className="view-button">
                                View Manual
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Documents;