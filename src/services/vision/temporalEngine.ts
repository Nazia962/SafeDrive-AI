/**
 * SafeDrive AI - Temporal Feature Engineering
 * Handles the robust temporal analysis of instantaneous facial landmarks over time.
 * Calculates blinks, prolonged closures, PERCLOS, yawns, and smooths head pose.
 */

export interface TemporalState {
  currentEar: number;
  averageEar: number;
  blinkCount: number;
  blinkDurationSec: number;
  blinkRate: number; // blinks per minute
  eyeClosedDurationSec: number;
  perclos: number; // percentage (0-100)
  mar: number;
  yawnState: boolean;
  yawnCount: number;
  yawnDurationSec: number;
  headYaw: number;
  headPitch: number;
  headRoll: number;
  facePresent: boolean;
  lastUpdateTimestamp: number;
}

export interface TemporalThresholds {
  earClosureThreshold: number;
  marYawnThreshold: number;
  marYawnRecoveryThreshold: number;
  perclosWindowMs: number;
  minYawnDurationMs: number;
  minBlinkDurationMs: number;
  maxBlinkDurationMs: number;
}

const DEFAULT_THRESHOLDS: TemporalThresholds = {
  earClosureThreshold: 0.22,
  marYawnThreshold: 0.58,
  marYawnRecoveryThreshold: 0.45,
  perclosWindowMs: 60000, // 1 minute rolling window for PERCLOS
  minYawnDurationMs: 800, // Must be open for 800ms to count as a yawn
  minBlinkDurationMs: 50, // Ignore micro-glitches < 50ms
  maxBlinkDurationMs: 400 // Closures > 400ms are prolonged, not normal blinks
};

export class TemporalFeatureEngine {
  private state: TemporalState;
  private thresholds: TemporalThresholds;

  // Smoothing
  private smoothEar: number = 0.32;
  private smoothMar: number = 0.20;
  private smoothPitch: number = 0;
  private smoothYaw: number = 0;
  private smoothRoll: number = 0;

  // Eye State Tracking
  private eyeState: 'OPEN' | 'CLOSED' = 'OPEN';
  private lastEyeStateChangeMs: number = 0;
  private blinkTimestamps: number[] = [];

  // Yawn State Tracking
  private marState: 'CLOSED' | 'OPEN' | 'YAWNING' = 'CLOSED';
  private lastMarStateChangeMs: number = 0;

  // PERCLOS tracking (sliding window of closed frame timestamps / durations)
  private perclosFrames: { timestamp: number; isClosed: boolean }[] = [];

  constructor(thresholds: Partial<TemporalThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    this.state = this.getInitialState();
    this.lastEyeStateChangeMs = Date.now();
    this.lastMarStateChangeMs = Date.now();
  }

  private getInitialState(): TemporalState {
    return {
      currentEar: 0.32,
      averageEar: 0.32,
      blinkCount: 0,
      blinkDurationSec: 0,
      blinkRate: 0,
      eyeClosedDurationSec: 0,
      perclos: 0,
      mar: 0,
      yawnState: false,
      yawnCount: 0,
      yawnDurationSec: 0,
      headYaw: 0,
      headPitch: 0,
      headRoll: 0,
      facePresent: false,
      lastUpdateTimestamp: Date.now()
    };
  }

  public reset() {
    this.state = this.getInitialState();
    this.smoothEar = 0.32;
    this.smoothMar = 0.20;
    this.smoothPitch = 0;
    this.smoothYaw = 0;
    this.smoothRoll = 0;
    this.eyeState = 'OPEN';
    this.marState = 'CLOSED';
    this.blinkTimestamps = [];
    this.perclosFrames = [];
    const now = Date.now();
    this.lastEyeStateChangeMs = now;
    this.lastMarStateChangeMs = now;
  }

  /**
   * Called when no face is present to gracefully decay/suspend tracking
   */
  public handleNoFace(timestampMs: number): TemporalState {
    this.state.facePresent = false;
    this.state.lastUpdateTimestamp = timestampMs;
    // We reset instantaneous timers so they don't incorrectly trigger upon return
    this.eyeState = 'OPEN';
    this.lastEyeStateChangeMs = timestampMs;
    this.state.eyeClosedDurationSec = 0;
    
    this.marState = 'CLOSED';
    this.lastMarStateChangeMs = timestampMs;
    this.state.yawnState = false;
    this.state.yawnDurationSec = 0;

    // Prune old PERCLOS frames and blinks but do NOT add new closed frames
    this.pruneTemporalWindows(timestampMs);
    this.updatePerclosAndBlinkRate(timestampMs);

    return { ...this.state };
  }

  /**
   * Process a new set of valid facial landmarks
   */
  public processObservation(
    rawEar: number,
    rawMar: number,
    rawPitch: number,
    rawYaw: number,
    rawRoll: number,
    timestampMs: number
  ): TemporalState {
    // 1. Smoothing (Exponential Moving Average)
    this.smoothEar = this.smoothEar * 0.6 + rawEar * 0.4;
    this.smoothMar = this.smoothMar * 0.7 + rawMar * 0.3;
    this.smoothPitch = this.smoothPitch * 0.7 + rawPitch * 0.3;
    this.smoothYaw = this.smoothYaw * 0.7 + rawYaw * 0.3;
    this.smoothRoll = this.smoothRoll * 0.7 + rawRoll * 0.3;

    // 2. Eye State & Blink / Prolonged Closure tracking
    const isCurrentlyClosed = this.smoothEar < this.thresholds.earClosureThreshold;
    const eyeStateDurationMs = timestampMs - this.lastEyeStateChangeMs;

    if (this.eyeState === 'OPEN' && isCurrentlyClosed) {
      // Transition to closed
      this.eyeState = 'CLOSED';
      this.lastEyeStateChangeMs = timestampMs;
      this.state.eyeClosedDurationSec = 0;
    } else if (this.eyeState === 'CLOSED' && !isCurrentlyClosed) {
      // Transition to open
      this.eyeState = 'OPEN';
      this.lastEyeStateChangeMs = timestampMs;
      this.state.eyeClosedDurationSec = 0;
      this.state.blinkDurationSec = 0;

      // Classify the closure duration
      if (eyeStateDurationMs >= this.thresholds.minBlinkDurationMs && eyeStateDurationMs <= this.thresholds.maxBlinkDurationMs) {
        // It's a normal blink
        this.state.blinkCount++;
        this.blinkTimestamps.push(timestampMs);
      }
      // If it was > maxBlinkDurationMs, it was a prolonged closure, which riskEngine handles. We don't increment blinkCount for microsleeps.
    } else if (this.eyeState === 'CLOSED' && isCurrentlyClosed) {
      // Still closed
      this.state.eyeClosedDurationSec = eyeStateDurationMs / 1000.0;
      // Also record how long it's been closed for display purposes
      if (eyeStateDurationMs <= this.thresholds.maxBlinkDurationMs) {
        this.state.blinkDurationSec = eyeStateDurationMs / 1000.0;
      }
    }

    // 3. Yawn State Tracking
    const marDurationMs = timestampMs - this.lastMarStateChangeMs;
    if (this.marState === 'CLOSED' && this.smoothMar > this.thresholds.marYawnThreshold) {
      this.marState = 'OPEN';
      this.lastMarStateChangeMs = timestampMs;
    } else if (this.marState === 'OPEN' && this.smoothMar > this.thresholds.marYawnThreshold) {
      if (marDurationMs >= this.thresholds.minYawnDurationMs) {
        this.marState = 'YAWNING';
        this.state.yawnState = true;
        this.state.yawnCount++;
        this.state.yawnDurationSec = marDurationMs / 1000.0;
      }
    } else if (this.marState === 'YAWNING') {
      if (this.smoothMar < this.thresholds.marYawnRecoveryThreshold) {
        // Recovered from yawn
        this.marState = 'CLOSED';
        this.state.yawnState = false;
        this.lastMarStateChangeMs = timestampMs;
        this.state.yawnDurationSec = 0;
      } else {
        // Still yawning
        this.state.yawnDurationSec = marDurationMs / 1000.0;
      }
    } else if (this.marState === 'OPEN' && this.smoothMar < this.thresholds.marYawnRecoveryThreshold) {
      // False alarm mouth opening, didn't reach yawn threshold duration
      this.marState = 'CLOSED';
      this.lastMarStateChangeMs = timestampMs;
    }

    // 4. PERCLOS Frame Recording
    this.perclosFrames.push({ timestamp: timestampMs, isClosed: isCurrentlyClosed });
    this.pruneTemporalWindows(timestampMs);
    this.updatePerclosAndBlinkRate(timestampMs);

    // 5. Update State Object
    this.state.currentEar = Number(this.smoothEar.toFixed(3));
    this.state.averageEar = Number(rawEar.toFixed(3)); // (Expose raw for visualization or separate use if needed)
    this.state.mar = Number(this.smoothMar.toFixed(3));
    this.state.headPitch = Number(this.smoothPitch.toFixed(1));
    this.state.headYaw = Number(this.smoothYaw.toFixed(1));
    this.state.headRoll = Number(this.smoothRoll.toFixed(1));
    this.state.facePresent = true;
    this.state.lastUpdateTimestamp = timestampMs;

    return { ...this.state };
  }

  private pruneTemporalWindows(timestampMs: number) {
    // Prune PERCLOS frames older than window
    const perclosCutoff = timestampMs - this.thresholds.perclosWindowMs;
    while (this.perclosFrames.length > 0 && this.perclosFrames[0].timestamp < perclosCutoff) {
      this.perclosFrames.shift();
    }

    // Prune blinks older than 60 seconds (for rate calculation)
    const blinkCutoff = timestampMs - 60000;
    while (this.blinkTimestamps.length > 0 && this.blinkTimestamps[0] < blinkCutoff) {
      this.blinkTimestamps.shift();
    }
  }

  private updatePerclosAndBlinkRate(timestampMs: number) {
    // Calculate PERCLOS
    if (this.perclosFrames.length === 0) {
      this.state.perclos = 0;
    } else {
      const closedFrames = this.perclosFrames.filter(f => f.isClosed).length;
      this.state.perclos = Number(((closedFrames / this.perclosFrames.length) * 100).toFixed(1));
    }

    // Calculate Blink Rate (blinks per minute)
    this.state.blinkRate = this.blinkTimestamps.length;
  }
}
