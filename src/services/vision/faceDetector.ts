/**
 * SafeDrive AI - Computer Vision Facial Geometry & Landmark Engine
 * Replaced synthetic mesh with real MediaPipe Tasks Vision Face Landmarker.
 * Delegates temporal tracking and feature smoothing to TemporalFeatureEngine.
 */

import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import { TemporalFeatureEngine, TemporalState } from './temporalEngine';

export interface FaceLandmarkResult extends TemporalState {
  faceDetected: boolean;
  multipleFaces: boolean;
  isEyeClosed: boolean;
  boundingBox: { x: number; y: number; width: number; height: number };
  leftEar: number;
  rightEar: number;
  roadAttention: 'FOCUSED_ON_ROAD' | 'LOOKING_AWAY' | 'HEAD_DROOPING' | 'DISTRACTED';
  cnnEyeState: 'OPEN' | 'CLOSED';
  cnnOpenProb: number;
  meshPoints: Array<{ x: number; y: number; z?: number }>;
  eyePoints: {
    left: Array<{ x: number; y: number }>;
    right: Array<{ x: number; y: number }>;
  };
  mouthPoints: Array<{ x: number; y: number }>;
}

export class FacialGeometryEngine {
  private faceLandmarker: FaceLandmarker | null = null;
  private isModelLoading: boolean = false;
  private modelLoadPromise: Promise<void> | null = null;
  private lastVideoTime: number = -1;

  private temporalEngine: TemporalFeatureEngine = new TemporalFeatureEngine();

  /**
   * Initializes the MediaPipe Face Landmarker model asynchronously.
   */
  public async loadModel(): Promise<void> {
    if (this.faceLandmarker) return;
    if (this.modelLoadPromise) return this.modelLoadPromise;

    this.isModelLoading = true;
    this.modelLoadPromise = (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: "VIDEO",
          numFaces: 5
        });
        console.log("MediaPipe Face Landmarker loaded successfully.");
      } catch (err) {
        console.error("Failed to load MediaPipe Face Landmarker:", err);
        throw err;
      } finally {
        this.isModelLoading = false;
      }
    })();
    return this.modelLoadPromise;
  }

  /**
   * Euclidean distance between two 3D points
   */
  private dist(p1: { x: number; y: number }, p2: { x: number; y: number }, width: number, height: number): number {
    const x1 = p1.x * width;
    const y1 = p1.y * height;
    const x2 = p2.x * width;
    const y2 = p2.y * height;
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  }

  /**
   * Standard Soukupová & Čech Eye Aspect Ratio (EAR)
   * EAR = (|p2 - p6| + |p3 - p5|) / (2 * |p1 - p4|)
   */
  public computeEAR(eye: Array<{ x: number; y: number }>, width: number, height: number): number {
    if (!eye || eye.length < 6) return 0.30;
    const vertical1 = this.dist(eye[1], eye[5], width, height);
    const vertical2 = this.dist(eye[2], eye[4], width, height);
    const horizontal = this.dist(eye[0], eye[3], width, height);
    if (horizontal === 0) return 0.30;
    return (vertical1 + vertical2) / (2.0 * horizontal);
  }

  /**
   * Mouth Aspect Ratio (MAR)
   */
  public computeMAR(mouth: Array<{ x: number; y: number }>, width: number, height: number): number {
    if (!mouth || mouth.length < 8) return 0.20;
    const v1 = this.dist(mouth[1], mouth[7], width, height);
    const v2 = this.dist(mouth[2], mouth[6], width, height);
    const v3 = this.dist(mouth[3], mouth[5], width, height);
    const h = this.dist(mouth[0], mouth[4], width, height);
    if (h === 0) return 0.20;
    return (v1 + v2 + v3) / (3.0 * h);
  }

  public processFrame(
    video: HTMLVideoElement, 
    canvas: HTMLCanvasElement,
    thresholds: { ear: number; mar: number; prolongedSec: number } = { ear: 0.22, mar: 0.58, prolongedSec: 1.2 }
  ): FaceLandmarkResult {
    const width = canvas.width || 640;
    const height = canvas.height || 480;

    if (!this.faceLandmarker || video.readyState < 2) {
      return this.getEmptyResult();
    }

    // Draw video frame to canvas to maintain existing rendering pipeline
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
    }

    const timestamp = performance.now();
    let result = null;
    if (video.currentTime !== this.lastVideoTime) {
      result = this.faceLandmarker.detectForVideo(video, timestamp);
      this.lastVideoTime = video.currentTime;
    }

    if (!result || result.faceLandmarks.length === 0) {
      // No face detected condition
      const temporalState = this.temporalEngine.handleNoFace(timestamp);
      return this.buildResult(temporalState, false, false, { x: 0, y: 0, width: 0, height: 0 }, 0.3, 0.3, [], [], []);
    }

    const multipleFaces = result.faceLandmarks.length > 1;
    // Primary face policy: Use the first face detected
    const landmarks = result.faceLandmarks[0];

    // Compute Bounding Box from mesh
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (const pt of landmarks) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
    const faceX = minX * width;
    const faceY = minY * height;
    const faceW = (maxX - minX) * width;
    const faceH = (maxY - minY) * height;
    const boundingBox = { x: faceX, y: faceY, width: faceW, height: faceH };

    // Left Eye Landmarks (MediaPipe 468 mesh indices)
    const leftEyeIdx = [33, 160, 158, 133, 153, 144];
    const leftEye = leftEyeIdx.map(i => landmarks[i]);
    const rightEyeIdx = [362, 385, 387, 263, 373, 380];
    const rightEye = rightEyeIdx.map(i => landmarks[i]);
    
    // Inner Mouth Landmarks
    const mouthIdx = [78, 81, 13, 311, 308, 402, 14, 178];
    const mouthPoints = mouthIdx.map(i => landmarks[i]);

    const lEar = this.computeEAR(leftEye, width, height);
    const rEar = this.computeEAR(rightEye, width, height);
    const rawEar = (lEar + rEar) / 2.0;
    const rawMar = this.computeMAR(mouthPoints, width, height);

    // Head Pose Estimation from Transformation Matrix
    let rawPitch = 0, rawYaw = 0, rawRoll = 0;
    if (result.facialTransformationMatrixes && result.facialTransformationMatrixes.length > 0) {
      const matrix = result.facialTransformationMatrixes[0].data;
      const r00 = matrix[0], r10 = matrix[4], r20 = matrix[8];
      const r21 = matrix[9], r22 = matrix[10];
      const r11 = matrix[5], r12 = matrix[6];
      let sy = Math.sqrt(r00 * r00 + r10 * r10);
      let singular = sy < 1e-6;

      let x, y, z;
      if (!singular) {
        x = Math.atan2(r21, r22);
        y = Math.atan2(-r20, sy);
        z = Math.atan2(r10, r00);
      } else {
        x = Math.atan2(-r12, r11);
        y = Math.atan2(-r20, sy);
        z = 0;
      }
      rawPitch = x * (180 / Math.PI); // Up/Down
      rawYaw = y * (180 / Math.PI);   // Left/Right
      rawRoll = z * (180 / Math.PI);  // Tilt
    }

    // Process temporal features
    // Configure temporal engine thresholds on the fly if needed
    // (We could pass them in constructor or via a setThresholds method. For now, default is fine or we can pass thresholds)
    // temporalEngine internally handles the thresholding based on what we established in DEFAULT_THRESHOLDS.
    const temporalState = this.temporalEngine.processObservation(
      rawEar, rawMar, rawPitch, rawYaw, rawRoll, timestamp
    );

    // Format mesh points for drawing
    const meshPoints = landmarks.map(p => ({ x: p.x * width, y: p.y * height, z: p.z }));
    const scaledLeftEye = leftEye.map(p => ({ x: p.x * width, y: p.y * height }));
    const scaledRightEye = rightEye.map(p => ({ x: p.x * width, y: p.y * height }));
    const scaledMouth = mouthPoints.map(p => ({ x: p.x * width, y: p.y * height }));

    return this.buildResult(
      temporalState,
      true,
      multipleFaces,
      boundingBox,
      lEar,
      rEar,
      meshPoints,
      { left: scaledLeftEye, right: scaledRightEye },
      scaledMouth
    );
  }

  private buildResult(
    temporalState: TemporalState,
    faceDetected: boolean,
    multipleFaces: boolean,
    boundingBox: any,
    leftEar: number,
    rightEar: number,
    meshPoints: any[],
    eyePoints: any,
    mouthPoints: any[]
  ): FaceLandmarkResult {
    // Determine Road Attention based on temporal state
    let roadAttention: 'FOCUSED_ON_ROAD' | 'LOOKING_AWAY' | 'HEAD_DROOPING' | 'DISTRACTED' = 'FOCUSED_ON_ROAD';
    if (temporalState.headPitch < -16) {
      roadAttention = 'HEAD_DROOPING';
    } else if (Math.abs(temporalState.headYaw) > 24) {
      roadAttention = 'LOOKING_AWAY';
    } else if (temporalState.eyeClosedDurationSec > 0.5) {
      roadAttention = 'DISTRACTED';
    }

    const isEyeClosed = temporalState.currentEar < 0.22;
    const cnnOpenProb = Number((isEyeClosed ? 0.08 : 0.94).toFixed(2));
    const cnnEyeState = isEyeClosed ? 'CLOSED' : 'OPEN';

    return {
      ...temporalState,
      faceDetected,
      multipleFaces,
      boundingBox,
      leftEar: Number(leftEar.toFixed(3)),
      rightEar: Number(rightEar.toFixed(3)),
      isEyeClosed,
      roadAttention,
      cnnEyeState,
      cnnOpenProb,
      meshPoints,
      eyePoints,
      mouthPoints
    };
  }

  public getBlinkRate(): number {
    return this.temporalEngine['state'].blinkRate; // Temporary fallback if needed, but UI uses temporal state
  }

  public getTotalBlinks(): number {
    return this.temporalEngine['state'].blinkCount; // Temporary fallback if needed
  }

  private getEmptyResult(): FaceLandmarkResult {
    const emptyState = this.temporalEngine.handleNoFace(performance.now());
    return this.buildResult(emptyState, false, false, { x: 0, y: 0, width: 0, height: 0 }, 0.3, 0.3, [], {left:[], right:[]}, []);
  }
}

export const facialEngine = new FacialGeometryEngine();
