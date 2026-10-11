"""api_bridge.py: JSON interface for Node.js backend to interact with QuestionBank."""
import json
import sys
import database
import builder

def get_stats():
    groups = builder.load_groups()
    usable = [g for g in groups if g["eligible"] and not g["has_diagram"] and g["has_memo"]]
    papers = database.list_papers()
    
    topics = sorted(list({g["topic"] for g in usable if g["topic"] and g["topic"] != "Unclassified"}))
    qtypes = sorted(list({g["qtype"] for g in usable if g["qtype"] and g["qtype"] != "other"}))
    grades = sorted(list({g["grade"] for g in usable if g["grade"]}))
    
    return {
        "ok": True,
        "total_groups": len(groups),
        "usable_groups": len(usable),
        "total_marks": sum(g["marks"] for g in usable),
        "topics": topics,
        "qtypes": qtypes,
        "grades": grades,
        "papers": papers
    }

def get_questions(grade=None, subject=None, topic=None, qtype=None, limit=50):
    rows = database.get_questions()
    filtered = []
    for r in rows:
        if r["is_parent"]:
            continue
        if r["status"] != "ready":
            continue
        if grade and str(r["grade"]) != str(grade):
            continue
        if subject and r["subject"] and subject.lower() not in r["subject"].lower():
            continue
        if topic and r["topic"] != topic:
            continue
        if qtype and r["qtype"] != qtype:
            continue
        filtered.append({
            "id": r["id"],
            "paper": r["paper"],
            "grade": r["grade"],
            "subject": r["subject"],
            "number": r["number"],
            "text": r["text"],
            "context": r["context"],
            "parent_text": r["parent_text"],
            "marks": r["marks"],
            "options": r["options"],
            "topic": r["topic"],
            "qtype": r["qtype"],
            "memo_text": r["memo_text"]
        })
        if len(filtered) >= int(limit):
            break
    return {"ok": True, "count": len(filtered), "questions": filtered}

def build_test(marks=30, grade=None, subject=None, topic=None, title="CAPS Controlled Test", qtype=None):
    groups = builder.load_groups()
    filters = {
        "allow_diagram": False,
        "need_memo": True
    }
    if topic:
        filters["topics"] = [topic]
    if qtype:
        filters["qtypes"] = [qtype]
    if grade:
        filters["grades"] = [str(grade)]

    res = builder.generate(groups, marks=int(marks), **filters)
    if not res["ok"] and topic:
        # Fallback to general pool for the grade if topic pool is too small
        filters.pop("topics", None)
        res = builder.generate(groups, marks=int(marks), **filters)

    if not res["ok"]:
        return {"ok": False, "message": res.get("message", "Could not build test matching criteria.")}
    
    qtext, mtext, total = builder.render(res["chosen"], title)
    
    # Structure questions and memo into items
    structured_questions = []
    structured_memo = []
    
    for i, g in enumerate(res["chosen"], 1):
        for r in g["rows"]:
            structured_questions.append({
                "questionNumber": f"Q{i} ({r['number']})",
                "question": r["text"],
                "context": r["context"] or r["parent_text"] or "",
                "marks": r["marks"],
                "options": r["options"],
                "topic": r["topic"],
                "cognitiveLevel": r["qtype"].capitalize() if r["qtype"] else "Knowledge"
            })
            structured_memo.append({
                "questionNumber": f"Q{i} ({r['number']})",
                "guidelines": r["memo_text"],
                "marks": r["marks"]
            })

    return {
        "ok": True,
        "title": title,
        "totalMarks": total,
        "paperText": qtext,
        "memoText": mtext,
        "questions": structured_questions,
        "memorandum": structured_memo,
        "groupsCount": len(res["chosen"])
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "No action specified"}))
        return
    
    action = sys.argv[1]
    
    if action == "stats":
        print(json.dumps(get_stats(), ensure_ascii=False))
    elif action == "questions":
        kwargs = {}
        for arg in sys.argv[2:]:
            if "=" in arg:
                k, v = arg.split("=", 1)
                kwargs[k] = v
        print(json.dumps(get_questions(**kwargs), ensure_ascii=False))
    elif action == "build":
        kwargs = {}
        for arg in sys.argv[2:]:
            if "=" in arg:
                k, v = arg.split("=", 1)
                kwargs[k] = v
        print(json.dumps(build_test(**kwargs), ensure_ascii=False))
    else:
        print(json.dumps({"ok": False, "error": f"Unknown action {action}"}))

if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    main()
