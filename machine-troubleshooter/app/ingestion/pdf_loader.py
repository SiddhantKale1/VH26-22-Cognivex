"""PDF text extraction using PyMuPDF."""

import logging
from pathlib import Path

import fitz  # PyMuPDF

from app.models.schemas import PageContent

logger = logging.getLogger(__name__)


class PDFLoader:
    """Extracts text content from PDF files page by page."""

    def load(self, file_path: Path) -> list[PageContent]:
        """
        Extract text from each page of a PDF file.

        Args:
            file_path: Path to the PDF file.

        Returns:
            List of PageContent objects, one per page with text.

        Raises:
            FileNotFoundError: If the file does not exist.
            ValueError: If the file is not a PDF or is empty.
            RuntimeError: If PDF extraction fails.
        """
        file_path = Path(file_path)

        # Validate file exists
        if not file_path.exists():
            raise FileNotFoundError(f"PDF file not found: {file_path}")

        # Validate extension
        if file_path.suffix.lower() != ".pdf":
            raise ValueError(f"File is not a PDF: {file_path.suffix}")

        logger.info("Loading PDF: %s", file_path.name)

        try:
            doc = fitz.open(str(file_path))
        except Exception as e:
            raise RuntimeError(f"Failed to open PDF '{file_path.name}': {e}") from e

        if doc.page_count == 0:
            doc.close()
            raise ValueError(f"PDF is empty (0 pages): {file_path.name}")

        pages: list[PageContent] = []
        source_filename = file_path.name

        for page_num in range(doc.page_count):
            try:
                page = doc.load_page(page_num)
                text = page.get_text("text").strip()

                if not text:
                    logger.warning(
                        "Page %d of '%s' has no extractable text — skipping.",
                        page_num + 1,
                        source_filename,
                    )
                    continue

                pages.append(
                    PageContent(
                        page_number=page_num + 1,  # 1-indexed
                        text=text,
                        source_file=source_filename,
                    )
                )
            except Exception as e:
                logger.error(
                    "Error extracting page %d from '%s': %s",
                    page_num + 1,
                    source_filename,
                    e,
                )
                continue

        total_pages = doc.page_count
        doc.close()

        logger.info(
            "Extracted %d pages with text from '%s' (%d total pages).",
            len(pages),
            source_filename,
            total_pages,
        )

        return pages
