"""cleaner.py: keeps the question bank clean. Runs after every upload.

Every question gets ONE status:
  heading    a question that only introduces sub-questions (2.3 above 2.3.1, 2.3.2)
  ready      safe to use in quizzes and papers
  needs_fix  a person must repair something first (missing mark, scrambled text, no memo...)
  excluded   will never be used (cancelled by the memo, duplicate of another question)
Nothing is ever deleted. The reason is always written in the 'notes' column.
"""
import itertools
import re

import config
from database import get_questions, update_questions

CANCEL_RE = re.compile(
    r"ignore\s+this\s+question|ignoreer\s+hierdie\s+vraag|"
    r"question\s+(?:was\s+|is\s+)?(?:cancelled|canceled|deleted|removed)|"
    r"vraag\s+(?:is\s+)?(?:geskrap|gekanselleer)", re.I)

# A question that needs a diagram/graph/table GIVEN to the learner.
# "Draw a graph" or "graphite" must NOT match, so these are specific phrases.
NOUN = r"(?:diagram|graph|figure|table|circuit|picture|sketch|map)"
NEEDS_DIAGRAM_RE = re.compile(
    rf"\brefer\s+to\s+(?:the\s+)?(?:following\s+)?{NOUN}|"
    rf"\b(?:study|examine|consider|use)\s+(?:the\s+)?(?:following\s+)?{NOUN}|"
    rf"\b{NOUN}s?\s+(?:below|above|alongside|shows?|represents?|illustrates?)\b|"
    rf"\b(?:shown|given|illustrated|represented|drawn)\s+(?:below|above)\b|"
    rf"\b(?:shown|given|illustrated|represented)\s+in\s+(?:the\s+)?{NOUN}|"
    rf"\bin\s+the\s+{NOUN}\b|\bfigure\s+\d", re.I)

MONTHS = ("FEBRUARY|FEBRUARIE|MARCH|MAART|MAY|MEI|JUNE|JUNIE|JULY|JULIE|AUGUST|AUGUSTUS|"
          "SEPTEMBER|OCTOBER|OKTOBER|NOVEMBER|DECEMBER|DESEMBER")


# ---------------------------------------------------------------------------
# Reading the cover page
# ---------------------------------------------------------------------------
def detect_paper_info(text):
    """Read grade, subject, branch, paper number, exam month/year and marks from the cover page.
    Anything not found is None."""
    head = "\n".join((text or "").splitlines()[:80])
    info = dict.fromkeys(["grade", "subject", "branch", "paper", "exam", "marks"])
    m = re.search(r"\b(?:GRADE|GRAAD)\s*(\d{1,2})\b", head, re.I)
    if m and 8 <= int(m.group(1)) <= 12:
        info["grade"] = m.group(1)
    for pattern, name in (("Physical Sciences|Fisiese Wetenskappe", "Physical Sciences"),
                          ("Natural Sciences|Natuurwetenskappe", "Natural Sciences"),
                          ("Life Sciences|Lewenswetenskappe", "Life Sciences"),
                          ("Mathematics|Wiskunde", "Mathematics")):
        if re.search(pattern, head, re.I):
            info["subject"] = name
            break
    m = re.search(r"\b(PHYSICS|CHEMISTRY|FISIKA|CHEMIE)\b", head, re.I)
    if m:
        info["branch"] = {"fisika": "Physics", "chemie": "Chemistry"}.get(m.group(1).lower(), m.group(1).capitalize())
    m = re.search(r"\(\s*[PV]\s*(\d)\s*\)|\b(?:PAPER|VRAESTEL)\s*(\d)\b", head, re.I)
    if m:
        info["paper"] = m.group(1) or m.group(2)
    elif info["branch"]:
        info["paper"] = "1" if info["branch"] == "Physics" else "2"
    m = re.search(rf"\b((?:{MONTHS})(?:\s*/\s*(?:{MONTHS}))?)\s+(20\d{{2}})\b", head, re.I)
    if m:
        info["exam"] = f"{m.group(1).title()} {m.group(2)}"
    m = re.search(r"\bMARKS?\s*[:\-]?\s*(\d{2,3})\b", head, re.I)
    if m:
        info["marks"] = m.group(1)
    return info


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------
def _key(r):
    """What makes two questions 'the same': wording, options and marks."""
    words = re.sub(r"[^a-z0-9]+", "", (r["text"] or "").lower())
    opts = "".join(re.sub(r"[^a-z0-9]+", "", v.lower()) for v in r["options"].values())
    return f"{words}|{opts}|{r['marks']}", len(words)


def _looks_damaged(text):
    t = text.strip()
    return len(t) >= 12 and sum(c.isalpha() for c in t) / len(t) < 0.45


def _reconcile_marks(items, state, adjustments):
    """Use the printed question total [n] as the referee between paper marks and memo marks.
    Returns None, or a dict describing a total that still does not add up."""
    total = items[0].get("question_total")
    for r in items:                                         # fill a missing mark from the memo
        s = state[r["id"]]
        if s["marks"] is None and r["memo_marks"] is not None:
            s["marks"] = r["memo_marks"]
            s["notes"].append(f"mark {int(r['memo_marks'])} taken from the memo (paper mark was unreadable)")
            adjustments.append(f"{r['number']}: mark filled in as {int(r['memo_marks'])} from the memo")
    if total is None:
        return None
    found = sum(state[r["id"]]["marks"] or 0 for r in items)
    if found == total:
        for r in items:                                     # disagreement, but the total is fine
            s = state[r["id"]]
            if r["memo_marks"] is not None and s["marks"] is not None and s["marks"] != r["memo_marks"]:
                s["notes"].append(f"memo shows {int(r['memo_marks'])} but the paper's {int(s['marks'])} "
                                  f"matches the printed total, so it was kept")
        return None
    differ = [r for r in items if state[r["id"]]["marks"] is not None and r["memo_marks"] is not None
              and state[r["id"]]["marks"] != r["memo_marks"]][:12]
    for size in range(1, len(differ) + 1):                  # fewest changes that fix the total
        fixes = [c for c in itertools.combinations(differ, size)
                 if found + sum(r["memo_marks"] - state[r["id"]]["marks"] for r in c) == total]
        if len(fixes) == 1:
            for r in fixes[0]:
                old = state[r["id"]]["marks"]
                state[r["id"]]["marks"] = r["memo_marks"]
                state[r["id"]]["notes"].append(f"mark changed {int(old)} -> {int(r['memo_marks'])} "
                                               f"so the question adds up to its printed total {int(total)}")
                adjustments.append(f"{r['number']}: mark changed {int(old)} -> {int(r['memo_marks'])} "
                                   f"(question total {int(total)})")
            return None
        if len(fixes) > 1:
            break
    found = sum(state[r["id"]]["marks"] or 0 for r in items)
    return None if found == total else {"question": items[0]["question"], "found": int(found), "stated": int(total)}


# ---------------------------------------------------------------------------
# The cleaner
# ---------------------------------------------------------------------------
def clean_paper(paper, text_path=None, dry_run=False):
    """Clean one saved paper. Safe to run again at any time. Returns a report dictionary."""
    rows = get_questions(paper)
    if not rows:
        return {"paper": paper, "found": False}
    first_id = min(r["id"] for r in rows)
    state = {r["id"]: {"status": None, "notes": [], "marks": r["marks"]} for r in rows}
    leaf = [r for r in rows if not r["is_parent"]]
    for r in rows:
        if r["is_parent"]:
            state[r["id"]]["status"] = "heading"

    # 1. marks
    adjustments, question_checks = [], []
    for q in dict.fromkeys(r["question"] for r in leaf):
        problem = _reconcile_marks([r for r in leaf if r["question"] == q], state, adjustments)
        if problem:
            question_checks.append(problem)

    # 2. row-by-row checks
    has_memo_at_all = any((r["memo_text"] or "").strip() for r in leaf)
    for r in leaf:
        s = state[r["id"]]
        if CANCEL_RE.search(r["memo_text"] or "") or CANCEL_RE.search(r["text"] or ""):
            s["status"] = "excluded"
            s["notes"].append("cancelled: the memo says to ignore this question")
            continue
        problems = []
        if len((r["text"] or "").strip()) < 5 and not r["options"]:
            problems.append(f"question text is missing or too short ({(r['text'] or '').strip()!r}); "
                            f"probably a table or picture that did not read")
        elif _looks_damaged(r["text"] or ""):
            problems.append("question text looks damaged")
        if s["marks"] is None:
            problems.append("no mark found")
        if r["options"]:
            if sorted(r["options"]) != ["A", "B", "C", "D"] or any(not v.strip() for v in r["options"].values()):
                problems.append("multiple-choice options are incomplete or are pictures")
            if has_memo_at_all and (r["memo_text"] or "").strip() and \
                    not re.match(r"^\(?[A-D]\b", r["memo_text"].strip()):
                problems.append("memo answer is not a letter A to D")
        if has_memo_at_all and not (r["memo_text"] or "").strip():
            problems.append("no memo answer")
        if problems:
            s["status"] = "needs_fix"
            s["notes"] += problems
        else:
            s["status"] = "ready"

    # 3. diagrams (a note only: the generator leaves these out unless asked)
    needs_diagram = {}
    for r in leaf:
        probe = f'{r["context"]} {r["parent_text"]} {r["text"]}'
        needs_diagram[r["id"]] = bool(NEEDS_DIAGRAM_RE.search(probe))
        if needs_diagram[r["id"]] and state[r["id"]]["status"] == "ready":
            state[r["id"]]["notes"].append("needs a diagram, graph or table")

    # 4. duplicates of an earlier question (this paper or an older one)
    seen = {}
    for r in get_questions(status="ready"):
        if r["paper"] != paper and r["id"] < first_id and not r["is_parent"]:
            k, size = _key(r)
            if size >= 15:
                seen.setdefault(k, f'{r["paper"]} {r["number"]}')
    for r in leaf:
        s = state[r["id"]]
        if s["status"] != "ready":
            continue
        k, size = _key({**r, "marks": s["marks"]})
        if size < 15:
            continue
        if k in seen:
            s["status"] = "excluded"
            s["notes"].append(f"duplicate of {seen[k]}")
        else:
            seen[k] = f'{paper} {r["number"]}'

    # 5. save
    updates = []
    for r in rows:
        s = state[r["id"]]
        fields = {"status": s["status"], "notes": " | ".join(s["notes"]),
                  "needs_review": s["status"] == "needs_fix",
                  "has_diagram": needs_diagram.get(r["id"], False)}
        if s["marks"] != r["marks"]:
            fields["marks"] = s["marks"]
        updates.append((r["id"], fields))
    if not dry_run:
        update_questions(updates)

    # 6. report
    counts = {k: sum(1 for r in leaf if state[r["id"]]["status"] == k) for k in ("ready", "needs_fix", "excluded")}
    report = {"paper": paper, "found": True, "questions": len(leaf), "counts": counts,
              "headings": len(rows) - len(leaf), "adjustments": adjustments,
              "question_checks": question_checks,
              "excluded": [(r["number"], state[r["id"]]["notes"][-1]) for r in leaf if state[r["id"]]["status"] == "excluded"],
              "needs_fix": [(r["number"], "; ".join(state[r["id"]]["notes"])) for r in leaf if state[r["id"]]["status"] == "needs_fix"],
              "needs_diagram": sum(1 for r in leaf if needs_diagram[r["id"]] and state[r["id"]]["status"] == "ready"),
              "no_memo_uploaded": not has_memo_at_all, "info": None}
    text_path = text_path or (config.TEXT_DIR / f"{paper}.txt")
    try:
        with open(text_path, encoding="utf-8") as f:
            report["info"] = detect_paper_info(f.read())
    except OSError:
        pass
    return report


def clean_all():
    """Clean every saved paper, oldest first (so later papers are checked against earlier ones)."""
    order = []
    for r in get_questions():
        if r["paper"] not in order:
            order.append(r["paper"])
    return [clean_paper(p) for p in order]


def print_report(rep, limit=25):
    if not rep.get("found"):
        print(f"No saved paper called '{rep['paper']}'.")
        return
    c = rep["counts"]
    print(f"\nCLEANING REPORT for '{rep['paper']}'")
    print(f"  {rep['questions']} questions: {c['ready']} READY | {c['needs_fix']} NEED FIXING | "
          f"{c['excluded']} EXCLUDED  (+ {rep['headings']} headings)")
    print(f"  {rep['needs_diagram']} of the ready questions need a diagram, graph or table")
    if rep["no_memo_uploaded"]:
        print("  NOTE: no memo uploaded yet, so memo checks were skipped. Upload it, then clean again.")
    if rep["info"]:
        i = rep["info"]
        print("  Cover page says:", ", ".join(f"{k}={v}" for k, v in i.items() if v) or "(nothing readable)")
    if rep["adjustments"]:
        print("\n  Marks adjusted:")
        for a in rep["adjustments"][:limit]:
            print("   -", a)
    if rep["question_checks"]:
        print("\n  Questions whose marks still do not add up to the printed total:")
        for q in rep["question_checks"]:
            print(f"   - Q{q['question']}: found {q['found']}, paper says {q['stated']}")
    if rep["excluded"]:
        print("\n  Excluded:")
        for n, why in rep["excluded"][:limit]:
            print(f"   - {n}: {why}")
    if rep["needs_fix"]:
        print("\n  Need fixing:")
        for n, why in rep["needs_fix"][:limit]:
            print(f"   - {n}: {why}")
        if len(rep["needs_fix"]) > limit:
            print(f"   ... and {len(rep['needs_fix']) - limit} more")