# SafeDrive AI — Temporal Feature Engineering Specification
Version: 1.0.0

This document defines the mathematical models implemented in `src/services/vision/temporalEngine.ts`.

---

## 1. Exponential Moving Average (EMA) Smoothing

To eliminate high-frequency webcam frame jitter and landmark estimation noise, instantaneous measurements are smoothed using EMA filters:

$$S_t = \alpha \cdot X_t + (1 - \alpha) \cdot S_{t-1}$$

- **EAR Smoothing**: $\alpha = 0.40$
- **MAR Smoothing**: $\alpha = 0.30$
- **Head Pose (Pitch, Yaw, Roll)**: $\alpha = 0.30$

---

## 2. PERCLOS (Percentage of Eye Closure)

Calculated over a rolling 60-second ($60,000\text{ ms}$) temporal sliding window:

$$\text{PERCLOS} = \frac{\text{Frames with } \text{smoothEar} < 0.22}{\text{Total frames in rolling 60s window}} \times 100$$

- **Normal Alert Driver**: $\text{PERCLOS} < 8.0\%$
- **Elevated Fatigue**: $8.0\% \le \text{PERCLOS} < 15.0\%$
- **Severe Fatigue**: $\text{PERCLOS} \ge 15.0\%$

---

## 3. Blink Rate & Prolonged Closure Tracking

- **Blink Duration Window**: $50\text{ ms} \le t_{\text{closure}} \le 400\text{ ms}$.
- **Microsleep / Prolonged Closure**: $t_{\text{closure}} > 400\text{ ms}$. If closure exceeds $1200\text{ ms}$ ($1.2\text{ s}$), a high-priority critical warning is triggered immediately.
- **Blink Rate Calculation**: Count of valid blinks recorded within the rolling 60-second window.

---

## 4. Yawn State Machine

States: `CLOSED` $\to$ `OPEN` $\to$ `YAWNING` $\to$ `CLOSED`.
- **Yawn Entry Condition**: $\text{smoothMar} > 0.58$ continuously for $\ge 800\text{ ms}$.
- **Yawn Recovery Condition**: $\text{smoothMar} < 0.45$.
