"""builder.py: build a quiz or question paper, with its memo, from the CLEAN question bank.

Only questions with status 'ready' are used. Sub-questions that share wording (2.3.1 + 2.3.2)
always stay together. Questions that need a picture, or that refer to another question
(e.g. 'Explain the answer to QUESTION 3.4'), are left out unless they are self-contained.

  python builder.py --list                                     what is available
  python builder.py --marks 20 --topic "Atomic structure"      a 20-mark quiz on one topic
  python builder.py --marks 30 --mix "definition=6,theory=14,calculation=10" --title "Test 1"
  python builder.py --marks 20 --grade 10 --type definition --type theory --seed 7
Options: --topic/--type/--grade/--paper (can repeat)  --diagrams  --any-memo  --paper-mode  --seed N
Files are written to the 'output' folder.
"""
import argparse
import random
import re
import sys
from collections import Counter
from pathlib import Path

import config
from cleaner import NEEDS_DIAGRAM_RE
from database import get_questions

TYPE_ORDER = ["multiple choice", "definition", "theory", "calculation", "application", "drawing/graph", "other"]
REF_RE = re.compile(r"\b(QUESTION|VRAAG)\s+(\d+(?:\.\d+)+)", re.I)
OUTPUT_DIR = config.BASE / "output"


# ---------------------------------------------------------------------------
# Building the groups
# ---------------------------------------------------------------------------
def _mode(values, ignore=()):
    c = Counter(v for v in values if v not in ignore) or Counter(values)
    return c.most_common(1)[0][0] if c else ""


def needs_picture(r):
    """True if the learner must be GIVEN a diagram, graph or table. A definition stands alone even
    when the shared scenario above it mentions a table."""
    if NEEDS_DIAGRAM_RE.search(f'{r["parent_text"]} {r["text"]}'):
        return True
    if r["context"] and NEEDS_DIAGRAM_RE.search(r["context"]):
        return not (r["qtype"] == "definition" or re.match(r"(?i)\s*(differentiate|distinguish)\b", r["text"] or ""))
    return False


def load_groups(rows=None):
    """Group real questions by their main number. Each group says whether it is usable."""
    rows = rows if rows is not None else get_questions()
    leaf = [r for r in rows if not r["is_parent"]]
    by_key = {}
    for r in leaf:
        by_key.setdefault((r["paper"], ".".join(r["number"].split(".")[:2])), []).append(r)
    groups = []
    for (paper, key), items in by_key.items():
        why = []
        if any(r["status"] != "ready" for r in items):
            why.append("not all parts are ready")
        if any(r["marks"] is None for r in items):
            why.append("a mark is missing")
        for r in items:                                    # refers to a question outside this group?
            text = f'{r["context"]} {r["parent_text"]} {r["text"]} {r["memo_text"]}'
            for _, num in REF_RE.findall(text):
                if ".".join(num.split(".")[:2]) != key:
                    why.append(f"refers to QUESTION {num}")
        groups.append({
            "paper": paper, "key": key, "rows": items, "why": sorted(set(why)), "eligible": not why,
            "marks": int(sum(r["marks"] or 0 for r in items)),
            "grade": str(items[0]["grade"]), "subject": items[0]["subject"],
            "topic": _mode([r["topic"] for r in items], ignore=("Unclassified",)),
            "qtype": _mode([r["qtype"] for r in items], ignore=("other",)),
            "has_diagram": any(needs_picture(r) for r in items),
            "has_memo": all((r["memo_text"] or "").strip() for r in items),
        })
    return groups


def filter_groups(groups, topics=None, qtypes=None, grades=None, papers=None, allow_diagram=False, need_memo=True):
    def ok(g):
        return (g["eligible"]
                and (not topics or g["topic"] in topics) and (not qtypes or g["qtype"] in qtypes)
                and (not grades or g["grade"] in grades) and (not papers or g["paper"] in papers)
                and (allow_diagram or not g["has_diagram"]) and (g["has_memo"] or not need_memo))
    return [g for g in groups if ok(g)]


# ---------------------------------------------------------------------------
# Choosing questions that add up to the target marks
# ---------------------------------------------------------------------------
def pick(groups, target, tries=3000, rng=None):
    """Random search. Among exact hits, prefer the mix with the most different topics and papers.
    If no exact hit exists, return the closest total. Returns (chosen, total)."""
    rng = rng or random.Random()
    pool = [g for g in groups if 0 < g["marks"] <= target]
    best, best_key = [], (False, 0, 0, 0)
    for _ in range(tries):
        rng.shuffle(pool)
        chosen, s = [], 0
        for g in pool:
            if s + g["marks"] <= target:
                chosen.append(g)
                s += g["marks"]
            if s == target:
                break
        key = (s == target, s, len({g["topic"] for g in chosen}), len({g["paper"] for g in chosen}))
        if s and key > best_key:
            best, best_key = list(chosen), key
    return best, sum(g["marks"] for g in best)


def generate(groups, marks=None, mix=None, seed=None, **filters):
    """Returns {ok, message, chosen, total, notes}. Never raises when nothing matches."""
    rng = random.Random(seed)
    pool = filter_groups(groups, **filters)
    if not pool:
        return {"ok": False, "chosen": [], "total": 0, "notes": [],
                "message": "No usable questions match these filters. Try fewer filters, add --diagrams, "
                           "or run 'python process.py clean all' so questions get their status."}
    chosen, notes = [], []
    if mix:
        for qtype, want in mix.items():
            part, got = pick([g for g in pool if g["qtype"] == qtype], want, rng=rng)
            chosen += part
            if got != want:
                notes.append(f"{qtype}: asked for {want} marks, could only find {got}")
        target = sum(mix.values())
    else:
        target = int(marks)
        chosen, got = pick(pool, target, rng=rng)
    total = sum(g["marks"] for g in chosen)
    if not chosen:
        return {"ok": False, "chosen": [], "total": 0, "notes": notes,
                "message": f"Every matching question is worth more than the {target} marks asked for."}
    msg = (f"Built a {total}-mark set from {len(pool)} usable question groups." if total == target
           else f"Closest possible total is {total} marks (asked for {target}). Only {len(pool)} usable question groups matched.")
    return {"ok": True, "message": msg, "chosen": chosen, "total": total, "notes": notes}


# ---------------------------------------------------------------------------
# Writing the paper and the memo
# ---------------------------------------------------------------------------
def _options(opt):
    return [f"      {k}. {v}" for k, v in (opt or {}).items()]


def render(chosen, title, mode="quiz"):
    """Returns (question text, memo text, total). Question n always has memo n."""
    def order(g):
        t = g["qtype"] if g["qtype"] in TYPE_ORDER else "other"
        return (TYPE_ORDER.index(t), g["topic"], g["rows"][0]["id"])
    chosen = sorted(chosen, key=order)
    total = sum(g["marks"] for g in chosen)
    subjects = {(g["grade"], g["subject"]) for g in chosen}
    label = f"Grade {chosen[0]['grade']} {chosen[0]['subject']}" if len(subjects) == 1 else ""
    head = [title.upper(), label, ""]
    if mode == "quiz":
        head += ["Name: ______________________    Date: ______________", f"Total: {total} marks", ""]
    else:
        head += ["Name: ______________________    Time: ______________", f"TOTAL: {total} MARKS",
                 "Answer ALL the questions. Show all working.", ""]
    q, m = list(head), [f"{title.upper()} - MEMORANDUM", f"TOTAL: {total} MARKS", ""]
    for i, g in enumerate(chosen, 1):
        rows = g["rows"]
        labels = {r["number"]: (str(i) if len(rows) == 1 else f"{i}.{k}") for k, r in enumerate(rows, 1)}

        def fix(text):                                      # QUESTION 5.6.1 -> the new number
            return REF_RE.sub(lambda mm: f"{mm.group(1).upper()} {labels.get(mm.group(2), mm.group(2))}", text or "")
        first = rows[0]
        # a definition stands alone: the scenario of its old question would only confuse
        show_context = bool(first["context"]) and not (len(rows) == 1 and first["qtype"] == "definition")
        if show_context:
            q.append(f"{i}. {fix(first['context'])}")
        if len(rows) == 1:
            r = rows[0]
            lead = "" if show_context else f"{i}. "
            q.append(f"{lead}{fix(r['text'])}  ({int(r['marks'])})")
            q += _options(r["options"])
            m.append(f"{i}. " + fix(r["memo_text"]).replace("\n", "\n   ") + f"  ({int(r['marks'])})")
        else:
            if first["parent_text"]:
                q.append(fix(first["parent_text"]) if show_context else f"{i}. {fix(first['parent_text'])}")
            m.append(f"{i}.")
            for r in rows:
                q.append(f"   {labels[r['number']]} {fix(r['text'])}  ({int(r['marks'])})")
                q += _options(r["options"])
                m.append(f"   {labels[r['number']]} " + fix(r["memo_text"]).replace("\n", "\n         ") + f"  ({int(r['marks'])})")
        if g["has_diagram"]:
            q.append(f"   [Diagram needed: {g['paper']}, page {first['page']}]")
        q.append("")
        m.append("")
    return "\n".join(q), "\n".join(m), total


def save_files(title, qtext, mtext):
    OUTPUT_DIR.mkdir(exist_ok=True)
    slug = re.sub(r"[^\w-]+", "_", title.strip()).strip("_") or "paper"
    qp, mp = OUTPUT_DIR / f"{slug}_questions.txt", OUTPUT_DIR / f"{slug}_memo.txt"
    qp.write_text(qtext, encoding="utf-8-sig")
    mp.write_text(mtext, encoding="utf-8-sig")
    return qp, mp


# ---------------------------------------------------------------------------
# Command line
# ---------------------------------------------------------------------------
def show_available(groups):
    ok = [g for g in groups if g["eligible"] and g["has_memo"]]
    print(f"{len(groups)} question groups in the bank: {len(ok)} usable (ready, with a memo), "
          f"{sum(1 for g in ok if not g['has_diagram'])} of them need no picture.\n")
    print("Usable marks by TYPE (no picture needed):")
    by_type, by_topic = Counter(), Counter()
    for g in ok:
        if not g["has_diagram"]:
            by_type[g["qtype"]] += g["marks"]
            by_topic[g["topic"]] += g["marks"]
    for t, n in by_type.most_common():
        print(f"  {n:>4} marks  {t}")
    print("\nUsable marks by TOPIC (no picture needed):")
    for t, n in by_topic.most_common():
        print(f"  {n:>4} marks  {t}")
    skipped = Counter(w for g in groups if not g["eligible"] for w in g["why"])
    if skipped:
        print("\nLeft out because:")
        for w, n in skipped.most_common(8):
            print(f"  {n:>3} groups  {w}")


def parse_mix(text):
    mix = {}
    for part in text.split(","):
        name, _, n = part.partition("=")
        if name.strip() not in TYPE_ORDER or not n.strip().isdigit():
            sys.exit(f"Bad --mix part '{part}'. Use names from {TYPE_ORDER}, like definition=6,theory=14")
        mix[name.strip()] = int(n)
    return mix


def main(argv=None):
    ap = argparse.ArgumentParser(description="Build a quiz or paper plus memo from the clean question bank.")
    ap.add_argument("--list", action="store_true", help="show what is available")
    ap.add_argument("--marks", type=int, help="total marks")
    ap.add_argument("--mix", help='marks per type, e.g. "definition=6,theory=14,calculation=10"')
    ap.add_argument("--topic", action="append", default=[]); ap.add_argument("--type", action="append", default=[])
    ap.add_argument("--grade", action="append", default=[]); ap.add_argument("--paper", action="append", default=[])
    ap.add_argument("--title", default="Quiz"); ap.add_argument("--paper-mode", action="store_true", help="exam-style header")
    ap.add_argument("--diagrams", action="store_true", help="include questions that need a picture")
    ap.add_argument("--any-memo", action="store_true", help="allow questions without a memo answer")
    ap.add_argument("--seed", type=int, help="same number = same quiz again")
    a = ap.parse_args(argv)

    groups = load_groups()
    if a.list or not (a.marks or a.mix):
        show_available(groups)
        if not a.list:
            print("\nGive --marks 20 (or --mix ...) to build something. See --help.")
        return
    res = generate(groups, marks=a.marks, mix=parse_mix(a.mix) if a.mix else None, seed=a.seed,
                   topics=a.topic, qtypes=a.type, grades=a.grade, papers=a.paper,
                   allow_diagram=a.diagrams, need_memo=not a.any_memo)
    print(res["message"])
    for n in res["notes"]:
        print("  note:", n)
    if not res["ok"]:
        return
    qtext, mtext, total = render(res["chosen"], a.title, "paper" if a.paper_mode else "quiz")
    qp, mp = save_files(a.title, qtext, mtext)
    print(f"\nSaved:\n  {qp}\n  {mp}\n\n{qtext}\n{'-' * 60}\n{mtext}")


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    main()