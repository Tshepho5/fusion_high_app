"""matcher.py: attach memo answers to the questions of a saved paper."""
from database import get_questions, update_questions


def match_memo(memo_rows, paper):
    """Match by question number. If the paper has a question (say 9.1) but the memo only has
    9.1.1 and 9.1.2, those answers are joined. The memo's marks are stored separately
    (memo_marks); the cleaner decides which marks to trust."""
    questions = get_questions(paper)
    if not questions:
        return {"status": "not_found"}

    remaining = {str(r["number"]).strip(): r for r in memo_rows}
    assign = {}

    for q in questions:                                     # 1. exact number
        n = q["number"].strip()
        if n in remaining:
            row = remaining.pop(n)
            assign[q["id"]] = (row["text"], row.get("marks"))
    for q in questions:                                     # 2. answers filed under sub-numbers
        if q["id"] in assign:
            continue
        n = q["number"].strip()
        kids = sorted(k for k in remaining if k.startswith(n + "."))
        if kids:
            text = "\n\n".join(f"[{k}] {remaining[k]['text']}" for k in kids)
            marks = [remaining[k].get("marks") for k in kids]
            assign[q["id"]] = (text, sum(marks) if all(m is not None for m in marks) else None)
            for k in kids:
                remaining.pop(k)

    updates = []
    for q in questions:
        if q["id"] in assign:
            text, marks = assign[q["id"]]
            updates.append((q["id"], {"memo_text": text,
                                      "memo_marks": float(marks) if marks is not None else None}))
    update_questions(updates)

    leaf = [q for q in questions if not q["is_parent"]]
    missing = [q["number"] for q in leaf if q["id"] not in assign]
    return {"status": "ok", "leaf_questions": len(leaf), "with_memo": len(leaf) - len(missing),
            "missing": missing, "unmatched_memo": sorted(remaining)}