"""
SafeDrive AI — Model Export Pipeline
Version: 1.0.0

Exports trained PyTorch BaselineMLP models to ONNX / TF.js format.
Generates model_metadata.json containing canonical feature schema order
and normalization parameters for client-side JavaScript runtime.
"""

import argparse
import json
from pathlib import Path
import numpy as np
import torch

from ml.models.baseline_mlp import BaselineMLP
from ml.preprocessing.feature_schema import CANONICAL_FEATURE_ORDER, CLASS_MAP


def export_to_onnx(model: BaselineMLP, output_path: str, input_dim: int = 10, opset_version: int = 13):
    """Exports PyTorch model to ONNX format."""
    model.eval()
    dummy_input = torch.randn(1, input_dim, dtype=torch.float32)

    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=opset_version,
        do_constant_folding=True,
        input_names=["feature_vector"],
        output_names=["logits"],
        dynamic_axes={
            "feature_vector": {0: "batch_size"},
            "logits": {0: "batch_size"}
        }
    )
    print(f"[+] Model exported to ONNX: {output_path}")


def export_metadata(normalization_params: dict, output_path: str):
    """Exports feature schema, normalization parameters, and class map to JSON."""
    metadata = {
        "version": "1.0.0",
        "input_dim": len(CANONICAL_FEATURE_ORDER),
        "feature_order": CANONICAL_FEATURE_ORDER,
        "class_map": CLASS_MAP,
        "normalization": normalization_params
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"[+] Model metadata exported to JSON: {output_path}")


def export_pipeline(model_path: str, target_format: str = "onnx"):
    """Main export runner."""
    path = Path(model_path)
    if not path.exists():
        print("\n" + "=" * 70)
        print("[!] NOTICE: Model checkpoint not found.")
        print(f"[!] Export interface cannot find '{model_path}'.")
        print("[!] No fake model export will be created.")
        print("=" * 70 + "\n")
        return

    checkpoint = torch.load(path)
    config = checkpoint["config"]

    model = BaselineMLP(
        input_dim=config["schema"]["input_dim"],
        num_classes=len(CLASS_MAP),
        hidden_dims=config["model"]["architecture"]["hidden_dims"]
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    
    out_dir = Path(config["export"]["output_dir"])
    out_dir.mkdir(parents=True, exist_ok=True)

    if target_format == "onnx":
        onnx_file = out_dir / config["export"]["export_filename"]
        export_to_onnx(model, str(onnx_file), input_dim=config["schema"]["input_dim"])
        
    metadata_file = out_dir / "model_metadata.json"
    export_metadata(checkpoint.get("normalization_params", {}), str(metadata_file))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export SafeDrive AI Model")
    parser.add_argument("--model-path", type=str, default="ml/models/safedrive_drowsiness_v1.pth", help="Checkpoint path")
    parser.add_argument("--format", type=str, default="onnx", choices=["onnx", "tfjs"], help="Export format")
    args = parser.parse_args()

    export_pipeline(args.model_path, args.format)
