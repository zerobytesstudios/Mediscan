"""Text extraction for uploaded medical documents."""
import os

from app.ai import prompts


def extract_text(file_path: str, ext: str) -> tuple[str, str]:
    """Extract readable text from a stored file.

    Returns (extracted_text, extraction_status).
    Statuses: extracted | empty | unsupported | ocr_required | error
    """
    try:
        if ext == ".txt":
            with open(file_path, "r", encoding="utf-8", errors="replace") as handle:
                text = handle.read()
            return (text.strip(), "extracted") if text.strip() else ("", "empty")

        if ext == ".pdf":
            return _extract_pdf(file_path)

        if ext in {".jpg", ".jpeg", ".png"}:
            return _extract_image(file_path)

        return ("", "unsupported")
    except Exception:
        return ("", "error")


def _extract_pdf(file_path: str) -> tuple[str, str]:
    try:
        from pypdf import PdfReader
    except ImportError:
        return ("", "unsupported")

    reader = PdfReader(file_path)
    chunks = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        if page_text.strip():
            chunks.append(page_text)
    text = "\n".join(chunks).strip()
    return (text, "extracted") if text else ("", "empty")


def _extract_image(file_path: str) -> tuple[str, str]:
    """Best-effort OCR. pytesseract is optional; if missing we fail gracefully."""
    try:
        import pytesseract  # type: ignore
        from PIL import Image  # type: ignore
    except ImportError:
        return (
            prompts.EXTRACTION_FALLBACK
            + " Image OCR requires optional packages (pytesseract and Pillow) to be installed.",
            "ocr_required",
        )

    try:
        text = pytesseract.image_to_string(Image.open(file_path)).strip()
    except Exception:
        return (
            prompts.EXTRACTION_FALLBACK + " The OCR engine (Tesseract) could not be started.",
            "ocr_required",
        )

    return (text, "extracted") if text else ("", "empty")


def looks_like_binary(file_path: str) -> bool:
    return os.path.getsize(file_path) > 0
