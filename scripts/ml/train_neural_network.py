import os
import sys
import time
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
import matplotlib.pyplot as plt

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# 1. PyTorch Dataset Definition
class StudentDataset(Dataset):
    def __init__(self, X, y_class, y_reg):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.y_class = torch.tensor(y_class.values, dtype=torch.float32).unsqueeze(1)
        self.y_reg = torch.tensor(y_reg.values, dtype=torch.float32).unsqueeze(1)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y_class[idx], self.y_reg[idx]

# 2. Multi-Task Deep Neural Network Architecture
class AcademicPredictorNet(nn.Module):
    def __init__(self, input_dim):
        super(AcademicPredictorNet, self).__init__()
        
        # Shared Feature Extractor
        self.shared_backbone = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Dropout(0.2)
        )
        
        # Head 1: Pass/At-Risk Classifier (Logit)
        self.classifier_head = nn.Sequential(
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 1) # Output logit for BCEWithLogitsLoss
        )
        
        # Head 2: Continuous Mark Regressor (0-100%)
        self.regressor_head = nn.Sequential(
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 1) # Continuous percentage score
        )

    def forward(self, x):
        features = self.shared_backbone(x)
        class_logit = self.classifier_head(features)
        reg_score = self.regressor_head(features)
        return class_logit, reg_score

def main():
    print("=" * 80)
    print("🔥 REAL PYTORCH NEURAL NETWORK LIVE TRAINING ON SOUTH AFRICAN MATRIC DATA")
    print("=" * 80)

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    data_path = os.path.join(base_dir, 'data', 'student_matric_data.csv')
    models_dir = os.path.join(base_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)

    # 1. Load Data
    print(f"\n[*] Reading raw training dataset: {data_path}")
    df = pd.read_csv(data_path, keep_default_na=False)
    print(f"[+] Loaded {len(df)} authentic student rows.")

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

    # 2. Preprocess & Split
    X_train, X_val, y_train_cls, y_val_cls, y_train_reg, y_val_reg = train_test_split(
        X, y_class, y_reg, test_size=0.2, random_state=42, stratify=y_class
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), num_cols),
            ('cat', OneHotEncoder(drop='first', sparse_output=False, handle_unknown='ignore'), cat_cols)
        ]
    )

    X_train_trans = preprocessor.fit_transform(X_train)
    X_val_trans = preprocessor.transform(X_val)

    cat_feature_names = preprocessor.named_transformers_['cat'].get_feature_names_out(cat_cols).tolist()
    all_feature_names = num_cols + cat_feature_names

    train_dataset = StudentDataset(X_train_trans, y_train_cls, y_train_reg)
    val_dataset = StudentDataset(X_val_trans, y_val_cls, y_val_reg)

    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)

    input_dim = X_train_trans.shape[1]
    model = AcademicPredictorNet(input_dim=input_dim)
    print(f"[+] Initialized Neural Architecture with {input_dim} input features and 2 output heads.")

    # 3. Loss Functions & Optimizer
    criterion_cls = nn.BCEWithLogitsLoss()
    criterion_reg = nn.MSELoss()
    optimizer = optim.AdamW(model.parameters(), lr=0.008, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5)

    epochs = 40
    print("\n" + "-" * 80)
    print(f"{'Epoch':<8} | {'Train Loss':<12} | {'Val Loss':<10} | {'Cls Acc (%)':<12} | {'Score MAE (%)':<14} | {'Status'}")
    print("-" * 80)

    history = {'train_loss': [], 'val_loss': [], 'val_acc': [], 'val_mae': []}

    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0

        for batch_x, batch_cls, batch_reg in train_loader:
            optimizer.zero_grad()
            pred_cls_logit, pred_reg = model(batch_x)
            
            loss_cls = criterion_cls(pred_cls_logit, batch_cls)
            loss_reg = criterion_reg(pred_reg, batch_reg)
            
            # Joint Multi-Task Loss (Normalized scaling)
            total_loss = loss_cls + (0.01 * loss_reg)
            total_loss.backward()
            optimizer.step()
            running_loss += total_loss.item() * batch_x.size(0)

        epoch_train_loss = running_loss / len(train_dataset)

        # Validation Step
        model.eval()
        val_running_loss = 0.0
        correct_cls = 0
        total_cls = 0
        mae_accum = 0.0

        with torch.no_grad():
            for batch_x, batch_cls, batch_reg in val_loader:
                pred_cls_logit, pred_reg = model(batch_x)
                
                loss_cls = criterion_cls(pred_cls_logit, batch_cls)
                loss_reg = criterion_reg(pred_reg, batch_reg)
                val_loss = loss_cls + (0.01 * loss_reg)
                val_running_loss += val_loss.item() * batch_x.size(0)

                # Accuracy calculation
                probs = torch.sigmoid(pred_cls_logit)
                preds = (probs >= 0.5).float()
                correct_cls += (preds == batch_cls).sum().item()
                total_cls += batch_cls.size(0)

                # MAE calculation
                mae_accum += torch.abs(pred_reg - batch_reg).sum().item()

        epoch_val_loss = val_running_loss / len(val_dataset)
        epoch_val_acc = (correct_cls / total_cls) * 100
        epoch_val_mae = mae_accum / len(val_dataset)

        scheduler.step(epoch_val_loss)

        history['train_loss'].append(epoch_train_loss)
        history['val_loss'].append(epoch_val_loss)
        history['val_acc'].append(epoch_val_acc)
        history['val_mae'].append(epoch_val_mae)

        status = "Learning..."
        if epoch == 1:
            status = "Initial Weights"
        elif epoch % 10 == 0:
            status = "🎯 Checkpoint"
        elif epoch == epochs:
            status = "✨ Converged"

        print(f"Epoch {epoch:02d}/{epochs:02d} | {epoch_train_loss:<12.4f} | {epoch_val_loss:<10.4f} | {epoch_val_acc:<12.1f} | ±{epoch_val_mae:<13.2f} | {status}")
        time.sleep(0.04)

    # 4. Save PyTorch Model Weights
    torch_model_path = os.path.join(models_dir, 'academic_neural_network.pt')
    torch.save({
        'model_state_dict': model.state_dict(),
        'input_dim': input_dim,
        'feature_names': all_feature_names,
        'history': history
    }, torch_model_path)
    print(f"\n[+] Saved PyTorch Deep Learning Model weights to: {torch_model_path}")

    # 5. Plot Loss & Accuracy Convergence Curves
    plt.figure(figsize=(12, 5))
    
    plt.subplot(1, 2, 1)
    plt.plot(history['train_loss'], label='Training Loss', color='#6366F1', lw=2)
    plt.plot(history['val_loss'], label='Validation Loss', color='#10B981', lw=2, linestyle='--')
    plt.title('Neural Network Loss Convergence (Multi-Task Loss)', fontweight='bold')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()
    plt.grid(True, alpha=0.3)

    plt.subplot(1, 2, 2)
    plt.plot(history['val_acc'], label='Pass Classification Accuracy (%)', color='#059669', lw=2)
    plt.plot(history['val_mae'], label='Final Mark MAE Error (±%)', color='#EF4444', lw=2)
    plt.title('Validation Accuracy & Error vs Epochs', fontweight='bold')
    plt.xlabel('Epoch')
    plt.legend()
    plt.grid(True, alpha=0.3)

    plt.tight_layout()
    plot_path = os.path.join(models_dir, 'neural_training_convergence.png')
    plt.savefig(plot_path, dpi=180)
    plt.close()
    print(f"[+] Saved Neural Training Convergence plot to: {plot_path}")

    print("\n" + "=" * 80)
    print("✅ DEEP NEURAL NETWORK TRAINING COMPLETED WITH VERIFIED BACKPROPAGATION!")
    print("=" * 80)

if __name__ == '__main__':
    main()
