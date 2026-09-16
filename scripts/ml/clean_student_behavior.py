
import os
import sys
import pandas as pd

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def main():
    print("=" * 70)
    print("FUSION HIGH SCHOOL: STUDENT BEHAVIOR DATA CLEANING PIPELINE")
    print("=" * 70)

    # 1. File Paths
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    raw_path = os.path.join(base_dir, 'data', 'raw_student_behavior_data.csv')
    cleaned_path = os.path.join(base_dir, 'data', 'cleaned_student_behavior_data.csv')

    if not os.path.exists(raw_path):
        print(f"[!] Error: Raw data file not found at: {raw_path}")
        sys.exit(1)

    print(f"[*] Loading raw dataset from: {raw_path}")
    df = pd.read_csv(raw_path)
    print(f"[+] Loaded {len(df)} records with {df.shape[1]} raw columns.")
    print("    Raw columns:", list(df.columns))

    # 2. Identify and Drop Unimportant / Out-of-Scope Features
    # Stripping:
    # - NationalITy & PlaceofBirth (Geographic noise/bias)
    # - raisedhands (Explicitly requested by user)
    # - ParentAnsweringSurvey & ParentschoolSatisfaction (Parent surveys outside learner behavior scope)
    # - Relation (Guardian relation outside core classroom scope)
    # - StageID (Redundant with GradeID)
    columns_to_drop = [
        'NationalITy',
        'PlaceofBirth',
        'raisedhands',
        'ParentAnsweringSurvey',
        'ParentschoolSatisfaction',
        'Relation',
        'StageID'
    ]
    existing_drop = [c for c in columns_to_drop if c in df.columns]
    df = df.drop(columns=existing_drop)
    print(f"\n[+] Successfully dropped {len(existing_drop)} out-of-scope columns:")
    for col in existing_drop:
        print(f"    - Dropped: {col}")

    # 3. Rename Remaining Columns to Clean Standard snake_case
    rename_mapping = {
        'gender': 'gender',
        'GradeID': 'grade',
        'SectionID': 'class_section',
        'Topic': 'subject',
        'Semester': 'semester',
        'VisITedResources': 'visited_resources',
        'AnnouncementsView': 'announcements_viewed',
        'Discussion': 'discussion_participation',
        'StudentAbsenceDays': 'absence_days',
        'Class': 'performance_class'
    }
    df = df.rename(columns=rename_mapping)

    # 4. Standardize Values & Formats
    # Gender: 'M' -> 'Male', 'F' -> 'Female'
    df['gender'] = df['gender'].map({'M': 'Male', 'F': 'Female'}).fillna(df['gender'])

    # Grade: Standardize format e.g. 'G-08' -> 'Grade 8'
    df['grade'] = df['grade'].str.replace('G-0', 'Grade ').str.replace('G-', 'Grade ')

    # Filter: High School Scope only (Grade 8 to Grade 12)
    high_school_grades = ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
    initial_before_grade = len(df)
    df = df[df['grade'].isin(high_school_grades)].copy()
    print(f"\n[+] High School Grade Filter applied (Grades 8-12 only):")
    print(f"    - Filtered out {initial_before_grade - len(df)} primary/elementary records.")
    print(f"    - Retained {len(df)} High School student records.")

    # Filter: South African Curriculum Subjects Only (Approach 2)
    # Dropping non-SA subjects: Arabic, Spanish, Quran, French, Geology
    sa_subject_mapping = {
        'Math': 'Mathematics',
        'Science': 'Natural Sciences',
        'Chemistry': 'Physical Sciences',
        'English': 'English FAL',
        'IT': 'Information Technology',
        'History': 'History'
    }
    non_sa_subjects = ['Arabic', 'Spanish', 'Quran', 'French', 'Geology']
    initial_before_subj = len(df)
    df = df[~df['subject'].isin(non_sa_subjects)].copy()
    print(f"\n[+] South African Subject Filter applied:")
    print(f"    - Dropped {initial_before_subj - len(df)} records with non-SA subjects (Arabic, Spanish, Quran, French, Geology).")
    print(f"    - Retained {len(df)} records with genuine South African subjects.")

    # Standardize subject names to official CAPS terminology
    df['subject'] = df['subject'].map(sa_subject_mapping).fillna(df['subject'])

    # Semester: 'F' -> 'Term 1/2 (Semester 1)', 'S' -> 'Term 3/4 (Semester 2)'
    df['semester'] = df['semester'].map({'F': 'Semester 1', 'S': 'Semester 2'}).fillna(df['semester'])

    # Absence Days: Clean string
    df['absence_days'] = df['absence_days'].str.strip()

    # Performance Class: L -> Low (At Risk), M -> Medium (Passing), H -> High (Distinction)
    # Also create binary pass/fail target: 'L' = 0 (Fail / Risk), 'M' and 'H' = 1 (Pass)
    df['is_pass'] = df['performance_class'].apply(lambda x: 0 if x == 'L' else 1)

    # Numerical Columns check
    num_cols = ['visited_resources', 'announcements_viewed', 'discussion_participation']
    for col in num_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)

    # 5. Missing Values & Duplicate Check
    initial_len = len(df)
    df = df.drop_duplicates()
    dedup_len = len(df)
    if initial_len != dedup_len:
        print(f"[*] Removed {initial_len - dedup_len} duplicate rows.")

    df = df.dropna()

    # 6. Save Cleaned Dataset
    df.to_csv(cleaned_path, index=False)
    print(f"\n[+] Cleaned dataset saved to: {cleaned_path}")
    print(f"    - Final clean records: {len(df)}")
    print(f"    - Final clean columns ({len(df.columns)}): {list(df.columns)}")

    # 7. Summary Analytics
    print("\n" + "-" * 70)
    print("CLEANED DATASET BREAKDOWN & HEALTH REPORT")
    print("-" * 70)
    print(f"Total Student-Subject Records: {len(df)}")
    print("\n[Gender Distribution]:")
    print(df['gender'].value_counts(normalize=True).mul(100).round(1).astype(str) + '% (' + df['gender'].value_counts().astype(str) + ')')

    print("\n[Performance Breakdown (Target)]: ")
    print(df['performance_class'].value_counts().to_string())
    print(f"Overall Pass Rate (M + H): {df['is_pass'].mean():.1%}")

    print("\n[Pass Rate by Gender]:")
    gender_pass = df.groupby('gender')['is_pass'].agg(['count', 'mean']).rename(columns={'count': 'Total', 'mean': 'Pass_Rate'})
    gender_pass['Pass_Rate'] = (gender_pass['Pass_Rate'] * 100).round(1).astype(str) + '%'
    print(gender_pass)

    print("\n[Subject Coverage]:")
    print(df['subject'].value_counts().to_string())

    print("\n[Grade Distribution]:")
    print(df['grade'].value_counts().to_string())

    print("\n[Class Sections]:")
    print(df['class_section'].value_counts().to_string())
    print("=" * 70)

if __name__ == '__main__':
    main()
