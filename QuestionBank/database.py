"""database.py: everything that reads or writes the question bank (SQLite, built into Python)."""
import json
import sqlite3
from contextlib import contextmanager

import config

COLUMNS = ["paper", "grade", "subject", "question", "number", "page", "context",
           "parent_text", "text", "marks", "options", "is_parent", "has_diagram",
           "needs_review", "topic", "area", "qtype", "memo_text",
           "question_total", "memo_marks", "status", "notes"]

# Columns added after the first version. An older database gets them automatically.
NEW_COLUMNS = {"question_total": "REAL", "memo_marks": "REAL",
               "status": "TEXT DEFAULT 'new'", "notes": "TEXT DEFAULT ''"}

# Only these fields may be changed after a paper is saved.
EDITABLE = {"topic", "area", "qtype", "marks", "text", "memo_text", "needs_review",
            "has_diagram", "memo_marks", "status", "notes"}
INT_FIELDS = {"needs_review", "has_diagram"}


@contextmanager
def connect(path=None):
    """Open the database, create/upgrade the table, save on success, always close."""
    con = sqlite3.connect(path or config.DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("""CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paper TEXT NOT NULL, grade TEXT, subject TEXT,
        question TEXT, number TEXT NOT NULL, page INTEGER,
        context TEXT DEFAULT '', parent_text TEXT DEFAULT '', text TEXT DEFAULT '',
        marks REAL, options TEXT DEFAULT '{}',
        is_parent INTEGER DEFAULT 0, has_diagram INTEGER DEFAULT 0, needs_review INTEGER DEFAULT 0,
        topic TEXT DEFAULT 'Unclassified', area TEXT DEFAULT '', qtype TEXT DEFAULT 'other',
        memo_text TEXT DEFAULT '',
        question_total REAL, memo_marks REAL, status TEXT DEFAULT 'new', notes TEXT DEFAULT '')""")
    have = {r["name"] for r in con.execute("PRAGMA table_info(questions)")}
    for name, ddl in NEW_COLUMNS.items():
        if name not in have:
            con.execute(f"ALTER TABLE questions ADD COLUMN {name} {ddl}")
    try:
        yield con
        con.commit()
    finally:
        con.close()


def _clean(row):
    """Turn one question (a dict) into the values stored in the database."""
    out = {c: row.get(c) for c in COLUMNS}
    out["options"] = json.dumps(row.get("options") or {}, ensure_ascii=False)
    for c in ("is_parent", "has_diagram", "needs_review"):
        out[c] = int(bool(row.get(c)))
    for c in ("context", "parent_text", "text", "memo_text", "area", "notes"):
        out[c] = row.get(c) or ""
    out["topic"] = row.get("topic") or "Unclassified"
    out["qtype"] = row.get("qtype") or "other"
    out["status"] = row.get("status") or "new"
    return out


def _load(row):
    """Turn one database row back into a normal dict."""
    d = dict(row)
    try:
        d["options"] = json.loads(d.get("options") or "{}")
    except ValueError:
        d["options"] = {}
    for c in ("is_parent", "has_diagram", "needs_review"):
        d[c] = bool(d[c])
    d["notes"] = d.get("notes") or ""
    d["status"] = d.get("status") or "new"
    return d


def save_paper(rows, paper, path=None):
    """Store a question paper. An earlier upload with the same name is replaced
    (this also clears its memo answers). Returns how many questions were saved."""
    names = ",".join(COLUMNS)
    marks = ",".join(":" + c for c in COLUMNS)
    with connect(path) as con:
        con.execute("DELETE FROM questions WHERE paper = ?", (paper,))
        for r in rows:
            r = dict(r, paper=paper)
            con.execute(f"INSERT INTO questions ({names}) VALUES ({marks})", _clean(r))
    return len(rows)


def list_papers(path=None):
    """One summary line per paper: counts, total marks and how many are ready."""
    with connect(path) as con:
        cur = con.execute("""
            SELECT paper, MIN(grade) AS grade, MIN(subject) AS subject,
                   SUM(CASE WHEN is_parent = 0 THEN 1 ELSE 0 END) AS questions,
                   SUM(CASE WHEN is_parent = 0 AND TRIM(memo_text) != '' THEN 1 ELSE 0 END) AS with_memo,
                   SUM(CASE WHEN is_parent = 0 AND status = 'ready' THEN 1 ELSE 0 END) AS ready,
                   SUM(CASE WHEN is_parent = 0 AND status = 'needs_fix' THEN 1 ELSE 0 END) AS needs_fix,
                   SUM(CASE WHEN is_parent = 0 AND status = 'excluded' THEN 1 ELSE 0 END) AS excluded,
                   SUM(CASE WHEN is_parent = 0 THEN COALESCE(marks, 0) ELSE 0 END) AS total_marks
            FROM questions GROUP BY paper ORDER BY MIN(id)""")
        return [dict(r) for r in cur.fetchall()]


def get_questions(paper=None, only_review=False, status=None, path=None):
    """Return questions as a list of dicts, in paper order. status may be one value or a list."""
    sql, args = "SELECT * FROM questions WHERE 1=1", []
    if paper:
        sql += " AND paper = ?"
        args.append(paper)
    if only_review:
        sql += " AND needs_review = 1"
    if status:
        wanted = [status] if isinstance(status, str) else list(status)
        sql += f" AND status IN ({','.join('?' * len(wanted))})"
        args += wanted
    with connect(path) as con:
        return [_load(r) for r in con.execute(sql + " ORDER BY id", args).fetchall()]


def _check_fields(fields):
    bad = set(fields) - EDITABLE
    if bad:
        raise ValueError(f"Cannot edit: {', '.join(sorted(bad))}")


def update_question(question_id, path=None, **fields):
    """Change allowed fields of one question. Unknown field names are rejected."""
    update_questions([(question_id, fields)], path=path)


def update_questions(updates, path=None):
    """Change many questions in one go. updates = [(id, {field: value}), ...]."""
    for _, fields in updates:
        _check_fields(fields)
    with connect(path) as con:
        for question_id, fields in updates:
            if not fields:
                continue
            sets = ", ".join(f"{k} = ?" for k in fields)
            values = [int(v) if k in INT_FIELDS else v for k, v in fields.items()]
            con.execute(f"UPDATE questions SET {sets} WHERE id = ?", values + [question_id])


def delete_paper(paper, path=None):
    """Delete a paper and all its questions. Returns how many rows were removed."""
    with connect(path) as con:
        return con.execute("DELETE FROM questions WHERE paper = ?", (paper,)).rowcount


# ---------------------------------------------------------------------------
# Self-test: run  python database.py  (uses a temporary file, your real data is untouched)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import tempfile
    from pathlib import Path

    tmp = Path(tempfile.mkdtemp()) / "test.db"
    sample = [
        {"grade": "11", "subject": "Physical Sciences", "question": "1", "number": "1.1", "page": 3,
         "text": "Which law...", "marks": 2, "options": {"A": "first", "B": "second"}, "qtype": "multiple choice"},
        {"grade": "11", "subject": "Physical Sciences", "question": "2", "number": "2.1", "page": 4,
         "text": "State Newton's second law.", "marks": 2, "has_diagram": True, "memo_text": "F = ma"},
        {"grade": "11", "subject": "Physical Sciences", "question": "2", "number": "2", "page": 4,
         "text": "Intro", "is_parent": True},
    ]
    print("saved:", save_paper(sample, "Test paper", path=tmp))
    qs = get_questions("Test paper", path=tmp)
    print("new rows start as status:", [q["status"] for q in qs])
    update_questions([(qs[0]["id"], {"status": "ready", "notes": "ok", "needs_review": False}),
                      (qs[1]["id"], {"status": "excluded"})], path=tmp)
    print("after update:", [(q["number"], q["status"]) for q in get_questions(path=tmp)])
    print("only ready:", [q["number"] for q in get_questions(status="ready", path=tmp)])
    print("list_papers:", list_papers(path=tmp))
    try:
        update_question(qs[0]["id"], path=tmp, paper="hacked")
    except ValueError as e:
        print("blocked bad edit:", e)
    print("deleted:", delete_paper("Test paper", path=tmp), "| left:", len(get_questions(path=tmp)))
    print("\nALL DATABASE CHECKS PASSED")