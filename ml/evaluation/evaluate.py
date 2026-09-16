"""
SafeDrive AI — Model Evaluation & Metrics Framework
Version: 1.0.0

Calculates multi-class classification and safety metrics (FNR, FPR, F1, ROC-AUC)
on held-out test sets.
Refuses to generate placeholder numbers if no model checkpoint or test set exists.
"""

import argparse
from pathlib import Path
import numpy as np
import torch
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    roc_auc_score
)

from ml.preprocessing.feature_schema import CLASS_MAP, CLASS_NAME_TO_INDEX
from ml.models.baseline_mlp import BaselineMLP


def evaluate_model_on_test_set(model: BaselineMLP, X_test: np.ndarray, y_test: np.ndarray) -> dict:
    """
    Evaluates a trained model on a held-out test set.
    Calculates standard multi-class metrics and safety-oriented risk metrics.
    """
    model.eval()
    with torch.no_grad():
        inputs = torch.tensor(X_test, dtype=torch.float32)
        probabilities = model.predict_proba(inputs).numpy()
        predictions = np.argmax(probabilities, axis=1)

    # Standard metrics
    acc = accuracy_score(y_test, predictions)
    prec_macro, rec_macro, f1_macro, _ = precision_recall_fscore_support(y_test, predictions, average="macro", zero_division=0)
    prec_weighted, rec_weighted, f1_weighted, _ = precision_recall_fscore_support(y_test, predictions, average="weighted", zero_division=0)
    
    # Class-specific precision, recall, f1
    prec_per_class, rec_per_class, f1_per_class, support_per_class = precision_recall_fscore_support(
        y_test, predictions, average=None, labels=list(CLASS_MAP.keys()), zero_division=0
    )

    cm = confusion_matrix(y_test, predictions, labels=list(CLASS_MAP.keys()))

    # ROC-AUC calculation (Multi-class One-vs-Rest)
    try:
        roc_auc = roc_auc_score(y_test, probabilities, multi_class="ovr", average="macro")
    except Exception:
        roc_auc = None

    # Safety-Oriented Risk Metrics
    # 1. SEVERE_FATIGUE False Negative Rate (FNR)
    severe_idx = CLASS_NAME_TO_INDEX["SEVERE_FATIGUE"]
    tp_severe = cm[severe_idx, severe_idx]
    fn_severe = np.sum(cm[severe_idx, :]) - tp_severe
    fnr_severe = float(fn_severe / (tp_severe + fn_severe)) if (tp_severe + fn_severe) > 0 else 0.0

    # 2. ALERT False Positive Rate (FPR)
    alert_idx = CLASS_NAME_TO_INDEX["ALERT"]
    fp_alert = np.sum(cm[:, alert_idx]) - cm[alert_idx, alert_idx]
    tn_alert = np.sum(cm) - np.sum(cm[alert_idx, :]) - fp_alert
    fpr_alert = float(fp_alert / (fp_alert + tn_alert)) if (fp_alert + tn_alert) > 0 else 0.0

    results = {
        "accuracy": float(acc),
        "precision_macro": float(prec_macro),
        "recall_macro": float(rec_macro),
        "f1_macro": float(f1_macro),
        "precision_weighted": float(prec_weighted),
        "recall_weighted": float(rec_weighted),
        "f1_weighted": float(f1_weighted),
        "roc_auc_ovr_macro": roc_auc,
        "safety_metrics": {
            "severe_fatigue_false_negative_rate": fnr_severe,
            "alert_false_positive_rate": fpr_alert
        },
        "per_class": {
            CLASS_MAP[i]: {
                "precision": float(prec_per_class[i]),
                "recall": float(rec_per_class[i]),
                "f1": float(f1_per_class[i]),
                "support": int(support_per_class[i])
            } for i in range(len(CLASS_MAP))
        },
        "confusion_matrix": cm.tolist()
    }

    return results


def print_evaluation_report(results: dict):
    """Prints a formatted academic metrics report to standard output."""
    print("\n" + "=" * 60)
    print("      SafeDrive AI — Model Evaluation Report")
    print("=" * 60)
    print(f"Overall Accuracy:           {results['accuracy'] * 100:.2f}%")
    print(f"Macro F1 Score:             {results['f1_macro']:.4f}")
    print(f"Weighted F1 Score:          {results['f1_weighted']:.4f}")
    if results["roc_auc_ovr_macro"] is not None:
        print(f"ROC-AUC (OVR Macro):        {results['roc_auc_ovr_macro']:.4f}")
    print("-" * 60)
    print("Safety Risk Metrics:")
    print(f"  - Severe Fatigue FNR (Missed Microsleeps): {results['safety_metrics']['severe_fatigue_false_negative_rate'] * 100:.2f}%")
    print(f"  - Alert Driver FPR (False Alarms):          {results['safety_metrics']['alert_false_positive_rate'] * 100:.2f}%")
    print("-" * 60)
    print("Per-Class Breakdown:")
    for cls_name, metrics in results["per_class"].items():
        print(f"  Class: {cls_name:15s} | Prec: {metrics['precision']:.3f} | Rec: {metrics['recall']:.3f} | F1: {metrics['f1']:.3f} | Support: {metrics['support']}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate SafeDrive AI Model")
    parser.add_argument("--model-path", type=str, default="ml/models/safedrive_drowsiness_v1.pth", help="Path to checkpoint")
    args = parser.parse_args()

    model_path = Path(args.model_path)
    if not model_path.exists():
        print("\n" + "=" * 70)
        print("[!] NOTICE: Model checkpoint not found.")
        print(f"[!] Evaluator cannot find '{model_path}'.")
        print("[!] No fake metrics or accuracy benchmark results will be printed.")
        print("=" * 70 + "\n")
    else:
        checkpoint = torch.load(model_path)
        config = checkpoint["config"]
        model = BaselineMLP(
            input_dim=config["schema"]["input_dim"],
            num_classes=len(CLASS_MAP),
            hidden_dims=config["model"]["architecture"]["hidden_dims"]
        )
        model.load_state_dict(checkpoint["model_state_dict"])
        print("[*] Model loaded successfully. Provide X_test and y_test array paths to run evaluation.")
