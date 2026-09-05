from langchain_text_splitters import (
    RecursiveCharacterTextSplitter
)


splitter = RecursiveCharacterTextSplitter(
    chunk_size=1500,
    chunk_overlap=250,
    separators=[
        "\n\n",
        "\n",
        ". ",
        " ",
        ""
    ]
)


def create_chunks(pages, metadata):

    chunks = []

    for page in pages:

        page_text = page["text"]

        if not page_text.strip():
            continue

        split_texts = splitter.split_text(
            page_text
        )

        for index, text in enumerate(
            split_texts
        ):

            chunks.append({
                "chunk_id": (
                    f"{metadata['document_id']}"
                    f"_p{page['page_number']}"
                    f"_c{index}"
                ),

                "document_id": (
                    metadata["document_id"]
                ),

                "text": text,

                "metadata": {
                    **metadata,
                    "page_number": (
                        page["page_number"]
                    )
                }
            })

    return chunks