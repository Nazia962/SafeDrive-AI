/**
 * SafeDrive AI - Core TypeScript Definitions
 * Professional B.Tech Capstone & Microsoft Project Standard
 */

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type RoadAttentionStatus = 'FOCUSED_ON_ROAD' | 'LOOKING_AWAY' | 'HEAD_DROOPING' | 'DISTRACTED';

export type CameraState = 
  | 'CAMERA_READY' 
  | 'CAMERA_ACTIVE' 
  | 'CAMERA_DISCONNECTED' 
  | 'NO_CAMERA' 
  | 'PERMISSION_DENIED' 
  | 'NO_FACE_DETECTED'
  | 'MULTIPLE_FACES';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'driver' | 'fleet_manager' | 'admin';
  createdAt: string;
}

export interface DriverProfile {
  id: string;
  userId: string;
  name: string;
  driverLicense: string;
  email: string;
  phone: string;
  emergencyContact: string;
  vehicleModel: string;
  licensePlate: string;
  registrationDate: string;
  safetyRating: number; // 0 - 100
  totalDrivingHours: number;
  totalTrips: number;
  fatigueIncidentsTotal: number;
  distractionIncidentsTotal: number;
  phoneIncidentsTotal: number;
  badges: Array<{
    id: string;
    title: string;
    description: string;
    earned: boolean;
    earnedAt?: string;
  }>;
}

export interface TelemetryPoint {
  timestamp: number;
  ear: number;
  mar: number;
  perclos: number;
  pitch: number; // Head droop / tilt
  yaw: number;   // Head turn
  roll: number;  // Head tilt lateral
  blinkRate: number; // blinks/min
  totalBlinks: number;
  drowsinessScore: number; // 0 - 100
  riskLevel: RiskLevel;
  riskScore: number; // 0 - 100
  phoneDetected: boolean;
  phoneConfidence: number; // 0 - 1
  roadAttention: RoadAttentionStatus;
  cnnEyeState: 'OPEN' | 'CLOSED';
  cnnOpenProb: number;
  contributingFactors: string[];
}

export interface FatigueEvent {
  id: string;
  tripId: string;
  timestamp: string;
  type: 'MICROSLEEP' | 'PROLONGED_CLOSURE' | 'YAWNING' | 'HIGH_PERCLOS' | 'HEAD_DROOP';
  durationSeconds: number;
  severity: RiskLevel;
  earValue?: number;
  marValue?: number;
  alertTriggered: boolean;
}

export interface PhoneEvent {
  id: string;
  tripId: string;
  timestamp: string;
  confidence: number;
  durationSeconds: number;
  severity: RiskLevel;
  driverGazeDiverted: boolean;
  alertTriggered: boolean;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DistractionEvent {
  id: string;
  tripId: string;
  timestamp: string;
  type: 'PHONE_USAGE' | 'GAZE_AWAY' | 'HEAD_TURN' | 'DROOPING';
  durationSeconds: number;
  severity: RiskLevel;
  alertTriggered: boolean;
}

export interface SafetyAlert {
  id: string;
  tripId: string;
  timestamp: string;
  type: 'DROWSINESS' | 'MICROSLEEP' | 'YAWN' | 'PHONE' | 'GAZE' | 'CRITICAL_FATIGUE';
  severity: RiskLevel;
  message: string;
  acousticPlayed: boolean;
  voiceSpoken: boolean;
}

export interface Trip {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  averageRisk: number;
  maxRisk: number;
  safetyScore: number; // 0 - 100
  drowsinessEventsCount: number;
  yawningEventsCount: number;
  phoneDistractionEventsCount: number;
  totalAlertsCount: number;
  telemetryHistory: TelemetryPoint[];
  events: Array<FatigueEvent | PhoneEvent | DistractionEvent>;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'DROWSINESS' | 'PHONE' | 'CRITICAL' | 'TRIP' | 'SYSTEM';
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  tripId?: string;
}

export interface SystemSettings {
  // Biometric
  earClosureThreshold: number; // default 0.22
  prolongedClosureSeconds: number; // default 1.2
  marYawnThreshold: number; // default 0.58
  yawnDurationSeconds: number; // default 1.8
  perclosFatigueThreshold: number; // default 30%
  // Phone
  phoneDetectionEnabled: boolean; // default true
  phoneConfidenceThreshold: number; // default 0.65
  phoneConfirmationFrames: number; // default 5 frames (~0.7s)
  phoneAlertCooldownSeconds: number; // default 4.0
  // Audio & Voice
  acousticAlertsEnabled: boolean;
  voiceWarningsEnabled: boolean;
  alertVolume: number; // 0 - 100 (default 80)
  alertCooldownSeconds: number; // default 4.0
  // Risk Engine
  sensitivity: 'LOW' | 'NORMAL' | 'HIGH';
  // Vision & Mesh
  showFaceMeshOverlay: boolean;
  showBoundingBoxes: boolean;
  targetFPS: number;
  // Privacy
  telemetryRetentionDays: number;
  anonymizeTelemetry: boolean;
  localProcessingOnly: boolean;
}

export interface MLModelEvaluation {
  modelName: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  aucRoc: number;
  confusionMatrix: {
    truePositive: number;
    falsePositive: number;
    trueNegative: number;
    falseNegative: number;
  };
  inferenceLatencyMs: number;
  selectedBest: boolean;
  latencyMs?: number;
  modelSizeMb?: number;
}

export type MLBenchmark = MLModelEvaluation;

export type SimulationScenarioId = 
  | 'NORMAL' 
  | 'ALERT' 
  | 'MILD_FATIGUE' 
  | 'SEVERE_FATIGUE' 
  | 'MICROSLEEP' 
  | 'YAWNING' 
  | 'PHONE_DISTRACTION' 
  | 'HEAD_DISTRACTION';

export interface SimulationScenario {
  id: SimulationScenarioId;
  name: string;
  description: string;
  ear: number;
  mar: number;
  perclos: number;
  yaw: number;
  pitch: number;
  roll: number;
  phoneDetected: boolean;
  phoneConfidence: number;
  roadAttention: RoadAttentionStatus;
  riskScore: number;
  riskLevel: RiskLevel;
}
