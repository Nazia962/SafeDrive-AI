# SafeDrive AI — Production Deployment & Local Setup Manual
Version: 1.0.0
Date: September 2026

This document provides step-by-step instructions for deploying and running SafeDrive AI in local development and production environments.

---

## 1. System Requirements

### Hardware Requirements
- **CPU**: Intel Core i5 / AMD Ryzen 5 or higher (Quad-core recommended).
- **RAM**: 8 GB minimum (16 GB recommended).
- **Webcam**: Standard 720p or 1080p USB / integrated webcam.
- **GPU** (Optional): WebGL / WebGPU acceleration supported in browser.

### Software Requirements
- **Node.js**: `v18.0.0` or higher.
- **npm**: `v9.0.0` or higher.
- **Python**: `v3.10` or higher (for offline ML pipeline).
- **Browser**: Google Chrome, Microsoft Edge, or Mozilla Firefox with WebAssembly (WASM) and WebGL support.

---

## 2. Environment Configuration

Create a `.env` file in the project root:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=safedrive_production_secret_key_change_in_prod_2026
```

> **Security Note**: Never commit `.env` containing real production secrets to version control.

---

## 3. Quick Start (Development Mode)

1. **Install Node.js Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Access Application**:
   Open Chrome/Edge and navigate to:
   `http://localhost:3000`

4. **Camera Permission**:
   When navigating to **Live Monitoring** and clicking **START MONITORING**, grant camera access in the browser prompt.

---

## 4. Production Build & Execution

1. **Linting Verification**:
   ```bash
   npm run lint
   ```

2. **Build Production Assets**:
   ```bash
   npm run build
   ```

3. **Start Production Server**:
   ```bash
   npm start
   ```

---

## 5. Offline Machine Learning Pipeline Execution

To train and export a new model after acquiring raw datasets:

1. **Install Python Dependencies**:
   ```bash
   pip install -r ml/requirements.txt
   ```

2. **Place Raw Datasets**:
   Place NTHU-DDD, YawDD, or RLDD raw files in `ml/data/raw/<DatasetName>/`.

3. **Execute Deterministic Training**:
   ```bash
   python -m ml.training.train --config ml/config/config.yaml --dataset NTHU-DDD
   ```

4. **Evaluate Model**:
   ```bash
   python -m ml.evaluation.evaluate --model-path ml/models/safedrive_drowsiness_v1.pth
   ```

5. **Export Model to ONNX**:
   ```bash
   python -m ml.export.export_model --model-path ml/models/safedrive_drowsiness_v1.pth --format onnx
   ```
