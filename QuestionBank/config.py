"""config.py: folders, database location and shared settings. Edit settings here."""
import os
from pathlib import Path

# Everything is stored relative to this file, so the project can live in any folder.
BASE = Path(__file__).resolve().parent
RAW_DIR = BASE / "data" / "raw"        # uploaded PDFs
TEXT_DIR = BASE / "data" / "text"      # text read from the PDFs
DB_PATH = BASE / "data" / "question_bank.db"

for _folder in (RAW_DIR, TEXT_DIR):
    _folder.mkdir(parents=True, exist_ok=True)

# Windows only: let Python find Tesseract and Ghostscript (used later for scanned PDFs).
# Nothing happens if they are not installed.
_tesseract = Path(r"C:\Program Files\Tesseract-OCR")
if _tesseract.exists() and str(_tesseract) not in os.environ.get("PATH", ""):
    os.environ["PATH"] += os.pathsep + str(_tesseract)
for _gs in Path(r"C:\Program Files\gs").glob("gs*/bin"):
    if str(_gs) not in os.environ.get("PATH", ""):
        os.environ["PATH"] += os.pathsep + str(_gs)

# Question types a question can be labelled with (used in Step 6 and the review page).
QTYPES = ["multiple choice", "definition", "calculation", "explanation", "drawing/graph", "other"]