"""Tests for PDF text extraction."""

import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from app.ingestion.pdf_loader import PDFLoader
from app.models.schemas import PageContent


@pytest.fixture
def pdf_loader():
    """Return a PDFLoader instance."""
    return PDFLoader()


@pytest.fixture
def sample_pdf_path(tmp_path):
    """Create a minimal test PDF and return its path."""
    import fitz

    pdf_path = tmp_path / "test_manual.pdf"
    doc = fitz.open()

    # Page 1 with content
    page1 = doc.new_page()
    page1.insert_text((72, 72), "Error E404 indicates spindle overload.")

    # Page 2 with content
    page2 = doc.new_page()
    page2.insert_text((72, 72), "Check motor winding resistance between phases.")

    # Page 3 empty (no text)
    doc.new_page()

    doc.save(str(pdf_path))
    doc.close()
    return pdf_path


class TestPDFLoader:
    """Test suite for PDFLoader."""

    def test_load_valid_pdf(self, pdf_loader, sample_pdf_path):
        """Test loading a valid PDF extracts pages correctly."""
        pages = pdf_loader.load(sample_pdf_path)

        # Should get 2 pages (page 3 is empty)
        assert len(pages) == 2

        # Check page numbers are 1-indexed
        assert pages[0].page_number == 1
        assert pages[1].page_number == 2

        # Check content
        assert "E404" in pages[0].text
        assert "spindle overload" in pages[0].text
        assert "motor winding" in pages[1].text

        # Check source filename
        assert pages[0].source_file == "test_manual.pdf"
        assert pages[1].source_file == "test_manual.pdf"

    def test_load_missing_file(self, pdf_loader, tmp_path):
        """Test that missing files raise FileNotFoundError."""
        fake_path = tmp_path / "nonexistent.pdf"
        with pytest.raises(FileNotFoundError):
            pdf_loader.load(fake_path)

    def test_load_non_pdf(self, pdf_loader, tmp_path):
        """Test that non-PDF files raise ValueError."""
        txt_file = tmp_path / "readme.txt"
        txt_file.write_text("Not a PDF")
        with pytest.raises(ValueError, match="not a PDF"):
            pdf_loader.load(txt_file)

    def test_load_empty_pdf(self, pdf_loader, tmp_path):
        """Test that PDFs with no extractable text return empty list."""
        import fitz

        pdf_path = tmp_path / "empty.pdf"
        doc = fitz.open()
        # Add a blank page (PyMuPDF can't save 0-page docs)
        doc.new_page()
        doc.save(str(pdf_path))
        doc.close()

        pages = pdf_loader.load(pdf_path)
        assert len(pages) == 0

    def test_pages_are_page_content_objects(self, pdf_loader, sample_pdf_path):
        """Test that returned items are PageContent instances."""
        pages = pdf_loader.load(sample_pdf_path)
        for page in pages:
            assert isinstance(page, PageContent)

    def test_empty_pages_skipped(self, pdf_loader, sample_pdf_path):
        """Test that pages with no text are skipped."""
        pages = pdf_loader.load(sample_pdf_path)
        # Our sample has 3 pages but only 2 have text
        assert len(pages) == 2
        page_numbers = [p.page_number for p in pages]
        assert 3 not in page_numbers

    def test_path_as_string(self, pdf_loader, sample_pdf_path):
        """Test that string paths work (converted to Path internally)."""
        pages = pdf_loader.load(str(sample_pdf_path))
        assert len(pages) == 2
