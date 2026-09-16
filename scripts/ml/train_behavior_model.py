import os
import sys
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.cluster import KMeans
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, mean_absolute_error, mean_squared_error, r2_score, silhouette_score
from sklearn.inspection import permutation_importance
import joblib

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def main():
    print("=" * 70)
    print("FUSION HIGH SCHOOL: BEHAVIORAL ML TRAINING & EVALUATION PIPELINE")
    print("=" * 70)

    # 1. File Paths
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    data_path = os.path.join(base_dir, 'data', 'sa_student_behavior_2000.csv')
    models_dir = os.path.join(base_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)

    if not os.path.exists(data_path):
        print(f"[!] Error: Dataset not found at {data_path}")
        sys.exit(1)

    print(f"[*] Loading dataset from: {data_path}")
    df = pd.read_csv(data_path)
    print(f"[+] Loaded {len(df)} student records with {df.shape[1]} columns.")
    print(f"    - Overall Pass Rate: {(df['is_pass'] == 1).mean():.1%}")
    print(f"    - Mean Final Score: {df['final_score'].mean():.1f}% (Std: {df['final_score'].std():.1f})")

    # 2. Features & Targets Definition
    num_cols = [
        'class_size',
        'visited_resources',
        'announcements_viewed',
        'discussion_participation',
        'weekly_study_hours',
        'homework_completion_rate'
    ]

    cat_cols = [
        'gender',
        'grade',
        'stream',
        'class_section',
        'subject',
        'semester',
        'absence_days'
    ]

    feature_cols = num_cols + cat_cols
    X = df[feature_cols]
    y_class = df['is_pass'].astype(int)
    y_reg = df['final_score'].astype(float)

    # 3. Train/Test Split (80/20 Stratified by pass status)
    X_train, X_test, y_train_cls, y_test_cls, y_train_reg, y_test_reg = train_test_split(
        X, y_class, y_reg, test_size=0.2, random_state=42, stratify=y_class
    )
    print(f"[+] Data split: {len(X_train)} training records, {len(X_test)} test records (80/20 split).")

    # 4. Build Preprocessing Transformer
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

    # 5. Evaluate Classification Models (Pass / Risk Prediction)
    print("\n" + "-" * 70)
    print("PHASE 1: CLASSIFICATION BENCHMARK (Pass vs At-Risk)")
    print("-" * 70)

    clf_models = {
        'LogisticRegression': LogisticRegression(max_iter=1000, random_state=42),
        'RandomForest': RandomForestClassifier(n_estimators=150, max_depth=8, random_state=42),
        'HistGradientBoosting': HistGradientBoostingClassifier(max_iter=120, random_state=42)
    }

    best_clf_name = None
    best_clf_score = -1
    best_clf_model = None
    clf_results = {}

    for name, model in clf_models.items():
        model.fit(X_train_trans, y_train_cls)
        y_pred = model.predict(X_test_trans)
        y_proba = model.predict_proba(X_test_trans)[:, 1] if hasattr(model, 'predict_proba') else y_pred

        acc = accuracy_score(y_test_cls, y_pred)
        prec = precision_score(y_test_cls, y_pred, zero_division=0)
        rec = recall_score(y_test_cls, y_pred, zero_division=0)
        f1 = f1_score(y_test_cls, y_pred, zero_division=0)
        auc = roc_auc_score(y_test_cls, y_proba)

        cv_scores = cross_val_score(model, X_train_trans, y_train_cls, cv=5, scoring='accuracy')

        clf_results[name] = {
            'Accuracy': acc,
            'Precision': prec,
            'Recall': rec,
            'F1-Score': f1,
            'ROC-AUC': auc,
            'CV-Accuracy': cv_scores.mean()
        }

        print(f"[{name}]")
        print(f"    - Accuracy: {acc:.1%} (5-Fold CV: {cv_scores.mean():.1%})")
        print(f"    - ROC-AUC: {auc:.4f} | Precision: {prec:.1%} | Recall: {rec:.1%} | F1: {f1:.4f}")

        if auc > best_clf_score:
            best_clf_score = auc
            best_clf_name = name
            best_clf_model = model

    print(f"\n[★] Champion Classifier: {best_clf_name} (ROC-AUC: {best_clf_score:.4f})")

    # 6. Evaluate Regression Models (Continuous Final Score Prediction)
    print("\n" + "-" * 70)
    print("PHASE 2: REGRESSION BENCHMARK (Projected Final Score %)")
    print("-" * 70)

    reg_models = {
        'Ridge': Ridge(alpha=1.0),
        'RandomForest': RandomForestRegressor(n_estimators=150, max_depth=8, random_state=42),
        'HistGradientBoosting': HistGradientBoostingRegressor(max_iter=120, random_state=42)
    }

    best_reg_name = None
    best_reg_r2 = -1
    best_reg_model = None
    reg_results = {}

    for name, model in reg_models.items():
        model.fit(X_train_trans, y_train_reg)
        y_pred = model.predict(X_test_trans)

        r2 = r2_score(y_test_reg, y_pred)
        mae = mean_absolute_error(y_test_reg, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test_reg, y_pred))
        cv_r2 = cross_val_score(model, X_train_trans, y_train_reg, cv=5, scoring='r2')

        reg_results[name] = {
            'R2': r2,
            'MAE': mae,
            'RMSE': rmse,
            'CV-R2': cv_r2.mean()
        }

        print(f"[{name}]")
        print(f"    - R² Score: {r2:.4f} (5-Fold CV: {cv_r2.mean():.4f})")
        print(f"    - Mean Absolute Error (MAE): ±{mae:.2f}% | RMSE: {rmse:.2f}%")

        if r2 > best_reg_r2:
            best_reg_r2 = r2
            best_reg_name = name
            best_reg_model = model

    print(f"\n[★] Champion Regressor: {best_reg_name} (R²: {best_reg_r2:.4f}, MAE: ±{reg_results[best_reg_name]['MAE']:.2f}%)")

    # 7. Feature Importance Analysis
    print("\n" + "-" * 70)
    print("PHASE 3: FEATURE IMPORTANCE & BEHAVIORAL DRIVERS")
    print("-" * 70)

    perm_importance = permutation_importance(best_clf_model, X_test_trans, y_test_cls, n_repeats=10, random_state=42)
    importances = perm_importance.importances_mean

    feat_imp = []
    for idx, val in enumerate(importances):
        feat_imp.append({'feature': all_feature_names[idx], 'importance': float(round(val, 4))})

    feat_imp.sort(key=lambda x: x['importance'], reverse=True)

    print("Top 10 Most Influential Behavioral & Environmental Features:")
    for rank, item in enumerate(feat_imp[:10], 1):
        print(f"   {rank:2d}. {item['feature']:<35} (Impact weight: {item['importance']:.4f})")

    # 8. Train an interpretable Logistic & Linear model for fast JSON export
    logistic_fast = LogisticRegression(max_iter=1000, random_state=42).fit(X_train_trans, y_train_cls)
    linear_fast = Ridge(alpha=1.0).fit(X_train_trans, y_train_reg)

    scaler_meta = {
        'num_cols': num_cols,
        'mean': preprocessor.named_transformers_['num'].mean_.tolist(),
        'scale': preprocessor.named_transformers_['num'].scale_.tolist()
    }

    # Extract coefficients
    logistic_coefs = {all_feature_names[i]: float(logistic_fast.coef_[0][i]) for i in range(len(all_feature_names))}
    linear_coefs = {all_feature_names[i]: float(linear_fast.coef_[i]) for i in range(len(all_feature_names))}

    # ------------------------------------------------------------------
    # PHASE 4: UNSUPERVISED LEARNING (K-Means Behavioral Personas)
    # ------------------------------------------------------------------
    print("\n" + "-" * 70)
    print("PHASE 4: UNSUPERVISED LEARNING (K-Means Clustering - 4 Personas)")
    print("-" * 70)

    # Standardize numerical behavioral features across entire dataset for clustering
    scaler_cluster = StandardScaler()
    cluster_features = df[num_cols].copy()
    cluster_trans = scaler_cluster.fit_transform(cluster_features)

    kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
    df['cluster'] = kmeans.fit_predict(cluster_trans)
    sil_score = silhouette_score(cluster_trans, df['cluster'])
    print(f"[+] K-Means 4-Cluster Silhouette Score: {sil_score:.4f}")

    # Analyze cluster centroids & assign meaningful educational personas
    cluster_stats = df.groupby('cluster').agg({
        'is_pass': 'mean',
        'final_score': 'mean',
        'visited_resources': 'mean',
        'weekly_study_hours': 'mean',
        'homework_completion_rate': 'mean',
        'discussion_participation': 'mean',
        'class_size': 'mean'
    }).reset_index()

    # Sort clusters by average score to order from Highest Achievers to High Risk
    cluster_stats = cluster_stats.sort_values(by='final_score', ascending=False).reset_index(drop=True)

    persona_archetypes = [
        {
            "name": "Autonomous High-Achiever",
            "badge": "bg-emerald-100 text-emerald-800 border-emerald-300",
            "color": "#10B981",
            "description": "Exemplary study ethic, maximum LMS resource views, and proactive self-directed revision.",
            "recommendation": "Candidate for Advanced Programmes (AP Mathematics / AP Physics), subject Olympiads, and peer tutoring roles."
        },
        {
            "name": "Consistent Striver",
            "badge": "bg-blue-100 text-blue-800 border-blue-300",
            "color": "#3B82F6",
            "description": "Dependable attendance and homework completion with steady class participation.",
            "recommendation": "Maintain structured revision routine and introduce timed DBE past exam paper simulations."
        },
        {
            "name": "Passive / Inconsistent Learner",
            "badge": "bg-amber-100 text-amber-800 border-amber-300",
            "color": "#F59E0B",
            "description": "Attends class but displays low digital portal engagement and inconsistent assignment submissions.",
            "recommendation": "Assign peer study buddy, monitor weekly homework log, and schedule an educator check-in."
        },
        {
            "name": "Critical Truant / High-Risk",
            "badge": "bg-red-100 text-red-800 border-red-300",
            "color": "#EF4444",
            "description": "Chronic absence, low study hours, and delayed homework resulting in severe content backlogs.",
            "recommendation": "Urgent intervention: Compulsory attendance recovery plan, parent notification, and subject remedial bootcamp."
        }
    ]

    clusters_payload = []
    print("\nDiscovered Student Behavioral Personas (Unsupervised):")
    for rank, row in cluster_stats.iterrows():
        c_id = int(row['cluster'])
        meta = persona_archetypes[rank]
        cluster_info = {
            "cluster_id": c_id,
            "rank": rank + 1,
            "persona_name": meta["name"],
            "badge": meta["badge"],
            "color": meta["color"],
            "description": meta["description"],
            "recommendation": meta["recommendation"],
            "mean_score": round(row['final_score'], 1),
            "pass_rate": f"{row['is_pass']:.1%}",
            "avg_visited_resources": round(row['visited_resources'], 1),
            "avg_study_hours": round(row['weekly_study_hours'], 1),
            "avg_homework_rate": round(row['homework_completion_rate'], 1)
        }
        clusters_payload.append(cluster_info)
        print(f"   Cluster {c_id} -> {meta['name']} (Avg Mark: {row['final_score']:.1f}%, Pass Rate: {row['is_pass']:.1%})")
        print(f"      - Habits: {row['weekly_study_hours']:.1f} hrs/wk study | {row['homework_completion_rate']:.1f}% homework | {row['visited_resources']:.1f} resources")
        print(f"      - Action: {meta['recommendation']}")

    # 9. Save Model Artifacts
    # Save Joblib binary models
    joblib.dump(best_clf_model, os.path.join(models_dir, 'sa_behavior_classifier.joblib'))
    joblib.dump(best_reg_model, os.path.join(models_dir, 'sa_behavior_regressor.joblib'))
    joblib.dump(preprocessor, os.path.join(models_dir, 'sa_behavior_preprocessor.joblib'))
    joblib.dump(kmeans, os.path.join(models_dir, 'sa_behavior_kmeans.joblib'))

    # Save JSON artifacts for instant in-app JavaScript inference
    artifacts = {
        'version': '2.0.0-behavior-sa-hybrid',
        'dataset_records': len(df),
        'metrics': {
            'classifier': {
                'champion': best_clf_name,
                'accuracy': round(clf_results[best_clf_name]['Accuracy'], 4),
                'roc_auc': round(clf_results[best_clf_name]['ROC-AUC'], 4),
                'f1_score': round(clf_results[best_clf_name]['F1-Score'], 4),
                'all_models': {k: {m: round(v, 4) for m, v in vals.items()} for k, vals in clf_results.items()}
            },
            'regressor': {
                'champion': best_reg_name,
                'r2_score': round(reg_results[best_reg_name]['R2'], 4),
                'mae': round(reg_results[best_reg_name]['MAE'], 2),
                'rmse': round(reg_results[best_reg_name]['RMSE'], 2),
                'all_models': {k: {m: round(v, 4) for m, v in vals.items()} for k, vals in reg_results.items()}
            },
            'unsupervised_clustering': {
                'algorithm': 'KMeans',
                'n_clusters': 4,
                'silhouette_score': round(sil_score, 4)
            }
        },
        'feature_names': all_feature_names,
        'feature_importance_top10': feat_imp[:10],
        'unsupervised_personas': clusters_payload,
        'scaler': scaler_meta,
        'logistic_regression': {
            'intercept': float(logistic_fast.intercept_[0]),
            'coefficients': logistic_coefs
        },
        'linear_regressor': {
            'intercept': float(linear_fast.intercept_),
            'coefficients': linear_coefs
        },
        'caps_levels': [
            {'level': 7, 'min': 80, 'max': 100, 'label': 'Outstanding Achievement', 'color': '#10B981'},
            {'level': 6, 'min': 70, 'max': 79, 'label': 'Meritorious Achievement', 'color': '#059669'},
            {'level': 5, 'min': 60, 'max': 69, 'label': 'Substantial Achievement', 'color': '#3B82F6'},
            {'level': 4, 'min': 50, 'max': 59, 'label': 'Adequate Achievement', 'color': '#6366F1'},
            {'level': 3, 'min': 40, 'max': 49, 'label': 'Moderate Achievement', 'color': '#F59E0B'},
            {'level': 2, 'min': 30, 'max': 39, 'label': 'Elementary Achievement', 'color': '#EF4444'},
            {'level': 1, 'min': 0, 'max': 29, 'label': 'Not Achieved (Critical)', 'color': '#DC2626'}
        ]
    }

    json_path = os.path.join(models_dir, 'sa_behavior_model_artifacts.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(artifacts, f, indent=2)

    print(f"\n[+] Successfully saved model artifacts:")
    print(f"    - Binary Classifier: {os.path.join(models_dir, 'sa_behavior_classifier.joblib')}")
    print(f"    - Binary Regressor: {os.path.join(models_dir, 'sa_behavior_regressor.joblib')}")
    print(f"    - Preprocessor: {os.path.join(models_dir, 'sa_behavior_preprocessor.joblib')}")
    print(f"    - JSON In-App Engine: {json_path}")
    print("=" * 70)

if __name__ == '__main__':
    main()
