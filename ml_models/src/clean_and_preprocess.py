"""
Data Cleaning, Imputation, and Preprocessing Pipeline
Fusion High School Student Analytics

Strips non-essential & PII columns:
- email
- first_name
- last_name
- gender
- part_time_job
"""

import os
import pandas as pd
import numpy as np

def clean_and_preprocess(raw_csv_path, output_dir):
    """
    Cleans raw student data, handles any missing/empty values without dropping rows,
    engineers academic composite features, strips unnecessary columns (email, names, gender, part_time_job),
    and outputs processed datasets.
    """
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Loading raw dataset from: {raw_csv_path}")
    df = pd.read_csv(raw_csv_path)
    initial_row_count = len(df)
    print(f"Initial row count: {initial_row_count}")
    
    # 1. Standardize text and handle empty strings / whitespace
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].astype(str).str.strip()
        df[col] = df[col].replace({'': np.nan, 'nan': np.nan, 'None': np.nan, 'null': np.nan})
        
    # Check missing values
    missing_summary = df.isnull().sum()
    print("Missing values per column before imputation:")
    print(missing_summary[missing_summary > 0] if missing_summary.sum() > 0 else "  No explicit null values detected.")
    
    # 2. Imputation Strategy (PRESERVE ALL ROWS - DO NOT DROP)
    score_cols = [
        "math_score", "history_score", "physics_score", 
        "chemistry_score", "biology_score", "english_score", "geography_score"
    ]
    numeric_behavior_cols = ["absence_days", "weekly_self_study_hours"]
    
    # Impute numeric features with median
    for col in score_cols + numeric_behavior_cols:
        if col in df.columns:
            median_val = df[col].median()
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(median_val)
            
    # Impute extracurricular activities boolean
    if "extracurricular_activities" in df.columns:
        df["extracurricular_activities"] = df["extracurricular_activities"].astype(str).str.lower().map({'true': 1, '1': 1, 'false': 0, '0': 0})
        df["extracurricular_activities"] = df["extracurricular_activities"].fillna(0).astype(int)

    # Impute career aspiration target
    if "career_aspiration" in df.columns:
        df["career_aspiration"] = df["career_aspiration"].fillna("Unknown")

    # Verify no rows were dropped
    assert len(df) == initial_row_count, f"Row count changed from {initial_row_count} to {len(df)}!"
    print(f"All {len(df)} rows retained successfully after cleaning and imputation.")

    # 3. Feature Engineering
    # Academic Composites
    df["stem_avg"] = df[["math_score", "physics_score", "chemistry_score", "biology_score"]].mean(axis=1).round(2)
    df["humanities_avg"] = df[["history_score", "english_score", "geography_score"]].mean(axis=1).round(2)
    df["math_physics_avg"] = df[["math_score", "physics_score"]].mean(axis=1).round(2)
    df["bio_chem_avg"] = df[["biology_score", "chemistry_score"]].mean(axis=1).round(2)
    df["overall_score"] = df[score_cols].mean(axis=1).round(2)
    
    # Behavioral & Study Efficiency
    df["study_efficiency"] = (df["overall_score"] / (df["weekly_self_study_hours"] + 1)).round(2)
    df["academic_balance"] = (df["stem_avg"] - df["humanities_avg"]).round(2)
    
    # 4. Synthesizing Grounded At-Risk Indicator (Target for Model 3)
    is_failing_gpa = df["overall_score"] < 72.0
    is_chronic_absentee = df["absence_days"] >= 8
    is_core_deficit = (df["math_score"] < 65) & (df["english_score"] < 65)
    
    df["is_at_risk"] = (is_failing_gpa | is_chronic_absentee | is_core_deficit).astype(int)
    
    at_risk_count = df["is_at_risk"].sum()
    print(f"\nAt-Risk Distribution: {at_risk_count} at-risk students ({at_risk_count / len(df):.1%}), {len(df) - at_risk_count} stable.")

    # 5. Drop unnecessary columns per user specification:
    # email, first_name, last_name, gender, part_time_job
    columns_to_drop = ["first_name", "last_name", "email", "gender", "part_time_job"]
    existing_drops = [c for c in columns_to_drop if c in df.columns]
    print(f"Dropping unnecessary columns: {existing_drops}")
    df = df.drop(columns=existing_drops)

    # 6. Partitioning into Cleaned, Labeled (training), and Unlabeled ('Unknown' inference)
    cleaned_all_path = os.path.join(output_dir, "cleaned_students.csv")
    df.to_csv(cleaned_all_path, index=False)
    print(f"Saved complete cleaned dataset ({len(df)} rows, {len(df.columns)} cols) -> {cleaned_all_path}")

    # Labeled subset (for Career Model Training)
    labeled_df = df[df["career_aspiration"] != "Unknown"].copy()
    labeled_path = os.path.join(output_dir, "labeled_students.csv")
    labeled_df.to_csv(labeled_path, index=False)
    print(f"Saved labeled training dataset ({len(labeled_df)} rows, {len(labeled_df.columns)} cols) -> {labeled_path}")

    # Unlabeled subset (Unknown aspirations to recommend careers for)
    unlabeled_df = df[df["career_aspiration"] == "Unknown"].copy()
    unlabeled_path = os.path.join(output_dir, "unlabeled_students.csv")
    unlabeled_df.to_csv(unlabeled_path, index=False)
    print(f"Saved unlabeled inference dataset ({len(unlabeled_df)} rows, {len(unlabeled_df.columns)} cols) -> {unlabeled_path}")

    print("Columns in final processed dataset:\n", df.columns.tolist())
    return df, labeled_df, unlabeled_df

if __name__ == "__main__":
    raw_path = r"c:\FUSION_HIGH_APP_1\FUSION_HIGH_APP_2.1\ml_models\data\raw\student_scores.csv"
    proc_dir = r"c:\FUSION_HIGH_APP_1\FUSION_HIGH_APP_2.1\ml_models\data\processed"
    clean_and_preprocess(raw_path, proc_dir)
