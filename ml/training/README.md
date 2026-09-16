# SafeDrive AI — Model Training Module

This module orchestrates deterministic model training, validation logging, and model artifact serialization.

---

## Training Principles

1. **Determinism**: All random seeds (`random`, `numpy`, `torch`) are set explicitly to `config['random_seed']` (default: 42).
2. **Subject Independence**: Splitting uses `SubjectIndependentSplitter` (GroupKFold) so no driver is shared across splits.
3. **Scaler Preservation**: Normalization parameters are calculated strictly on train data and saved alongside model weights.
4. **Honest Execution**: Training will ONLY execute when a verified dataset is present in `ml/data/raw/`. No fake results are generated.

---

## Usage

```bash
python -m ml.training.train --config ml/config/config.yaml --dataset NTHU-DDD
```
