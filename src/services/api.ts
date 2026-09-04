import axios from "axios";

const api = axios.create({
    baseURL:
        import.meta.env.VITE_API_URL ||
        "http://localhost:8000",
});

// Ask a question
export const askQuestion = async (question: string) => {
    console.log("Question sent to backend:", question);

    // Temporary mock response
    await new Promise((resolve) =>
        setTimeout(resolve, 1000)
    );

    return {
        answer:
            "The motor may be overheating because of excessive load, insufficient cooling, or poor ventilation.",

        sources: [
            {
                document: "Siemens Motor Manual",
                page: 42,
            },
        ],
    };
};

// Get documents
export const getDocuments = async () => {
    // Temporary mock response
    await new Promise((resolve) =>
        setTimeout(resolve, 700)
    );

    return [
        {
            id: "1",
            name: "Siemens S7-1200 System Manual",
            manufacturer: "Siemens",
            machine: "S7-1200 PLC",
            version: "2024",
            language: "English",
            status: "Processed",
        },
        {
            id: "2",
            name: "Siemens SINAMICS Manual",
            manufacturer: "Siemens",
            machine: "SINAMICS Drive",
            version: "2023",
            language: "English",
            status: "Processed",
        },
        {
            id: "3",
            name: "Industrial Motor Manual",
            manufacturer: "Siemens",
            machine: "Industrial Motor",
            version: "2024",
            language: "English",
            status: "Processed",
        },
    ];
};

// Analyze machine error
export const analyzeError = async (
    machineId: string,
    errorCode: string
) => {
    console.log(
        "Machine:",
        machineId,
        "Error:",
        errorCode
    );

    // Temporary mock response
    await new Promise((resolve) =>
        setTimeout(resolve, 1000)
    );

    return {
        error_code: errorCode,

        possible_causes: [
            "Motor overload detected.",
            "Insufficient cooling or ventilation.",
            "Electrical connection problem.",
        ],

        recommended_actions: [
            "Check the motor load.",
            "Inspect the cooling and ventilation system.",
            "Check electrical connections.",
            "Restart the machine after resolving the issue.",
        ],

        sources: [
            {
                document:
                    "Siemens S7-1200 System Manual",
                page: 87,
            },
        ],
    };
};

export default api;