"""extract.py: PDF -> text file with '=== PAGE n ===' markers.

Digital PDFs (text you can select) are read directly: takes seconds.
Scanned PDFs (photos of pages) are sent through OCR first: can take minutes.
"""
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import config

MIN_CHARS_PER_PAGE = 30     # fewer characters per page than this = treat as a scan


def _read_pages(pdf_path):
    """Return the text of each page as a list of strings."""
    import pymupdf
    with pymupdf.open(pdf_path) as doc:
        return [page.get_text() for page in doc]


def _write_text(pages, txt_path):
    with open(txt_path, "w", encoding="utf-8") as f:
        for number, text in enumerate(pages, start=1):
            f.write(f"\n=== PAGE {number} ===\n{text}")


def _has_text(pages):
    """True if the PDF contains real selectable text (not just pictures)."""
    if not pages:
        return False
    total = sum(len(t.strip()) for t in pages)
    return total > 200 and total / len(pages) >= MIN_CHARS_PER_PAGE


def _run_ocr(src, dst, force):
    """Run ocrmypdf in a separate process. Raises RuntimeError with a readable message."""
    if not shutil.which("tesseract"):
        raise RuntimeError("Tesseract was not found. Install it, or check that "
                           r"C:\Program Files\Tesseract-OCR exists.")
    if not (shutil.which("gswin64c") or shutil.which("gs")):
        raise RuntimeError(r"Ghostscript was not found. Install it, or check that "
                           r"C:\Program Files\gs\...\bin exists.")
    jobs = max(1, min(4, (os.cpu_count() or 2) - 1))
    cmd = [sys.executable, "-m", "ocrmypdf", "-l", "eng", "--output-type", "pdf",
           "--optimize", "0", "-j", str(jobs)]
    cmd += ["--force-ocr", "--deskew"] if force else ["--skip-text"]
    cmd += [str(src), str(dst)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError("OCR failed: " + (result.stderr or "ocrmypdf gave no message")[-1200:])


def extract_text(pdf_path, force_ocr=False):
    """Read a PDF and save its text in data/text/<name>.txt.
    Returns {"text_path", "used_ocr", "pages", "characters"}."""
    pdf_path = Path(pdf_path)
    if not pdf_path.is_file():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")
    txt_path = config.TEXT_DIR / f"{pdf_path.stem}.txt"

    try:
        pages = _read_pages(pdf_path)
    except Exception as e:
        raise RuntimeError(f"Could not open the PDF (is it damaged or password-protected?): {e}")

    used_ocr = False
    if force_ocr or not _has_text(pages):
        ocr_pdf = config.TEXT_DIR / f"{pdf_path.stem}.ocr.pdf"
        _run_ocr(pdf_path, ocr_pdf, force_ocr)
        pages = _read_pages(ocr_pdf)
        used_ocr = True
        if not _has_text(pages):
            raise RuntimeError("OCR finished but almost no text was found. "
                               "Check that the scan is clear and upright.")

    _write_text(pages, txt_path)
    return {"text_path": txt_path, "used_ocr": used_ocr, "pages": len(pages),
            "characters": sum(len(t) for t in pages)}


# ---------------------------------------------------------------------------
# Try it:   python extract.py "C:\path\to\paper.pdf"          (auto-detect)
#           python extract.py "C:\path\to\paper.pdf" --ocr    (force OCR)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit('Usage: python extract.py "path\\to\\file.pdf" [--ocr]')
    info = extract_text(args[0], force_ocr="--ocr" in sys.argv)
    text = info["text_path"].read_text(encoding="utf-8")
    print("Text saved to :", info["text_path"])
    print("Method        :", "OCR (scanned PDF)" if info["used_ocr"] else "read directly (digital PDF)")
    print("Pages         :", info["pages"], "| characters:", info["characters"])
    print("QUESTION lines:", len(re.findall(r"^\s*QUESTION\s+\d+", text, re.M | re.I)))
    print("\n--- first 600 characters ---\n" + text[:600])