import pymupdf
import pytesseract

from PIL import Image


def needs_ocr(pages):
    """
    Determine whether a PDF probably needs OCR.
    """

    total_characters = sum(
        len(page["text"].strip())
        for page in pages
    )

    return total_characters < 100


def ocr_pdf(pdf_path: str):
    """
    Run OCR on every page of a PDF.
    """

    document = pymupdf.open(pdf_path)

    pages = []

    for page_number, page in enumerate(
        document,
        start=1
    ):

        pix = page.get_pixmap(
            matrix=pymupdf.Matrix(2, 2)
        )

        image = Image.frombytes(
            "RGB",
            [pix.width, pix.height],
            pix.samples
        )

        text = pytesseract.image_to_string(image)

        pages.append({
            "page_number": page_number,
            "text": text
        })

    document.close()

    return pages