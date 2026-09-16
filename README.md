# SafeDrive AI: Real-Time Driver Drowsiness and Distraction Detection Using Computer Vision and Artificial Intelligence

[![License: Academic](https://img.shields.io/badge/License-Academic%20B.Tech-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/Build-Passing-emerald.svg)](#testing-and-verification)

## 2. Project Overview
SafeDrive AI is an edge-native, real-time driver safety monitoring system that performs continuous computer-vision processing, 3D facial landmark analysis, temporal feature tracking, and mobile phone detection directly inside the browser. It fuses these indicators to calculate a real-time risk score and alerts the driver of impending danger.

## 3. Problem Statement
Driver drowsiness and distraction are leading causes of severe road accidents globally. Traditional safety systems are often expensive, proprietary, or require heavy onboard processing. There is a need for an accessible, low-latency, privacy-preserving safety system that can run on consumer hardware to detect fatigue and distraction.

## 4. Objectives
- Provide real-time, zero-latency edge AI detection of driver drowsiness and distraction.
- Preserve user privacy by processing all webcam frames strictly within the client browser.
- Deliver an explainable, multimodal risk assessment fusing visual, temporal, and contextual indicators.
- Offer a robust, cloud-native backend for telemetry and history aggregation.

## 5. Key Features
- **User authentication**: Secure JWT-based registration and login.
- **Dashboard**: Real-time monitoring and analytics hub.
- **Browser webcam monitoring**: Zero-upload, local video processing via WebRTC.
- **Face/landmark detection**: 478-point 3D facial mesh processing.
- **EAR**: Eye Aspect Ratio tracking.
- **Blink detection**: Blink counting and duration monitoring.
- **Eye closure duration**: Detection of dangerous microsleeps.
- **PERCLOS**: Percentage of Eye Closure over time.
- **MAR/yawning**: Mouth Aspect Ratio for yawn state machines.
- **Head pose**: 3D perspective pitch, yaw, and roll tracking.
- **Distraction detection**: Detection of looking away from the road.
- **Phone detection**: Real-time object detection for mobile phones.
- **Temporal analysis**: EMA smoothing and time-windowed tracking.
- **Risk scoring**: 0-100 calibrated safety risk engine.
- **Explainable alerts**: Human-readable causes for all high-risk events.
- **History**: Detailed trip logs and telemetry.
- **Analytics**: Aggregate safety trends and statistics.
- **Notifications**: System warnings and alerts.
- **Settings/profile**: Driver configuration and profile management.
- **Secure backend**: Hono API with strict JWT validation.
- **Cloudflare deployment**: Edge-hosted workers and D1 database.

## 6. System Architecture
SafeDrive AI utilizes a client-edge architecture. 
- The **Client Browser** handles all heavy lifting: WebRTC camera capture, MediaPipe/TF.js model inference, temporal feature engineering, risk fusion, and UI rendering.
- The **Cloudflare Workers Backend (Hono)** acts as a secure REST API edge server, processing structured telemetry and managing stateless JWT authentication.
- The **Cloudflare D1 Database** provides globally distributed, relational data storage.

## 7. Technology Stack
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS
- **Computer Vision**: MediaPipe Tasks Vision (Face Landmarker), TensorFlow.js (COCO-SSD)
- **Backend**: Hono, Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Machine Learning**: Python, PyTorch, Scikit-Learn (offline training)

## 8. Detection Pipeline
1. **Camera Input**: Raw frames captured via browser `getUserMedia()`.
2. **Vision Inference**: Frames processed by MediaPipe (faces) and TF.js (objects).
3. **Geometric Extraction**: 3D landmarks converted to mathematical ratios (EAR, MAR).
4. **Temporal Engine**: Instantaneous ratios smoothed via EMA and tracked over rolling 60s windows to determine prolonged states (blinks, yawns, PERCLOS).

## 9. Risk Assessment Pipeline
The Multimodal Risk Engine consumes temporal states and emits a 0-100 score. It applies specific penalty weights for active yawns, high PERCLOS, prolonged eye closures, distracted head poses, and phone usage. The score dictates the risk tier (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`), triggering visual and auditory alerts.

## 10. ML Pipeline and CURRENT ML STATUS
The offline ML pipeline (`ml/`) supports NTHU-DDD, YawDD, and RLDD datasets using a 10-dimensional temporal feature schema, Subject-independent `GroupKFold`, and a PyTorch `BaselineMLP`. 
**CURRENT STATUS**: The ML training and evaluation infrastructure is fully implemented. However, a final trained production model is currently pending dataset ingestion and training execution.
**FALLBACK BEHAVIOR**: While a validated ONNX model is unavailable, the application safely falls back to a deterministic, temporal heuristic rule engine to assess drowsiness and distraction with high explainability.

## 11. Database Architecture
Cloudflare D1 provides relational data storage. Data is scoped by user ID, containing tables for `Users`, `Trips`, `Telemetry`, `Events`, `Alerts`, and `Notifications`.

## 12. Security
- Passwords hashed via `bcryptjs`.
- Stateless JWT authentication via HTTP headers.
- JWT secret supplied securely through environment variables.
- All API routes are protected and enforce user-scoped database access.
- No hardcoded demo accounts or plaintext passwords.
- No raw webcam upload or storage.
- Sensitive files and secrets excluded from Git.

## 13. Privacy
Privacy by design: 100% of video processing occurs in the client's volatile RAM. No images, videos, or raw biometric point clouds are ever transmitted to the server. The backend only receives abstracted, numeric safety scores.

## 14. Project Structure
- `/src`: React frontend application.
- `/server`: Hono backend API and logic.
- `/ml`: Offline Python machine learning pipeline.
- `/migrations`: D1 database SQL schemas.
- `/docs`: Comprehensive project documentation.

## 15. Local Development Instructions
```bash
npm install
npm run dev
```

## 16. Environment Variables
Local development uses `.dev.vars`. Production uses Cloudflare Secrets.
- `JWT_SECRET`: Secret key for token signing.

## 17. Cloudflare Deployment Instructions
```bash
npm run build
npx wrangler deploy
```

## 18. D1 Database Setup/Migration Instructions
```bash
# Local development
npx wrangler d1 migrations apply safedrive-db --local

# Production
npx wrangler d1 migrations apply safedrive-db --remote
```

## 19. Testing/Verification
- **TypeScript Linting**: `npm run lint`
- **Build Verification**: `npm run build`
- **Temporal Engine Unit Tests**: `npx tsx testTemporal.ts`
- **Python ML Syntax Checks**: `python -m py_compile ml/preprocessing/...`

## 20. Known Limitations
- Model inference performance depends on client hardware capabilities.
- Low-light environments may reduce MediaPipe landmark confidence.
- ML pipeline requires manual dataset download due to academic licensing.

## 21. Future Work
- Integration of advanced lightweight vision transformers.
- Night-vision IR camera support.
- Fleet management dashboard for enterprise operators.

## 22. Deployment URL
https://safedrive-ai.naziasultana0430.workers.dev

## 23. GitHub Repository Information
Repository: Nazia962/SafeDrive-AI
Description: Real-time driver drowsiness and distraction detection using computer vision, temporal analysis, and AI.

## 24. Academic Disclaimer
This is an academic/research prototype and is not certified as an automotive safety system or medical diagnostic system. Evaluative benchmarks represent lab-controlled conditions.
