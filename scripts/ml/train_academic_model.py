import os
import sys
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, mean_absolute_error, mean_squared_error, r2_score
from sklearn.inspection import permutation_importance
import joblib

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def main():
    print("=" * 70)
    print("FUSION HIGH SCHOOL: ACADEMIC ML MODEL TRAINING PIPELINE")
    print("=" * 70)

    # 1. Paths
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    data_path = os.path.join(base_dir, 'data', 'student_matric_data.csv')
    models_dir = os.path.join(base_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)

    print(f"[*] Loading dataset from: {data_path}")
    # keep_default_na=False ensures 'None' is read as the literal string 'None' (parent education category)
    df = pd.read_csv(data_path, keep_default_na=False)
    print(f"[+] Loaded {len(df)} student records with {df.shape[1]} columns.")
    print(f"    - Pass count: {(df['passed'] == 'Yes').sum()} ({(df['passed'] == 'Yes').mean():.1%})")
    print(f"    - Mean final score: {df['final_score'].astype(float).mean():.2f}% (Std: {df['final_score'].astype(float).std():.2f})")

    # 2. Define Features & Targets
    feature_cols = [
        'gender', 'age', 'study_hours_per_week', 'attendance_rate',
        'parent_education', 'internet_access', 'extracurricular', 'previous_score'
    ]
    num_cols = ['age', 'study_hours_per_week', 'attendance_rate', 'previous_score']
    cat_cols = ['gender', 'parent_education', 'internet_access', 'extracurricular']

    # Convert types
    for c in num_cols:
        df[c] = pd.to_numeric(df[c], errors='coerce').fillna(df[c].median() if len(df[c]) > 0 else 0)
    for c in cat_cols:
        df[c] = df[c].astype(str)

    X = df[feature_cols]
    y_class = (df['passed'] == 'Yes').astype(int)
    y_reg = df['final_score'].astype(float)

    # 3. Train/Test Split (80/20 Stratified)
    X_train, X_test, y_train_cls, y_test_cls, y_train_reg, y_test_reg = train_test_split(
        X, y_class, y_reg, test_size=0.2, random_state=42, stratify=y_class
    )

    # 4. Build Preprocessing Transformer
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), num_cols),
            ('cat', OneHotEncoder(drop='first', sparse_output=False, handle_unknown='ignore'), cat_cols)
        ]
    )

    # Fit transformer
    preprocessor.fit(X_train)
    cat_feature_names = preprocessor.named_transformers_['cat'].get_feature_names_out(cat_cols).tolist()
    all_feature_names = num_cols + cat_feature_names

    X_train_trans = preprocessor.transform(X_train)
    X_test_trans = preprocessor.transform(X_test)

    # 5. Train & Compare Classification Models
    print("\n" + "-" * 70)
    print("EVALUATING CLASSIFICATION MODELS (Pass / Risk Prediction)")
    print("-" * 70)

    clf_models = {
        'LogisticRegression': LogisticRegression(max_iter=1000, random_state=42),
        'RandomForest': RandomForestClassifier(n_estimators=120, max_depth=6, random_state=42),
        'HistGradientBoosting': HistGradientBoostingClassifier(max_iter=100, random_state=42)
    }

    best_clf_name = None
    best_clf_score = -1
    best_clf_model = None

    for name, model in clf_models.items():
        model.fit(X_train_trans, y_train_cls)
        y_pred = model.predict(X_test_trans)
        y_proba = model.predict_proba(X_test_trans)[:, 1] if hasattr(model, 'predict_proba') else y_pred

        acc = accuracy_score(y_test_cls, y_pred)
        prec = precision_score(y_test_cls, y_pred, zero_division=0)
        rec = recall_score(y_test_cls, y_pred, zero_division=0)
        f1 = f1_score(y_test_cls, y_pred, zero_division=0)
        auc = roc_auc_score(y_test_cls, y_proba)

        cv_scores = cross_val_score(model, X_train_trans, y_train_cls, cv=5, scoring='roc_auc')
        print(f"  * {name:22} | Acc: {acc:.3f} | Prec: {prec:.3f} | Rec: {rec:.3f} | F1: {f1:.3f} | ROC-AUC: {auc:.3f} (CV AUC: {cv_scores.mean():.3f})")

        if auc > best_clf_score:
            best_clf_score = auc
            best_clf_name = name
            best_clf_model = model

    print(f"[+] Selected Best Classifier: {best_clf_name} (ROC-AUC: {best_clf_score:.3f})")

    # 6. Train & Compare Regression Models (Final Exam Mark % Projection)
    print("\n" + "-" * 70)
    print("📈 EVALUATING REGRESSION MODELS (Final Exam Mark % Projection)")
    print("-" * 70)

    reg_models = {
        'Ridge': Ridge(alpha=1.0, random_state=42),
        'RandomForestRegressor': RandomForestRegressor(n_estimators=120, max_depth=6, random_state=42),
        'HistGradientBoostingRegressor': HistGradientBoostingRegressor(max_iter=100, random_state=42)
    }

    best_reg_name = None
    best_reg_r2 = -999
    best_reg_model = None

    for name, model in reg_models.items():
        model.fit(X_train_trans, y_train_reg)
        y_pred = model.predict(X_test_trans)

        r2 = r2_score(y_test_reg, y_pred)
        mae = mean_absolute_error(y_test_reg, y_pred)
        rmse = float(np.sqrt(mean_squared_error(y_test_reg, y_pred)))

        print(f"  * {name:30} | R^2: {r2:.3f} | MAE: {mae:.2f}% | RMSE: {rmse:.2f}%")

        if r2 > best_reg_r2:
            best_reg_r2 = r2
            best_reg_name = name
            best_reg_model = model

    print(f"[+] Selected Best Regressor: {best_reg_name} (R^2: {best_reg_r2:.3f})")

    # 7. Feature Importance Analysis
    print("\n" + "-" * 70)
    print("FEATURE IMPORTANCE & SUCCESS DRIVERS")
    print("-" * 70)
    
    perm_res = permutation_importance(best_clf_model, X_test_trans, y_test_cls, n_repeats=10, random_state=42)
    feature_importance_list = []
    for idx, col in enumerate(all_feature_names):
        importance_val = float(perm_res.importances_mean[idx])
        feature_importance_list.append({
            'feature': col,
            'importance': round(max(0.0, importance_val), 4)
        })
    
    feature_importance_list = sorted(feature_importance_list, key=lambda x: x['importance'], reverse=True)
    for rank, item in enumerate(feature_importance_list[:6], 1):
        print(f"  {rank}. {item['feature']:28}: {item['importance']:.4f}")

    # 8. Train also Logistic Regression & Ridge explicitly for transparent weights
    log_reg = LogisticRegression(max_iter=1000, random_state=42)
    log_reg.fit(X_train_trans, y_train_cls)

    ridge_reg = Ridge(alpha=1.0, random_state=42)
    ridge_reg.fit(X_train_trans, y_train_reg)

    # 9. Build Complete Artifacts Payload for Node.js
    scaler = preprocessor.named_transformers_['num']
    encoder = preprocessor.named_transformers_['cat']

    scaler_params = {
        'num_cols': num_cols,
        'mean': [float(x) for x in scaler.mean_],
        'scale': [float(x) for x in scaler.scale_],
        'var': [float(x) for x in scaler.var_]
    }

    cat_mappings = {}
    for col_idx, col_name in enumerate(cat_cols):
        cat_mappings[col_name] = [str(x) for x in encoder.categories_[col_idx]]

    model_artifacts = {
        'version': '1.0.0',
        'generated_at': pd.Timestamp.now().isoformat(),
        'dataset_size': len(df),
        'metrics': {
            'classifier': {
                'model_type': best_clf_name,
                'roc_auc': round(float(best_clf_score), 4),
                'accuracy': round(float(accuracy_score(y_test_cls, best_clf_model.predict(X_test_trans))), 4),
                'recall': round(float(recall_score(y_test_cls, best_clf_model.predict(X_test_trans))), 4),
                'precision': round(float(precision_score(y_test_cls, best_clf_model.predict(X_test_trans))), 4),
            },
            'regressor': {
                'model_type': best_reg_name,
                'r2_score': round(float(best_reg_r2), 4),
                'mae': round(float(mean_absolute_error(y_test_reg, best_reg_model.predict(X_test_trans))), 2),
                'rmse': round(float(np.sqrt(mean_squared_error(y_test_reg, best_reg_model.predict(X_test_trans)))), 2),
            }
        },
        'feature_names': all_feature_names,
        'feature_importance': feature_importance_list,
        'scaler': scaler_params,
        'categorical_mappings': cat_mappings,
        'logistic_regression': {
            'intercept': float(log_reg.intercept_[0]),
            'coefficients': {col: float(coef) for col, coef in zip(all_feature_names, log_reg.coef_[0])}
        },
        'linear_regressor': {
            'intercept': float(ridge_reg.intercept_),
            'coefficients': {col: float(coef) for col, coef in zip(all_feature_names, ridge_reg.coef_)}
        },
        'caps_levels': [
            {'level': 7, 'min': 80, 'max': 100, 'label': 'Outstanding Achievement', 'color': '#10B981'},
            {'level': 6, 'min': 70, 'max': 79,  'label': 'Meritorious Achievement', 'color': '#059669'},
            {'level': 5, 'min': 60, 'max': 69,  'label': 'Substantial Achievement', 'color': '#3B82F6'},
            {'level': 4, 'min': 50, 'max': 59,  'label': 'Adequate Achievement',    'color': '#6366F1'},
            {'level': 3, 'min': 40, 'max': 49,  'label': 'Moderate Achievement',    'color': '#F59E0B'},
            {'level': 2, 'min': 30, 'max': 39,  'label': 'Elementary Achievement',  'color': '#EF4444'},
            {'level': 1, 'min': 0,  'max': 29,  'label': 'Not Achieved (Critical)', 'color': '#DC2626'}
        ]
    }

    # Save JSON artifact
    json_path = os.path.join(models_dir, 'academic_model_artifacts.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(model_artifacts, f, indent=2)
    print(f"\n[+] Saved JSON model artifact: {json_path}")

    # Save Joblib pipelines
    clf_pipeline = Pipeline([('preprocessor', preprocessor), ('classifier', best_clf_model)])
    reg_pipeline = Pipeline([('preprocessor', preprocessor), ('regressor', best_reg_model)])
    
    joblib.dump(clf_pipeline, os.path.join(models_dir, 'risk_classifier.joblib'))
    joblib.dump(reg_pipeline, os.path.join(models_dir, 'score_regressor.joblib'))
    print(f"[+] Saved Python joblib pipelines to: {models_dir}")
    print("\n[SUCCESS] ML Model Training and Serialization completed successfully!")

if __name__ == '__main__':
    main()
