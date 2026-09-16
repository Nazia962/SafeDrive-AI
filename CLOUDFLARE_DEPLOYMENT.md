# SafeDrive AI — Production Deployment Manual (Cloudflare)
Version: 2.0.0
Date: September 2026

## 1. System Architecture

- **Frontend Application**: React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS.
- **Backend Service**: Cloudflare Workers (using Hono router for API routes).
- **Database**: Cloudflare D1 (Serverless SQLite).
- **Computer Vision Framework**: `@mediapipe/tasks-vision` (Face Landmarker, 478 3D facial points) - *Client-side browser execution*.
- **Object Detection Engine**: `@tensorflow-models/coco-ssd` + `@tensorflow/tfjs` (Mobile phone detection) - *Client-side browser execution*.
- **Offline ML Pipeline**: Python 3.11/3.14 + PyTorch + scikit-learn + ONNX Exporter.
- **Client Inference Service**: `onnxModelService.ts` (ONNX WebAssembly / TF.js execution engine).
- **Fallback**: Heuristic risk engine operates entirely when a trained ONNX model is unavailable.
- **Camera Privacy**: ALL camera frames remain in the browser memory. Only telemetry/metrics (EAR, MAR, Head Pose, Alerts) are sent to the Cloudflare Worker.

## 2. Environment & Secrets Configuration

Create a `.env` file for local development:
```env
JWT_SECRET=development_secret_key_change_me
```

For production deployment on Cloudflare, set the Worker secret:
```bash
npx wrangler secret put JWT_SECRET
```

## 3. Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Local Cloudflare Worker & Vite Frontend**:
   ```bash
   npm run dev
   ```

## 4. Production Deployment

1. **Lint Verification**:
   ```bash
   npm run lint
   ```

2. **Apply Database Schema**:
   ```bash
   npx wrangler d1 migrations apply safedrive-db --remote
   ```

3. **Deploy to Cloudflare Workers**:
   ```bash
   npm run deploy
   ```

## 5. Machine Learning Note
ML training/evaluation is NOT claimed complete unless actual physical ONNX model artifacts exist in the production environment. The application safely falls back to the deterministic real-time heuristic risk engine (EAR, MAR, PERCLOS thresholds).
