import BackButton from "../components/backbutton";
import { useEffect, useState, useRef } from "react";
import { getDocuments, uploadDocument } from "../services/api";


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
    const [uploading, setUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => {
        loadDocuments();
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadMessage("Processing PDF, extracting text & generating embeddings...");

        try {
            const res = await uploadDocument(file);
            setUploadMessage(`Success: ${res.message}`);
            await loadDocuments();
        } catch (err: any) {
            console.error("Upload error:", err);
            const msg = err.response?.data?.detail || err.message || "Failed to upload manual.";
            setUploadMessage(`Error: ${msg}`);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

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

                <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                />

                <button
                    className="upload-button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {uploading ? "Uploading & Indexing..." : "+ Upload Document"}
                </button>
            </div>

            {uploadMessage && (
                <div style={{
                    padding: "12px 16px",
                    marginBottom: "16px",
                    borderRadius: "8px",
                    backgroundColor: uploadMessage.startsWith("Error") ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                    border: `1px solid ${uploadMessage.startsWith("Error") ? "#ef4444" : "#10b981"}`,
                    color: uploadMessage.startsWith("Error") ? "#fca5a5" : "#6ee7b7",
                    fontSize: "0.9rem"
                }}>
                    {uploadMessage}
                </div>
            )}

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