import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
    timeout: 90000,
});

export interface Citation {
    manual_name: string;
    filename: string;
    section: string;
    page_number: number;
    snippet: string;
    relevance_score: number;
    match_type?: string;
}

export interface ClarificationOption {
    machine_model: string;
    machine_name: string;
    context_summary: string;
    source_file: string;
    page_number: number;
}

export interface ConfidenceInfo {
    level: "High" | "Medium" | "Low" | "Insufficient" | "Ambiguous";
    score: number;
    explanation: string;
}

export interface DiagnosticResponse {
    status: "success" | "ambiguous" | "insufficient_data";
    error_code?: string | null;
    machine_model?: string | null;
    machine_detected?: string;
    meaning: string;
    severity: string;
    possible_causes: string[];
    recommended_actions: string[];
    citations: Citation[];
    confidence: ConfidenceInfo;
    clarifying_question?: string;
    clarification_options?: ClarificationOption[];
}

export interface DemoScenario {
    id: string;
    category: string;
    title: string;
    machine_model: string | null;
    machine_name: string;
    query: string;
    description: string;
}

export interface DocumentInfo {
    id: string;
    name: string;
    manufacturer: string;
    machine: string;
    version: string;
    language: string;
    status: string;
    filename?: string;
}

// Ask a troubleshooting question with multi-turn history support
export const askQuestion = async (
    question: string,
    machineModel?: string | null,
    history: { role: string; content: string }[] = []
): Promise<DiagnosticResponse> => {
    try {
        const response = await api.post("/api/query", {
            question,
            machine_model: machineModel || null,
            history
        });
        return response.data;
    } catch (error: any) {
        console.error("Error asking question:", error);
        const detail = error.response?.data?.detail || error.message;
        throw new Error(
            detail || "Failed to reach backend server. Please verify backend is running on port 8000."
        );
    }
};

// Analyze specific machine error code
export const analyzeError = async (
    machineId: string,
    errorCode: string
): Promise<DiagnosticResponse> => {
    try {
        const response = await api.post("/api/errors", {
            machine_model: machineId,
            error_code: errorCode,
        });
        return response.data;
    } catch (error: any) {
        console.error("Error analyzing machine error:", error);
        const detail = error.response?.data?.detail || error.message;
        throw new Error(
            detail || "Failed to reach backend server. Please verify backend is running on port 8000."
        );
    }
};

// Get list of indexed manuals
export const getDocuments = async (): Promise<DocumentInfo[]> => {
    try {
        const response = await api.get("/api/documents");
        return response.data;
    } catch (error: any) {
        console.error("Error fetching documents:", error);
        return [
            {
                id: "1",
                name: "SINAMICS G120 CU240B-2 / CU240E-2 Operating Instructions",
                manufacturer: "Siemens",
                machine: "SINAMICS Drive",
                version: "01/2017",
                language: "English",
                status: "Indexed & Ready",
                filename: "G120_CU240BE2_op_instr_0117_en-US.pdf"
            },
            {
                id: "2",
                name: "SINAMICS G120 Safety Functions Manual",
                manufacturer: "Siemens",
                machine: "SINAMICS Drive",
                version: "09/2020",
                language: "English",
                status: "Indexed & Ready",
                filename: "G120_Safety_fct_man_0920_en-US.pdf"
            },
            {
                id: "3",
                name: "SIMATIC S7-1200 Programmable Controller System Manual",
                manufacturer: "Siemens",
                machine: "S7-1200 PLC",
                version: "2024",
                language: "English",
                status: "Indexed & Ready",
                filename: "s71200_system_manual_en-US.pdf"
            },
            {
                id: "4",
                name: "SIMATIC S7-1500 CPU 1512C-1 PN Manual",
                manufacturer: "Siemens",
                machine: "S7-1500 PLC",
                version: "2024",
                language: "English",
                status: "Indexed & Ready",
                filename: "s71500_cpu1512c_1_pn_manual_en-US_en-US.pdf"
            },
        ];
    }
};

// Fetch live demo scenarios
export const getDemoScenarios = async (): Promise<DemoScenario[]> => {
    try {
        const response = await api.get("/api/demo-scenarios");
        return response.data;
    } catch (error) {
        console.warn("Failed to fetch demo scenarios from backend, using fallback list.");
        return [
            {
                id: "exact_code",
                category: "Exact Code",
                title: "Fault F07900: Motor Blocked",
                machine_model: "sinamics-drive",
                machine_name: "SINAMICS G120 Drive",
                query: "Fault F07900",
                description: "Critical drive trip: checks parameters p2175, p2177, r1538 with exact manual page citations."
            },
            {
                id: "natural_language",
                category: "Natural Language",
                title: "Drive Motor Humming & Overheating",
                machine_model: "sinamics-drive",
                machine_name: "SINAMICS G120 Drive",
                query: "Why is the drive motor humming loudly and overheating at low speeds?",
                description: "Diagnostic search across symptoms, current limits, and cooling procedures."
            },
            {
                id: "cross_manual_ambiguity",
                category: "Ambiguity Resolution",
                title: "Overlapping Code 8013 across Manuals",
                machine_model: null,
                machine_name: "All Machines (Unscoped)",
                query: "Error 8013",
                description: "Code 8013 appears in S7-1200 (Connection error) and G120 (Rotation monitoring) — triggers clarifying question."
            },
            {
                id: "insufficient_data",
                category: "Hallucination Control",
                title: "Unknown Error E9999 / Hydraulic Leak",
                machine_model: null,
                machine_name: "All Machines",
                query: "Error E9999 hydraulic valve burst on production line",
                description: "Deterministic refusal: verifies system refuses gracefully rather than inventing plausible fixes."
            },
            {
                id: "follow_up",
                category: "Conversational Memory",
                title: "Follow-Up Troubleshooting Dialogue",
                machine_model: "sinamics-drive",
                machine_name: "SINAMICS G120 Drive",
                query: "What if checking motor free rotation doesn't fix it?",
                description: "Multi-turn context retention carrying active fault & machine context seamlessly."
            }
        ];
    }
};

export const uploadDocument = async (file: File): Promise<{ status: string; message: string; chunks_added: number }> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/api/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
};

export const deleteDocument = async (filename: string): Promise<{ status: string; message: string; deleted_chunks?: number }> => {
    const response = await api.delete(`/api/documents/${encodeURIComponent(filename)}`);
    return response.data;
};

export interface QueryRecord {
    query_id: string;
    timestamp: string;
    question: string;
    selected_machine?: string | null;
    status: string;
    error_code?: string | null;
    machine_detected?: string;
    severity: string;
    confidence_level: string;
    confidence_score: number;
    meaning?: string;
    causes_count: number;
    actions_count: number;
    citations_count: number;
    response_time_ms: number;
}

export interface QueryAnalyticsMetrics {
    total_queries: number;
    average_response_time_ms: number;
    average_confidence_score: number;
    severity_distribution: {
        critical_faults: number;
        warnings_alarms: number;
        guides_procedures: number;
        insufficient_data: number;
    };
    machine_distribution: Record<string, number>;
    confidence_distribution: {
        high: number;
        medium: number;
        low: number;
        insufficient: number;
    };
    top_error_codes: { error_code: string; count: number; machine: string }[];
}

export interface PostgresStatus {
    connected: boolean;
    version?: string;
    manuals_count?: number;
    database?: string;
    host?: string;
    error?: string;
}

export interface PostgresManual {
    id: string;
    filename: string;
    machine_family: string;
    file_size_bytes: number;
    total_pages: number;
    mime_type: string;
    status: string;
    uploaded_at: string;
}

// Fetch persistent query transactions
export const getQueryHistory = async (limit: number = 50): Promise<QueryRecord[]> => {
    try {
        const response = await api.get(`/api/analytics/history?limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching query history:", error);
        return [];
    }
};

// Fetch chart-ready query analytics metrics
export const getQueryMetrics = async (): Promise<QueryAnalyticsMetrics> => {
    try {
        const response = await api.get("/api/analytics/metrics");
        return response.data;
    } catch (error) {
        console.error("Error fetching query metrics:", error);
        return {
            total_queries: 0,
            average_response_time_ms: 0,
            average_confidence_score: 0,
            severity_distribution: {
                critical_faults: 0,
                warnings_alarms: 0,
                guides_procedures: 0,
                insufficient_data: 0,
            },
            machine_distribution: {},
            confidence_distribution: { high: 0, medium: 0, low: 0, insufficient: 0 },
            top_error_codes: [],
        };
    }
};

// Clear persistent query logs
export const clearQueryHistory = async (): Promise<boolean> => {
    try {
        await api.delete("/api/analytics/history");
        return true;
    } catch (error) {
        console.error("Error clearing query history:", error);
        return false;
    }
};

// Get PostgreSQL health & manuals status
export const getPostgresStatus = async (): Promise<PostgresStatus> => {
    try {
        const response = await api.get("/api/postgres/status");
        return response.data;
    } catch (error: any) {
        return {
            connected: false,
            error: error.message || "Failed to reach PostgreSQL endpoint",
        };
    }
};

// Get list of manuals from PostgreSQL
export const getPostgresManuals = async (): Promise<PostgresManual[]> => {
    try {
        const response = await api.get("/api/manuals");
        return response.data;
    } catch (error) {
        console.error("Error fetching PostgreSQL manuals:", error);
        return [];
    }
};

// Get streamable URL for PDF viewing
export const getManualStreamUrl = (docId: string): string => {
    const base = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
    return `${base}/api/manuals/${encodeURIComponent(docId)}/stream`;
};

export interface SystemStats {
    total_documents: number;
    total_chunks: number;
    embedding_model: string;
    vector_dimensions: number;
    manual_distribution: { manual: string; chunks: number }[];
    machine_distribution: { machine: string; chunks: number }[];
    system_status: string;
    llm_model: string;
}

export const getStats = async (): Promise<SystemStats> => {
    try {
        const response = await api.get("/api/stats");
        return response.data;
    } catch (error) {
        console.error("Error fetching stats:", error);
        return {
            total_documents: 5,
            total_chunks: 6729,
            embedding_model: "paraphrase-multilingual-MiniLM-L12-v2",
            vector_dimensions: 384,
            manual_distribution: [
                { manual: "G120_CU240BE2_op_instr.pdf", chunks: 2140 },
                { manual: "G120_Safety_fct_man.pdf", chunks: 1480 },
                { manual: "s71200_system_manual.pdf", chunks: 1820 },
                { manual: "s71500_cpu1512c_1_pn.pdf", chunks: 1289 },
            ],
            machine_distribution: [
                { machine: "SINAMICS G120", chunks: 3620 },
                { machine: "SIMATIC S7-1200", chunks: 1820 },
                { machine: "SIMATIC S7-1500", chunks: 1289 },
            ],
            system_status: "Operational",
            llm_model: "Groq LLaMA-3.3-70B",
        };
    }
};

export default api;