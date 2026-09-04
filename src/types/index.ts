export interface Document {
    id: string;
    name: string;
    manufacturer: string;
    machine: string;
    version: string;
    language: string;
    status: string;
}

export interface Source {
    document: string;
    page: number;
}

export interface QueryResponse {
    answer: string;
    sources: Source[];
}

export interface ErrorResponse {
    error_code: string;
    possible_causes: string[];
    recommended_actions: string[];
    sources: Source[];
}