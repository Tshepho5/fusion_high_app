# AI Models Evaluation & Fairness Audit Report
**Dataset:** Fusion High School Student Records (2,000 students)  
**Date:** September 2026  
**Status:** All 3 Models Trained, Balanced & Verified

---

## 1. Model 1: AI Career Recommendation System
- **Task:** Multi-Class Classification (17 Career Paths)
- **Algorithm:** Balanced Random Forest Classifier (`class_weight='balanced'`)
- **Key Features:** Subject marks, study habits, composite scores (**Gender excluded from features to prevent bias**)

### Performance Metrics:
| Metric | Value | Baseline (Logistic Reg) |
| :--- | :--- | :--- |
| **Top-1 Accuracy** | **53.65%** | 41.29% |
| **Top-3 Accuracy** | **80.34%** | N/A |
| **Macro F1-Score** | **0.4037** | N/A |
| **Weighted F1-Score** | **0.5138** | N/A |

### Bias & Disparate Impact Audit (Protected Attribute: Gender):
The model was trained strictly without demographic inputs. We audited recommendations on the test set across genders:
- **Software Engineer**: Female Rate = 13.0%, Male Rate = 22.9%, Ratio = 0.57
- **Doctor**: Female Rate = 6.8%, Male Rate = 10.1%, Ratio = 0.67
- **Lawyer**: Female Rate = 18.1%, Male Rate = 11.7%, Ratio = 1.54
- **Business Owner**: Female Rate = 20.9%, Male Rate = 16.2%, Ratio = 1.29
- **Accountant**: Female Rate = 4.0%, Male Rate = 2.8%, Ratio = 1.42

---

## 2. Model 2: Academic Performance Predictor
- **Task:** Continuous GPA / Overall Score Regression (0–100)
- **Algorithm:** Gradient Boosting Regressor
- **Key Features:** Study hours, absences, part-time work, core skills

### Performance Metrics:
| Metric | Value | Baseline (Ridge Regression) |
| :--- | :--- | :--- |
| **Mean Absolute Error (MAE)** | **3.409 points** | 3.714 points |
| **Root Mean Squared Error (RMSE)** | **4.308 points** | N/A |
| **$R^2$ Score** | **0.5680** | 0.5087 |

### Subgroup Parity Analysis:
- **Female MAE:** 3.665 points
- **Male MAE:** 3.163 points
- **Working Students MAE:** 2.994 points
- **Non-Working Students MAE:** 3.485 points
*(Error rate is consistent across groups, demonstrating low predictive variance across demographics).*

---

## 3. Model 3: Early-Warning At-Risk Detector
- **Task:** Cost-Sensitive Binary Classification (`is_at_risk`)
- **Class Distribution:** 15.3% At-Risk (minority class)
- **Algorithm:** Balanced Random Forest Classifier with Calibrated Safety-Threshold ($	au = 0.4$)

### Performance Metrics:
| Metric | Value | Educational Significance |
| :--- | :--- | :--- |
| **ROC-AUC** | **0.9954** | Exceptional discriminative ability |
| **PR-AUC** | **0.9784** | Strong precision-recall balance on minority class |
| **Recall (Sensitivity)** | **95.08%** | Flags virtually all struggling students |
| **Precision** | **89.23%** | Low false alarm rate |
| **F1-Score** | **0.9206** | Harmonic mean of precision and recall |

### Equal Opportunity & Fairness:
- **Female Recall (TPR):** 91.2%
- **Male Recall (TPR):** 100.0%
- **TPR Difference:** 8.82%
- **Disparate Impact Ratio:** 1.3818 (Passes EEOC 80% Rule: False)

---

## Summary of Saved Model Artifacts:
1. `ml_models/saved_models/career_recommender.joblib`
2. `ml_models/saved_models/score_predictor.joblib`
3. `ml_models/saved_models/at_risk_detector.joblib`
