"""labeller.py: gives every question a TYPE and a TOPIC (rule-based, you can edit topics.json).

Types:  multiple choice | definition | theory | calculation | application | drawing/graph | other
Topics: read from topics.json. If nothing matches, or two topics tie, the topic stays
        'Unclassified' instead of guessing wrong.
Your manual edits are kept: only questions still at 'other' / 'Unclassified' are labelled,
unless you run with --redo.

  python labeller.py ps1            label one paper
  python labeller.py ps1 --redo     start again, replacing existing labels
  python labeller.py all
  python labeller.py --selftest     check the rules on example questions
"""
import json
import re
import sys
from collections import Counter

import config
from database import get_questions, update_questions

QTYPES = ["multiple choice", "definition", "theory", "calculation", "application", "drawing/graph", "other"]
TOPICS_FILE = config.BASE / "topics.json"

# ---------------------------------------------------------------------------
# Question TYPE
# ---------------------------------------------------------------------------
DRAW_RE = re.compile(r"^(draw|sketch|plot|construct|complete the (diagram|graph|circuit)|label|add .{0,20}to the (diagram|graph))\b")
DEFINITION_RE = re.compile(
    r"^(define\b|what is meant by|what do you understand by|state in words|"
    r"give the (definition|meaning) of|write down the (definition|meaning) of|"
    r"state\b.{0,45}\b(law|principle|rule|theorem|hypothesis|postulate|definition)\b)")
APPLICATION_RE = re.compile(
    r"^(predict|suggest|how will|what will happen|will (the|it|this|there)\b|would (the|it)\b)|"
    r"\bincreases?,?\s*decreases?,?\s*(or|and)\s*remains?(\s+the\s+same|\s+unchanged|\s+constant)?|"
    r"\b(increase|decrease),?\s*(or\s*)?(decrease|remain)")
CALC_START_RE = re.compile(
    r"^(calculate|determine the (magnitude|value|number|mass|volume|concentration|speed|velocity|"
    r"acceleration|force|energy|time|distance|height|resistance|current|potential|frequency|wavelength|"
    r"percentage|ph)|show by calculation|how (much|many|far|long|fast|high)|"
    r"what (is|was|will be) the (magnitude|value|speed|velocity|acceleration|force|energy|mass|time|"
    r"distance|height|resistance|current|frequency|wavelength|number of|concentration|volume|percentage|ph)\b)")
THEORY_RE = re.compile(
    r"^(explain|why|describe|give (a|the|one|two|three)\b|motivate|justify|differentiate|distinguish|compare|"
    r"discuss|name|state|identify|list|write down|what\b|which|is |are |does |do |can |"
    r"how (does|do|is|are|can)|account for|outline)")


def _normalise(text):
    t = (text or "").lower().replace("’", "'").replace("`", "'").strip()
    t = re.sub(r"^\(?[a-z]?\d*[.)]?\s*", "", t) if re.match(r"^\(?[a-z]\)", t) else t
    return re.sub(r"\s+", " ", t)


def type_from_text(text):
    t = _normalise(text)
    if not t:
        return None
    t = re.sub(r"without\s+(any\s+)?calculations?", "", t)     # "explain, without calculation" is theory
    if DRAW_RE.match(t):
        return "drawing/graph"
    if DEFINITION_RE.match(t):
        return "definition"
    if APPLICATION_RE.search(t[:200]):
        return "application"
    if CALC_START_RE.match(t) or re.search(r"\bcalculate\b", t[:150]):
        return "calculation"
    if THEORY_RE.match(t):
        return "theory"
    if re.search(r"\b(name|identify|state|explain|describe|write down|give|list|classify|indicate)\b", t[:120]):   # "Refer to the diagram and name ..."
        return "theory"
    return None


def classify_type(text, parent_text="", has_options=False):
    if has_options:
        return "multiple choice"
    return type_from_text(text) or (type_from_text(parent_text) if parent_text else None) or "other"


# ---------------------------------------------------------------------------
# Question TOPIC
# ---------------------------------------------------------------------------
def _pattern(keyword):
    """Short keywords (ph, rms, mole, base...) must be whole words; longer ones may take endings."""
    k = keyword.lower().strip()
    body = r"\s+".join(re.escape(w) for w in k.split())
    return rf"\b{body}s?\b" if len(k) <= 4 else rf"\b{body}"


def load_topics(path=TOPICS_FILE):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return [(t["topic"], t.get("area", ""), re.compile("|".join(_pattern(k) for k in t["keywords"])))
            for t in data["topics"] if t.get("keywords")]


def classify_topic(row, topics):
    """Weighted keyword score: own wording x3, options x2, the parent question x2, the shared scenario x1.
    Needs a score of 2 or more, and a clear winner."""
    parts = [(row.get("text"), 3), (" ".join((row.get("options") or {}).values()), 2),
             (row.get("parent_text"), 2), (row.get("context"), 1)]
    scores = []
    for name, area, rx in topics:
        s = sum(w * len(rx.findall((txt or "").lower().replace("’", "'"))) for txt, w in parts)
        scores.append((s, name, area))
    scores.sort(key=lambda x: -x[0])
    best = scores[0]
    if best[0] < 2 or (len(scores) > 1 and scores[1][0] == best[0]):
        return "Unclassified", ""
    return best[1], best[2]


def inherit_updates(rows, area_of, min_agree=2, min_share=0.6):
    """An unlabelled question takes the topic of the rest of its own question, but only when at
    least `min_agree` labelled questions agree and they are `min_share` of all labelled ones.
    Question 1 (multiple choice, mixed topics) never inherits. Returns [(id, fields), ...]."""
    updates = []
    for q in dict.fromkeys(r["question"] for r in rows):
        if str(q) == "1":
            continue
        group = [r for r in rows if r["question"] == q]
        counts = Counter(r["topic"] for r in group if r["topic"] not in ("", "Unclassified", None))
        if not counts:
            continue
        best, n = counts.most_common(1)[0]
        if n >= min_agree and n / sum(counts.values()) >= min_share:
            for r in group:
                if r["topic"] in ("", "Unclassified", None):
                    updates.append((r["id"], {"topic": best, "area": area_of.get(best, "")}))
    return updates


# ---------------------------------------------------------------------------
# Labelling a paper
# ---------------------------------------------------------------------------
def label_paper(paper, redo=False):
    rows = [r for r in get_questions(paper) if not r["is_parent"]]
    topics = load_topics()
    updates = []
    for r in rows:
        fields = {}
        if redo or r["qtype"] in ("", "other", None):
            qtype = classify_type(r["text"], r["parent_text"], bool(r["options"]))
            if qtype != r["qtype"]:
                fields["qtype"] = qtype
        if redo or r["topic"] in ("", "Unclassified", None):
            topic, area = classify_topic(r, topics)
            fields.update(topic=topic, area=area)
        if fields:
            updates.append((r["id"], fields))
    update_questions(updates)
    area_of = {name: area for name, area, _ in topics}
    inherited = inherit_updates([r for r in get_questions(paper) if not r["is_parent"]], area_of)
    update_questions(inherited)
    after = [r for r in get_questions(paper) if not r["is_parent"]]
    return {"paper": paper, "questions": len(after), "inherited": len(inherited),
            "types": Counter(r["qtype"] for r in after), "topics": Counter(r["topic"] for r in after),
            "unclassified": sum(1 for r in after if r["topic"] == "Unclassified"),
            "other": sum(1 for r in after if r["qtype"] == "other")}


def print_labels(rep):
    print("\n  LABELS")
    print("   types :", ", ".join(f"{k} {v}" for k, v in rep["types"].most_common()))
    print("   topics:")
    for name, n in rep["topics"].most_common():
        print(f"     {n:>3}  {name}")
    if rep.get("inherited"):
        print(f"   ({rep['inherited']} of these took the topic of the rest of their own question)")
    print(f"   {rep['unclassified']} questions have no topic yet and {rep['other']} have no clear type: "
          "fix those by hand in the review page.")


# ---------------------------------------------------------------------------
# Self-test:  python labeller.py --selftest
# ---------------------------------------------------------------------------
TYPE_CASES = [
    ("Define the term free fall.", "", False, "definition"),
    ("State Newton's second law of motion in words.", "", False, "definition"),
    ("What is meant by the term isotope?", "", False, "definition"),
    ("Calculate the magnitude of the tension in the string.", "", False, "calculation"),
    ("Using only EQUATIONS OF MOTION, calculate the speed at which the ball was projected.", "", False, "calculation"),
    ("Explain, without any calculation, why the answer decreases.", "", False, "theory"),
    ("Explain why friction decreases.", "", False, "theory"),
    ("Name the type of bond between Na and Cl.", "", False, "theory"),
    ("Draw a labelled free-body diagram showing all the forces acting on block A.", "", False, "drawing/graph"),
    ("How will this change the kinetic frictional force on A? Choose from INCREASES, DECREASES or REMAINS THE SAME.", "", False, "application"),
    ("Will the reading on the ammeter increase, decrease or remain the same?", "", False, "application"),
    ("Predict what will happen to the reaction rate.", "", False, "application"),
    ("The normal force", "Calculate the magnitude of:", False, "calculation"),
    ("Which ONE of the following is correct?", "", True, "multiple choice"),
    ("Refer to the diagram below and name the type of bond.", "", False, "theory"),
    ("Chemical symbol of P", "Use the table to answer the following:", False, "other"),
    ("Dependent variable", "For this investigation, write down the:", False, "theory"),
    ("Pure substance", "Use the diagram to classify the following:", False, "theory"),
    ("What the symbol ∆ represents", "", False, "theory"),
    ("Hmm odd text", "", False, "other"),
]
TOPIC_CASES = [
    ("Define the term free fall.", {}, "Vertical projectile motion"),
    ("State Coulomb's law.", {}, "Electrostatics"),
    ("Calculate the pH of the solution.", {}, "Acids and bases"),
    ("Which ONE of the following substances is NOT a pure substance?", {}, "Classification of matter"),
    ("The CORRECT chemical formula for potassium nitrate is", {}, "Chemical bonding and molecular structure"),
    ("Which equation represents the second ionisation energy?", {}, "Periodic table and periodic trends"),
    ("Name the process by which plants lose water: transpiration.", {}, "The hydrosphere"),
    ("State Newton's law of universal gravitation.", {}, "Newton's law of universal gravitation"),
    ("Calculate the net force on the block on a rough incline.", {}, "Newton's laws and forces"),
    ("State the law of conservation of momentum.", {}, "Momentum and impulse"),
    ("A transverse wave has a wavelength of 2 m and an amplitude of 3 cm.", {}, "Transverse and longitudinal waves"),
    ("The substance graphite conducts electricity.", {}, "Unclassified"),
    ("Hello there", {}, "Unclassified"),
    ("Which physical method would you use to separate substance Q into its components?", {}, "Classification of matter"),
    ("Explain the meaning of the term hydrated.", {}, "Quantitative aspects of chemical change"),
    ("Which solution will NOT form a precipitate when sodium sulphate is added?", {}, "Reactions in aqueous solution"),
    ("The sphere in which minerals are found is known as", {"A": "atmosphere", "B": "biosphere", "C": "hydrosphere", "D": "lithosphere"}, "The hydrosphere"),
]


def selftest():
    bad = 0
    for text, parent, opts, want in TYPE_CASES:
        got = classify_type(text, parent, opts)
        bad += got != want
        print(("ok   " if got == want else "FAIL ") + f"type  {got:<15} (wanted {want:<15}) {text[:60]}")
    topics = load_topics()
    for text, opts, want in TOPIC_CASES:
        got = classify_topic({"text": text, "options": opts}, topics)[0]
        bad += got != want
        print(("ok   " if got == want else "FAIL ") + f"topic {got[:30]:<30} (wanted {want[:30]})")
    # inheriting a topic from the rest of the question
    rows = [dict(id=1, question="3", topic="Intermolecular forces"), dict(id=2, question="3", topic="Intermolecular forces"),
            dict(id=3, question="3", topic="Unclassified"), dict(id=4, question="1", topic="Unclassified"),
            dict(id=5, question="1", topic="Atomic structure"), dict(id=6, question="1", topic="Atomic structure"),
            dict(id=7, question="8", topic="Acids and bases"), dict(id=8, question="8", topic="Unclassified"),
            dict(id=9, question="9", topic="Sound"), dict(id=10, question="9", topic="Magnetism"),
            dict(id=11, question="9", topic="Unclassified")]
    got = sorted(i for i, _ in inherit_updates(rows, {}))
    ok = got == [3]
    bad += not ok
    print(("ok   " if ok else "FAIL ") + f"inherit: unlabelled rows that borrowed a topic = {got} (wanted [3]: "
          "Q1 never inherits, one lone label is not enough, mixed topics are not enough)")
    print("\nALL LABEL CHECKS PASSED" if not bad else f"\n{bad} CHECK(S) FAILED")


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--selftest" in sys.argv:
        selftest()
    elif args:
        names = [r["paper"] for r in get_questions()] if args[0].lower() == "all" else [args[0]]
        for name in dict.fromkeys(names):
            print_labels(label_paper(name, redo="--redo" in sys.argv))
    else:
        sys.exit(__doc__)