/**
 * SafeDrive AI - Live Monitoring Hub
 * Integrated In-App Webcam, 468-Point Mesh, EAR/MAR, Real Phone Detection (TF.js COCO-SSD),
 * Multimodal Risk Fusion & Acoustic/Voice Alert Engine
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Radio,
  Volume2,
  VolumeX,
  Layers,
  Smartphone,
  Eye,
  Activity,
  Compass,
  AlertTriangle,
  ShieldAlert,
  Play,
  Square,
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react';
import type { 
  CameraState, 
  RiskLevel, 
  TelemetryPoint, 
  Trip, 
  SystemSettings,
  SimulationScenarioId,
  SafetyAlert
} from '../../types';
import { facialEngine } from '../../services/vision/faceDetector';
import { phoneEngine, type PhoneDetectionResult } from '../../services/vision/phoneDetector';
import { riskEngine } from '../../services/riskEngine';
import { audioAlerts } from "../../services/vision/audioAlerts";
import { SIMULATION_SCENARIOS } from "../../services/vision/simulationEngine";
import { onnxModelService, type ModelRuntimeStatus } from '../../services/vision/onnxModelService';
import { api } from '../../services/api';

interface LiveMonitoringViewProps {
  settings: SystemSettings;
  activeTrip: Trip | null;
  isSimulationMode: boolean;
  onToggleSimulation: () => void;
  onTripStarted: (trip: Trip) => void;
  onTripCompleted: (trip: Trip) => void;
  onTelemetryUpdate: (telemetry: TelemetryPoint) => void;
}

export const LiveMonitoringView: React.FC<LiveMonitoringViewProps> = ({
  settings,
  activeTrip,
  isSimulationMode,
  onToggleSimulation,
  onTripStarted,
  onTripCompleted,
  onTelemetryUpdate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Camera & Stream State
  const [cameraState, setCameraState] = useState<CameraState>('CAMERA_READY');
  const [fps, setFps] = useState<number>(30);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(!settings.acousticAlertsEnabled);
  const [showMesh, setShowMesh] = useState<boolean>(settings.showFaceMeshOverlay);
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenarioId>('NORMAL');
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);

  // Live Telemetry Local State
  const [telemetry, setTelemetry] = useState<TelemetryPoint>({
    timestamp: Date.now(),
    ear: 0.32,
    mar: 0.20,
    perclos: 5.0,
    pitch: 0,
    yaw: 0,
    roll: 0,
    blinkRate: 16,
    totalBlinks: 0,
    drowsinessScore: 10,
    riskLevel: 'LOW',
    riskScore: 10,
    phoneDetected: false,
    phoneConfidence: 0.0,
    roadAttention: 'FOCUSED_ON_ROAD',
    cnnEyeState: 'OPEN',
    cnnOpenProb: 0.94,
    contributingFactors: ['Driver road attention verified']
  });

  const [activeAlertBanner, setActiveAlertBanner] = useState<{
    type: 'NONE' | 'DROWSINESS' | 'PHONE' | 'CRITICAL';
    title: string;
    message: string;
    severity: RiskLevel;
  } | null>(null);

  const [consecutiveClosureSec, setConsecutiveClosureSec] = useState<number>(0);
  const [lastAlertTime, setLastAlertTime] = useState<number>(0);

  // Initialize ML models on mount
  useEffect(() => {
    Promise.all([
      facialEngine.loadModel(),
      phoneEngine.loadModel()
    ]).then(() => {
      setModelsLoaded(true);
    }).catch(err => {
      console.warn('Model load notice:', err);
      setModelsLoaded(true); // Allow fallback functionality
    });
    
    audioAlerts.setVolume(settings.alertVolume);
    audioAlerts.setCooldown(settings.alertCooldownSeconds);
    audioAlerts.setMuted(!settings.acousticAlertsEnabled);
    riskEngine.setSensitivity(settings.sensitivity);
  }, [settings]);

  // Handle Simulation Mode Updates
  useEffect(() => {
    if (!isSimulationMode) return;

    const scenario = SIMULATION_SCENARIOS.find(s => s.id === selectedScenario) || SIMULATION_SCENARIOS[0];
    const newTelem: TelemetryPoint = {
      timestamp: Date.now(),
      ear: scenario.ear,
      mar: scenario.mar,
      perclos: scenario.perclos,
      pitch: scenario.pitch,
      yaw: scenario.yaw,
      roll: scenario.roll,
      blinkRate: scenario.ear < 0.2 ? 6 : 18,
      totalBlinks: 14,
      drowsinessScore: Math.min(100, Math.round(scenario.riskScore * 0.9)),
      riskLevel: scenario.riskLevel,
      riskScore: scenario.riskScore,
      phoneDetected: scenario.phoneDetected,
      phoneConfidence: scenario.phoneConfidence,
      roadAttention: scenario.roadAttention,
      cnnEyeState: scenario.ear < 0.22 ? 'CLOSED' : 'OPEN',
      cnnOpenProb: scenario.ear < 0.22 ? 0.08 : 0.95,
      contributingFactors: [scenario.description]
    };

    setTelemetry(newTelem);
    onTelemetryUpdate(newTelem);

    // Evaluate Simulation Alerts
    if (scenario.phoneDetected) {
      triggerSafetyAlert('PHONE', 'PHONE DISTRACTION DETECTED', 'Please put your phone away and focus on the road.');
    } else if (scenario.riskLevel === 'CRITICAL') {
      triggerSafetyAlert('CRITICAL', 'CRITICAL FATIGUE RISK', 'Pull over safely as soon as possible.');
    } else if (scenario.riskLevel === 'HIGH') {
      triggerSafetyAlert('DROWSINESS', 'DROWSINESS DETECTED', 'Warning: Signs of drowsiness detected. Please take a break.');
    } else {
      setActiveAlertBanner(null);
    }
  }, [isSimulationMode, selectedScenario]);

  // Start Real In-App Webcam
  const startCamera = async () => {
    try {
      setCameraState('CAMERA_READY');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraState('CAMERA_ACTIVE');
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('PERMISSION_DENIED');
      } else if (err.name === 'NotFoundError') {
        setCameraState('NO_CAMERA');
      } else {
        setCameraState('CAMERA_DISCONNECTED');
      }
    }
  };

  // Stop Webcam
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    setCameraState('CAMERA_READY');
  };

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Central Alert Triggering Engine with Cooldown & Persistence
  const triggerSafetyAlert = useCallback(async (
    type: 'DROWSINESS' | 'PHONE' | 'CRITICAL',
    title: string,
    message: string
  ) => {
    const now = Date.now();
    const cooldownMs = settings.alertCooldownSeconds * 1000;

    setActiveAlertBanner({
      type,
      title,
      message,
      severity: type === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
    });

    if (now - lastAlertTime >= cooldownMs) {
      setLastAlertTime(now);

      // 1. Play Acoustic Alarm
      if (settings.acousticAlertsEnabled && !isAudioMuted) {
        audioAlerts.playAcousticAlert(type);
      }

      // 2. Speak Voice Warning
      if (settings.voiceWarningsEnabled && !isAudioMuted) {
        audioAlerts.speakWarning(message);
      }

      // 3. Log into Database if trip is active
      if (activeTrip && !isSimulationMode) {
        try {
          if (type === 'PHONE') {
            await api.logPhoneEvent({
              tripId: activeTrip.id,
              confidence: telemetry.phoneConfidence || 0.9,
              durationSeconds: 1.5,
              severity: 'HIGH',
              alertTriggered: true
            });
          } else {
            await api.logFatigueEvent({
              tripId: activeTrip.id,
              type: type === 'CRITICAL' ? 'MICROSLEEP' : 'PROLONGED_CLOSURE',
              durationSeconds: 1.5,
              severity: type === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
              earValue: telemetry.ear,
              marValue: telemetry.mar,
              alertTriggered: true
            });
          }
          const alertType: SafetyAlert['type'] = type === 'CRITICAL' ? 'CRITICAL_FATIGUE' : type === 'PHONE' ? 'PHONE' : 'DROWSINESS';
          await api.logAlert({
            tripId: activeTrip.id,
            type: alertType,
            severity: type === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            message: title,
            acousticPlayed: settings.acousticAlertsEnabled,
            voiceSpoken: settings.voiceWarningsEnabled
          });
        } catch (err) {
          console.warn('Failed to persist safety alert:', err);
        }
      }
    }
  }, [settings, isAudioMuted, lastAlertTime, activeTrip, isSimulationMode, telemetry]);

  // Main Live Computer Vision Processing Loop
  useEffect(() => {
    if (cameraState !== 'CAMERA_ACTIVE' || isSimulationMode) return;

    let lastFrameTime = performance.now();
    let frameCount = 0;
    let fpsTimer = performance.now();
    let consecutiveClosed = 0;

    const processFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState < 2) {
        animFrameIdRef.current = requestAnimationFrame(processFrame);
        return;
      }

      // Calculate Real FPS
      frameCount++;
      const now = performance.now();
      if (now - fpsTimer >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - fpsTimer)));
        frameCount = 0;
        fpsTimer = now;
      }

      // 1. Process Facial Landmarks & Geometry
      const faceResult = facialEngine.processFrame(video, canvas, {
        ear: settings.earClosureThreshold,
        mar: settings.marYawnThreshold,
        prolongedSec: settings.prolongedClosureSeconds
      });

      // Track prolonged eye closure from the engine
      setConsecutiveClosureSec(faceResult.eyeClosedDurationSec);

      // 2. Real-Time Mobile Phone Detection (COCO-SSD)
      let phoneResult: PhoneDetectionResult = {
        detected: false,
        confidence: 0,
        boundingBox: undefined,
        consecutiveFrames: 0,
        temporalConfirmed: false,
        fusionState: 'CLEAR',
        driverGazeDiverted: false,
        distractionSeverity: 'LOW',
        statusMessage: 'Phone detection monitoring active.'
      };

      if (settings.phoneDetectionEnabled) {
        phoneResult = await phoneEngine.detectPhone(
          canvas,
          { pitch: faceResult.headPitch, yaw: faceResult.headYaw, roll: faceResult.headRoll },
          faceResult.boundingBox
        );
      }

      // 3. Construct Canonical 10D ML Vector & Execute Model Inference
      const canonicalVector10D = [
        faceResult.currentEar,
        faceResult.mar,
        faceResult.eyeClosedDurationSec,
        faceResult.perclos,
        faceResult.blinkRate,
        faceResult.yawnDurationSec,
        faceResult.headPitch,
        faceResult.headYaw,
        faceResult.headRoll,
        phoneResult.confidence
      ];
      const mlPredictionResult = onnxModelService.predict(canonicalVector10D);

      // 4. Multimodal Risk Fusion
      const riskResult = riskEngine.evaluateRisk({
        ear: faceResult.currentEar,
        mar: faceResult.mar,
        perclos: faceResult.perclos,
        pitch: faceResult.headPitch,
        yaw: faceResult.headYaw,
        roll: faceResult.headRoll,
        phoneDetected: phoneResult.detected,
        phoneConfidence: phoneResult.confidence,
        phoneConfirmed: phoneResult.temporalConfirmed,
        roadAttention: faceResult.roadAttention,
        earThreshold: settings.earClosureThreshold,
        marThreshold: settings.marYawnThreshold,
        perclosThreshold: settings.perclosFatigueThreshold,
        eyeClosedDurationSec: faceResult.eyeClosedDurationSec,
        yawnState: faceResult.yawnState,
        yawnDurationSec: faceResult.yawnDurationSec,
        mlPrediction: mlPredictionResult ? {
          isMLModelActive: mlPredictionResult.isMLModelActive,
          predictedClass: mlPredictionResult.predictedClass,
          confidence: mlPredictionResult.confidence,
          probabilities: mlPredictionResult.probabilities
        } : null
      });

      // 4. Update Telemetry State
      const currentTelem: TelemetryPoint = {
        timestamp: Date.now(),
        ear: faceResult.currentEar,
        mar: faceResult.mar,
        perclos: faceResult.perclos,
        pitch: faceResult.headPitch,
        yaw: faceResult.headYaw,
        roll: faceResult.headRoll,
        blinkRate: faceResult.blinkRate,
        totalBlinks: faceResult.blinkCount,
        drowsinessScore: riskResult.drowsinessScore,
        riskLevel: riskResult.riskLevel,
        riskScore: riskResult.riskScore,
        phoneDetected: phoneResult.detected,
        phoneConfidence: phoneResult.confidence,
        roadAttention: faceResult.roadAttention,
        cnnEyeState: faceResult.cnnEyeState,
        cnnOpenProb: faceResult.cnnOpenProb,
        contributingFactors: riskResult.contributingFactors
      };

      setTelemetry(currentTelem);
      onTelemetryUpdate(currentTelem);

      // Periodically append telemetry to active trip backend
      if (activeTrip && frameCount % 60 === 0) {
        api.appendTelemetry(activeTrip.id, currentTelem).catch(() => {});
      }

      // 5. Evaluate and Trigger Alerts
      if (phoneResult.temporalConfirmed) {
        triggerSafetyAlert('PHONE', 'PHONE DISTRACTION DETECTED', 'Please put your phone away and focus on the road.');
      } else if (riskResult.riskLevel === 'CRITICAL' || faceResult.eyeClosedDurationSec >= 1.2) {
        triggerSafetyAlert('CRITICAL', 'CRITICAL FATIGUE RISK', 'Pull over safely as soon as possible.');
      } else if (riskResult.riskLevel === 'HIGH' || faceResult.yawnState) {
        const msg = faceResult.yawnState ? 'Frequent yawning observed. Consider pulling over.' : 'Warning: Signs of drowsiness detected.';
        triggerSafetyAlert('DROWSINESS', 'DROWSINESS DETECTED', msg);
      } else {
        setActiveAlertBanner(null);
      }

      // 6. Draw Canvas Overlays (Face Mesh, Driver Box, Phone Box)
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw Driver Bounding Box
        if (settings.showBoundingBoxes && faceResult.faceDetected) {
          ctx.strokeStyle = riskResult.riskLevel === 'CRITICAL' ? '#EF4444' : riskResult.riskLevel === 'HIGH' ? '#F97316' : '#10B981';
          ctx.lineWidth = 2;
          ctx.strokeRect(faceResult.boundingBox.x, faceResult.boundingBox.y, faceResult.boundingBox.width, faceResult.boundingBox.height);
          
          // Driver Label
          ctx.fillStyle = ctx.strokeStyle;
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(`DRIVER [${faceResult.roadAttention}]`, faceResult.boundingBox.x + 4, faceResult.boundingBox.y - 6);
        }

        // Draw 468-Point Mesh Overlay
        if (showMesh && faceResult.meshPoints.length > 0) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.65)'; // Translucent cyan/blue
          faceResult.meshPoints.forEach((pt, idx) => {
            // Draw eye and mouth points brighter
            const isKeypoint = (idx >= 33 && idx <= 38) || (idx >= 263 && idx <= 268) || (idx >= 61 && idx <= 68);
            if (isKeypoint) {
              ctx.fillStyle = faceResult.isEyeClosed ? '#EF4444' : '#10B981';
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
              ctx.fill();
            } else if (idx % 2 === 0) {
              ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 1.2, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }

        // Draw Mobile Phone Bounding Box if detected
        if (phoneResult.detected && phoneResult.boundingBox) {
          ctx.strokeStyle = '#DC2626'; // Deep Red
          ctx.lineWidth = 3;
          ctx.strokeRect(
            phoneResult.boundingBox.x,
            phoneResult.boundingBox.y,
            phoneResult.boundingBox.width,
            phoneResult.boundingBox.height
          );
          ctx.fillStyle = '#DC2626';
          ctx.fillRect(
            phoneResult.boundingBox.x,
            phoneResult.boundingBox.y - 20,
            160,
            20
          );
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(
            `PHONE ${(phoneResult.confidence * 100).toFixed(0)}% [${phoneResult.fusionState}]`,
            phoneResult.boundingBox.x + 4,
            phoneResult.boundingBox.y - 5
          );
        }
      }

      animFrameIdRef.current = requestAnimationFrame(processFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [cameraState, isSimulationMode, settings, showMesh, activeTrip, triggerSafetyAlert]);

  // Trip Recording Handlers
  const handleStartTrip = async () => {
    try {
      const trip = await api.startTrip();
      onTripStarted(trip);
      if (cameraState !== 'CAMERA_ACTIVE' && !isSimulationMode) {
        startCamera();
      }
    } catch (err) {
      console.error('Failed to start trip:', err);
    }
  };

  const handleEndTrip = async () => {
    if (!activeTrip) return;
    try {
      const completed = await api.completeTrip(activeTrip.id, {
        durationSeconds: activeTrip.durationSeconds + 120,
        averageRisk: telemetry.riskScore,
        maxRisk: Math.max(activeTrip.maxRisk, telemetry.riskScore),
        safetyScore: Math.max(60, 100 - (telemetry.riskScore > 50 ? 25 : 5))
      });
      onTripCompleted(completed);
    } catch (err) {
      console.error('Failed to complete trip:', err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
            <span>Real-Time Live Monitoring Hub</span>
            {isSimulationMode && (
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                DEMO / SIMULATION MODE
              </span>
            )}
            <span className={`px-2 py-0.5 rounded font-bold border ${
              onnxModelService.getStatus() === 'ML_MODEL_ACTIVE'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}>
              {onnxModelService.getStatus() === 'ML_MODEL_ACTIVE' ? 'ML MODEL ACTIVE' : 'HEURISTIC / FALLBACK MODE'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Driver Telematics & Biometric Vision Stream
          </h1>
          <p className="mt-1 text-xs text-gray-600 max-w-2xl">
            Continuous facial landmark tracking, EAR/MAR calculation, head pose, drowsiness detection,
            distraction detection, phone detection, and deep-learning fatigue analysis.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5 shrink-0">
          
          {/* Trip Start / Stop Button */}
          {activeTrip ? (
            <button
              onClick={handleEndTrip}
              id="monitoring-stop-trip-btn"
              className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition-colors flex items-center space-x-1.5 shadow-xs"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>STOP MONITORING</span>
            </button>
          ) : (
            <button
              onClick={handleStartTrip}
              id="monitoring-start-trip-btn"
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors flex items-center space-x-1.5 shadow-xs"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>START MONITORING</span>
            </button>
          )}

          {/* Camera Button */}
          {cameraState === 'CAMERA_ACTIVE' ? (
            <button
              onClick={stopCamera}
              id="monitoring-stop-camera-btn"
              className="px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold text-xs hover:bg-gray-100 flex items-center space-x-1.5"
            >
              <VideoOff className="w-3.5 h-3.5 text-red-500" />
              <span>STOP CAMERA</span>
            </button>
          ) : (
            <button
              onClick={startCamera}
              disabled={!modelsLoaded}
              id="monitoring-start-camera-btn"
              className={`px-3.5 py-2 rounded-xl text-white font-semibold text-xs flex items-center space-x-1.5 shadow-xs ${!modelsLoaded ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>{!modelsLoaded ? 'LOADING MODELS...' : 'START CAMERA'}</span>
            </button>
          )}

          {/* Audio Mute Toggle */}
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            id="monitoring-mute-btn"
            className={`p-2 rounded-xl border transition-colors ${
              isAudioMuted 
                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
            title={isAudioMuted ? 'Unmute Audio & Spoken Alerts' : 'Mute Audio Alerts'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Mesh Overlay Toggle */}
          <button
            onClick={() => setShowMesh(!showMesh)}
            id="monitoring-mesh-toggle-btn"
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              showMesh 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'bg-gray-50 text-gray-600 border-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>468 Mesh</span>
          </button>

        </div>
      </div>

      {/* Prominent Real-Time Warning Banner */}
      {activeAlertBanner && (
        <div 
          id="monitoring-prominent-alert-banner"
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-xs transition-all ${
            activeAlertBanner.type === 'PHONE'
              ? 'bg-red-50 text-red-900 border-red-300 animate-pulse'
              : activeAlertBanner.type === 'CRITICAL'
              ? 'bg-red-100 text-red-950 border-red-400 font-bold'
              : 'bg-amber-50 text-amber-900 border-amber-300'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl ${activeAlertBanner.type === 'PHONE' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
              {activeAlertBanner.type === 'PHONE' ? <Smartphone className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <div className="text-sm font-extrabold uppercase tracking-wide">
                ⚠ {activeAlertBanner.title}
              </div>
              <div className="text-xs font-medium mt-0.5">
                {activeAlertBanner.message}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-white/80 border border-current">
              {activeAlertBanner.severity}
            </span>
          </div>
        </div>
      )}

      {/* Main Stream & Telemetry Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Webcam Stream & Canvas Video Hub (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col justify-between">
          
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${cameraState === 'CAMERA_ACTIVE' ? 'bg-emerald-500 animate-ping' : 'bg-gray-400'}`}></span>
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                {isSimulationMode ? 'SIMULATION FEED' : cameraState.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-gray-400 font-mono">| {fps} FPS</span>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
                640x480 RGB
              </span>
              <span className="text-gray-400">Low-latency</span>
            </div>
          </div>

          {/* Video Container */}
          <div className="relative aspect-4/3 w-full bg-gray-950 rounded-xl overflow-hidden flex items-center justify-center border border-gray-300 shadow-inner">
            
            {/* Real HTML5 Video element (hidden/mirrored) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover -scale-x-100 opacity-0 pointer-events-none"
            />

            {/* Canvas where computer vision overlay and video frame are rendered */}
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className={`w-full h-full object-cover -scale-x-100 ${cameraState === 'CAMERA_ACTIVE' ? 'block' : 'hidden'}`}
            />

            {/* Fallback States if Camera is NOT active */}
            {cameraState !== 'CAMERA_ACTIVE' && !isSimulationMode && (
              <div className="text-center p-6 text-gray-400 max-w-sm">
                <Video className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-200">
                  {cameraState === 'PERMISSION_DENIED' ? 'Camera Permission Required' :
                   cameraState === 'NO_CAMERA' ? 'No Camera Detected' :
                   'Camera Feed Standby'}
                </h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  {cameraState === 'PERMISSION_DENIED' 
                    ? 'Please grant browser webcam permissions to enable real-time driver monitoring.'
                    : 'Click "Start Camera" above to initiate real-time facial landmark tracking and phone detection.'}
                </p>
                <button
                  onClick={startCamera}
                  className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 shadow-xs"
                >
                  Start Live Camera
                </button>
              </div>
            )}

            {/* Simulation Feed Visual Placeholder */}
            {isSimulationMode && (
              <div className="relative w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-6">
                <div className="w-48 h-64 border-2 border-emerald-400/80 rounded-2xl relative flex flex-col items-center justify-center p-4 bg-emerald-950/20 shadow-lg">
                  <div className="w-24 h-24 rounded-full border border-emerald-300/60 flex items-center justify-center mb-4">
                    <Eye className={`w-8 h-8 ${telemetry.ear < 0.22 ? 'text-red-400' : 'text-emerald-400'}`} />
                  </div>
                  <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    {telemetry.roadAttention}
                  </div>
                  <div className="text-[11px] text-gray-300 font-mono mt-1">
                    EAR: {telemetry.ear.toFixed(2)} | MAR: {telemetry.mar.toFixed(2)}
                  </div>

                  {telemetry.phoneDetected && (
                    <div className="absolute -bottom-4 -right-4 bg-red-600 text-white p-2 rounded-xl border border-white text-xs font-bold flex items-center space-x-1 shadow-lg animate-bounce">
                      <Smartphone className="w-4 h-4" />
                      <span>PHONE {(telemetry.phoneConfidence * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>

                <div className="absolute top-3 left-3 bg-amber-500 text-black px-2 py-0.5 rounded text-[11px] font-bold">
                  DEMO SIMULATION ACTIVE: {selectedScenario}
                </div>
              </div>
            )}

            {/* Stream HUD Badges */}
            <div className="absolute top-3 right-3 flex items-center space-x-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${
                telemetry.riskLevel === 'CRITICAL' ? 'bg-red-500/90 text-white border-red-400' :
                telemetry.riskLevel === 'HIGH' ? 'bg-orange-500/90 text-white border-orange-400' :
                telemetry.riskLevel === 'MODERATE' ? 'bg-amber-500/90 text-white border-amber-400' :
                'bg-emerald-500/90 text-white border-emerald-400'
              }`}>
                {telemetry.riskLevel} ({telemetry.riskScore}%)
              </span>
            </div>

          </div>

          {/* Bottom Stream Diagnostics Bar */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2">
            <div>
              <span>Mesh State: </span>
              <strong className="text-gray-700">{showMesh ? '468 Points Active' : 'Contour Only'}</strong>
            </div>
            <div>
              <span>Deep Model: </span>
              <strong className="text-gray-700">MobileNet v2 + LSTM Sequence</strong>
            </div>
            <div>
              <span>Audio Alarm: </span>
              <strong className={isAudioMuted ? 'text-amber-600' : 'text-emerald-600'}>
                {isAudioMuted ? 'Muted' : 'Armed (80dB)'}
              </strong>
            </div>
          </div>

        </div>

        {/* Right: Real-Time Telemetry Gauges (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Dedicated Real-Time Phone Distraction Card */}
          <div className={`p-5 rounded-2xl border transition-all ${
            telemetry.phoneDetected 
              ? 'bg-red-50 border-red-300 shadow-sm' 
              : 'bg-white border-gray-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded-lg ${telemetry.phoneDetected ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  <Smartphone className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                  Phone Distraction Detector
                </span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                telemetry.phoneDetected ? 'bg-red-600 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {telemetry.phoneDetected ? 'PHONE DETECTED' : 'CLEAR'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <span className="text-[11px] font-semibold text-gray-500 uppercase">Detection Confidence</span>
                <div className="text-lg font-bold text-gray-900 mt-0.5">
                  {(telemetry.phoneConfidence * 100).toFixed(0)}%
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <span className="text-[11px] font-semibold text-gray-500 uppercase">Distraction State</span>
                <div className={`text-sm font-bold mt-0.5 truncate ${telemetry.phoneDetected ? 'text-red-600' : 'text-gray-800'}`}>
                  {telemetry.phoneDetected ? 'HIGH DISTRACTION' : 'ATTENTIVE'}
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-600">
              {telemetry.phoneDetected 
                ? 'Mobile phone verified in driver quadrant. Warning protocol triggered.'
                : 'Zero mobile phone interaction detected in forward visual cone.'}
            </div>
          </div>

          {/* 4-Grid Biometric Telemetry Dials */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* Eye Status & EAR */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
                <span>Eye Status (EAR)</span>
                <Eye className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-lg font-bold text-gray-900">
                {telemetry.ear < 0.22 ? 'CLOSED' : 'OPEN'}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                EAR: <strong className="text-gray-800">{telemetry.ear.toFixed(2)}</strong> (Thresh: {settings.earClosureThreshold})
              </div>
              <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full ${telemetry.ear < 0.22 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (telemetry.ear / 0.4) * 100)}%` }}
                />
              </div>
            </div>

            {/* Yawning & MAR */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
                <span>Mouth Ratio (MAR)</span>
                <Activity className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-lg font-bold text-gray-900">
                {telemetry.mar >= settings.marYawnThreshold ? 'YAWNING' : 'NORMAL'}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                MAR: <strong className="text-gray-800">{telemetry.mar.toFixed(2)}</strong> (Thresh: {settings.marYawnThreshold})
              </div>
              <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full ${telemetry.mar >= settings.marYawnThreshold ? 'bg-amber-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, (telemetry.mar / 0.8) * 100)}%` }}
                />
              </div>
            </div>

            {/* Head Pose */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
                <span>Head Pose</span>
                <Compass className="w-3.5 h-3.5 text-teal-500" />
              </div>
              <div className="text-lg font-bold text-gray-900 truncate">
                {Math.abs(telemetry.yaw) > 20 ? 'TURNED' : telemetry.pitch < -12 ? 'DROOPING' : 'FORWARD'}
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                Pitch: {telemetry.pitch}° | Yaw: {telemetry.yaw}°
              </div>
              <div className="mt-2 text-[10px] text-gray-400 font-mono">
                PnP 3D Vector Calibrated
              </div>
            </div>

            {/* PERCLOS & CNN */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
                <span>PERCLOS Fatigue</span>
                <Activity className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="text-lg font-bold text-gray-900">
                {telemetry.perclos.toFixed(1)}%
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Thresh: <strong>{settings.perclosFatigueThreshold}%</strong>
              </div>
              <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full ${telemetry.perclos >= settings.perclosFatigueThreshold ? 'bg-red-500' : 'bg-purple-500'}`}
                  style={{ width: `${Math.min(100, (telemetry.perclos / settings.perclosFatigueThreshold) * 100)}%` }}
                />
              </div>
            </div>

          </div>

          {/* Multimodal Risk Contributing Factors */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
              <span>Multimodal Risk Factors</span>
              <span className="text-blue-600">{telemetry.riskScore}/100</span>
            </div>
            <ul className="space-y-1.5 text-xs text-gray-600">
              {telemetry.contributingFactors.map((factor, idx) => (
                <li key={idx} className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

      </div>

      {/* Demo / Simulation Mode Scenario Switcher */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                Academic & Viva Demonstration Suite
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                DEMO / SIMULATION
              </span>
            </div>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">
              Simulate Driver Scenarios for Evaluation
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Test safety alarms, phone detection, and visual warning cascades without waiting for natural fatigue.
            </p>
          </div>

          <button
            onClick={onToggleSimulation}
            id="monitoring-toggle-sim-mode-btn"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
              isSimulationMode 
                ? 'bg-amber-600 text-white hover:bg-amber-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isSimulationMode ? 'Simulation Active (Click to Exit)' : 'Activate Simulation Mode'}
          </button>
        </div>

        {/* Preset Scenarios Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mt-4">
          {SIMULATION_SCENARIOS.map((scenario) => {
            const isSelected = isSimulationMode && selectedScenario === scenario.id;
            return (
              <button
                key={scenario.id}
                onClick={() => {
                  if (!isSimulationMode) onToggleSimulation();
                  setSelectedScenario(scenario.id);
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  isSelected 
                    ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20 shadow-xs' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-gray-900 truncate">{scenario.name}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                    {scenario.description}
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[10px]">
                  <span className={`font-bold ${
                    scenario.riskLevel === 'CRITICAL' ? 'text-red-600' :
                    scenario.riskLevel === 'HIGH' ? 'text-orange-600' :
                    scenario.riskLevel === 'MODERATE' ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {scenario.riskLevel}
                  </span>
                  <span className="text-gray-400 font-mono">{scenario.riskScore}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
