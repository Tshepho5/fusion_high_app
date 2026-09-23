"""
Unit and Integration Tests for Student ML Pipeline
"""

import os
import unittest
import pandas as pd
import numpy as np

BASE_DIR = r"c:\FUSION_HIGH_APP_1\FUSION_HIGH_APP_2.1\ml_models"

class TestStudentMLPipeline(unittest.TestCase):
    
    def test_01_raw_dataset_integrity(self):
        raw_csv = os.path.join(BASE_DIR, "data", "raw", "student_scores.csv")
        self.assertTrue(os.path.exists(raw_csv), "Raw student_scores.csv missing!")
        df = pd.read_csv(raw_csv)
        self.assertEqual(len(df), 2000, f"Expected 2000 rows, got {len(df)}")
        self.assertEqual(len(df.columns), 17, f"Expected 17 columns, got {len(df.columns)}")
        
    def test_02_cleaned_datasets_retention(self):
        cleaned_csv = os.path.join(BASE_DIR, "data", "processed", "cleaned_students.csv")
        self.assertTrue(os.path.exists(cleaned_csv), "Cleaned dataset missing!")
        df = pd.read_csv(cleaned_csv)
        self.assertEqual(len(df), 2000, "Cleaned dataset dropped rows! Must retain all 2000 rows.")
        self.assertEqual(df.isnull().sum().sum(), 0, "Cleaned dataset contains unhandled nulls!")
        
    def test_03_saved_models_exist(self):
        m1 = os.path.join(BASE_DIR, "saved_models", "career_recommender.joblib")
        m2 = os.path.join(BASE_DIR, "saved_models", "score_predictor.joblib")
        m3 = os.path.join(BASE_DIR, "saved_models", "at_risk_detector.joblib")
        self.assertTrue(os.path.exists(m1), "Career model artifact missing!")
        self.assertTrue(os.path.exists(m2), "Score predictor model artifact missing!")
        self.assertTrue(os.path.exists(m3), "At-risk detector model artifact missing!")
        
    def test_04_advisor_inference(self):
        from ml_models.src.predict import StudentAIAdvisor
        advisor = StudentAIAdvisor()
        
        sample = {
            "math_score": 90,
            "history_score": 85,
            "physics_score": 92,
            "chemistry_score": 88,
            "biology_score": 89,
            "english_score": 84,
            "geography_score": 80,
            "part_time_job": 0,
            "absence_days": 2,
            "extracurricular_activities": 1,
            "weekly_self_study_hours": 30
        }
        res = advisor.predict_student(sample)
        
        # Check Career Recommendations
        recs = res["career_recommendations"]
        self.assertEqual(len(recs), 3, "Expected top 3 career recommendations")
        total_top3_conf = sum(r["confidence"] for r in recs)
        self.assertGreater(total_top3_conf, 0.0)
        
        # Check Predicted Score
        score = res["performance_prediction"]["predicted_overall_score"]
        self.assertTrue(50 <= score <= 100, f"Score out of plausible range: {score}")
        
        # Check At-Risk Flag
        self.assertIn("is_at_risk", res["at_risk_assessment"])
        self.assertIn(res["at_risk_assessment"]["risk_level"], ["Low", "Moderate", "High"])

if __name__ == "__main__":
    unittest.main()
