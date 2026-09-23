"""
Model Training, Balancing, and Evaluation Pipeline (Streamlined & Non-Biased)
Fusion High School Student Analytics

Trains 3 AI Models without PII, Gender, or Part-Time Job:
1. Career Recommendation System (Multi-class Classification with Class Balancing)
2. Academic Performance Predictor (Continuous Regression)
3. Early-Warning At-Risk Detector (Cost-sensitive Binary Classification)
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.linear_model import Ridge, LogisticRegression
from sklearn.metrics import (
    accuracy_score, f1_score, mean_absolute_error, mean_squared_error, r2_score,
    roc_auc_score, precision_recall_curve, auc, recall_score, precision_score, confusion_matrix
)

# Output directories
BASE_DIR = r"c:\FUSION_HIGH_APP_1\FUSION_HIGH_APP_2.1\ml_models"
DATA_DIR = os.path.join(BASE_DIR, "data", "processed")
MODEL_DIR = os.path.join(BASE_DIR, "saved_models")
REPORT_DIR = os.path.join(BASE_DIR, "reports")

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

# ---------------------------------------------------------
# 1. MODEL 1: CAREER RECOMMENDATION SYSTEM (MULTI-CLASS)
# ---------------------------------------------------------
def train_career_recommender(df_labeled):
    print("\n=======================================================")
    print("TRAINING MODEL 1: CAREER RECOMMENDATION CLASSIFIER")
    print("=======================================================")
    
    # Feature columns strictly based on academic performance and study effort
    feature_cols = [
        "math_score", "history_score", "physics_score", 
        "chemistry_score", "biology_score", "english_score", "geography_score",
        "absence_days", "extracurricular_activities", "weekly_self_study_hours",
        "stem_avg", "humanities_avg", "math_physics_avg", "bio_chem_avg",
        "study_efficiency", "academic_balance"
    ]
    
    X = df_labeled[feature_cols].copy()
    y = df_labeled["career_aspiration"].copy()
    
    # Encode target classes
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    # Strict 80/20 Stratified Train/Test split BEFORE scaling/training
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.20, random_state=42, stratify=y_encoded
    )
    
    # Standardize numerical features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Balanced Random Forest Classifier
    rf_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        class_weight="balanced",
        min_samples_leaf=2,
        random_state=42,
        n_jobs=1
    )
    rf_model.fit(X_train_scaled, y_train)
    
    # Baseline comparison: Logistic Regression (balanced)
    baseline_lr = LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)
    baseline_lr.fit(X_train_scaled, y_train)
    
    # Predictions
    y_pred_rf = rf_model.predict(X_test_scaled)
    y_pred_lr = baseline_lr.predict(X_test_scaled)
    y_probs_rf = rf_model.predict_proba(X_test_scaled)
    
    # Top-3 Accuracy Calculation
    top_3_correct = 0
    for i, true_label in enumerate(y_test):
        top_3_preds = np.argsort(y_probs_rf[i])[::-1][:3]
        if true_label in top_3_preds:
            top_3_correct += 1
    top_3_acc = top_3_correct / len(y_test)
    
    acc_rf = accuracy_score(y_test, y_pred_rf)
    acc_lr = accuracy_score(y_test, y_pred_lr)
    macro_f1 = f1_score(y_test, y_pred_rf, average="macro")
    weighted_f1 = f1_score(y_test, y_pred_rf, average="weighted")
    
    print(f"Random Forest Top-1 Accuracy: {acc_rf:.2%}")
    print(f"Random Forest Top-3 Accuracy: {top_3_acc:.2%}")
    print(f"Random Forest Macro F1:       {macro_f1:.4f}")
    print(f"Logistic Regression Baseline: {acc_lr:.2%}")
    
    artifact = {
        "model": rf_model,
        "scaler": scaler,
        "label_encoder": label_encoder,
        "feature_names": feature_cols,
        "metrics": {
            "top1_accuracy": acc_rf,
            "top3_accuracy": top_3_acc,
            "macro_f1": macro_f1,
            "weighted_f1": weighted_f1,
            "baseline_accuracy": acc_lr
        }
    }
    model_path = os.path.join(MODEL_DIR, "career_recommender.joblib")
    joblib.dump(artifact, model_path)
    print(f"Saved Career Recommendation Model -> {model_path}")
    
    return artifact

# ---------------------------------------------------------
# 2. MODEL 2: ACADEMIC PERFORMANCE PREDICTOR (REGRESSION)
# ---------------------------------------------------------
def train_score_predictor(df_all):
    print("\n=======================================================")
    print("TRAINING MODEL 2: ACADEMIC PERFORMANCE PREDICTOR (GPA)")
    print("=======================================================")
    
    feature_cols = [
        "weekly_self_study_hours", "absence_days", 
        "extracurricular_activities",
        "math_score", "english_score"
    ]
    
    X = df_all[feature_cols].copy()
    y = df_all["overall_score"].copy()
    
    # 80/20 Train/Test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Primary Model: Gradient Boosting Regressor
    gbr_model = GradientBoostingRegressor(n_estimators=150, max_depth=4, learning_rate=0.08, random_state=42)
    gbr_model.fit(X_train_scaled, y_train)
    
    # Baseline Model: Ridge Linear Regression
    ridge_baseline = Ridge(alpha=1.0, random_state=42)
    ridge_baseline.fit(X_train_scaled, y_train)
    
    y_pred_gbr = gbr_model.predict(X_test_scaled)
    y_pred_ridge = ridge_baseline.predict(X_test_scaled)
    
    mae_gbr = mean_absolute_error(y_test, y_pred_gbr)
    rmse_gbr = np.sqrt(mean_squared_error(y_test, y_pred_gbr))
    r2_gbr = r2_score(y_test, y_pred_gbr)
    
    mae_ridge = mean_absolute_error(y_test, y_pred_ridge)
    r2_ridge = r2_score(y_test, y_pred_ridge)
    
    print(f"Gradient Boosting Regressor MAE:  {mae_gbr:.3f} points")
    print(f"Gradient Boosting Regressor RMSE: {rmse_gbr:.3f} points")
    print(f"Gradient Boosting Regressor R²:   {r2_gbr:.4f}")
    print(f"Ridge Baseline MAE:               {mae_ridge:.3f} points, R²: {r2_ridge:.4f}")
    
    artifact = {
        "model": gbr_model,
        "scaler": scaler,
        "feature_names": feature_cols,
        "metrics": {
            "mae": mae_gbr,
            "rmse": rmse_gbr,
            "r2": r2_gbr,
            "baseline_mae": mae_ridge,
            "baseline_r2": r2_ridge
        }
    }
    
    model_path = os.path.join(MODEL_DIR, "score_predictor.joblib")
    joblib.dump(artifact, model_path)
    print(f"Saved Score Predictor Model -> {model_path}")
    
    return artifact

# ---------------------------------------------------------
# 3. MODEL 3: EARLY-WARNING AT-RISK DETECTOR (BINARY)
# ---------------------------------------------------------
def train_at_risk_detector(df_all):
    print("\n=======================================================")
    print("TRAINING MODEL 3: EARLY-WARNING AT-RISK DETECTOR")
    print("=======================================================")
    
    feature_cols = [
        "math_score", "history_score", "physics_score", 
        "chemistry_score", "biology_score", "english_score", "geography_score",
        "absence_days", "extracurricular_activities", "weekly_self_study_hours",
        "stem_avg", "humanities_avg", "study_efficiency"
    ]
    
    X = df_all[feature_cols].copy()
    y = df_all["is_at_risk"].copy()
    
    # 80/20 Stratified Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Cost-sensitive Balanced Random Forest
    rf_at_risk = RandomForestClassifier(
        n_estimators=180,
        max_depth=8,
        class_weight="balanced",
        random_state=42,
        n_jobs=1
    )
    rf_at_risk.fit(X_train_scaled, y_train)
    
    y_probs = rf_at_risk.predict_proba(X_test_scaled)[:, 1]
    
    precision_vals, recall_vals, thresholds = precision_recall_curve(y_test, y_probs)
    pr_auc = auc(recall_vals, precision_vals)
    roc_auc = roc_auc_score(y_test, y_probs)
    
    target_threshold = 0.40
    y_pred_calibrated = (y_probs >= target_threshold).astype(int)
    
    recall = recall_score(y_test, y_pred_calibrated)
    precision = precision_score(y_test, y_pred_calibrated)
    f1 = f1_score(y_test, y_pred_calibrated)
    cm = confusion_matrix(y_test, y_pred_calibrated)
    
    print(f"At-Risk ROC-AUC:      {roc_auc:.4f}")
    print(f"At-Risk PR-AUC:       {pr_auc:.4f}")
    print(f"Calibrated Recall:    {recall:.2%} (Identified {cm[1,1]} of {cm[1,0]+cm[1,1]} at-risk students)")
    print(f"Calibrated Precision: {precision:.2%}")
    print(f"Calibrated F1 Score:  {f1:.4f}")
    print("Confusion Matrix:\n", cm)
    
    artifact = {
        "model": rf_at_risk,
        "scaler": scaler,
        "threshold": target_threshold,
        "feature_names": feature_cols,
        "metrics": {
            "roc_auc": roc_auc,
            "pr_auc": pr_auc,
            "recall": recall,
            "precision": precision,
            "f1": f1,
            "confusion_matrix": cm.tolist()
        }
    }
    
    model_path = os.path.join(MODEL_DIR, "at_risk_detector.joblib")
    joblib.dump(artifact, model_path)
    print(f"Saved At-Risk Detector Model -> {model_path}")
    
    return artifact

# ---------------------------------------------------------
# MAIN EXECUTION
# ---------------------------------------------------------
if __name__ == "__main__":
    labeled_path = os.path.join(DATA_DIR, "labeled_students.csv")
    cleaned_all_path = os.path.join(DATA_DIR, "cleaned_students.csv")
    
    df_labeled = pd.read_csv(labeled_path)
    df_all = pd.read_csv(cleaned_all_path)
    
    m1_artifact = train_career_recommender(df_labeled)
    m2_artifact = train_score_predictor(df_all)
    m3_artifact = train_at_risk_detector(df_all)
    print("\nAll 3 models retrained and serialized successfully with streamlined columns.")
