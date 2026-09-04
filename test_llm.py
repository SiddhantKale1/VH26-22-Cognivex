from rag.generator import generate_answer


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


question = "What is preventive maintenance?"


result = generate_answer(
    question,
    retrieved_chunks
)


print("\nANSWER:")
print(result["answer"])

print("\nSOURCES:")

for source in result["sources"]:
    print(source)