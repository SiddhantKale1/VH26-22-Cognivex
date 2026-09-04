import os

from dotenv import load_dotenv
from openai import OpenAI


load_dotenv()

api_key = os.getenv("NVIDIA_API_KEY")

if not api_key:
    raise ValueError("NVIDIA_API_KEY not found in .env file")


client = OpenAI(
    api_key=api_key,
    base_url="https://integrate.api.nvidia.com/v1"
)


def generate_answer(question: str, retrieved_chunks: list) -> dict:

    context_parts = []

    for i, chunk in enumerate(retrieved_chunks, start=1):
        text = chunk.get("text", "")
        metadata = chunk.get("metadata", {})

        context_parts.append(
            f"""
SOURCE {i}
Document: {metadata.get("document", "Unknown")}
Page: {metadata.get("page", "Unknown")}
Version: {metadata.get("version", "Unknown")}

Content:
{text}
"""
        )

    context = "\n\n".join(context_parts)

    prompt = f"""
You are an industrial machine troubleshooting assistant.

Answer the user's question using ONLY the manual context.

Rules:
1. Do not use outside knowledge.
2. Do not invent information.
3. If the answer is not present, say:
   "I could not find this information in the available manuals."
4. Give a concise answer.
5. Use the provided source information.

MANUAL CONTEXT:
{context}

USER QUESTION:
{question}
"""

    response = client.chat.completions.create(
        model="nvidia/nemotron-3.5-lightning-30b-a3b",
        messages=[
            {
                "role": "system",
                "content": "You are an industrial machine manual assistant."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.2,
        max_tokens=1000
    )

    answer = response.choices[0].message.content

    sources = [
        chunk.get("metadata", {})
        for chunk in retrieved_chunks
    ]

    return {
        "answer": answer,
        "sources": sources
    }