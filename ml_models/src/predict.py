"""
Inference & Advisory Engine
Fusion High School Student Analytics

Loads trained models:
1. Career Recommendation System (Top 3 Career Matches + Confidence)
2. Academic Score Predictor (Predicted GPA)
3. Early-Warning At-Risk Detector (Risk Status + Intervention Guidance)

Can be imported in Python or executed from Node.js via CLI with `--json '...'`
"""

import os
import sys
import json
import warnings
import joblib
import pandas as pd
import numpy as np

# Suppress sklearn joblib worker warnings on Python 3.14
warnings.filterwarnings("ignore", category=UserWarning)

BASE_DIR = r"c:\FUSION_HIGH_APP_1\FUSION_HIGH_APP_2.1\ml_models"
MODEL_DIR = os.path.join(BASE_DIR, "saved_models")
DATA_DIR = os.path.join(BASE_DIR, "data", "processed")

class StudentAIAdvisor:
    def __init__(self, model_dir=MODEL_DIR):
        career_path = os.path.join(model_dir, "career_recommender.joblib")
        score_path = os.path.join(model_dir, "score_predictor.joblib")
        at_risk_path = os.path.join(model_dir, "at_risk_detector.joblib")
        
        if not os.path.exists(career_path):
            raise FileNotFoundError(f"Missing {career_path}. Run train_models.py first.")
            
        self.career_art = joblib.load(career_path)
        self.score_art = joblib.load(score_path)
        self.at_risk_art = joblib.load(at_risk_path)
        
        self.career_art["model"].n_jobs = 1
        self.at_risk_art["model"].n_jobs = 1

    def _engineer_features_df(self, df: pd.DataFrame) -> pd.DataFrame:
        """Computes derived academic features in a vectorized manner for batch or single rows."""
        df = df.copy()
        score_cols = [
            "math_score", "history_score", "physics_score", 
            "chemistry_score", "biology_score", "english_score", "geography_score"
        ]
        for col in score_cols:
            if col not in df.columns:
                df[col] = 75.0
                
        df["stem_avg"] = df[["math_score", "physics_score", "chemistry_score", "biology_score"]].mean(axis=1).round(2)
        df["humanities_avg"] = df[["history_score", "english_score", "geography_score"]].mean(axis=1).round(2)
        df["math_physics_avg"] = df[["math_score", "physics_score"]].mean(axis=1).round(2)
        df["bio_chem_avg"] = df[["biology_score", "chemistry_score"]].mean(axis=1).round(2)
        df["overall_score"] = df[score_cols].mean(axis=1).round(2)
        
        if "weekly_self_study_hours" not in df.columns:
            df["weekly_self_study_hours"] = 15.0
        if "absence_days" not in df.columns:
            df["absence_days"] = 2
        if "extracurricular_activities" not in df.columns:
            df["extracurricular_activities"] = 0
            
        df["study_efficiency"] = (df["overall_score"] / (df["weekly_self_study_hours"] + 1)).round(2)
        df["academic_balance"] = (df["stem_avg"] - df["humanities_avg"]).round(2)
        
        return df

    def predict_student(self, student_input: dict) -> dict:
        """
        Runs full AI evaluation across all 3 models for an individual student,
        dynamically customized by South African CAPS phase & grade level:
        - Grade 12: Post-School Career Recommendations (Top-3)
        - Grade 9: Grade 10 Stream & Subject Choice Advisory
        - Grades 8, 10, 11: Academic Performance Trajectory & Early At-Risk Detection
        """
        input_df = pd.DataFrame([student_input])
        features_df = self._engineer_features_df(input_df)
        grade = int(student_input.get("grade", 10))
        
        # 1. Career Recommendation (Top-3) — Exclusively evaluated for Grade 12 Matric candidates
        recommendations = None
        if grade == 12:
            c_cols = self.career_art["feature_names"]
            X_c_scaled = self.career_art["scaler"].transform(features_df[c_cols])
            c_probs = self.career_art["model"].predict_proba(X_c_scaled)[0]
            
            top_3_indices = np.argsort(c_probs)[::-1][:3]
            classes = self.career_art["label_encoder"].classes_
            
            recommendations = []
            for idx in top_3_indices:
                recommendations.append({
                    "career": classes[idx],
                    "confidence": round(float(c_probs[idx]) * 100, 1)
                })

        # 2. Grade 9 Stream & Subject Selection Advisory (Exclusively for Grade 9 transitioning to Grade 10)
        stream_selection = None
        if grade == 9:
            math_val = float(student_input.get("math_score", 65))
            science_val = float(student_input.get("physics_score") or student_input.get("natural_sciences_score") or 65)
            ems_val = float(student_input.get("ems_score") or student_input.get("accounting") or 60)
            lang_val = float(student_input.get("english_score") or student_input.get("languages_score") or 70)
            soc_val = float(student_input.get("history_score") or student_input.get("social_sciences_score") or 65)

            science_suitability = round((math_val * 0.5) + (science_val * 0.5), 1)
            commerce_suitability = round((ems_val * 0.6) + (math_val * 0.4), 1)
            humanities_suitability = round((lang_val * 0.5) + (soc_val * 0.5), 1)

            streams = [
                {
                    "stream": "Science Stream",
                    "suitability": science_suitability,
                    "focus": "STEM, Engineering, Medicine & Environmental Sciences",
                    "subjects": ["Mathematics", "Physical Sciences", "Life Sciences", "Geography", "English FAL", "Home Language", "Life Orientation"]
                },
                {
                    "stream": "Commerce Stream",
                    "suitability": commerce_suitability,
                    "focus": "Accounting, Finance, Economics & Business Leadership",
                    "subjects": ["Accounting", "Business Studies", "Economics", "Mathematics", "English FAL", "Home Language", "Life Orientation"]
                },
                {
                    "stream": "Humanities & Tourism Stream",
                    "suitability": humanities_suitability,
                    "focus": "Law, Social Sciences, Tourism Management & Media",
                    "subjects": ["Tourism", "History", "Geography", "Mathematical Literacy", "English FAL", "Home Language", "Life Orientation"]
                }
            ]
            streams.sort(key=lambda s: s["suitability"], reverse=True)
            top_stream = streams[0]

            stream_selection = {
                "recommended_stream": top_stream["stream"],
                "match_percentage": top_stream["suitability"],
                "recommended_subjects": top_stream["subjects"],
                "all_streams": streams,
                "guidance_summary": f"Based on strong performance in {top_stream['stream']}, the learner shows high academic readiness for the Grade 10 FET {top_stream['stream']}."
            }

        # 3. Predicted Overall Score
        s_cols = self.score_art["feature_names"]
        X_s_scaled = self.score_art["scaler"].transform(features_df[s_cols])
        predicted_score = round(float(self.score_art["model"].predict(X_s_scaled)[0]), 1)
        
        if predicted_score >= 80:
            performance_tier = "Distinction (Level 7)"
        elif predicted_score >= 70:
            performance_tier = "Meritorious (Level 6)"
        elif predicted_score >= 60:
            performance_tier = "Substantial (Level 5)"
        elif predicted_score >= 50:
            performance_tier = "Adequate (Level 4 - Bachelor Admission)"
        elif predicted_score >= 40:
            performance_tier = "Moderate (Level 3 - Diploma Admission)"
        elif predicted_score >= 30:
            performance_tier = "Elementary (Level 2 - Higher Certificate)"
        else:
            performance_tier = "Not Achieved (Level 1 - Action Required)"

        # 4. Early-Warning At-Risk Detector
        r_cols = self.at_risk_art["feature_names"]
        X_r_scaled = self.at_risk_art["scaler"].transform(features_df[r_cols])
        
        risk_prob = float(self.at_risk_art["model"].predict_proba(X_r_scaled)[0, 1])
        risk_threshold = self.at_risk_art["threshold"]
        is_at_risk = bool(risk_prob >= risk_threshold)
        
        if risk_prob >= 0.75:
            risk_level = "High"
            guidance = "Student requires immediate personalized counseling, tutoring intervention, and attendance review."
        elif risk_prob >= risk_threshold:
            risk_level = "Moderate"
            guidance = "Student shows signs of academic strain or attendance issues; mentor check-in recommended."
        else:
            risk_level = "Low"
            guidance = "Student is performing within stable healthy parameters."

        return {
            "grade": grade,
            "career_recommendations": recommendations,
            "stream_selection": stream_selection,
            "performance_prediction": {
                "predicted_overall_score": predicted_score,
                "tier": performance_tier
            },
            "at_risk_assessment": {
                "is_at_risk": is_at_risk,
                "risk_probability": round(risk_prob * 100, 1),
                "risk_level": risk_level,
                "intervention_guidance": guidance
            }
        }

    def recommend_for_unknown_students(self, input_csv_path, output_csv_path):
        """Batch processing: Generates AI recommendations for unknown students."""
        if not os.path.exists(input_csv_path):
            print(f"File not found: {input_csv_path}")
            return
            
        df = pd.read_csv(input_csv_path)
        features_df = self._engineer_features_df(df)
        
        # Batch Model 1 (Careers)
        c_cols = self.career_art["feature_names"]
        X_c_scaled = self.career_art["scaler"].transform(features_df[c_cols])
        c_probs = self.career_art["model"].predict_proba(X_c_scaled)
        classes = self.career_art["label_encoder"].classes_
        
        # Batch Model 2 (GPA Score)
        s_cols = self.score_art["feature_names"]
        X_s_scaled = self.score_art["scaler"].transform(features_df[s_cols])
        pred_scores = np.round(self.score_art["model"].predict(X_s_scaled), 1)
        
        # Batch Model 3 (At-Risk)
        r_cols = self.at_risk_art["feature_names"]
        X_r_scaled = self.at_risk_art["scaler"].transform(features_df[r_cols])
        risk_probs = self.at_risk_art["model"].predict_proba(X_r_scaled)[:, 1]
        risk_threshold = self.at_risk_art["threshold"]
        
        results = []
        for i in range(len(df)):
            probs_i = c_probs[i]
            top_3 = np.argsort(probs_i)[::-1][:3]
            
            r_prob = float(risk_probs[i])
            is_risk = bool(r_prob >= risk_threshold)
            r_level = "High" if r_prob >= 0.75 else ("Moderate" if is_risk else "Low")
            
            results.append({
                "id": df.iloc[i].get("id"),
                "top_career_1": classes[top_3[0]],
                "confidence_1": f"{probs_i[top_3[0]] * 100:.1f}%",
                "top_career_2": classes[top_3[1]],
                "confidence_2": f"{probs_i[top_3[1]] * 100:.1f}%",
                "top_career_3": classes[top_3[2]],
                "confidence_3": f"{probs_i[top_3[2]] * 100:.1f}%",
                "predicted_score": pred_scores[i],
                "is_at_risk": is_risk,
                "risk_probability": f"{r_prob * 100:.1f}%",
                "risk_level": r_level
            })
            
        out_df = pd.DataFrame(results)
        out_df.to_csv(output_csv_path, index=False)
        print(f"Saved recommendations -> {output_csv_path}")
        return out_df

if __name__ == "__main__":
    advisor = StudentAIAdvisor()
    
    # Check if CLI JSON argument provided or stdin
    if "--stdin" in sys.argv:
        try:
            raw_input = sys.stdin.read().strip()
            payload = json.loads(raw_input)
            if isinstance(payload, list):
                results = [advisor.predict_student(item) for item in payload]
                print(json.dumps(results))
            else:
                result = advisor.predict_student(payload)
                print(json.dumps(result))
            sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": str(e)}), file=sys.stderr)
            sys.exit(1)
            
    if "--json" in sys.argv:
        try:
            idx = sys.argv.index("--json") + 1
            payload_str = sys.argv[idx]
            payload = json.loads(payload_str)
            
            if isinstance(payload, list):
                # Batch prediction
                results = [advisor.predict_student(item) for item in payload]
                print(json.dumps(results))
            else:
                # Single prediction
                result = advisor.predict_student(payload)
                print(json.dumps(result))
            sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": str(e)}), file=sys.stderr)
            sys.exit(1)

    print("\n-----------------------------------------------------------")
    print("DEMO TEST CASE 1: High STEM Student (Doctor / Engineer Profile)")
    print("-----------------------------------------------------------")
    student_1 = {
        "math_score": 96,
        "history_score": 82,
        "physics_score": 95,
        "chemistry_score": 98,
        "biology_score": 97,
        "english_score": 88,
        "geography_score": 86,
        "absence_days": 1,
        "extracurricular_activities": 1,
        "weekly_self_study_hours": 42
    }
    pred_1 = advisor.predict_student(student_1)
    print("Career Recommendations:")
    for i, c in enumerate(pred_1["career_recommendations"], 1):
        print(f"  {i}. {c['career']} ({c['confidence']}%)")
    print(f"Predicted Academic Score: {pred_1['performance_prediction']['predicted_overall_score']} ({pred_1['performance_prediction']['tier']})")
    print(f"At-Risk Assessment: {pred_1['at_risk_assessment']['risk_level']} (Prob: {pred_1['at_risk_assessment']['risk_probability']}%)")

    # Run batch inference on all 223 unknown students
    unknown_csv = os.path.join(DATA_DIR, "unlabeled_students.csv")
    recom_csv = os.path.join(DATA_DIR, "unknown_students_recommended.csv")
    advisor.recommend_for_unknown_students(unknown_csv, recom_csv)
