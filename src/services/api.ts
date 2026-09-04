import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

export const askQuestion = async (question: string) => {
    console.log("Question sent to backend:", question);

    await new Promise((resolve) => setTimeout(resolve, 1000));

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

export default api;