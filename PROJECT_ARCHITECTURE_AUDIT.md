# SafeDrive AI Architecture Audit

## 1. Current Architecture
The current architecture is a monolithic client-server web application. The frontend is built with React, Vite, and TailwindCSS. The backend is an Express.js Node server providing a REST API and acting as a telemetry data store. All AI/Computer Vision inference runs locally in the user's browser, while the backend stores telemetry, calculates aggregate analytics, and provides a mock/heuristic machine learning API for benchmark demonstration.

## 2. Frontend
**IMPLEMENTED**
The complete frontend folder structure is:
- `src/`
  - `App.tsx`
  - `main.tsx`
  - `index.css`
  - `types.ts`
  - `components/`
    - `analytics/`
    - `dashboard/`
    - `history/`
    - `layout/`
    - `monitoring/`
    - `notification/`
    - `profile/`
    - `settings/`
    - `viva/`
  - `services/`
    - `api.ts` (API client)
    - `riskEngine.ts` (Multimodal Risk Engine)
    - `vision/`
      - `audioAlerts.ts`
      - `faceDetector.ts`
      - `phoneDetector.ts`
      - `simulationEngine.ts`

React pages/components correspond to the directories in `src/components/`, managing dashboard, monitoring, profile, settings, history, and analytics views.

## 3. Backend
**IMPLEMENTED**
The complete backend/server folder structure is:
- `server.ts` (Entry point and Express app configuration)
- `server/`
  - `auth.ts` (JWT Authentication logic)
  - `db.ts` (In-memory JSON database)
  - `ml_engine.ts` (Server-side mock ML inference and academic benchmarks)
  - `routes.ts` (Express API endpoints)
- `data/` (Auto-generated directory for database storage)

All API routes implemented:
- **Auth:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- **User:** `GET /profile`, `PUT /profile`, `GET /settings`, `PUT /settings`
- **Trips:** `GET /trips`, `GET /trips/:id`, `POST /trips`, `PUT /trips/:id/complete`, `DELETE /trips/:id`, `DELETE /trips`
- **Telemetry:** `POST /trips/:id/telemetry`, `POST /events/fatigue`, `POST /events/phone`, `POST /events/distraction`, `POST /alerts`
- **Notifications:** `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/mark-all-read`, `DELETE /notifications/:id`
- **Analytics:** `GET /analytics`
- **ML & Workflow:** `GET /ml/workflow`, `GET /ml/benchmarks`, `POST /ml/predict`
- **DB Exports:** `GET /database/download`, `GET /database/export`, `GET /download/safedrive.json`, `GET /download/safadrive.json`, `GET /safedrive.json`, `GET /safadrive.json`

## 4. Database
**IMPLEMENTED**
- Custom in-memory `class Database` (`server/db.ts`).
- Storage Method: Periodically writes state to a flat JSON file at `data/safedrive.json` (and creates copies in the `public/` directory).

## 5. Authentication
**IMPLEMENTED**
- Uses `jsonwebtoken` (JWT) for stateless sessions.
- Uses `bcryptjs` for password hashing.
- Contains a fallback mechanism that automatically logs users in as `driver_default_01` if no valid token is provided (intended for local demo).

## 6. Webcam
**IMPLEMENTED**
- The webcam implementation feeds frames into a canvas to be processed by `faceDetector.ts` and `phoneDetector.ts` in the browser. WebRTC/Camera API is presumed to be handled in the React components (e.g., `monitoring/`).

## 7. Computer Vision
**IMPLEMENTED**
- Facial geometry is generated using a custom heuristic method based on pixel luminance and contrast in `faceDetector.ts`. It synthesizes 468 mesh points, calculates EAR/MAR, and approximates pitch and yaw using facial symmetry (instead of using a heavy library like MediaPipe).

## 8. Machine Learning
**IMPLEMENTED**
- **Frontend:** TensorFlow.js (`@tensorflow/tfjs`) is loaded dynamically.
- **Backend:** `ml_engine.ts` provides a "16-Step ML Workflow" and returns academic benchmarks. The actual server-side prediction (`predictDriverState`) uses a hardcoded logistic regression formula based on input features rather than a real serialized model.

## 9. Risk Engine
**IMPLEMENTED**
- Implemented in `src/services/riskEngine.ts` as `MultimodalRiskEngine`.
- Fuses EAR, MAR, PERCLOS, head pose, road attention, and phone detection into a 0-100 smoothed risk score using a 30-step temporal sliding sequence.

## 10. Alerts
**IMPLEMENTED**
- Implemented in `src/services/vision/audioAlerts.ts`.
- Uses Web Audio API to synthesize dual-tone frequency oscillator chimes/sirens (for drowsiness, phone, and critical alerts).
- Uses Web Speech API (`window.speechSynthesis`) for spoken voice warnings.

## 11. Dashboard
**IMPLEMENTED**
- Components exist in `src/components/dashboard`. Backend provides `/analytics` endpoint computing real aggregate telemetry data (no fake numbers).

## 12. History and Analytics
**IMPLEMENTED**
- Implemented via `Trip` arrays in the JSON database. Analytics endpoints aggregate total trips, hours, safety score, events, and a recent trip trend.

## 13. Security
**IMPLEMENTED (WITH CRITICAL FLAWS)**
- **Vulnerability 1 (Data Exposure):** `server/db.ts` saves the entire database (including password hashes and user profiles) to the `public/` folder (`public/safedrive.json`) for static download. Furthermore, Express routes explicitly serve the database file without authentication checks.
- **Vulnerability 2 (Auth Bypass):** In `server/auth.ts`, if no token is provided, the API automatically falls back to `req.user = db.getUserById('driver_default_01')`, completely bypassing authentication.
- **Vulnerability 3 (Hardcoded Secrets):** JWT secret is hardcoded (`safedrive_btech_capstone_jwt_secret_2026_production`).

## 14. Privacy
**IMPLEMENTED**
- Webcam frames do **NOT** leave the user's browser. All computer vision and TF.js inference occurs entirely client-side. The backend only receives telemetry metadata (scores, coordinates, events).

## 15. Environment Variables
**IMPLEMENTED**
- Current required variables: `JWT_SECRET` (if customized), `NODE_ENV`.
- No external AI API keys or third-party cloud secrets are required, as inference is local.

## 16. Deployment Readiness
**PARTIALLY IMPLEMENTED (BLOCKERS EXIST)**
- **Blockers:** 
  1. The security flaws mentioned above (public exposure of `safedrive.json`, auth bypass) must be patched before any public deployment.
  2. The application relies on `public/safedrive.json` being writable at runtime, which is problematic for read-only serverless environments or Docker containers without mounted volumes.

## 17. Missing/Incomplete Features
- **FaceMesh/MediaPipe:** Despite having 468 mesh points, the `faceDetector.ts` synthesizes these using basic 2D drawing math rather than actual 3D FaceMesh inference.
- **Actual Server ML Model:** `ml_engine.ts` simulates ML rather than loading a trained `.h5` or `.pkl` model.

## 18. Recommended Next Development Steps
1. **Fix Security:** Remove the fallback in `requireAuth` and stop writing/serving `safedrive.json` publicly.
2. **Robust Database:** Replace the file-based JSON store with a robust database like PostgreSQL/SQLite for production.
3. **Upgrade Vision Engine:** Integrate actual MediaPipe FaceLandmarker to replace the heuristic luminance-based `faceDetector.ts`.
