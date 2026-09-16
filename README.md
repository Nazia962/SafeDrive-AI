# SAFEdrive AI — AI-Powered Real-Time Driver Drowsiness, Fatigue, & Distraction Safety System

[![License: Academic](https://img.shields.io/badge/License-Academic%20B.Tech-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/Build-Passing-emerald.svg)](#verification--testing)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Tasks%20Vision-teal.svg)](https://developers.google.com/mediapipe)

SafeDrive AI is an edge-native, real-time driver safety monitoring system that performs continuous computer-vision processing, 3D facial landmark analysis, temporal feature tracking (EAR, MAR, PERCLOS, blinks, yawns, head pose), mobile phone detection, and multimodal risk assessment directly inside the browser.

---

## 🌟 Key Architecture & Capabilities

1. **Client-Side Computer Vision Engine**:
   - Uses `@mediapipe/tasks-vision` Face Landmarker to extract 478 3D facial landmarks at 30+ FPS.
   - Primary face selection policy for multi-person vehicles.
   - No-face safety decay handling (resets timers to prevent false positive microsleep alarms).

2. **Temporal Feature Engineering (`TemporalFeatureEngine`)**:
   - Exponential Moving Average (EMA) smoothing for noise reduction.
   - Rolling 60-second PERCLOS % (Percentage of Eye Closure).
   - Rolling 60-second Blink Rate counter and prolonged closure detection ($> 400\text{ ms}$ microsleeps).
   - Continuous yawn state machine ($> 800\text{ ms}$ mouth opening at $MAR > 0.58$).
   - Perspective-n-Point 3D Head Pose estimation (Pitch, Yaw, Roll).

3. **Mobile Phone Distraction Detection (`PhoneDetector`)**:
   - Real-time COCO-SSD object detection (`cell phone` class) with 3-frame temporal confirmation.

4. **Multimodal Risk Fusion Engine (`MultimodalRiskEngine`)**:
   - Fuses visual geometry, temporal indicators, phone detection, and optional ML predictions into a calibrated 0-100 safety score.
   - Outputs 4-tier safety risk levels (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`) with human-readable contributing factors.

5. **Browser ML Runtime (`onnxModelService.ts`)**:
   - Asynchronous client-side ONNX WebAssembly / TF.js model loader.
   - Displays clear runtime status badges: `ML MODEL ACTIVE` (when valid ONNX binary is loaded) or `HEURISTIC / FALLBACK MODE` (when running on validated temporal rule engine).

6. **Offline Python Machine Learning Pipeline (`ml/`)**:
   - Reproducible academic ML pipeline supporting NTHU-DDD, YawDD, and RLDD datasets.
   - Canonical 10-dimensional feature schema (`feature_schema.py`).
   - Subject-independent `GroupKFold` driver partitioning (`splitter.py`).
   - Training-isolated `StandardScaler` preprocessor (`preprocessor.py`).
   - PyTorch `BaselineMLP` model (`baseline_mlp.py`).
   - Safety metrics evaluator (`evaluate.py`) calculating FNR, FPR, F1, and ROC-AUC.
   - ONNX exporter (`export_model.py`).

---

## 🔒 Security & Privacy Engineering

- **Privacy-by-Design**: All webcam processing occurs strictly in client-side RAM via WebRTC `getUserMedia()`. Zero raw camera frames or videos are uploaded to the backend server.
- **Password Security**: User passwords hashed with `bcryptjs` (salt rounds = 10).
- **JWT Authorization**: All protected API endpoints enforce valid Bearer tokens validated against `process.env.JWT_SECRET`.
- **Database & Route Protection**: Database folder `/data/` protected with HTTP 403 Forbidden. No database JSON dumps exposed in public directories.

---

## 🚦 System Dashboard & User Experience

- **Live Monitoring Hub**: Real-time 478-point mesh overlay, EAR/MAR gauges, head pose compass, phone detection indicator, and live safety risk gauge.
- **Acoustic & Voice Alerts**: Web Audio API synthesizer + Web Speech API for immediate spoken warnings during high-risk events.
- **Analytics & History**: Session breakdown, safety trends, event timestamps, driver stats, and notification center.

---

## 🛠️ Installation & Execution

### Prerequisites
- Node.js `v18+` & npm `v9+`
- Python `v3.10+` (optional, for offline ML training)

### Running the Web Application
```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Build production bundle
npm run build

# 4. Run production server
npm start
```

### Running Automated Verification Tests
```bash
# Run 18/18 temporal feature & risk engine unit tests
npx tsx testTemporal.ts

# Run TypeScript compilation check
npm run lint

# Run Python syntax compilation checks
python -m py_compile ml/preprocessing/feature_schema.py ml/preprocessing/dataset_adapters.py ml/preprocessing/splitter.py ml/preprocessing/preprocessor.py ml/models/baseline_mlp.py ml/training/train.py ml/evaluation/evaluate.py ml/export/export_model.py
```

---

## 📚 Project Documentation

- [`ARCHITECTURE.md`](file:///c:/Users/lenovo/Desktop/SafeDrive%20AI/ARCHITECTURE.md) — System architecture & component diagram.
- [`VISION_ENGINE.md`](file:///c:/Users/lenovo/Desktop/SafeDrive%20AI/VISION_ENGINE.md) — 478-point facial mesh & geometric formulations.
- [`TEMPORAL_FEATURES.md`](file:///c:/Users/lenovo/Desktop/SafeDrive%20AI/TEMPORAL_FEATURES.md) — PERCLOS, blink rate, and yawn state definitions.
- [`ML_MODEL_CONTRACT.md`](file:///c:/Users/lenovo/Desktop/SafeDrive%20AI/ML_MODEL_CONTRACT.md) — 10D feature vector contract & ONNX metadata format.
- [`ML_TRAINING.md`](file:///c:/Users/lenovo/Desktop/SafeDrive%20AI/ML_TRAINING.md) — Academic training manual & reproducibility guidelines.
- [`DEPLOYMENT.md`](file:///c:/Users/lenovo/Desktop/SafeDrive%20AI/DEPLOYMENT.md) — Deployment & production setup guide.
- [`ml/data/DATASET_VALIDATION.md`](file:///c:/Users/lenovo/Desktop/SafeDrive%20AI/ml/data/DATASET_VALIDATION.md) — Dataset availability audit & class mapping.
- [`ml/preprocessing/FEATURE_COMPATIBILITY.md`](file:///c:/Users/lenovo/Desktop/SafeDrive%20AI/ml/preprocessing/FEATURE_COMPATIBILITY.md) — TypeScript vs. Python schema equivalence.
- [`ml/evaluation/RESULTS.md`](file:///c:/Users/lenovo/Desktop/SafeDrive%20AI/ml/evaluation/RESULTS.md) — Evaluation results & safety metrics protocol.
