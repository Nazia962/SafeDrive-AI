# SafeDrive AI — Machine Learning Model Integration Contract
Version: 1.0.0
Status: APPROVED BLUEPRINT (Offline Infrastructure Ready)

This contract defines the precise API, data layout, normalization formula, and output semantics required for future integration between the offline trained model and the TypeScript production application (`src/services/riskEngine.ts`).

---

## 1. Input Feature Vector Specification

The model consumes a single 1D tensor of **10 float32 features** ordered strictly as follows:

```typescript
export const CANONICAL_FEATURE_ORDER = [
  'current_ear',            // Index 0: Smoothed Eye Aspect Ratio [0.0 - 1.0]
  'mar',                    // Index 1: Smoothed Mouth Aspect Ratio [0.0 - 2.0]
  'eye_closed_duration_sec',// Index 2: Active eye closure duration in seconds [>= 0.0]
  'perclos',                // Index 3: Rolling 60s eye closure percentage [0.0 - 100.0]
  'blink_rate',             // Index 4: Rolling 60s blinks per minute [0.0 - 120.0]
  'yawn_duration_sec',      // Index 5: Active yawn duration in seconds [>= 0.0]
  'head_pitch',             // Index 6: Head pitch angle in degrees [-90.0 - +90.0]
  'head_yaw',               // Index 7: Head yaw angle in degrees [-90.0 - +90.0]
  'head_roll',              // Index 8: Head roll angle in degrees [-90.0 - +90.0]
  'phone_confidence'        // Index 9: Mobile device detection score [0.0 - 1.0]
] as const;
```

---

## 2. Pre-Inference Normalization Formula

Prior to executing inference, the raw 10-dimensional feature vector $\mathbf{x}_{\text{raw}}$ must be standardized using the pre-calculated parameters stored in `model_metadata.json`:

$$\hat{x}_i = \frac{x_i - \mu_i}{\sigma_i}$$

Where:
- $\mu_i$: Mean of feature $i$ computed **strictly on the training split**.
- $\sigma_i$: Standard deviation of feature $i$ computed **strictly on the training split**.

If $\sigma_i = 0$, $\hat{x}_i = 0$.

---

## 3. Missing Value & Edge Case Behavior

If face landmark tracking is interrupted (`facePresent === false`):
1. Features `current_ear`, `mar`, `head_pitch`, `head_yaw`, and `head_roll` fallback to default constants (`ear: 0.32`, `mar: 0.20`, `angles: 0.0`).
2. Timers (`eye_closed_duration_sec`, `yawn_duration_sec`) reset to `0.0`.
3. Rolling statistics (`perclos`, `blink_rate`) decay gradually as old frames roll out.

---

## 4. Model Output & Probability Semantics

The model outputs a 4-dimensional probability tensor generated via Softmax:

$$\mathbf{p} = [p_0, p_1, p_2, p_3], \quad \sum_{i=0}^3 p_i = 1.0$$

### Class Index Mapping

| Index | Class Name | State Meaning | Safety Reaction Trigger |
| :---: | :--- | :--- | :--- |
| `0` | `ALERT` | Driver is focused, eyes open, head oriented forward. | Normal monitoring state. |
| `1` | `MILD_FATIGUE` | Early signs of drowsiness (frequent blinking, mild yawning). | Visual advisory on dashboard. |
| `2` | `SEVERE_FATIGUE` | Prolonged eye closure (microsleep), head drooping. | **HIGH PRIORITY AUDIO ALERT**. |
| `3` | `DISTRACTED` | Prolonged head yaw/pitch off-road or mobile phone detected. | **DISTRACTION AUDIO WARNING**. |

---

## 5. Confidence Thresholding & Safety Fallback

To prevent false alarms from low-confidence model noise:
1. `class_predicted = argmax(p)`
2. `confidence = max(p)`
3. **Safety Fallback Rule**: If `confidence < 0.60`, the system maintains the prior state or falls back to the deterministic safety heuristic rule engine in `riskEngine.ts`.
