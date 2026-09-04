from fastapi import FastAPI
from pydantic import BaseModel

from rag.generator import generate_answer


app = FastAPI(
    title="Industrial Manual RAG API",
    version="1.0"
)


class QuestionRequest(BaseModel):
    question: str


@app.get("/")
def root():
    return {
        "status": "running",
        "message": "Industrial Manual RAG API"
    }


@app.post("/ask")
def ask_question(request: QuestionRequest):

    # Temporary data
    # Later this will come from Person 2's retriever
    retrieved_chunks = [
        {
            "text": """
            Preventive maintenance consists of regularly scheduled
            inspection and servicing of machine components to reduce
            the possibility of unexpected failures.
            """,
            "metadata": {
                "document": "machine_manual.pdf",
                "page": 10,
                "version": "1.0"
            }
        }
    ]

    result = generate_answer(
        request.question,
        retrieved_chunks
    )

    return result