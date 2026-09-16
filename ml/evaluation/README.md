# SafeDrive AI — Model Evaluation & Metrics Module

This module implements safety-oriented model evaluation on held-out test sets.

---

## Metric Definitions

1. **Overall Classification Metrics**:
   - **Accuracy**: Overall fraction of correct predictions across all 4 classes.
   - **Precision (Macro & Weighted)**: Proportion of correct positive predictions.
   - **Recall (Macro & Weighted)**: Proportion of actual positives identified.
   - **F1 Score**: Harmonic mean of Precision and Recall.
   - **ROC-AUC (One-vs-Rest)**: Multi-class area under the ROC curve.

2. **Safety-Oriented Risk Metrics**:
   - **Severe Fatigue False Negative Rate (FNR)**:
     $$\text{FNR}_{\text{severe}} = \frac{\text{False Negatives}}{\text{True Positives} + \text{False Negatives}}$$
     *Critical safety metric: Measures how often the model misses a severely fatigued driver.*
   - **Alert False Positive Rate (FPR)**:
     $$\text{FPR}_{\text{alert}} = \frac{\text{False Positives}}{\text{True Negatives} + \text{False Positives}}$$
     *Measures how often an alert driver is falsely flagged with warnings.*
   - **Per-Class Precision & Recall**: Individual metrics for `ALERT`, `MILD_FATIGUE`, `SEVERE_FATIGUE`, and `DISTRACTED`.

---

## Usage

```bash
python -m ml.evaluation.evaluate --model-path ml/models/safedrive_drowsiness_v1.pth
```
