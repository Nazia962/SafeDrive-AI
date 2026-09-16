/**
 * SafeDrive AI - Multimodal Risk Fusion Engine
 * Integrates temporal features (EAR, MAR, PERCLOS, Head Pose, Yawn State) and Phone Detection into a Calibrated 0-100 Safety Risk Score
 */

import type { RiskLevel, RoadAttentionStatus } from '../types';

export interface MultimodalRiskResult {
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  drowsinessScore: number; // 0 - 100
  distractionScore: number; // 0 - 100
  contributingFactors: string[];
  recommendedAlert: 'NONE' | 'DROWSINESS' | 'PHONE' | 'CRITICAL';
  statusDescription: string;
  isMLModelActive?: boolean;
  mlStatusText?: string;
  mlPredictedClass?: string;
  mlConfidence?: number;
}

export class MultimodalRiskEngine {
  private temporalBuffer: number[] = [];
  private maxBufferSize = 30; // 30-step temporal sliding sequence
  private sensitivityMultiplier = 1.0;

  public setSensitivity(sensitivity: 'LOW' | 'NORMAL' | 'HIGH') {
    if (sensitivity === 'LOW') this.sensitivityMultiplier = 0.85;
    else if (sensitivity === 'HIGH') this.sensitivityMultiplier = 1.2;
    else this.sensitivityMultiplier = 1.0;
  }

  /**
   * Calculates fused risk from all telemetry streams using precise temporal feature indicators.
   */
  public evaluateRisk(params: {
    ear: number;
    mar: number;
    perclos: number;
    pitch: number;
    yaw: number;
    roll: number;
    phoneDetected: boolean;
    phoneConfidence: number;
    phoneConfirmed: boolean;
    roadAttention: RoadAttentionStatus;
    earThreshold: number;
    marThreshold: number;
    perclosThreshold: number;
    eyeClosedDurationSec: number;
    yawnState?: boolean;
    yawnDurationSec?: number;
    mlPrediction?: {
      isMLModelActive: boolean;
      predictedClass: string;
      confidence: number;
      probabilities: number[];
    } | null;
  }): MultimodalRiskResult {
    const factors: string[] = [];
    let drowsinessSubscore = 0;
    let distractionSubscore = 0;

    // 0. ML Model Evidence Fusion (if active and high confidence)
    if (params.mlPrediction && params.mlPrediction.isMLModelActive && params.mlPrediction.confidence >= 0.60) {
      const { predictedClass, confidence } = params.mlPrediction;
      if (predictedClass === 'SEVERE_FATIGUE') {
        drowsinessSubscore += Math.round(50 * confidence);
        factors.push(`ML Model: High Severe Fatigue Probability (${(confidence * 100).toFixed(0)}%)`);
      } else if (predictedClass === 'MILD_FATIGUE') {
        drowsinessSubscore += Math.round(25 * confidence);
        factors.push(`ML Model: Mild Fatigue Pattern (${(confidence * 100).toFixed(0)}%)`);
      } else if (predictedClass === 'DISTRACTED') {
        distractionSubscore += Math.round(40 * confidence);
        factors.push(`ML Model: Distraction Pattern (${(confidence * 100).toFixed(0)}%)`);
      }
    }

    // 1. EAR and Prolonged Eye Closure Analysis
    if (params.eyeClosedDurationSec >= 1.2) {
      drowsinessSubscore += 65;
      factors.push(`Prolonged eye closure (${params.eyeClosedDurationSec.toFixed(1)}s)`);
    } else if (params.eyeClosedDurationSec > 0.4) {
      drowsinessSubscore += 30;
      factors.push(`Eye closure detected (${params.eyeClosedDurationSec.toFixed(1)}s)`);
    }

    // 2. PERCLOS-style measure
    if (params.perclos >= params.perclosThreshold) {
      drowsinessSubscore += 35;
      factors.push(`Elevated PERCLOS-style measure (${params.perclos.toFixed(0)}%)`);
    } else if (params.perclos > 15) {
      drowsinessSubscore += (params.perclos / params.perclosThreshold) * 20;
    }

    // 3. Yawning / MAR
    if (params.yawnState) {
      drowsinessSubscore += 30;
      factors.push(`Sustained yawning (${(params.yawnDurationSec || 0).toFixed(1)}s)`);
    } else if (params.mar >= params.marThreshold) {
      drowsinessSubscore += 15;
      factors.push(`Mouth open (MAR ${params.mar.toFixed(2)})`);
    }

    // 4. Head Pose Droop (Nodding off)
    if (params.pitch < -14) {
      drowsinessSubscore += 30;
      distractionSubscore += 20;
      factors.push(`Prolonged off-road attention/head orientation (Pitch ${params.pitch}°)`);
    }

    // 5. Phone Distraction
    if (params.phoneConfirmed) {
      distractionSubscore += 85;
      factors.push(`Phone detected (${(params.phoneConfidence * 100).toFixed(0)}% confidence)`);
    } else if (params.phoneDetected) {
      distractionSubscore += 40;
      factors.push('Possible mobile device visible');
    }

    // 6. Gaze & Road Attention
    if (params.roadAttention === 'LOOKING_AWAY') {
      distractionSubscore += 35;
      factors.push(`Prolonged off-road attention/head orientation (Yaw ${params.yaw}°)`);
    } else if (params.roadAttention === 'DISTRACTED') {
      distractionSubscore += 45;
      factors.push('Driver attention diverted');
    }

    // Scale by user sensitivity
    drowsinessSubscore = Math.min(100, Math.round(drowsinessSubscore * this.sensitivityMultiplier));
    distractionSubscore = Math.min(100, Math.round(distractionSubscore * this.sensitivityMultiplier));

    // Multimodal combination with temporal smoothing
    const instantRisk = Math.max(
      drowsinessSubscore * 0.7 + distractionSubscore * 0.5,
      distractionSubscore,
      drowsinessSubscore
    );

    this.temporalBuffer.push(instantRisk);
    if (this.temporalBuffer.length > this.maxBufferSize) {
      this.temporalBuffer.shift();
    }

    // 30-step temporal sliding average
    const smoothedRisk = Math.round(
      this.temporalBuffer.reduce((a, b) => a + b, 0) / this.temporalBuffer.length
    );
    const finalScore = Math.max(0, Math.min(100, smoothedRisk));

    // Determine Risk Level
    let riskLevel: RiskLevel = 'LOW';
    let statusDescription = 'Normal alertness. Driving parameters optimal.';

    if (finalScore >= 80) {
      riskLevel = 'CRITICAL';
      statusDescription = 'CRITICAL RISK: Severe driver impairment. Pull over immediately!';
    } else if (finalScore >= 60) {
      riskLevel = 'HIGH';
      statusDescription = 'HIGH RISK: Impaired driving behavior detected. Take urgent action.';
    } else if (finalScore >= 35) {
      riskLevel = 'MODERATE';
      statusDescription = 'MODERATE RISK: Early signs of fatigue or distraction observed.';
    }

    // Recommended Alert action
    let recommendedAlert: 'NONE' | 'DROWSINESS' | 'PHONE' | 'CRITICAL' = 'NONE';
    if (params.phoneConfirmed) {
      recommendedAlert = 'PHONE';
    } else if (finalScore >= 80) {
      recommendedAlert = 'CRITICAL';
    } else if (drowsinessSubscore >= 60 || finalScore >= 60) {
      recommendedAlert = 'DROWSINESS';
    }

    const isMLActive = Boolean(params.mlPrediction?.isMLModelActive);

    return {
      riskScore: finalScore,
      riskLevel,
      drowsinessScore: drowsinessSubscore,
      distractionScore: distractionSubscore,
      contributingFactors: factors.length > 0 ? factors : ['Driver road attention verified'],
      recommendedAlert,
      statusDescription,
      isMLModelActive: isMLActive,
      mlStatusText: isMLActive ? 'ML MODEL ACTIVE' : 'HEURISTIC / FALLBACK MODE',
      mlPredictedClass: params.mlPrediction?.predictedClass,
      mlConfidence: params.mlPrediction?.confidence
    };
  }

  public reset() {
    this.temporalBuffer = [];
  }
}

export const riskEngine = new MultimodalRiskEngine();
