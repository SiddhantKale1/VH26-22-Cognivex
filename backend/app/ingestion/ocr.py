"""
Multi-Engine Industrial OCR Pipeline.
Extracts structured text from scanned technical manuals, schematics, and table registers
with automatic deskewing, CLAHE contrast enhancement, and multi-engine fallback.
"""

import logging
import pymupdf

from .preprocessor import preprocess_for_ocr

logger = logging.getLogger(__name__)

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False

try:
    import easyocr
    EASYOCR_AVAILABLE = True
    _easyocr_reader = None
except ImportError:
    EASYOCR_AVAILABLE = False
    _easyocr_reader = None


def get_easyocr_reader():
    """Lazily initialize EasyOCR reader."""
    global _easyocr_reader
    if _easyocr_reader is None and EASYOCR_AVAILABLE:
        try:
            logger.info("Initializing EasyOCR reader (English)...")
            _easyocr_reader = easyocr.Reader(['en'], gpu=False)
        except Exception as e:
            logger.warning(f"Failed to initialize EasyOCR: {e}")
            _easyocr_reader = None
    return _easyocr_reader


def needs_ocr(pages: list[dict], min_avg_chars: int = 50) -> bool:
    """
    Determine whether a PDF is scanned or image-based and requires OCR.
    Checks total character count and average characters per page.
    """
    if not pages:
        return True

    total_characters = sum(len(page.get("text", "").strip()) for page in pages)
    avg_chars = total_characters / len(pages)

    # If document has less than 100 total characters or avg page is nearly empty, trigger OCR
    return total_characters < 100 or avg_chars < min_avg_chars


def ocr_page_image(image_obj) -> str:
    """
    Extract text from a single image using preprocessed multi-engine pipeline:
    1. Preprocess image (deskew, CLAHE contrast, denoise).
    2. Attempt Pytesseract extraction.
    3. Attempt EasyOCR extraction if Pytesseract is not available or fails.
    """
    processed_img = preprocess_for_ocr(image_obj)
    text = ""

    # Engine 1: PyTesseract
    if PYTESSERACT_AVAILABLE:
        try:
            custom_config = r'--oem 3 --psm 3'
            text = pytesseract.image_to_string(processed_img, config=custom_config).strip()
            if text:
                return text
        except Exception as e:
            logger.debug(f"Pytesseract skipped: {e}")

    # Engine 2: EasyOCR
    reader = get_easyocr_reader()
    if reader is not None:
        try:
            import numpy as np
            img_np = np.array(processed_img)
            results = reader.readtext(img_np, detail=0, paragraph=True)
            text = "\n\n".join(results).strip()
            if text:
                return text
        except Exception as e:
            logger.debug(f"EasyOCR skipped: {e}")

    return text


def ocr_pdf(pdf_path: str, zoom: float = 1.5) -> list[dict]:
    """
    Execute optimized selective OCR on a PDF document:
    1. Extracts native embedded text first.
    2. Only rasterizes and runs image OCR on pages with insufficient text (< 40 characters).
    3. Preserves 1-indexed page numbers.
    """
    logger.info(f"Starting optimized hybrid extraction on: {pdf_path}")
    doc = pymupdf.open(pdf_path)
    pages = []

    for page_number, page in enumerate(doc, start=1):
        native_text = page.get_text("text").strip()
        
        # If page already has rich embedded text, use it directly (instant)
        if len(native_text) >= 40:
            pages.append({
                "page_number": page_number,
                "text": native_text
            })
            continue

        # Page is scanned or contains an image/schematic -> run preprocessed OCR
        try:
            pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
            extracted_text = ""
            if PIL_AVAILABLE:
                image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                extracted_text = ocr_page_image(image)

            pages.append({
                "page_number": page_number,
                "text": extracted_text or native_text or "[Technical Diagram / Schematic]"
            })
        except Exception as e:
            logger.warning(f"Page {page_number} OCR fallback notice: {e}")
            pages.append({
                "page_number": page_number,
                "text": native_text or ""
            })

    doc.close()
    logger.info(f"Completed hybrid extraction on {len(pages)} pages.")
    return pages