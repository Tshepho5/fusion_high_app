import os
import sys
import time
import pandas as pd
import numpy as np
import streamlit as st
import matplotlib.pyplot as plt
import seaborn as sns
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer

st.set_page_config(
    page_title="Fusion High • ML Training Studio",
    page_icon="🎓",
    layout="wide"
)

base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
data_path = os.path.join(base_dir, 'data', 'student_matric_data.csv')

st.title("🎓 Fusion High School • Live Machine Learning Training Studio")
st.markdown("Watch the **Deep Neural Network** train in real-time on authentic **South African High School Matric Data** with gradient backpropagation, live epoch loss curves, and validation metrics.")

# 1. Dataset Preview
st.subheader("1. 📂 Raw Matric Dataset (500 Student Records)")
df = pd.read_csv(data_path, keep_default_na=False)

col1, col2, col3, col4 = st.columns(4)
col1.metric("Total Student Records", len(df))
col2.metric("Pass Rate", f"{(df['passed'] == 'Yes').mean():.1%}")
col3.metric("Average Study Hours", f"{df['study_hours_per_week'].astype(float).mean():.1f} hrs/wk")
col4.metric("Average Final Score", f"{df['final_score'].astype(float).mean():.1f}%")

st.dataframe(df.head(10))

# 2. Live Training Controls
st.subheader("2. 🧠 Real-Time PyTorch Neural Network Training")

colA, colB, colC = st.columns(3)
epochs = colA.slider("Number of Epochs", min_value=10, max_value=60, value=30, step=5)
lr = colB.select_slider("Learning Rate", options=[0.001, 0.005, 0.008, 0.01, 0.02], value=0.008)
batch_size = colC.select_slider("Batch Size", options=[16, 32, 64], value=32)

start_training = st.button("🚀 Start Live Neural Network Training", type="primary")

if start_training:
    # Prepare features
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

    class StudentDataset(Dataset):
        def __init__(self, X, y_class, y_reg):
            self.X = torch.tensor(X, dtype=torch.float32)
            self.y_class = torch.tensor(y_class.values, dtype=torch.float32).unsqueeze(1)
            self.y_reg = torch.tensor(y_reg.values, dtype=torch.float32).unsqueeze(1)

        def __len__(self):
            return len(self.X)

        def __getitem__(self, idx):
            return self.X[idx], self.y_class[idx], self.y_reg[idx]

    train_loader = DataLoader(StudentDataset(X_train_trans, y_train_cls, y_train_reg), batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(StudentDataset(X_val_trans, y_val_cls, y_val_reg), batch_size=batch_size, shuffle=False)

    class AcademicPredictorNet(nn.Module):
        def __init__(self, input_dim):
            super().__init__()
            self.shared_backbone = nn.Sequential(
                nn.Linear(input_dim, 64),
                nn.BatchNorm1d(64),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(64, 32),
                nn.BatchNorm1d(32),
                nn.ReLU()
            )
            self.classifier_head = nn.Sequential(
                nn.Linear(32, 16),
                nn.ReLU(),
                nn.Linear(16, 1)
            )
            self.regressor_head = nn.Sequential(
                nn.Linear(32, 16),
                nn.ReLU(),
                nn.Linear(16, 1)
            )

        def forward(self, x):
            features = self.shared_backbone(x)
            return self.classifier_head(features), self.regressor_head(features)

    model = AcademicPredictorNet(X_train_trans.shape[1])
    criterion_cls = nn.BCEWithLogitsLoss()
    criterion_reg = nn.MSELoss()
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)

    # UI Placeholders for live training animation
    prog_bar = st.progress(0)
    status_text = st.empty()
    metric_cols = st.columns(4)
    chart_col1, chart_col2 = st.columns(2)
    chart_loss_placeholder = chart_col1.empty()
    chart_acc_placeholder = chart_col2.empty()

    train_losses = []
    val_losses = []
    val_accuracies = []
    val_maes = []

    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0

        for batch_x, batch_cls, batch_reg in train_loader:
            optimizer.zero_grad()
            pred_cls, pred_reg = model(batch_x)
            loss_cls = criterion_cls(pred_cls, batch_cls)
            loss_reg = criterion_reg(pred_reg, batch_reg)
            loss = loss_cls + (0.01 * loss_reg)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * batch_x.size(0)

        epoch_train_loss = running_loss / len(X_train_trans)

        # Validation
        model.eval()
        val_loss_sum = 0.0
        correct = 0
        total = 0
        mae_sum = 0.0

        with torch.no_grad():
            for batch_x, batch_cls, batch_reg in val_loader:
                pred_cls, pred_reg = model(batch_x)
                l_cls = criterion_cls(pred_cls, batch_cls)
                l_reg = criterion_reg(pred_reg, batch_reg)
                val_loss_sum += (l_cls + (0.01 * l_reg)).item() * batch_x.size(0)

                preds = (torch.sigmoid(pred_cls) >= 0.5).float()
                correct += (preds == batch_cls).sum().item()
                total += batch_cls.size(0)
                mae_sum += torch.abs(pred_reg - batch_reg).sum().item()

        epoch_val_loss = val_loss_sum / len(X_val_trans)
        epoch_acc = (correct / total) * 100
        epoch_mae = mae_sum / len(X_val_trans)

        train_losses.append(epoch_train_loss)
        val_losses.append(epoch_val_loss)
        val_accuracies.append(epoch_acc)
        val_maes.append(epoch_mae)

        prog_bar.progress(int((epoch / epochs) * 100))
        status_text.markdown(f"**Training Status**: Epoch **{epoch}/{epochs}** in progress...")

        metric_cols[0].metric("Current Train Loss", f"{epoch_train_loss:.4f}")
        metric_cols[1].metric("Validation Loss", f"{epoch_val_loss:.4f}")
        metric_cols[2].metric("Validation Accuracy", f"{epoch_acc:.1f}%")
        metric_cols[3].metric("Score Regressor Error", f"±{epoch_mae:.2f}%")

        # Live Chart 1: Loss
        fig1, ax1 = plt.subplots(figsize=(6, 3.5))
        ax1.plot(train_losses, label='Train Loss', color='#6366F1', lw=2)
        ax1.plot(val_losses, label='Val Loss', color='#10B981', lw=2, linestyle='--')
        ax1.set_title('Live Multi-Task Loss Convergence', fontweight='bold')
        ax1.set_xlabel('Epoch')
        ax1.set_ylabel('Loss')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        chart_loss_placeholder.pyplot(fig1)
        plt.close(fig1)

        # Live Chart 2: Accuracy & Error
        fig2, ax2 = plt.subplots(figsize=(6, 3.5))
        ax2.plot(val_accuracies, label='Pass Accuracy (%)', color='#059669', lw=2)
        ax2.plot(val_maes, label='Mark MAE (±%)', color='#EF4444', lw=2)
        ax2.set_title('Live Accuracy & MAE Curves', fontweight='bold')
        ax2.set_xlabel('Epoch')
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        chart_acc_placeholder.pyplot(fig2)
        plt.close(fig2)

        time.sleep(0.05)

    st.success(f"🎉 Neural Network Training Successfully Completed! Final Validation Accuracy: {val_accuracies[-1]:.1f}%, Final Error: ±{val_maes[-1]:.2f}%")
