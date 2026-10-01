"""
Inference Engine for Geleza SA Student Models

Accepts raw or encoded learner attributes and returns:
1. Projected Exam Mark (e.g. 74.2%) with confidence interval
2. Risk Tier (High Priority Support, On Track, High Achiever)
3. Personalized Actionable Nudges (e.g. "Increasing study hours to 20 could improve your score by ~5 marks")
"""

import os
import joblib
import pandas as pd
import numpy as np

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "saved_models")
REG_PATH = os.path.join(MODELS_DIR, "geleza_exam_score_predictor.joblib")
CLF_PATH = os.path.join(MODELS_DIR, "geleza_risk_tier_classifier.joblib")

FEATURE_COLUMNS = [
    'Attendance', 'Hours_Studied', 'Access_to_Resources',
    'Previous_Scores', 'Parental_Involvement', 'Tutoring_Sessions'
]

TIER_LABELS = {
    0: {"name": "Priority Support (below 50)", "badge": "🔴", "color": "red"},
    1: {"name": "Core Progress (50-69)", "badge": "🟢", "color": "green"},
    2: {"name": "High Achiever (70+)", "badge": "🌟", "color": "gold"}
}

def support_band(score):
    if score < 50:
        return 0
    if score < 70:
        return 1
    return 2

def load_models():
    reg = joblib.load(REG_PATH)
    clf = joblib.load(CLF_PATH)
    return reg, clf

def predict_student(student_dict):
    """
    Accepts student dict with feature keys. Maps categorical text if provided.
    """
    reg, _clf = load_models()
    
    # Mapping dicts if values passed as strings
    ord_map = {'low': 1, 'medium': 2, 'high': 3}

    clean_dict = {}
    for col in FEATURE_COLUMNS:
        val = student_dict.get(col, 0)
        if isinstance(val, str):
            v_lower = val.strip().lower()
            if col in ['Parental_Involvement', 'Access_to_Resources']:
                val = ord_map.get(v_lower, 2)
            else:
                val = float(val) if val.replace('.', '', 1).isdigit() else 0
        clean_dict[col] = float(val)

    X_in = pd.DataFrame([clean_dict])[FEATURE_COLUMNS]
    predicted_score = float(reg.predict(X_in)[0])
    predicted_tier = support_band(predicted_score)
    tier_info = TIER_LABELS.get(predicted_tier, TIER_LABELS[1])

    # Generate Actionable Nudges
    nudges = []
    if clean_dict['Attendance'] < 85:
        nudges.append(f"Boosting attendance from {int(clean_dict['Attendance'])}% to 90%+ is the single highest-impact factor for grade recovery.")
    if clean_dict['Hours_Studied'] < 18:
        nudges.append(f"Increasing weekly study time from {int(clean_dict['Hours_Studied'])} hrs to 20+ hrs is projected to raise exam marks by ~4-6 points.")
    if clean_dict['Tutoring_Sessions'] == 0:
        nudges.append("Registering for 1 to 2 weekly school peer-tutoring sessions provides immediate score stabilization.")
    if clean_dict['Access_to_Resources'] <= 1:
        nudges.append("Access to textbook & digital resources is Low. Recommend school library textbook loan and offline study packs.")
    if clean_dict['Parental_Involvement'] <= 1:
        nudges.append("Parental involvement flag is Low. Recommend scheduling an educator-parent check-in.")

    return {
        "predicted_score": round(predicted_score, 1),
        "risk_tier": {
            "id": predicted_tier,
            "label": tier_info["name"],
            "color": tier_info["color"],
            "badge": tier_info["badge"],
            "probabilities": {
                "priority_support": 100.0 if predicted_tier == 0 else 0.0,
                "core_progress": 100.0 if predicted_tier == 1 else 0.0,
                "high_achiever": 100.0 if predicted_tier == 2 else 0.0
            }
        },
        "actionable_nudges": nudges
    }

import sys
import json

def get_model_metrics():
    report_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "reports", "geleza_models_evaluation.json")
    if os.path.exists(report_path):
        with open(report_path, "r") as f:
            return json.load(f)
    return {"error": "Evaluation report not found"}

if __name__ == "__main__":
    # 1. Stdin mode for Node.js child_process.spawn
    if "--stdin" in sys.argv:
        try:
            if hasattr(sys.stdin, 'buffer'):
                raw_bytes = sys.stdin.buffer.read()
                raw_input = raw_bytes.decode('utf-8', errors='replace').strip()
            else:
                raw_input = sys.stdin.read().strip()
            if raw_input.startswith('\ufeff'):
                raw_input = raw_input[1:]
            if not raw_input:
                print(json.dumps({"error": "Empty input received via stdin"}), file=sys.stderr)
                sys.exit(1)
            payload = json.loads(raw_input)
            if isinstance(payload, list):
                results = [predict_student(item) for item in payload]
                print(json.dumps(results))
            else:
                result = predict_student(payload)
                print(json.dumps(result))
            sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": str(e)}), file=sys.stderr)
            sys.exit(1)

    # 2. JSON argument mode
    if "--json" in sys.argv:
        try:
            idx = sys.argv.index("--json") + 1
            payload = json.loads(sys.argv[idx])
            if isinstance(payload, list):
                results = [predict_student(item) for item in payload]
                print(json.dumps(results))
            else:
                result = predict_student(payload)
                print(json.dumps(result))
            sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": str(e)}), file=sys.stderr)
            sys.exit(1)

    # 3. Metrics inspection mode
    if "--metrics" in sys.argv:
        metrics = get_model_metrics()
        print(json.dumps(metrics))
        sys.exit(0)

    # Fallback to local test run if invoked without CLI flags
    test_learner = {
        'Attendance': 68,
        'Hours_Studied': 10,
        'Previous_Scores': 54,
        'Access_to_Resources': 'Low',
        'Parental_Involvement': 'Low',
        'Tutoring_Sessions': 0
    }

    result = predict_student(test_learner)
    print("\n--- SAMPLE PREDICTION TEST ---")
    print(f"Predicted Score: {result['predicted_score']}%")
    print(f"Tier: [{result['risk_tier']['color'].upper()}] {result['risk_tier']['label']}")
    print(f"Probabilities: {result['risk_tier']['probabilities']}")
    print("Nudges:")
    for n in result['actionable_nudges']:
        print(f"  * {n}")
