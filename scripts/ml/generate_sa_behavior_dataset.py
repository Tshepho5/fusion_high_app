import os
import sys
import numpy as np
import pandas as pd

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def main():
    print("=" * 70)
    print("FUSION HIGH SCHOOL: SOUTH AFRICAN CAPS BEHAVIOR DATASET SYNTHESIZER")
    print("=" * 70)

    # 1. Target count
    TARGET_RECORDS = 2000
    np.random.seed(42)

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    clean_seed_path = os.path.join(base_dir, 'data', 'cleaned_student_behavior_data.csv')
    output_path = os.path.join(base_dir, 'data', 'sa_student_behavior_2000.csv')

    print(f"[*] Reading base behavioral distributions from: {clean_seed_path}")
    df_seed = pd.read_csv(clean_seed_path)
    print(f"[+] Loaded {len(df_seed)} baseline seed records.")

    # 2. Extract baseline statistical benchmarks from clean data
    # Numerical distributions
    vis_res_mean = df_seed['visited_resources'].mean()
    vis_res_std = df_seed['visited_resources'].std()
    ann_mean = df_seed['announcements_viewed'].mean()
    ann_std = df_seed['announcements_viewed'].std()
    disc_mean = df_seed['discussion_participation'].mean()
    disc_std = df_seed['discussion_participation'].std()

    print(f"    - Visited Resources mean: {vis_res_mean:.1f}, std: {vis_res_std:.1f}")
    print(f"    - Announcements mean: {ann_mean:.1f}, std: {ann_std:.1f}")
    print(f"    - Discussions mean: {disc_mean:.1f}, std: {disc_std:.1f}")

    # 3. South African School Structure Setup
    grades = [
        ('Grade 8', 'General', ['8A', '8B', '8C'], 400),
        ('Grade 9', 'General', ['9A', '9B', '9C'], 400),
        ('Grade 10', ['Science', 'Commerce', 'Tourism'], ['10A', '10B', '10C'], 400),
        ('Grade 11', ['Science', 'Commerce', 'Tourism'], ['11A', '11B', '11C'], 400),
        ('Grade 12', ['Science', 'Commerce', 'Tourism'], ['12A', '12B', '12C'], 400),
    ]

    # CAPS Subject catalogues by Grade & Stream
    subjects_get = [
        'Mathematics', 'Natural Sciences', 'Social Sciences', 'EMS',
        'Technology', 'English FAL', 'Life Orientation'
    ]

    subjects_fet = {
        'Science': ['Mathematics', 'Physical Sciences', 'Life Sciences', 'Geography', 'Information Technology', 'English FAL', 'Life Orientation'],
        'Commerce': ['Accounting', 'Business Studies', 'Economics', 'Mathematics', 'Mathematical Literacy', 'English FAL', 'Life Orientation'],
        'Tourism': ['Tourism', 'Geography', 'Mathematical Literacy', 'History', 'English FAL', 'Life Orientation']
    }

    records = []
    student_counter = 1

    print(f"[*] Generating {TARGET_RECORDS} authentic South African learner records...")

    for grade_name, stream_spec, class_list, grade_allocation in grades:
        records_for_grade = 0
        while records_for_grade < grade_allocation:
            # Demographics
            gender = np.random.choice(['Male', 'Female'], p=[0.50, 0.50])
            student_id = f"FHS{student_counter:04d}"
            student_counter += 1

            # Select stream & class section
            if grade_name in ['Grade 8', 'Grade 9']:
                stream = 'General'
                class_section = np.random.choice(['A', 'B', 'C'], p=[0.38, 0.38, 0.24])
                class_name = f"{grade_name.replace('Grade ', '')}{class_section}"
                possible_subjects = subjects_get
            else:
                stream = np.random.choice(['Science', 'Commerce', 'Tourism'], p=[0.42, 0.35, 0.23])
                class_section = 'A' if stream == 'Science' else ('B' if stream == 'Commerce' else 'C')
                class_name = f"{grade_name.replace('Grade ', '')}{class_section}"
                possible_subjects = subjects_fet[stream]

            # Class environment: class size
            class_size = np.random.choice([32, 35, 38, 42, 45, 48], p=[0.15, 0.25, 0.25, 0.20, 0.10, 0.05])

            # Sample 1 or 2 subjects for this record to reflect per-subject performance
            subject = np.random.choice(possible_subjects)

            # Semester
            semester = np.random.choice(['Semester 1', 'Semester 2'], p=[0.50, 0.50])

            # Latent student motivation factor (latent capability & discipline)
            # Gender slight variance reflecting DBE trends: girls show higher average consistency
            base_motivation = np.random.beta(a=3.2 if gender == 'Female' else 2.8, b=2.2)

            # Attendance behavior
            # High motivation -> low absences
            prob_above_7 = max(0.05, min(0.85, 0.70 - (base_motivation * 0.75)))
            absence_days = 'Above-7' if np.random.rand() < prob_above_7 else 'Under-7'

            # Behavioral engagement metrics (bounded 0-100)
            vis_res_val = int(np.clip(np.random.normal(loc=base_motivation * 85 + 10, scale=14), 0, 99))
            ann_val = int(np.clip(np.random.normal(loc=base_motivation * 60 + 10, scale=18), 0, 99))
            disc_val = int(np.clip(np.random.normal(loc=base_motivation * 65 + 12, scale=16), 0, 99))

            # Study hours per week & homework submission
            weekly_study_hours = round(max(2.0, min(32.0, base_motivation * 22 + np.random.normal(0, 3))), 1)
            homework_rate = int(np.clip(base_motivation * 80 + 20 + np.random.normal(0, 10), 10, 100))

            # Subject difficulty adjustment (e.g. Physical Sciences / Math are tougher)
            diff_penalty = 0
            if subject in ['Mathematics', 'Physical Sciences', 'Accounting']:
                diff_penalty = 8
            elif subject in ['Tourism', 'Life Orientation', 'EMS']:
                diff_penalty = -5

            # Crowded classroom penalty (class_size > 42 adds slight distraction risk)
            class_penalty = 3 if class_size >= 42 else 0

            # Composite continuous score (0 - 100%)
            raw_score = (
                base_motivation * 68
                + (0 if absence_days == 'Under-7' else -15)
                + (vis_res_val * 0.15)
                + (ann_val * 0.08)
                + (disc_val * 0.08)
                - diff_penalty
                - class_penalty
                + np.random.normal(0, 5)
            )
            score_percentage = int(np.clip(round(raw_score), 5, 98))

            # Target Performance Class: L, M, H
            if score_percentage < 40:
                performance_class = 'L'
                is_pass = 0
            elif score_percentage < 70:
                performance_class = 'M'
                is_pass = 1
            else:
                performance_class = 'H'
                is_pass = 1

            # CAPS Level (1-7)
            if score_percentage >= 80:
                caps_level = 7
            elif score_percentage >= 70:
                caps_level = 6
            elif score_percentage >= 60:
                caps_level = 5
            elif score_percentage >= 50:
                caps_level = 4
            elif score_percentage >= 40:
                caps_level = 3
            elif score_percentage >= 30:
                caps_level = 2
            else:
                caps_level = 1

            records.append({
                'student_id': student_id,
                'gender': gender,
                'grade': grade_name,
                'stream': stream,
                'class_name': class_name,
                'class_section': class_section,
                'class_size': class_size,
                'subject': subject,
                'semester': semester,
                'visited_resources': vis_res_val,
                'announcements_viewed': ann_val,
                'discussion_participation': disc_val,
                'absence_days': absence_days,
                'weekly_study_hours': weekly_study_hours,
                'homework_completion_rate': homework_rate,
                'final_score': score_percentage,
                'caps_level': caps_level,
                'performance_class': performance_class,
                'is_pass': is_pass
            })

            records_for_grade += 1

    df_2000 = pd.DataFrame(records)

    # Save to CSV
    df_2000.to_csv(output_path, index=False)
    print(f"\n[+] Successfully created and saved: {output_path}")
    print(f"    - Total records: {len(df_2000)}")
    print(f"    - Total columns: {len(df_2000.columns)}")

    # Summary analytics
    print("\n" + "-" * 70)
    print("SOUTH AFRICAN 2,000-RECORD HIGH SCHOOL DATASET HEALTH REPORT")
    print("-" * 70)
    print(f"Total Student-Subject Records: {len(df_2000)}")
    print("\n[Gender Distribution]:")
    print(df_2000['gender'].value_counts(normalize=True).mul(100).round(1).astype(str) + '% (' + df_2000['gender'].value_counts().astype(str) + ')')

    print("\n[Pass Rate by Gender]:")
    gp = df_2000.groupby('gender')['is_pass'].agg(['count', 'mean']).rename(columns={'count': 'Total', 'mean': 'Pass_Rate'})
    gp['Pass_Rate'] = (gp['Pass_Rate'] * 100).round(1).astype(str) + '%'
    print(gp)

    print("\n[Performance Breakdown (Target)]: ")
    print(df_2000['performance_class'].value_counts().to_string())
    print(f"Overall Pass Rate: {df_2000['is_pass'].mean():.1%}")

    print("\n[Grade Distribution (Balanced)]: ")
    print(df_2000['grade'].value_counts().to_string())

    print("\n[Curriculum Stream Distribution]: ")
    print(df_2000['stream'].value_counts().to_string())

    print("\n[Subject Coverage across CAPS]: ")
    print(df_2000['subject'].value_counts().to_string())

    print("\n[Classroom Sizes (Environment)]: ")
    print(df_2000['class_size'].value_counts().sort_index().to_string())
    print("=" * 70)

if __name__ == '__main__':
    main()
