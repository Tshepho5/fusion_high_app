"""splitter.py: text from extract.py -> list of questions (paper) or list of answers (memo).
Plain Python, no extra packages."""
import re
from pathlib import Path

PAGE_RE = re.compile(r"^=== PAGE (\d+) ===")
JUNK_RE = re.compile(
    r"copyright reserved|kopiereg voorbehou|please turn over|blaai om asseblief|^\d{1,3}$|"
    r"DBE\s*/|\bNSC\b|\bNSS\b|marking guidelines|nasienriglyne|"
    r"Physical Sciences\s*/\s*P\d|Fisiese Wetenskappe\s*/\s*V\d", re.I)
END_RE = re.compile(r"^(DATA FOR PHYSICAL|INFORMATION SHEET|TOTAL:)", re.I)          # paper only
MEMO_TOTAL_LINE = re.compile(r"^(grand\s+)?total(\s+section\s+[a-d])?\s*[:=]?\s*\d{0,3}\s*$", re.I)
Q_RE = re.compile(r"^\s*(?:QUESTION|VRAAG)\s+(\d{1,2})(?!\.\d)\b[:.\s/\-]*(.*)$", re.I)
SUB_RE = re.compile(r"^\s*(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\s*(.*)$")
OPT_RE = re.compile(r"^\s*([A-D])\s*(?:[_\-–.]\s*(.*)|)$")
# "2.5 m" is a measurement, but "N = mg" / "V = IR" is an equation (so not a unit)
UNIT_RE = re.compile(r"^(m|cm|mm|kg|g|N|s|V|J|W|Hz|µC|μC|nC|Ω)(?=\s|$|[·.⁻/])(?!\s*[=≈:])")
TOTAL_RE = re.compile(r"(?:^|(?<=[\s\)]))(?:\[\s*(\d{1,3})\s*\]|\+\s*(\d{2,3})\s*\])\s*$")
MARK_RE = re.compile(r"(?:^|(?<=\s))[\(\{\[]\s*([0-9lI|OoSsB]{1,2})\s*[\)\}\]]?[\s.,]*$")
OCR_DIGITS = str.maketrans("lI|OoSsB", "11100558")
DIAGRAM_RE = re.compile(r"diagram|graph|figure|sketch|refer to|shown below|table below|shown in the", re.I)


def read_source(path_or_text):
    """Return (name, text). Accepts a file path or the text itself."""
    if isinstance(path_or_text, Path):
        return path_or_text.stem, path_or_text.read_text(encoding="utf-8")
    if isinstance(path_or_text, str) and "\n" not in path_or_text and len(path_or_text) < 260:
        try:
            p = Path(path_or_text)
            if p.is_file():
                return p.stem, p.read_text(encoding="utf-8")
        except (OSError, ValueError):
            pass
    return "direct_input", str(path_or_text)


def parse_mark(token):
    """Fix OCR mix-ups inside mark brackets: (l) -> 1, (S) -> 5, (O) -> 0."""
    t = str(token).translate(OCR_DIGITS)
    return int(t) if t.isdigit() and 1 <= int(t) <= 50 else None


def strip_mark(line):
    """Remove a trailing mark like (2) from a line."""
    mk = MARK_RE.search(line)
    if mk and parse_mark(mk.group(1)) is not None:
        return MARK_RE.sub("", line, count=1).strip()
    return line


def clean_symbols(text):
    """Replace private-use symbols (Wingdings ticks) with normal characters."""
    return (text or "").replace("\uf050", "✓").replace("\uf0fc", "✓").replace("\uf020", " ").replace("\uf0b7", "•")


def squash(text):
    return clean_symbols(re.sub(r"\s+", " ", text or "")).strip()


# =====================================================================
# QUESTION PAPER
# =====================================================================
def split_paper(path_or_text):
    """Returns (rows, totals, warnings).
    rows: list of dicts, one per numbered question; totals: {question: stated [total]}."""
    _, content = read_source(path_or_text)
    items, totals, warnings = [], {}, []
    scenario, scenario_fresh = [], False
    cur_q, last_q, last_b, page = None, 0, 0, 0
    cur, cur_opt, seen = None, None, set()

    def flush():
        nonlocal cur, cur_opt
        if cur is not None:
            cur["text"] = re.sub(r"\s*[\(\{\[]\s*$", "", squash(cur["text"]))   # stray "(" from a damaged mark
            cur["options"] = {k: squash(v) for k, v in cur["options"].items()}
            items.append(cur)
        cur, cur_opt = None, None

    def is_new_number(num, rest):
        nonlocal last_b
        parts = num.split(".")
        if parts[0] != cur_q or num in seen or UNIT_RE.match(rest):
            return False
        b = int(parts[1])
        ok = (last_b < b <= last_b + 3) if len(parts) == 2 else (last_b <= b <= last_b + 1)
        if ok:
            last_b = max(last_b, b)
        return ok

    for raw in content.splitlines():
        if m := PAGE_RE.match(raw):
            page = int(m.group(1))
            continue
        line = raw.strip()
        if not line or JUNK_RE.search(line):
            continue
        if cur_q and END_RE.search(line):
            break

        if m := Q_RE.match(line):                          # QUESTION n heading
            n = int(m.group(1))
            if n == last_q + 1:
                flush()
                cur_q, last_q, last_b = str(n), n, 0
                head = re.sub(r"\(.*?\)", "", m.group(2)).strip()   # drop "(Start on a new page)"
                scenario, scenario_fresh = ([head] if head else []), False
                continue
            if n == last_q:                                 # same heading again = page continues
                continue
            warnings.append(f"Ignored heading on page {page}: {line[:60]}")

        if cur_q is None:
            continue

        if t := TOTAL_RE.search(line):                      # question total [16]
            val = int(t.group(1) or t.group(2))
            if val <= 60:
                totals[cur_q] = val
                line = TOTAL_RE.sub("", line).strip()
                if not line:
                    continue

        if (s := SUB_RE.match(line)) and is_new_number(s.group(1), s.group(2).strip()):
            flush()
            seen.add(s.group(1))
            ctx = "" if cur_q == "1" else squash(" ".join(scenario))
            cur = {"question": cur_q, "number": s.group(1), "page": page, "context": ctx,
                   "text": "", "marks": None, "options": {}}
            scenario_fresh = False
            line = s.group(2).strip()
            if not line:
                continue

        if cur is None:
            scenario.append(line)
            continue

        mark_here = False
        if mk := MARK_RE.search(line):                      # marks (2)
            val = parse_mark(mk.group(1))
            if val is not None:
                if cur["marks"] is None:
                    cur["marks"] = val
                mark_here = True
                line = MARK_RE.sub("", line, count=1).strip()
                if not line:
                    continue

        if cur_q == "1":                                    # multiple choice
            if o := OPT_RE.match(line):
                cur_opt = o.group(1)
                cur["options"][cur_opt] = (o.group(2) or "").strip()
            elif cur_opt:
                cur["options"][cur_opt] += " " + line
            else:
                cur["text"] += " " + line
        elif cur["marks"] is not None and not mark_here:    # text after the mark = next scenario
            if not scenario_fresh:
                scenario, scenario_fresh = [], True
            scenario.append(line)
        else:
            cur["text"] += " " + line
    flush()

    if not items:
        return [], totals, warnings + ["No questions found. Check that this is a question paper."]

    numbers = [r["number"] for r in items]
    text_of = {r["number"]: r["text"] for r in items}
    for r in items:
        r["is_parent"] = any(o.startswith(r["number"] + ".") for o in numbers)
        r["parent_text"] = text_of.get(r["number"].rsplit(".", 1)[0], "") if r["number"].count(".") == 2 else ""
        r["has_diagram"] = bool(DIAGRAM_RE.search(f'{r["context"]} {r["parent_text"]} {r["text"]}'))
        bad_options = any(len(v) < 3 or re.search(r"[?_—]", v) for v in r["options"].values())
        missing_marks = r["marks"] is None and not r["is_parent"]
        r["needs_review"] = r["has_diagram"] or bad_options or missing_marks
    for r in items:                                     # remember the printed [total] of each question
        r["question_total"] = totals.get(r["question"])
    return items, totals, warnings
    


def mark_report(rows, totals):
    """Marks found per question vs the stated [total]. Used to check the split."""
    out, order = [], []
    for r in rows:
        if r["question"] not in order:
            order.append(r["question"])
    for q in order:
        found = int(sum(r["marks"] or 0 for r in rows if r["question"] == q))
        stated = totals.get(q)
        out.append({"question": q, "found": found, "stated": stated,
                    "ok": stated is None or stated == found})
    return out


# =====================================================================
# MEMORANDUM
# =====================================================================
def split_memo(path_or_text):
    """Returns (rows, warnings). rows: dicts with question, number, page, text, marks."""
    _, content = read_source(path_or_text)
    items, warnings, index = [], [], {}
    cur, cur_q, last_b, page = None, None, 0, 0

    def flush():
        nonlocal cur
        if cur is None:
            return
        lines = [clean_symbols(re.sub(r"[ \t]+", " ", l)).strip() for l in cur["text"].splitlines()]
        lines = [strip_mark(l) for l in lines if not re.match(r"^\s*\[\s*\d{1,3}\s*\]\s*$", l)]
        cur["text"] = "\n".join(l for l in lines if l).strip()
        if cur["number"] in index:                          # same number again: join the parts
            prev = items[index[cur["number"]]]
            prev["text"] = (prev["text"] + "\n\n" + cur["text"]).strip()
            if prev["marks"] is None:
                prev["marks"] = cur["marks"]
        else:
            index[cur["number"]] = len(items)
            items.append(cur)
        cur = None

    for raw in content.splitlines():
        if m := PAGE_RE.match(raw):
            page = int(m.group(1))
            continue
        line = raw.strip()
        if not line or JUNK_RE.search(line) or MEMO_TOTAL_LINE.match(line):
            continue

        if m := Q_RE.match(line):                           # QUESTION n heading
            flush()
            if m.group(1) != cur_q:                         # same heading again = page continues
                cur_q, last_b = m.group(1), 0
            continue
        if cur_q is None:
            continue

        if TOTAL_RE.search(line):                           # [15] question total
            line = TOTAL_RE.sub("", line).strip()
            if not line:
                continue

        if s := SUB_RE.match(line):
            num, rest = s.group(1), s.group(2).strip()
            parts = num.split(".")
            b = int(parts[1])
            # belongs to this question, is not a measurement ("2.5 m"), and does not jump around
            if parts[0] == cur_q and not UNIT_RE.match(rest) and last_b <= b <= last_b + 3:
                last_b = max(last_b, b)
                flush()
                mark = None
                if mk := MARK_RE.search(rest):
                    mark = parse_mark(mk.group(1))
                cur = {"question": parts[0], "number": num, "page": page, "text": rest, "marks": mark}
                continue

        if cur is not None:
            if cur["marks"] is None and (mk := MARK_RE.search(line)):
                cur["marks"] = parse_mark(mk.group(1))
            cur["text"] += "\n" + line
    flush()

    if not items:
        return [], warnings + ["No memo answers found. Check that this is a memorandum."]
    return items, warnings