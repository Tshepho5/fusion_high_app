import os
import sys
import json
import time
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
    confusion_matrix, roc_curve, mean_absolute_error, mean_squared_error, r2_score
)
from sklearn.inspection import permutation_importance
import joblib

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def print_progress(step, total, title):
    pct = int((step / total) * 100)
    bar = "█" * (pct // 5) + "░" * (20 - (pct // 5))
    print(f"\r[{bar}] {pct:3d}% | {title}", end="", flush=True)
    time.sleep(0.08)

def main():
    print("=" * 75)
    print("🎓 FUSION HIGH: VISUAL MACHINE LEARNING TRAINING & EVALUATION SUITE")
    print("=" * 75)

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    data_path = os.path.join(base_dir, 'data', 'student_matric_data.csv')
    models_dir = os.path.join(base_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)

    # 1. Dataset Loading
    print("\n[Step 1/5]  Loading South African High School Matric Dataset...")
    df = pd.read_csv(data_path, keep_default_na=False)
    for i in range(1, 11):
        print_progress(i, 10, f"Parsing CSV ({len(df)} student profiles)...")
    print("\n   Dataset loaded successfully.")
    print(f"    - Cohort Size: {len(df)} learners")
    print(f"    - Pass Rate: {(df['passed'] == 'Yes').mean():.1%} ({df['passed'].value_counts().to_dict()})")
    print(f"    - Average Final Exam Score: {df['final_score'].astype(float).mean():.1f}%")

    # 2. Features & Targets
    feature_cols = [
        'gender', 'age', 'study_hours_per_week', 'attendance_rate',
        'parent_education', 'internet_access', 'extracurricular', 'previous_score'
    ]
    num_cols = ['age', 'study_hours_per_week', 'attendance_rate', 'previous_score']
    cat_cols = ['gender', 'parent_education', 'internet_access', 'extracurricular']

    for c in num_cols:
        df[c] = pd.to_numeric(df[c], errors='coerce').fillna(df[c].median() if len(df[c]) > 0 else 0)
    for c in cat_cols:
        df[c] = df[c].astype(str)

    X = df[feature_cols]
    y_class = (df['passed'] == 'Yes').astype(int)
    y_reg = df['final_score'].astype(float)

    # 3. Train/Test Split
    X_train, X_test, y_train_cls, y_test_cls, y_train_reg, y_test_reg = train_test_split(
        X, y_class, y_reg, test_size=0.2, random_state=42, stratify=y_class
    )

    # 4. Preprocessing Pipeline
    print("\n[Step 2/5] Building Feature Transformer & Normalizer...")
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), num_cols),
            ('cat', OneHotEncoder(drop='first', sparse_output=False, handle_unknown='ignore'), cat_cols)
        ]
    )

    preprocessor.fit(X_train)
    cat_feature_names = preprocessor.named_transformers_['cat'].get_feature_names_out(cat_cols).tolist()
    all_feature_names = num_cols + cat_feature_names

    X_train_trans = preprocessor.transform(X_train)
    X_test_trans = preprocessor.transform(X_test)
    for i in range(1, 11):
        print_progress(i, 10, f"Standardizing {len(all_feature_names)} feature dimensions...")
    print("\n  ✔ Feature preprocessing completed.")

    # 5. Training Classification Models (with live fold metrics)
    print("\n[Step 3/5] Training At-Risk Classification Models (5-Fold Cross Validation)...")
    clf_models = {
        'Logistic Regression': LogisticRegression(max_iter=1000, random_state=42),
        'Random Forest': RandomForestClassifier(n_estimators=120, max_depth=6, random_state=42),
        'Gradient Boosting': HistGradientBoostingClassifier(max_iter=100, random_state=42)
    }

    best_clf_name = None
    best_clf_score = -1
    best_clf_model = None

    for name, model in clf_models.items():
        print(f"\n  Training {name}...")
        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        fold_scores = []
        for fold, (train_idx, val_idx) in enumerate(skf.split(X_train_trans, y_train_cls), 1):
            model.fit(X_train_trans[train_idx], y_train_cls.iloc[train_idx])
            val_preds = model.predict_proba(X_train_trans[val_idx])[:, 1]
            score = roc_auc_score(y_train_cls.iloc[val_idx], val_preds)
            fold_scores.append(score)
            print_progress(fold, 5, f"Fold {fold}/5: Validation AUC = {score:.3f}")
        
        # Fit on full training set
        model.fit(X_train_trans, y_train_cls)
        test_preds = model.predict(X_test_trans)
        test_proba = model.predict_proba(X_test_trans)[:, 1]
        
        acc = accuracy_score(y_test_cls, test_preds)
        auc = roc_auc_score(y_test_cls, test_proba)
        rec = recall_score(y_test_cls, test_preds)
        
        print(f"\n     {name} Results: Test Acc={acc:.1%}, Recall={rec:.1%}, ROC-AUC={auc:.3f}, CV-Mean-AUC={np.mean(fold_scores):.3f}")
        
        if auc > best_clf_score:
            best_clf_score = auc
            best_clf_name = name
            best_clf_model = model

    # 6. Training Score Regressors
    print(f"\n[Step 4/5]  Training Continuous Mark Regressor (Predicting Final Exam %)...")
    reg_models = {
        'Ridge Regression': Ridge(alpha=1.0, random_state=42),
        'Random Forest Regressor': RandomForestRegressor(n_estimators=120, max_depth=6, random_state=42),
        'Gradient Boosting Regressor': HistGradientBoostingRegressor(max_iter=100, random_state=42)
    }

    best_reg_name = None
    best_reg_r2 = -999
    best_reg_model = None

    for name, model in reg_models.items():
        print(f"\n   Training {name}...")
        model.fit(X_train_trans, y_train_reg)
        preds = model.predict(X_test_trans)
        r2 = r2_score(y_test_reg, preds)
        mae = mean_absolute_error(y_test_reg, preds)
        rmse = float(np.sqrt(mean_squared_error(y_test_reg, preds)))
        print(f"    ★ {name} Results: R² Score={r2:.3f}, MAE=±{mae:.2f}%, RMSE=±{rmse:.2f}%")
        
        if r2 > best_reg_r2:
            best_reg_r2 = r2
            best_reg_name = name
            best_reg_model = model

    # 7. Generate Visual Plots
    print("\n[Step 5/5]  Generating Visual Performance Plots (ROC Curve, Confusion Matrix, Actual vs Predicted)...")
    
    y_test_proba = best_clf_model.predict_proba(X_test_trans)[:, 1]
    y_test_pred = best_clf_model.predict(X_test_trans)
    y_reg_pred = best_reg_model.predict(X_test_trans)

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    plt.style.use('seaborn-v0_8-darkgrid' if 'seaborn-v0_8-darkgrid' in plt.style.available else 'default')

    # Plot 1: Confusion Matrix
    cm = confusion_matrix(y_test_cls, y_test_pred)
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[0, 0], cbar=False,
                xticklabels=['At-Risk / Fail', 'Pass'],
                yticklabels=['At-Risk / Fail', 'Pass'])
    axes[0, 0].set_title(f'1. Confusion Matrix ({best_clf_name})\nAccuracy: {accuracy_score(y_test_cls, y_test_pred):.1%}', fontsize=12, fontweight='bold')
    axes[0, 0].set_ylabel('Actual Status', fontweight='bold')
    axes[0, 0].set_xlabel('Predicted Status', fontweight='bold')

    # Plot 2: ROC Curve
    fpr, tpr, _ = roc_curve(y_test_cls, y_test_proba)
    axes[0, 1].plot(fpr, tpr, color='#10B981', lw=2.5, label=f'{best_clf_name} (AUC = {best_clf_score:.3f})')
    axes[0, 1].plot([0, 1], [0, 1], color='#94A3B8', linestyle='--', lw=1.5, label='Random Baseline')
    axes[0, 1].set_title('2. Receiver Operating Characteristic (ROC Curve)', fontsize=12, fontweight='bold')
    axes[0, 1].set_xlabel('False Positive Rate (1 - Specificity)', fontweight='bold')
    axes[0, 1].set_ylabel('True Positive Rate (Recall / Sensitivity)', fontweight='bold')
    axes[0, 1].legend(loc='lower right')

    # Plot 3: Actual vs Predicted Final Exam Scores
    axes[1, 0].scatter(y_test_reg, y_reg_pred, alpha=0.75, color='#6366F1', edgecolors='k', s=50)
    axes[1, 0].plot([20, 100], [20, 100], color='#EF4444', linestyle='--', lw=2, label='Perfect 1:1 Fit')
    axes[1, 0].set_title(f'3. Final Exam Mark Regression ({best_reg_name})\nR² = {best_reg_r2:.3f}, MAE = ±{mean_absolute_error(y_test_reg, y_reg_pred):.1f}%', fontsize=12, fontweight='bold')
    axes[1, 0].set_xlabel('Actual Final Score (%)', fontweight='bold')
    axes[1, 0].set_ylabel('ML Predicted Score (%)', fontweight='bold')
    axes[1, 0].legend(loc='upper left')

    # Plot 4: Feature Importance Ranking
    perm = permutation_importance(best_clf_model, X_test_trans, y_test_cls, n_repeats=10, random_state=42)
    feat_df = pd.DataFrame({
        'Feature': [f.replace('_', ' ').replace('parent education ', 'Parent: ') for f in all_feature_names],
        'Importance': perm.importances_mean
    }).sort_values('Importance', ascending=True)

    axes[1, 1].barh(feat_df['Feature'], feat_df['Importance'], color='#3B82F6')
    axes[1, 1].set_title('4. Permutation Feature Importance (Matric Success Drivers)', fontsize=12, fontweight='bold')
    axes[1, 1].set_xlabel('Mean Importance Impact on Model Accuracy', fontweight='bold')

    plt.tight_layout()
    chart_path = os.path.join(models_dir, 'training_evaluation_plots.png')
    plt.savefig(chart_path, dpi=180)
    plt.close()

    print(f"\n  ✔ Saved visualization chart to: {chart_path}")
    print("\n" + "=" * 75)
    print(" TRAINING COMPLETED WITH FULL VISUAL DIAGNOSTICS!")
    print("=" * 75)

if __name__ == '__main__':
    main()
