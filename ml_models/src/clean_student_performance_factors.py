"""
Data Cleaning, Imputation, Bias Audit, and Preprocessing Pipeline
for StudentPerformanceFactors.xlsx -> Geleza SA Multi-School System

Outputs:
1. data/raw/student_performance_factors_raw.csv (Pure raw CSV conversion)
2. data/processed/student_performance_clean.csv (Human-readable cleaned dataset with labels intact)
3. data/processed/student_performance_ml_ready.csv (Numerically encoded for ML training & fairness tests)
4. reports/student_performance_factors_audit.json & markdown summary
"""

import os
import zipfile
import xml.etree.ElementTree as ET
import json
import pandas as pd
import numpy as np

def convert_xlsx_to_df(xlsx_path):
    """
    Parses an XLSX file using standard library zipfile and xml.etree.
    Does not require openpyxl or heavy external dependencies.
    """
    print(f"Reading XLSX directly via XML parser from: {xlsx_path}")
    with zipfile.ZipFile(xlsx_path, 'r') as z:
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for t in tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'):
                strings.append(t.text if t.text else '')

        sheet = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        rows = sheet.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')

        header_row = rows[0]
        headers = []
        col_letters = []
        for c in header_row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
            r = c.get('r')
            col_letters.append(''.join([ch for ch in r if ch.isalpha()]))
            t = c.get('t')
            v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            val = v.text if v is not None else ''
            if t == 's' and val.isdigit() and int(val) < len(strings):
                headers.append(strings[int(val)])
            else:
                headers.append(val)

        records = []
        for row in rows[1:]:
            cell_dict = {}
            for c in row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                r = c.get('r')
                col_letter = ''.join([ch for ch in r if ch.isalpha()])
                t = c.get('t')
                v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                val = v.text if v is not None else ''
                if t == 's' and val.isdigit() and int(val) < len(strings):
                    cell_dict[col_letter] = strings[int(val)].strip()
                else:
                    cell_dict[col_letter] = val.strip()
            records.append([cell_dict.get(c, '') for c in col_letters])

    df = pd.DataFrame(records, columns=headers)
    print(f"Successfully extracted {len(df)} rows and {len(df.columns)} columns.")
    return df

def run_cleaning_and_processing(
    xlsx_path=r"c:\FUSION_HIGH_APP_1\FUSION_HIGH_APP_2.1\StudentPerformanceFactors.xlsx",
    output_base_dir=r"c:\FUSION_HIGH_APP_1\FUSION_HIGH_APP_2.1\ml_models"
):
    raw_dir = os.path.join(output_base_dir, "data", "raw")
    processed_dir = os.path.join(output_base_dir, "data", "processed")
    reports_dir = os.path.join(output_base_dir, "reports")
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(processed_dir, exist_ok=True)
    os.makedirs(reports_dir, exist_ok=True)

    # 1. Convert XLSX to DataFrame & save raw CSV
    df = convert_xlsx_to_df(xlsx_path)
    raw_csv_path = os.path.join(raw_dir, "student_performance_factors_raw.csv")
    df.to_csv(raw_csv_path, index=False)
    print(f"Saved raw CSV to: {raw_csv_path}")

    # Also save a copy in root data/ for convenience
    root_data_dir = r"c:\FUSION_HIGH_APP_1\FUSION_HIGH_APP_2.1\data"
    os.makedirs(root_data_dir, exist_ok=True)
    df.to_csv(os.path.join(root_data_dir, "student_performance_factors_raw.csv"), index=False)

    total_rows = len(df)

    # 2. Text normalization (strip whitespace, standardize empty strings)
    for col in df.columns:
        df[col] = df[col].astype(str).str.strip()
        df[col] = df[col].replace({'': np.nan, 'nan': np.nan, 'None': np.nan, 'null': np.nan})

    # 3. Audit Missing Values Before Imputation
    null_counts = df.isnull().sum()
    missing_dict = {col: int(cnt) for col, cnt in null_counts.items() if cnt > 0}
    print(f"Missing values found: {missing_dict}")

    # 4. Imputation Strategy
    # Mode imputation for the 3 columns with missing records:
    # Teacher_Quality: Mode is 'Medium'
    teacher_quality_mode = df['Teacher_Quality'].dropna().mode()[0] if 'Teacher_Quality' in df.columns else 'Medium'
    df['Teacher_Quality'] = df['Teacher_Quality'].fillna(teacher_quality_mode)

    # Parental_Education_Level: Mode is 'High School'
    parental_edu_mode = df['Parental_Education_Level'].dropna().mode()[0] if 'Parental_Education_Level' in df.columns else 'High School'
    df['Parental_Education_Level'] = df['Parental_Education_Level'].fillna(parental_edu_mode)

    # Distance_from_Home: Mode is 'Near'
    distance_mode = df['Distance_from_Home'].dropna().mode()[0] if 'Distance_from_Home' in df.columns else 'Near'
    df['Distance_from_Home'] = df['Distance_from_Home'].fillna(distance_mode)

    # 5. Type Casting for Numerical Columns
    numeric_cols = [
        'Hours_Studied', 'Attendance', 'Sleep_Hours', 
        'Previous_Scores', 'Tutoring_Sessions', 'Physical_Activity', 'Exam_Score'
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    # Impute any unforeseen numerical nulls with median
    for col in numeric_cols:
        if col in df.columns and df[col].isnull().sum() > 0:
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val)

    # 6. Outlier Capping & Range Bounds
    # Exam_Score cannot exceed 100 or be less than 0
    raw_max_score = float(df['Exam_Score'].max())
    if raw_max_score > 100.0:
        over_100_count = int((df['Exam_Score'] > 100.0).sum())
        print(f"Detected {over_100_count} rows where Exam_Score > 100 (Max: {raw_max_score}). Capping to 100.0.")
        df['Exam_Score'] = df['Exam_Score'].clip(lower=0.0, upper=100.0)

    # Attendance capped between 0 and 100
    df['Attendance'] = df['Attendance'].clip(lower=0.0, upper=100.0)

    # 7. Pre-Drop Bias & Balance Audit
    bias_audit = {
        "total_records": total_rows,
        "missing_imputed": missing_dict,
        "target_stats": {
            "mean": float(round(df['Exam_Score'].mean(), 2)),
            "std": float(round(df['Exam_Score'].std(), 2)),
            "min": float(df['Exam_Score'].min()),
            "median": float(df['Exam_Score'].median()),
            "max": float(df['Exam_Score'].max())
        },
        "gender_balance": {
            k: {
                "count": int(v['count']),
                "percentage": float(round(v['count'] / total_rows * 100, 2)),
                "mean_score": float(round(v['mean'], 2)),
                "std_score": float(round(v['std'], 2))
            }
            for k, v in df.groupby('Gender')['Exam_Score'].agg(['count', 'mean', 'std']).iterrows()
        },
        "school_type_balance": {
            k: {
                "count": int(v['count']),
                "percentage": float(round(v['count'] / total_rows * 100, 2)),
                "mean_score": float(round(v['mean'], 2)),
                "std_score": float(round(v['std'], 2))
            }
            for k, v in df.groupby('School_Type')['Exam_Score'].agg(['count', 'mean', 'std']).iterrows()
        },
        "family_income_balance": {
            k: {
                "count": int(v['count']),
                "percentage": float(round(v['count'] / total_rows * 100, 2)),
                "mean_score": float(round(v['mean'], 2)),
                "std_score": float(round(v['std'], 2))
            }
            for k, v in df.groupby('Family_Income')['Exam_Score'].agg(['count', 'mean', 'std']).iterrows()
        },
        "learning_disabilities_balance": {
            k: {
                "count": int(v['count']),
                "percentage": float(round(v['count'] / total_rows * 100, 2)),
                "mean_score": float(round(v['mean'], 2)),
                "std_score": float(round(v['std'], 2))
            }
            for k, v in df.groupby('Learning_Disabilities')['Exam_Score'].agg(['count', 'mean', 'std']).iterrows()
        }
    }

    # 8. Feature Selection: Retain Top 6 Core Features (Permutation Importance >= 0.05)
    # Dropped from Family_Income downwards:
    # Family_Income, Peer_Influence, Motivation_Level, Parental_Education_Level,
    # Distance_from_Home, Teacher_Quality, Internet_Access, Extracurricular_Activities,
    # Learning_Disabilities, Physical_Activity, Gender, School_Type, Sleep_Hours
    core_selected_features = [
        'Attendance',
        'Hours_Studied',
        'Access_to_Resources',
        'Previous_Scores',
        'Parental_Involvement',
        'Tutoring_Sessions',
        'Exam_Score'
    ]
    clean_df = df[[c for c in core_selected_features if c in df.columns]].copy()

    # Save Human-Readable Cleaned Dataset
    clean_csv_path = os.path.join(processed_dir, "student_performance_clean.csv")
    try:
        clean_df.to_csv(clean_csv_path, index=False)
        print(f"Saved human-readable clean dataset ({len(clean_df)} rows, {len(clean_df.columns)} cols) to: {clean_csv_path}")
    except PermissionError:
        print(f"Note: {clean_csv_path} is currently open in Excel. Saved copy to root data/ directory.")
    clean_df.to_csv(os.path.join(root_data_dir, "student_performance_clean.csv"), index=False)

    # 9. Machine Learning Encoding Pipeline
    ml_df = clean_df.copy()

    ordinal_mappings = {
        'Parental_Involvement': {'Low': 1, 'Medium': 2, 'High': 3},
        'Access_to_Resources': {'Low': 1, 'Medium': 2, 'High': 3}
    }

    for col, mapping in ordinal_mappings.items():
        if col in ml_df.columns:
            ml_df[col] = ml_df[col].map(mapping)

    # Cast numeric columns
    for col in ['Attendance', 'Hours_Studied', 'Previous_Scores', 'Tutoring_Sessions', 'Exam_Score']:
        if col in ml_df.columns:
            ml_df[col] = pd.to_numeric(ml_df[col], errors='coerce')

    # Target categorization: Perfectly Balanced 3-Tier Distribution (~33.3% each)
    # Tier 0 (Priority Support): <= 65 marks (~32.3% of students)
    # Tier 1 (Core Progress): 66 - 68 marks (~33.7% of students)
    # Tier 2 (High Achiever): >= 69 marks (~34.0% of students)
    def assign_risk_tier(score):
        if score <= 65.0:
            return 0 # 'Priority Support' (~2,131 students)
        elif score <= 68.0:
            return 1 # 'Core Progress' (~2,227 students)
        else:
            return 2 # 'High Achiever' (~2,249 students)

    ml_df['Risk_Tier'] = ml_df['Exam_Score'].apply(assign_risk_tier)

    # Save ML-Ready Encoded Dataset
    ml_csv_path = os.path.join(processed_dir, "student_performance_ml_ready.csv")
    ml_df.to_csv(ml_csv_path, index=False)
    ml_df.to_csv(os.path.join(root_data_dir, "student_performance_ml_ready.csv"), index=False)
    print(f"Saved ML-ready encoded dataset ({len(ml_df)} rows, {len(ml_df.columns)} cols) to: {ml_csv_path}")

    # 10. Save Audit Report
    report_json_path = os.path.join(reports_dir, "student_performance_audit.json")
    with open(report_json_path, "w") as f:
        json.dump(bias_audit, f, indent=2)
    print(f"Saved audit report JSON to: {report_json_path}")

    return clean_df, ml_df, bias_audit

if __name__ == "__main__":
    run_cleaning_and_processing()
