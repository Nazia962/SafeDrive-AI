"""
SafeDrive AI — Deterministic Model Training Pipeline
Version: 1.0.0

Orchestrates training of the BaselineMLP classifier.
Enforces seed determinism, subject-independent data splitting, and checkpointing.
DOES NOT execute training if raw datasets are missing.
"""

import argparse
import json
import random
from pathlib import Path
import numpy as np

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False

import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader

from ml.preprocessing.feature_schema import CANONICAL_FEATURE_ORDER, CLASS_MAP
from ml.preprocessing.dataset_adapters import get_dataset_adapter
from ml.preprocessing.splitter import SubjectIndependentSplitter
from ml.preprocessing.preprocessor import FeaturePreprocessor
from ml.models.baseline_mlp import BaselineMLP


def set_deterministic_seed(seed: int = 42):
    """Sets deterministic random seeds across all libraries."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False


def train_model(config_path: str, dataset_name: str):
    """Loads config, ingests dataset, trains baseline MLP, and saves model artifact."""
    # 1. Load Configuration
    if HAS_YAML:
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)
    else:
        # Fallback to default schema dictionary if PyYAML is not installed in runtime environment
        print("[!] PyYAML not installed. Using default fallback configuration.")
        config = {
            "random_seed": 42,
            "dataset": {"raw_dir": "ml/data/raw"},
            "schema": {"input_dim": 10},
            "splitting": {"val_size": 0.15, "test_size": 0.15},
            "model": {
                "architecture": {"hidden_dims": [64, 32], "dropout_rate": 0.2},
                "training": {"batch_size": 32, "learning_rate": 0.001, "weight_decay": 0.0001, "epochs": 50}
            },
            "export": {"output_dir": "ml/models", "export_filename": "safedrive_drowsiness_v1.onnx"}
        }

    seed = config.get("random_seed", 42)
    set_deterministic_seed(seed)
    print(f"[*] Deterministic seed set to {seed}")

    # 2. Check for Dataset
    raw_dir = Path(config["dataset"]["raw_dir"]) / dataset_name
    print(f"[*] Checking dataset location: {raw_dir}")

    adapter = get_dataset_adapter(dataset_name, str(raw_dir))
    
    try:
        X_raw, y_raw, subject_ids = adapter.load_dataset()
    except (FileNotFoundError, NotImplementedError) as e:
        print("\n" + "=" * 70)
        print("[!] NOTICE: Dataset not available for training.")
        print(f"[!] {e}")
        print("[!] No training was executed. No fake model weights will be generated.")
        print("=" * 70 + "\n")
        return

    # 3. Subject-Independent Splitting
    print("[*] Performing subject-independent Train/Val/Test splitting...")
    splitter = SubjectIndependentSplitter(random_seed=seed)
    X_train, y_train, X_val, y_val, X_test, y_test = splitter.train_val_test_split(
        X_raw, y_raw, subject_ids,
        val_ratio=config["splitting"]["val_size"],
        test_ratio=config["splitting"]["test_size"]
    )

    # 4. Preprocessing & Scaler Fitting
    print("[*] Normalizing features (scaler fit strictly on training set)...")
    preprocessor = FeaturePreprocessor()
    X_train_scaled = preprocessor.fit_transform(X_train)
    X_val_scaled = preprocessor.transform(X_val)
    X_test_scaled = preprocessor.transform(X_test)

    # Convert to Tensors
    train_dataset = TensorDataset(torch.tensor(X_train_scaled, dtype=torch.float32), torch.tensor(y_train, dtype=torch.long))
    val_dataset = TensorDataset(torch.tensor(X_val_scaled, dtype=torch.float32), torch.tensor(y_val, dtype=torch.long))
    
    batch_size = config["model"]["training"]["batch_size"]
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    # 5. Initialize Model & Optimizer
    model = BaselineMLP(
        input_dim=config["schema"]["input_dim"],
        num_classes=len(CLASS_MAP),
        hidden_dims=config["model"]["architecture"]["hidden_dims"],
        dropout_rate=config["model"]["architecture"]["dropout_rate"]
    )
    
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(
        model.parameters(),
        lr=config["model"]["training"]["learning_rate"],
        weight_decay=config["model"]["training"]["weight_decay"]
    )

    # 6. Training Loop
    epochs = config["model"]["training"]["epochs"]
    best_val_loss = float("inf")
    output_dir = Path(config["export"]["output_dir"])
    output_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_path = output_dir / "safedrive_drowsiness_v1.pth"

    print(f"[*] Beginning training for {epochs} epochs...")
    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        for X_b, y_b in train_loader:
            optimizer.zero_grad()
            out = model(X_b)
            loss = criterion(out, y_b)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * X_b.size(0)

        train_loss /= len(train_dataset)

        # Validation
        model.eval()
        val_loss = 0.0
        correct = 0
        with torch.no_grad():
            for X_b, y_b in val_loader:
                out = model(X_b)
                loss = criterion(out, y_b)
                val_loss += loss.item() * X_b.size(0)
                preds = torch.argmax(out, dim=1)
                correct += (preds == y_b).sum().item()

        val_loss /= len(val_dataset)
        val_acc = correct / len(val_dataset)

        print(f"Epoch {epoch:02d}/{epochs} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.4f}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save({
                "model_state_dict": model.state_dict(),
                "normalization_params": preprocessor.get_normalization_params(),
                "config": config,
                "epoch": epoch,
                "best_val_loss": best_val_loss
            }, checkpoint_path)
            print(f"  [+] Checkpoint saved to {checkpoint_path}")

    print("[*] Training completed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SafeDrive AI Model Training")
    parser.add_argument("--config", type=str, default="ml/config/config.yaml", help="Path to config.yaml")
    parser.add_argument("--dataset", type=str, default="NTHU-DDD", help="Dataset adapter to use")
    args = parser.parse_args()

    train_model(args.config, args.dataset)
