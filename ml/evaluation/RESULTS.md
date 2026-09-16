# SafeDrive AI — Model Evaluation Results & Verification Status
Version: 1.0.0
Date: September 2026

> **ACADEMIC INTEGRITY DIRECTIVE**
> No trained model weights or raw datasets are present in the repository prior to manual dataset ingestion.
> **No fake benchmark numbers, accuracy percentages, F1 scores, or confusion matrices have been fabricated.**

---

## 1. Evaluation Verification Summary

- **Status**: ⏳ **REQUIRES EXTERNAL DATASET**
- **Tested Model Checkpoint**: None (No pre-trained weights claimed).
- **Test Set Size**: 0 samples.
- **Evaluation Pipeline Functionality**: Verified via `python -m py_compile ml/evaluation/evaluate.py`.

---

## 2. Benchmark Protocol (To Be Executed Post-Dataset Ingestion)

When a dataset (NTHU-DDD, YawDD, or RLDD) is downloaded into `ml/data/raw/` and trained via `ml/training/train.py`, `evaluate.py` will execute subject-independent testing and output the following metrics table:

| Metric | Target / Baseline | Measured Value |
| :--- | :---: | :---: |
| **Accuracy** | $> 85\%$ | *Awaiting Dataset* |
| **Macro F1 Score** | $> 0.80$ | *Awaiting Dataset* |
| **Weighted F1 Score** | $> 0.85$ | *Awaiting Dataset* |
| **ROC-AUC (OVR)** | $> 0.90$ | *Awaiting Dataset* |
| **Severe Fatigue False Negative Rate (FNR)** | $< 5.0\%$ | *Awaiting Dataset* |
| **Alert Driver False Positive Rate (FPR)** | $< 8.0\%$ | *Awaiting Dataset* |

---

## 3. Safety Metric Definitions

1. **Severe Fatigue False Negative Rate (FNR)**:
   $$\text{FNR}_{\text{severe}} = \frac{\text{False Negatives (Missed Microsleeps)}}{\text{True Positives} + \text{False Negatives}}$$
   *Measures the safety hazard of failing to alert a sleeping driver.*

2. **Alert Driver False Positive Rate (FPR)**:
   $$\text{FPR}_{\text{alert}} = \frac{\text{False Positives (False Alarms)}}{\text{True Negatives} + \text{False Positives}}$$
   *Measures driver annoyance caused by spurious alerts when fully alert.*
