# SafeDrive AI Testing & Verification

## Overview
SafeDrive AI utilizes a combination of automated static analysis, unit tests, build validation, and manual verification protocols to ensure system stability and logical correctness.

## Verified Automatically

The following test suites and checks exist in the repository and can be run automatically:

1. **TypeScript Static Analysis & Linting**
   - Validates type safety across the React frontend and Hono backend.
   - Command: `npm run lint`

2. **Production Build Validation**
   - Ensures Vite and esbuild successfully compile the application bundles without resolving errors.
   - Command: `npm run build`

3. **Temporal Feature & Risk Engine Tests**
   - A suite of automated unit tests (`testTemporal.ts`) that strictly verifies the logic of the `TemporalFeatureEngine` and `MultimodalRiskEngine`.
   - Tests evaluate edge cases for EAR smoothing, PERCLOS accumulation, yawn state machines, and distraction logic.
   - Command: `npx tsx testTemporal.ts`

4. **Python ML Syntax Compilation**
   - Verifies that the offline machine learning pipeline scripts compile without syntax errors.
   - Command: `python -m py_compile ml/preprocessing/feature_schema.py ml/preprocessing/dataset_adapters.py ml/preprocessing/splitter.py ml/preprocessing/preprocessor.py ml/models/baseline_mlp.py ml/training/train.py ml/evaluation/evaluate.py ml/export/export_model.py`

## Manual Verification

Because the core safety features rely on hardware peripherals (webcams) and human biometric input, the following items require manual verification:

1. **Webcam Acquisition (`getUserMedia`)**: Ensure the browser requests and successfully captures the video stream.
2. **MediaPipe / TF.js Inference**: Ensure the 478-point mesh and phone detection bounding boxes render correctly on the canvas in real-time.
3. **Simulated Drowsiness**: Manually close eyes for >2 seconds or trigger a yawn to verify that the Risk Engine escalates the score and triggers auditory alerts.
4. **JWT Authentication Flow**: Manually register, login, and access protected dashboard routes.
5. **Database Persistence**: Ensure that completed trips and telemetry successfully save to the Cloudflare D1 database and appear in the History/Analytics views.
