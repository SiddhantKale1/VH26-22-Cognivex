import re


def clean_text(text: str) -> str:

    # Normalize line endings
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    # Remove excessive spaces
    text = re.sub(r"[ \t]+", " ", text)

    # Reduce excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Remove spaces around lines
    text = "\n".join(
        line.strip()
        for line in text.split("\n")
    )

    return text.strip()


def clean_pages(pages):

    cleaned_pages = []

    for page in pages:

        text = clean_text(page["text"])

        cleaned_pages.append({
            "page_number": page["page_number"],
            "text": text
        })

    return cleaned_pages