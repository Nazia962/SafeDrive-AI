# SafeDrive AI — Model Export Module

This module handles exporting trained PyTorch models to browser-compatible runtime formats.

---

## Target Inference Formats Evaluation

### Option 1: ONNX (`.onnx`) via `onnxruntime-web` (Recommended)
- **Advantages**:
  - Direct PyTorch native export (`torch.onnx.export`).
  - Supports WASM, WebGL, and WebGPU hardware acceleration in modern browsers.
  - Highly optimized, zero dependency on TensorFlow.
- **Client Library**: `onnxruntime-web` (npm package).

### Option 2: TensorFlow.js (`model.json` + `.bin` shards)
- **Advantages**:
  - Direct integration with existing `@tensorflow/tfjs` import in `package.json`.
- **Disadvantages**:
  - Requires `onnx2tf` or `tensorflowjs` Python package during offline export step.

---

## Usage

```bash
python -m ml.export.export_model --model-path ml/models/safedrive_drowsiness_v1.pth --format onnx
```
