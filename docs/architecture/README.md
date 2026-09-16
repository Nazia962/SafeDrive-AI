# SafeDrive AI Architecture

## Overview
SafeDrive AI employs an edge-native, real-time client processing architecture. The system shifts the heavy computational burden of computer vision to the user's browser, utilizing the WebRTC API and local machine learning models to analyze the driver's state without compromising privacy.

## Data Flow Pipeline

Browser
↓
Webcam `getUserMedia()` (Processed locally, never uploaded)
↓
MediaPipe Face Landmarker (Extracts 478 3D landmarks)
↓
EAR / MAR / Blink / PERCLOS / Head Pose (Mathematical feature extraction)
↓
Temporal Feature Engine (EMA smoothing, window tracking)
↓
ML Prediction (when a validated model is available) OR Heuristic Fallback
↓
Risk Fusion Engine (Aggregates multimodal indicators into 0-100 score)
↓
Alerts + Dashboard (Visual UI & Audio Warnings)
↓
Hono API (Telemetry payloads)
↓
Cloudflare D1 (Structured Relational Storage)

## Key Architectural Decisions

- **No-Face Handling**: If a face is lost (e.g., the driver looks completely away or blocks the camera), it is not immediately treated as "drowsiness." Timers decay safely to prevent false positive microsleep alarms, and after a threshold, a "Camera Obstructed / No Face" warning is issued.
- **Primary Face Handling**: In multi-person vehicles, the engine locks onto the largest, most centrally-located face to ensure passengers do not trigger false alerts.
- **Temporal Confirmation**: Instantaneous feature spikes (like a single frame of low EAR due to a blink) are smoothed over rolling windows (e.g., 60 seconds for PERCLOS) to ensure robust confirmation of physiological states.
- **Explainable Risk Reasons**: The Risk Fusion Engine does not just output a number; it yields an array of string indicators (e.g., "Prolonged Eye Closure", "Active Yawn", "Phone Detected") that explicitly explain *why* a risk level escalated.
- **Browser-Side Webcam Processing**: To guarantee privacy, webcam frames are drawn to an invisible `<canvas>` and processed directly in volatile RAM. No image data is serialized or transmitted over the network.
- **Aggregated Event Storage**: The backend only receives periodic telemetry heartbeats (e.g., `riskScore: 75, events: ["YAWN"]`) rather than continuous raw data streams.
