# SafeDrive AI — Feature Equivalence & Schema Compatibility Analysis
Version: 1.0.0

This document verifies the mathematical equivalence between the Python offline ML feature pipeline (`ml/preprocessing/feature_schema.py`) and the real-time TypeScript vision pipeline (`src/services/vision/temporalEngine.ts` and `src/services/vision/faceDetector.ts`).

---

## 1. Feature Equivalence Comparison Matrix

| Vector Index | Feature Key | TypeScript Source | Python Schema | Math Equivalence | Smoothing & Windowing |
| :---: | :--- | :--- | :--- | :---: | :--- |
| `0` | `current_ear` | `state.currentEar` | `current_ear` | **Identical** | Exponential Moving Average (EMA): $EAR_{t} = 0.6 \cdot EAR_{t-1} + 0.4 \cdot EAR_{raw}$. Range: $[0.0, 1.0]$. |
| `1` | `mar` | `state.mar` | `mar` | **Identical** | EMA: $MAR_{t} = 0.7 \cdot MAR_{t-1} + 0.3 \cdot MAR_{raw}$. Range: $[0.0, 2.0]$. |
| `2` | `eye_closed_duration_sec` | `state.eyeClosedDurationSec` | `eye_closed_duration_sec` | **Identical** | Timer tracks continuous duration eyes remain below closure threshold ($EAR < 0.22$). Reset to $0.0$ on eye open. |
| `3` | `perclos` | `state.perclos` | `perclos` | **Identical** | Percentage of closed-eye frames in rolling 60s ($60,000\text{ ms}$) window. Range: $[0.0, 100.0]\%$. |
| `4` | `blink_rate` | `state.blinkRate` | `blink_rate` | **Identical** | Count of completed blinks ($50\text{ ms} \le \text{duration} \le 400\text{ ms}$) in rolling 60s window. Range: $[0, 120]$ bpm. |
| `5` | `yawn_duration_sec` | `state.yawnDurationSec` | `yawn_duration_sec` | **Identical** | Timer tracks continuous mouth open duration above yawn threshold ($MAR > 0.58$) for $\ge 800\text{ ms}$. Reset on recovery ($MAR < 0.45$). |
| `6` | `head_pitch` | `state.headPitch` | `head_pitch` | **Identical** | Pitch angle in degrees (nodding up/down). EMA smoothed ($\alpha=0.3$). Range: $[-90^\circ, +90^\circ]$. |
| `7` | `head_yaw` | `state.headYaw` | `head_yaw` | **Identical** | Yaw angle in degrees (turning left/right). EMA smoothed ($\alpha=0.3$). Range: $[-90^\circ, +90^\circ]$. |
| `8` | `head_roll` | `state.headRoll` | `head_roll` | **Identical** | Roll angle in degrees (tilting side-to-side). EMA smoothed ($\alpha=0.3$). Range: $[-90^\circ, +90^\circ]$. |
| `9` | `phone_confidence` | `detection.phoneConfidence` | `phone_confidence` | **Identical** | Mobile device object detection confidence score from COCO-SSD. Range: $[0.0, 1.0]$. |

---

## 2. Detailed Mathematical Verification

### A. PERCLOS (Percentage of Eye Closure)
- **TypeScript Formula**:
  $$\text{PERCLOS} = \frac{\sum_{f \in W_{60s}} \mathbb{I}(\text{smoothEar}_f < 0.22)}{|W_{60s}|} \times 100$$
- **Python Schema**: Matches range $[0.0, 100.0]$. Default when no frames are recorded: `0.0`.

### B. Missing Face / No-Landmarks Handling
When `facePresent === false`:
- `current_ear` $\to$ default `0.32`
- `mar` $\to$ default `0.20`
- `eye_closed_duration_sec` $\to$ `0.0` (resets to prevent false microsleep alerts on face loss)
- `yawn_duration_sec` $\to$ `0.0`
- `head_pitch`, `head_yaw`, `head_roll` $\to$ `0.0`
- `perclos` and `blink_rate` decay naturally as old window frames prune out.

Both TypeScript and Python implementations adhere strictly to these missing-value rules.
