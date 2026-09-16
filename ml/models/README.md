# SafeDrive AI — Model Definitions & Artifacts

This module contains model architecture implementations and trained model artifacts.

---

## Model Candidate 1: Tabular MLP Classifier (`baseline_mlp.py`)

- **Input Dimension**: 10 (Canonical feature schema vector)
- **Output Dimension**: 4 logits / probabilities (`ALERT`, `MILD_FATIGUE`, `SEVERE_FATIGUE`, `DISTRACTED`)
- **Layer Architecture**:
  ```
  Input Layer (10)
    ↓
  Linear(10 -> 64) + BatchNorm + ReLU + Dropout(0.2)
    ↓
  Linear(64 -> 32) + BatchNorm + ReLU + Dropout(0.2)
    ↓
  Linear(32 -> 4) -> Softmax (Probabilities)
  ```
- **Size / Parameters**: ~2,800 parameters (~12 KB uncompressed). Extremely fast in browser inference (< 1ms execution time).

---

## Artifact Storage (Ignored by Git)

Model checkpoints and exported `.onnx` / `.bin` files will be saved in this directory:
- `safedrive_drowsiness_v1.pth` (PyTorch Checkpoint)
- `safedrive_drowsiness_v1.onnx` (ONNX Browser Model)
- `model_metadata.json` (Scaling parameters & versioning)
