"""process.py: PDF -> questions -> memo -> CLEANED question bank. Use this instead of try_it.py.

  python process.py paper "data\\raw\\ps1.pdf" "ps1"            grade is read from the cover page
  python process.py paper "data\\raw\\ps1.pdf" "ps1" 10         ...or type it yourself
  python process.py memo  "data\\raw\\ps1_memo.pdf" "ps1"       same name as the paper
  python process.py clean ps1                                    clean one saved paper again
  python process.py clean all                                    clean every paper
  python process.py report                                       one line per paper

Always do the paper first, then its memo with the SAME name.
"""
import sys

import database
from cleaner import clean_all, clean_paper, detect_paper_info, print_report
from extract import extract_text
from matcher import match_memo
from splitter import mark_report, split_memo, split_paper


def do_paper(pdf, name, grade=None, subject=None):
    info = extract_text(pdf)
    print("Read the PDF :", "OCR (scanned)" if info["used_ocr"] else "directly (digital)", "|", info["pages"], "pages")
    text = info["text_path"].read_text(encoding="utf-8")
    cover = detect_paper_info(text)
    if grade is None:
        if not cover["grade"]:
            print("Could not read the grade from the cover page. Type it at the end, for example:")
            print(f'  python process.py paper "{pdf}" "{name}" 11')
            return
        grade = cover["grade"]
        print(f"Grade        : {grade} (read from the cover page)")
    elif cover["grade"] and cover["grade"] != str(grade):
        print(f"WARNING: you typed grade {grade} but the cover page says GRADE {cover['grade']}. "
              f"Using {grade}. Check that you picked the right file.")
    subject = subject or cover["subject"] or "Physical Sciences"

    rows, totals, warnings = split_paper(info["text_path"])
    if not rows:
        print("NO QUESTIONS FOUND.", *warnings, sep="\n")
        return
    for r in rows:
        r["grade"], r["subject"] = str(grade), subject
    database.save_paper(rows, name)
    print(f"Saved '{name}': {len(rows)} rows")
    print("\nMarks per question (found vs the [total] printed on the paper):")
    for m in mark_report(rows, totals):
        print(f"  Q{m['question']:>2}: {m['found']:>3} vs {str(m['stated']):>4}", "" if m["ok"] else "   <-- CHECK (the cleaner will try to fix this)")
    for w in warnings:
        print("WARNING:", w)
    print_report(clean_paper(name, text_path=info["text_path"]))


def do_memo(pdf, name):
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
    for w in warnings:
        print("WARNING:", w)
    print_report(clean_paper(name))


def do_clean(name):
    if name.lower() == "all":
        for rep in clean_all():
            print_report(rep)
    else:
        print_report(clean_paper(name))


def do_report():
    papers = database.list_papers()
    if not papers:
        print("The bank is empty.")
    for p in papers:
        print(f"{p['paper']:<20} grade {p['grade']:<3} {p['questions']:>3} questions | "
              f"{p['ready']} ready, {p['needs_fix']} need fixing, {p['excluded']} excluded | "
              f"{p['with_memo']} with memo | {int(p['total_marks'])} marks")


def main(argv):
    cmd = argv[1] if len(argv) > 1 else ""
    try:
        if cmd == "paper" and len(argv) >= 4:
            do_paper(argv[2], argv[3], *argv[4:6])
        elif cmd == "memo" and len(argv) >= 4:
            do_memo(argv[2], argv[3])
        elif cmd == "clean" and len(argv) >= 3:
            do_clean(argv[2])
        elif cmd == "report":
            do_report()
        else:
            sys.exit(__doc__)
    except (FileNotFoundError, RuntimeError) as e:      # show a plain message, not a traceback
        sys.exit(f"ERROR: {e}")


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")        # avoids symbol errors on Windows
    except Exception:
        pass
    main(sys.argv)