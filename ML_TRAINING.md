# SafeDrive AI — Machine Learning Pipeline & Training Manual
Version: 1.0.0

This document provides complete academic documentation for the SafeDrive AI Machine Learning infrastructure established in Phase 4A.

---

## 1. Distinction: Engineered Features vs. Trained Machine Learning

> [!IMPORTANT]
> **Academic Integrity Requirement**: SafeDrive AI strictly distinguishes between feature engineering and machine learning model inference.

- **Engineered Features (Implemented in Phase 2 & 3)**:
  - Real-time mathematical signals extracted directly from MediaPipe 478 3D facial landmarks and COCO-SSD object detections.
  - Examples: Eye Aspect Ratio (EAR), Mouth Aspect Ratio (MAR), PERCLOS percentage, Blink Rate per minute, 3D Head Pose Angles (Pitch, Yaw, Roll), and Phone Detection Confidence.
  - *These features are deterministic, rule-based mathematical formulations.*

- **Trained Machine Learning Model (Phase 4 Offline Infrastructure)**:
  - Statistical and neural classifiers trained on academic datasets (NTHU-DDD, YawDD, RLDD) that map 10-dimensional feature vectors to driver state probabilities (`ALERT`, `MILD_FATIGUE`, `SEVERE_FATIGUE`, `DISTRACTED`).
  - *No model is claimed to be trained until approved datasets are ingested and reproducible training is run via `python -m ml.training.train`.*

---

## 2. Dataset Acquisition & Placement

SafeDrive AI supports three benchmark driver-drowsiness datasets:

1. **NTHU Drowsy Driver Dataset (NTHU-DDD)**: Multi-subject dataset recorded under diverse illumination and facial accessory conditions.
2. **YawDD (Yawning Detection Dataset)**: High-resolution driver video sequences for mouth gesture calibration.
3. **UTA Real-Life Drowsiness Dataset (RLDD)**: Multi-stage fatigue recordings across 60 participants.

**Placement**: Downloaded dataset files must be placed locally in `ml/data/raw/<DatasetName>/`. Raw dataset files are strictly excluded from version control via `.gitignore`.

---

## 3. Subject-Independent Splitting

To prevent **identity leakage** (where the model memorizes driver-specific facial geometry rather than fatigue indicators), splitting is implemented via `GroupKFold` on driver `subject_id`:

- Drivers in the Training set never appear in Validation or Test sets.
- Recommended split ratio: 70% Train, 15% Validation, 15% Test.

---

## 4. Preprocessing & Scaler Isolation

- Standard scaling ($\mu, \sigma$) parameters are fit **exclusively on the training split**.
- Missing frames ($< 500\text{ ms}$) are imputed using bounded feature defaults defined in `ml/preprocessing/feature_schema.py`.

---

## 5. Model Training & Determinism

- **Architecture**: Baseline Multi-Layer Perceptron (`BaselineMLP` in `ml/models/baseline_mlp.py`).
- **Seed Determinism**: Fixed random seeds across `python`, `numpy`, and `pytorch` (default seed: `42`).
- **Execution Command**:
  ```bash
  python -m ml.training.train --config ml/config/config.yaml --dataset NTHU-DDD
  ```

---

## 6. Safety-Oriented Evaluation Methodology

Evaluation calculates:
- Accuracy, Precision (Macro/Weighted), Recall (Macro/Weighted), F1-Score, ROC-AUC.
- **Severe Fatigue False Negative Rate (FNR)**: Measures missed microsleeps (highest safety hazard).
- **Alert Driver False Positive Rate (FPR)**: Measures false alarm rate (user annoyance factor).

---

## 7. Export & Runtime Deployment

- **Export Format**: ONNX (`.onnx`) or TensorFlow.js (`model.json`).
- **Export Command**:
  ```bash
  python -m ml.export.export_model --model-path ml/models/safedrive_drowsiness_v1.pth --format onnx
  ```
- Exporter generates `model_metadata.json` containing the exact normalization vector ($\mathbf{\mu}, \mathbf{\sigma}$) and canonical feature order.

---

## 8. Limitations & Scope

1. **Current Pipeline State**: Phase 4A establishes offline infrastructure, canonical schemas, splitters, trainers, evaluators, and export scripts. Model training will occur only after dataset files are placed locally.
2. **Environmental Conditions**: Extreme backlighting or complete face occlusions remain edge cases where missing-value safety fallbacks engage.
