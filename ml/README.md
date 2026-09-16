# SafeDrive AI — Offline Machine Learning Pipeline (Phase 4A)

This directory contains the reproducible Python machine learning training, evaluation, and export pipeline for SafeDrive AI.

> **Academic & Operational Integrity Notice**
> - The production web application (`src/`, `server/`) runs on React + TypeScript + Node.js.
> - This Python pipeline is used exclusively **offline** for feature schema definition, dataset ingestion adapters, subject-independent splitting, model training, evaluation, and model export to browser-compatible formats (TF.js / ONNX).
> - **No training datasets are committed to Git.**
> - **No fake benchmark metrics or pre-trained claims are present.**

---

## Directory Structure

```
ml/
├── README.md                  # Overview of the ML pipeline
├── requirements.txt           # Python dependencies (PyTorch, scikit-learn, ONNX, etc.)
├── config/
│   └── config.yaml            # Pipeline hyperparameters & schema versions
├── data/
│   └── README.md              # Instructions for dataset download & placement
├── preprocessing/
│   ├── README.md              # Preprocessing & schema guide
│   ├── feature_schema.py      # Canonical 10-feature schema definition
│   ├── dataset_adapters.py    # Adapters for NTHU-DDD, YawDD, and RLDD
│   ├── splitter.py           # Subject-independent GroupKFold splitter
│   └── preprocessor.py        # Normalization & sequence construction
├── training/
│   ├── README.md              # Training instructions
│   └── train.py               # Deterministic model training pipeline
├── evaluation/
│   ├── README.md              # Evaluation strategy guide
│   └── evaluate.py            # Safety-oriented metric evaluation (FNR, FPR, F1, ROC-AUC)
├── export/
│   ├── README.md              # Model export documentation
│   └── export_model.py        # ONNX / TF.js exporter interface
└── models/
    ├── README.md              # Model architecture definitions & artifacts
    └── baseline_mlp.py        # Baseline Multi-Layer Perceptron architecture
```

---

## Workflow Overview

1. **Obtain Datasets Legally**: Follow guidelines in `ml/data/README.md` to acquire NTHU-DDD, YawDD, or RLDD.
2. **Feature Extraction**: Run raw dataset frames through the `dataset_adapters.py` pipeline to map landmarks to the canonical schema defined in `feature_schema.py`.
3. **Train Model**: Run `python -m ml.training.train --config ml/config/config.yaml` to perform subject-independent training.
4. **Evaluate**: Run `python -m ml.evaluation.evaluate` to calculate hold-out test set metrics (Accuracy, F1, FNR, FPR).
5. **Export to Browser**: Run `python -m ml.export.export_model` to compile the model to ONNX / TF.js format for deployment to `public/models/`.

---

## Integration with Production App

See [`ML_MODEL_CONTRACT.md`](../ML_MODEL_CONTRACT.md) for the exact contract specifying input vector ordering, normalization parameters, and class output semantics.
