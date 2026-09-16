# SafeDrive AI — System Architecture Specification
Version: 1.0.0
Academic Year: 2026

## 1. System Overview & Technology Stack

SafeDrive AI is an edge-native, real-time driver drowsiness, fatigue, distraction, and safety analytics platform. It runs client-side inside modern web browsers using WebAssembly (WASM), WebGL, and HTML5 WebRTC `getUserMedia()` video streaming.

```
+-----------------------------------------------------------------------------------+
|                                  BROWSER CLIENT                                   |
|                                                                                   |
|  +-------------------+      +-------------------------+      +-----------------+  |
|  |  Webcam Stream    | ---> | MediaPipe Face Mesh     | ---> |  Temporal       |  |
|  | (getUserMedia)    |      | (478 3D Landmarks)      |      |  Feature Engine |  |
|  +-------------------+      +-------------------------+      +-----------------+  |
|                                          |                            |           |
|                                          v                            v           |
|                             +-------------------------+      +-----------------+  |
|                             | COCO-SSD Phone Detector |      |  10D Vector     |  |
|                             | (TensorFlow.js)         |      +-----------------+  |
|                             +-------------------------+               |           |
|                                          |                            v           |
|                                          +------------------> +-----------------+  |
|                                                               | ONNX ML Engine  |  |
|                                                               | & Fallback      |  |
|                                                               +-----------------+  |
|                                                                       |           |
|                                                                       v           |
|                                                              +-----------------+  |
|                                                              |  Multimodal     |  |
|                                                              |  Risk Fusion    |  |
|                                                              +-----------------+  |
|                                                                       |           |
|                                                                       v           |
|                                                              +-----------------+  |
|                                                              | Audio & Dashboard|  |
|                                                              | Alerts & UI     |  |
|                                                              +-----------------+  |
+-----------------------------------------------------------------------------------+
                                       |
                                       v (JWT Authenticated Telemetry / Events)
+-----------------------------------------------------------------------------------+
|                                EXPRESS BACKEND SERVER                             |
|                                                                                   |
|  - Auth Routes (/api/auth/*)                                                      |
|  - Telemetry & Trip APIs (/api/trips/*)                                           |
|  - Secure File Storage (/data/ - 403 Restricted)                                  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Technology Stack Breakdown

- **Frontend Application**: React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS.
- **Computer Vision Framework**: `@mediapipe/tasks-vision` (Face Landmarker, 478 3D facial points).
- **Object Detection Engine**: `@tensorflow-models/coco-ssd` + `@tensorflow/tfjs` (Mobile phone detection).
- **Offline ML Pipeline**: Python 3.11/3.14 + PyTorch + scikit-learn + ONNX Exporter.
- **Client Inference Service**: `onnxModelService.ts` (ONNX WebAssembly / TF.js execution engine).
- **Backend Server**: Node.js + Express + bcryptjs + jsonwebtoken.
- **Storage**: Local JSON database with 403-forbidden static file protection.
