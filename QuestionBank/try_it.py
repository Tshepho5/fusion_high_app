"""try_it.py: run one PDF through the whole chain and print a report.

  python try_it.py paper "data\\raw\\nov2023_p1.pdf" "Nov 2023 P1"
  python try_it.py memo  "data\\raw\\nov2023_p1_memo.pdf" "Nov 2023 P1"

Always do the paper first, then the memo with the SAME name.
Optional extras for a paper:  grade (default 11)  and  subject (default Physical Sciences)
"""
import sys

from extract import extract_text
from splitter import split_paper, split_memo, mark_report
from matcher import match_memo
import database


def show_paper(pdf, name, grade="11", subject="Physical Sciences"):
    info = extract_text(pdf)
    print("Read the PDF :", "OCR (scanned)" if info["used_ocr"] else "directly (digital)", "|", info["pages"], "pages")
    rows, totals, warnings = split_paper(info["text_path"])
    if not rows:
        print("NO QUESTIONS FOUND.", *warnings, sep="\n")
        return
    for r in rows:
        r["grade"], r["subject"] = grade, subject
    database.save_paper(rows, name)
    leaf = [r for r in rows if not r["is_parent"]]
    print(f"Saved '{name}': {len(rows)} rows ({len(leaf)} real questions)")
    print("Total marks  :", int(sum(r["marks"] or 0 for r in leaf)), "(a full paper is usually 150)")
    print("\nMarks per question (found vs the [total] printed on the paper):")
    for m in mark_report(rows, totals):
        print(f"  Q{m['question']:>2}: {m['found']:>3} vs {str(m['stated']):>4}", "" if m["ok"] else "   <-- CHECK")
    missing = [r["number"] for r in leaf if r["marks"] is None]
    print("\nQuestions with no mark found:", missing or "none")
    print("Flagged for review:", sum(r["needs_review"] for r in rows), "of", len(rows))
    for w in warnings:
        print("WARNING:", w)
    print("\nFirst 6 questions:")
    for r in rows[:6]:
        print(f"  {r['number']:>6} ({r['marks']}) {r['text'][:80]}")


def show_memo(pdf, name):
    info = extract_text(pdf)
    print("Read the PDF :", "OCR (scanned)" if info["used_ocr"] else "directly (digital)", "|", info["pages"], "pages")
    rows, warnings = split_memo(info["text_path"])
    if not rows:
        print("NO MEMO ANSWERS FOUND.", *warnings, sep="\n")
        return
    res = match_memo(rows, name)
    if res["status"] == "not_found":
        print(f"No saved question paper is called '{name}'. Do the paper first, using exactly the same name.")
        return
    print(f"Memo answers found : {len(rows)}")
    print(f"Questions with memo: {res['with_memo']} of {res['leaf_questions']}")
    print("Questions missing a memo:", res["missing"] or "none")
    print("Memo answers that matched no question:", res["unmatched_memo"] or "none")
    print("Marks filled in from the memo:", res["marks_filled"] or "none")
    print("Mark differences (paper vs memo):", res["mark_mismatch"] or "none")
    for w in warnings:
        print("WARNING:", w)
    print("\nFirst 4 answers:")
    for r in rows[:4]:
        print(f"  {r['number']:>6}: {r['text'][:80]!r}")


def main(argv):
    if len(argv) < 4 or argv[1] not in ("paper", "memo"):
        sys.exit(__doc__)
    if argv[1] == "paper":
        show_paper(argv[2], argv[3], *argv[4:6])
    else:
        show_memo(argv[2], argv[3])


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")        # avoids symbol errors on Windows
    except Exception:
        pass
    main(sys.argv)