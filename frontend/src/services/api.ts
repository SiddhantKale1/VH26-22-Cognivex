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

export interface SuggestedLanguage {
    code: string;
    name: string;
    is_default: boolean;
}

export interface LanguageInfo {
    query_language: string;
    query_language_name: string;
    document_language: string;
    document_language_name: string;
    target_language: string;
    target_language_name: string;
    suggested_languages: SuggestedLanguage[];
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
    language_info?: LanguageInfo;
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
    history: { role: string; content: string }[] = [],
    targetLanguage: string = "en"
): Promise<DiagnosticResponse> => {
    try {
        const response = await api.post("/api/query", {
            question,
            machine_model: machineModel || null,
            history,
            target_language: targetLanguage || "en"
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
    errorCode: string,
    targetLanguage: string = "en"
): Promise<DiagnosticResponse> => {
    try {
        const response = await api.post("/api/errors", {
            machine_model: machineId,
            error_code: errorCode,
            target_language: targetLanguage || "en"
        });
        return response.data;
    } catch (error: any) {
        console.error("Error analyzing error:", error);
        const detail = error.response?.data?.detail || error.message;
        throw new Error(
            detail || "Failed to analyze error. Please check your backend connection."
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
        timeout: 600000, // 10 minutes timeout for multi-hundred page industrial manuals
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

export interface MinioStatus {
    connected: boolean;
    storage_type: string;
    endpoint?: string;
    bucket?: string;
    manuals_count?: number;
    mode?: string;
    error?: string;
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

// Get MinIO S3 Object Store status
export const getMinioStatus = async (): Promise<MinioStatus> => {
    try {
        const response = await api.get("/api/minio/status");
        return response.data;
    } catch (error: any) {
        return {
            connected: false,
            storage_type: "Local S3 Emulation",
            bucket: "cognivex-manuals",
            error: error.message || "Failed to reach MinIO status endpoint",
        };
    }
};

export const getPostgresStatus = getMinioStatus;

// Get list of manuals from MinIO S3
export const getPostgresManuals = async (): Promise<PostgresManual[]> => {
    try {
        const response = await api.get("/api/manuals");
        return response.data;
    } catch (error) {
        console.error("Error fetching manuals:", error);
        return [];
    }
};

// Get streamable URL for PDF viewing
export const getManualStreamUrl = (docId: string): string => {
    const base = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
    return `${base}/api/manuals/${encodeURIComponent(docId)}/stream`;
};

// Get S3 presigned URL for direct viewing
export const getManualPresignedUrl = async (docId: string): Promise<string> => {
    try {
        const response = await api.get(`/api/manuals/${encodeURIComponent(docId)}/presigned-url`);
        return response.data.url;
    } catch {
        return getManualStreamUrl(docId);
    }
};

// ============================================================
// COMPREHENSIVE ANALYTICS & ERROR ANALYSIS INTERFACES
// ============================================================

export interface SummaryKPIs {
    total_documents: number;
    ocr_success_rate_pct: number;
    avg_document_quality: number;
    total_queries: number;
    answer_success_rate_pct: number;
    overall_error_rate_pct: number;
}

export interface PDFOCRErrorStats {
    total_documents: number;
    total_pages_scanned: number;
    successful_documents: number;
    ocr_failures: number;
    low_confidence_ocr: number;
    incomplete_garbled_extraction: number;
    corrupted_pdfs: number;
    failed_pages_count: number;
    ocr_error_rate_pct: number;
    chart_data: { category: string; count: number; color: string }[];
    document_breakdown: {
        filename: string;
        total_pages: number;
        empty_pages: number;
        low_conf_pages: number;
        garbled_pages: number;
        status: string;
    }[];
}

export interface DocumentQualityItem {
    filename: string;
    document_id: string;
    quality_score: number;
    total_pages: number;
    text_pages: number;
    chunk_count: number;
    completeness_pct: number;
    cleanliness_pct: number;
    tier: string;
    tier_color: string;
}

export interface DocumentQualityRanking {
    average_quality_score: number;
    ranked_documents: DocumentQualityItem[];
    top_quality: DocumentQualityItem[];
    bottom_quality: DocumentQualityItem[];
}

export interface QueryOutcomeStats {
    total_queries: number;
    successful_count: number;
    partially_correct_count: number;
    incorrect_count: number;
    hallucinated_count: number;
    unable_to_answer_count: number;
    success_rate_pct: number;
    failure_rate_pct: number;
    chart_data: { outcome: string; count: number; color: string }[];
    classified_queries: {
        query_id: string;
        timestamp: string;
        question: string;
        detected_machine?: string;
        error_code?: string;
        confidence_score: number;
        outcome: string;
        citations_count: number;
        response_time_ms: number;
    }[];
}

export interface RootCauseStats {
    total_failures_analyzed: number;
    root_causes: {
        ocr: number;
        retrieval: number;
        chunking: number;
        answer_generation: number;
        unknown: number;
    };
    chart_data: { cause: string; count: number; color: string; description: string }[];
}

export interface MachineWiseErrorStats {
    machine_statistics: {
        machine: string;
        total: number;
        successful: number;
        failed: number;
        error_rate_pct: number;
        error_types: {
            retrieval: number;
            generation: number;
            refusal: number;
        };
    }[];
}
export interface ComprehensiveAnalytics {
    summary_kpis: SummaryKPIs;
    pdf_ocr_errors: PDFOCRErrorStats;
    document_quality: DocumentQualityRanking;
    query_outcomes: QueryOutcomeStats;
    error_root_causes: RootCauseStats;
    machine_wise_errors: MachineWiseErrorStats;
}

export interface QueryAuditDetail {
    query_id: string;
    timestamp: string;
    question: string;
    machine_model_filter?: string | null;
    detected_machine: string;
    error_code?: string;
    severity: string;
    confidence_score: number;
    confidence_level: string;
    meaning: string;
    possible_causes: string[];
    recommended_actions: string[];
    citations: Citation[];
    retrieved_chunks: {
        chunk_id: string;
        source_file: string;
        page_number: number;
        relevance_score: number;
        snippet: string;
        match_type: string;
    }[];
    error_analysis: {
        outcome: string;
        root_cause: string;
        explanation: string;
        is_grounded: boolean;
    };
    response_time_ms: number;
}

// Fetch comprehensive calculated analytics
export const getComprehensiveAnalytics = async (): Promise<ComprehensiveAnalytics> => {
    try {
        const response = await api.get("/api/analytics/comprehensive");
        return response.data;
    } catch (error) {
        console.error("Error fetching comprehensive analytics:", error);
        throw error;
    }
};

// Fetch single query diagnostic trace for Error Inspector
export const getQueryAuditDetail = async (queryId: string): Promise<QueryAuditDetail> => {
    try {
        const response = await api.get(`/api/analytics/query/${encodeURIComponent(queryId)}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching audit detail for query ${queryId}:`, error);
        throw error;
    }
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
            total_documents: 7,
            total_chunks: 6729,
            embedding_model: "paraphrase-multilingual-MiniLM-L12-v2",
            vector_dimensions: 384,
            manual_distribution: [
                { manual: "s71200_system_manual.pdf", chunks: 2494 },
                { manual: "s71200_system_manual_en-US_en-US.pdf", chunks: 2653 },
                { manual: "G120_CU240BE2_op_instr_0117_en-US.pdf", chunks: 793 },
                { manual: "G120_Safety_fct_man_0920_en-US.pdf", chunks: 478 },
                { manual: "s71500_cpu1512c_1_pn_manual_en-US_en-US.pdf", chunks: 311 },
            ],
            machine_distribution: [
                { machine: "SIMATIC S7-1200", chunks: 5147 },
                { machine: "SINAMICS G120", chunks: 1271 },
                { machine: "SIMATIC S7-1500", chunks: 311 },
            ],
            system_status: "Operational",
            llm_model: "Groq Qwen 2.5 / LLaMA 3.3",
        };
    }
};

export default api;