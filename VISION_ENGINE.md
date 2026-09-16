# SafeDrive AI — Computer Vision Engine Specification
Version: 1.0.0

This document details the real-time computer vision subsystem powering SafeDrive AI.

---

## 1. Primary Vision Engine: MediaPipe Face Landmarker

SafeDrive AI uses `@mediapipe/tasks-vision` running asynchronously inside the browser via WebAssembly (WASM).

### Key Properties
- **Landmark Count**: 478 3D points ($X, Y, Z$ normalized coordinates + iris points).
- **Primary Face Policy**: If multiple faces appear in the video stream, the face with the largest bounding box area is selected as the active driver.
- **No-Face Fallback**: If `facePresent === false`, measurements decay gracefully without triggering false microsleep alerts.

---

## 2. Geometric Metrics Formulation

### Eye Aspect Ratio (EAR)
Calculated separately for left and right eyes using vertical and horizontal landmark distances:

$$\text{EAR} = \frac{\|p_2 - p_6\| + \|p_3 - p_5\|}{2 \|p_1 - p_4\|}$$

- **Left Eye Indices**: `[33, 160, 158, 133, 153, 144]`
- **Right Eye Indices**: `[362, 385, 387, 263, 373, 380]`
- **Combined EAR**: $\text{EAR}_{\text{total}} = \frac{\text{EAR}_{\text{left}} + \text{EAR}_{\text{right}}}{2}$

### Mouth Aspect Ratio (MAR)
Calculated from inner lip landmarks:

$$\text{MAR} = \frac{\|p_{81} - p_{178}\| + \|p_{13} - p_{14}\| + \|p_{311} - p_{402}\|}{2 \|p_{78} - p_{308}\|}$$

---

## 3. Head Pose Estimation (Pitch, Yaw, Roll)

Estimated using perspective geometry from key facial anchor points (nose tip, chin, eye corners, mouth corners):

- **Pitch ($\theta_x$)**: Nodding up/down. Positive = looking up, Negative = nodding down.
- **Yaw ($\theta_y$)**: Turning left/right. Positive = turning right, Negative = turning left.
- **Roll ($\theta_z$)**: Tilting head side-to-side.

---

## 4. Phone Detection (COCO-SSD)

Uses `@tensorflow-models/coco-ssd` to detect mobile devices (`cell phone` class) in the upper torso/steering frame:
- **Temporal Confirmation**: A phone detection is flagged as confirmed if it persists across $\ge 3$ consecutive frames with confidence $\ge 0.50$.
