/**
 * SafeDrive AI - API Routes
 */

import { Router, Response } from 'express';
import { db } from './db';
import { generateToken, requireAuth, AuthenticatedRequest } from './auth';
import { 
  BENCHMARK_MODELS, 
  ML_WORKFLOW_STEPS, 
  predictDriverState,
  MLFeatureInput 
} from './ml_engine';
import type { 
  User, 
  Trip, 
  FatigueEvent, 
  PhoneEvent, 
  DistractionEvent, 
  SafetyAlert 
} from '../src/types';

export const apiRouter = Router();

// --- Health Check ---
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'SafeDrive AI Telematics Core',
    version: '2.4.0-rc1',
    timestamp: new Date().toISOString()
  });
});

// --- Authentication Routes ---
apiRouter.post('/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'User already exists with this email' });
  }

  const user: User = {
    id: `user_${Date.now()}`,
    email,
    name,
    role: 'driver',
    createdAt: new Date().toISOString()
  };

  db.createUser(user, password);
  const token = generateToken(user);
  res.status(201).json({ user, token });
});

apiRouter.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.getUserByEmail(email);
  if (!user || !db.verifyPassword(user.id, password)) {
    return res.status(401).json({ error: 'Invalid email or password credentials' });
  }

  const token = generateToken(user);
  res.json({ user, token });
});

apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const profile = db.getProfileByUserId(user.id);
  res.json({ user, profile });
});

// --- Driver Profile ---
apiRouter.get('/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const profile = db.getProfileByUserId(req.user!.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
});

apiRouter.put('/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updated = db.updateProfile(req.user!.id, req.body);
  res.json(updated);
});

// --- Settings ---
apiRouter.get('/settings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const settings = db.getSettings(req.user!.id);
  res.json(settings);
});

apiRouter.put('/settings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updated = db.updateSettings(req.user!.id, req.body);
  res.json(updated);
});

// --- Trips ---
apiRouter.get('/trips', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const trips = db.getTrips(req.user!.id);
  res.json(trips);
});

apiRouter.get('/trips/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const trip = db.getTripById(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json(trip);
});

apiRouter.post('/trips', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const newTrip: Trip = {
    id: `trip_${Date.now()}`,
    userId,
    startTime: new Date().toISOString(),
    durationSeconds: 0,
    status: 'ACTIVE',
    averageRisk: 0,
    maxRisk: 0,
    safetyScore: 100,
    drowsinessEventsCount: 0,
    yawningEventsCount: 0,
    phoneDistractionEventsCount: 0,
    totalAlertsCount: 0,
    telemetryHistory: [],
    events: []
  };

  const created = db.createTrip(newTrip);
  res.status(201).json(created);
});

apiRouter.put('/trips/:id/complete', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const completed = db.completeTrip(req.params.id, req.body);
  if (!completed) return res.status(404).json({ error: 'Trip not found' });
  res.json(completed);
});

apiRouter.delete('/trips/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = db.deleteTrip(req.params.id);
  if (!success) return res.status(404).json({ error: 'Trip not found' });
  res.json({ success: true });
});

apiRouter.delete('/trips', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  db.clearAllTrips(req.user!.id);
  res.json({ success: true, message: 'All trip history cleared' });
});

// --- Events & Alerts ---
apiRouter.post('/events/fatigue', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const event: FatigueEvent = {
    id: `fatigue_${Date.now()}`,
    tripId: req.body.tripId,
    timestamp: new Date().toISOString(),
    type: req.body.type || 'PROLONGED_CLOSURE',
    durationSeconds: req.body.durationSeconds || 1.5,
    severity: req.body.severity || 'HIGH',
    earValue: req.body.earValue,
    marValue: req.body.marValue,
    alertTriggered: req.body.alertTriggered ?? true
  };
  db.addFatigueEvent(event);
  res.status(201).json(event);
});

apiRouter.post('/events/phone', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const event: PhoneEvent = {
    id: `phone_${Date.now()}`,
    tripId: req.body.tripId,
    timestamp: new Date().toISOString(),
    confidence: req.body.confidence || 0.85,
    durationSeconds: req.body.durationSeconds || 1.2,
    severity: req.body.severity || 'HIGH',
    driverGazeDiverted: req.body.driverGazeDiverted ?? true,
    alertTriggered: req.body.alertTriggered ?? true,
    boundingBox: req.body.boundingBox
  };
  db.addPhoneEvent(event);

  // Auto notification
  db.addNotification({
    id: `notif_phone_${Date.now()}`,
    userId: req.user!.id,
    type: 'PHONE',
    severity: 'HIGH',
    title: 'Mobile Phone Distraction Detected',
    message: `Driver observed interacting with mobile phone during trip (confidence ${(event.confidence * 100).toFixed(0)}%).`,
    timestamp: new Date().toISOString(),
    isRead: false,
    tripId: event.tripId
  });

  res.status(201).json(event);
});

apiRouter.post('/events/distraction', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const event: DistractionEvent = {
    id: `dist_${Date.now()}`,
    tripId: req.body.tripId,
    timestamp: new Date().toISOString(),
    type: req.body.type || 'GAZE_AWAY',
    durationSeconds: req.body.durationSeconds || 2.0,
    severity: req.body.severity || 'MODERATE',
    alertTriggered: req.body.alertTriggered ?? false
  };
  db.addDistractionEvent(event);
  res.status(201).json(event);
});

apiRouter.post('/alerts', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const alert: SafetyAlert = {
    id: `alert_${Date.now()}`,
    tripId: req.body.tripId,
    timestamp: new Date().toISOString(),
    type: req.body.type,
    severity: req.body.severity,
    message: req.body.message,
    acousticPlayed: req.body.acousticPlayed ?? true,
    voiceSpoken: req.body.voiceSpoken ?? true
  };
  db.addAlert(alert);
  res.status(201).json(alert);
});

// --- Telemetry Buffer Append ---
apiRouter.post('/trips/:id/telemetry', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const trip = db.getTripById(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  const point = req.body;
  trip.telemetryHistory.push(point);
  // Cap in-memory history to last 500 points to preserve memory
  if (trip.telemetryHistory.length > 500) {
    trip.telemetryHistory.shift();
  }
  db.save();
  res.status(201).json({ success: true, count: trip.telemetryHistory.length });
});

// --- Notifications ---
apiRouter.get('/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const notifs = db.getNotifications(req.user!.id);
  res.json(notifs);
});

apiRouter.patch('/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = db.markNotificationAsRead(req.params.id);
  res.json({ success });
});

apiRouter.post('/notifications/mark-all-read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  db.markAllNotificationsRead(req.user!.id);
  res.json({ success: true });
});

apiRouter.delete('/notifications/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = db.deleteNotification(req.params.id);
  res.json({ success });
});

// --- Real Database Analytics (No fake numbers!) ---
apiRouter.get('/analytics', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const trips = db.getTrips(req.user!.id);
  const profile = db.getProfileByUserId(req.user!.id);

  if (trips.length === 0) {
    return res.json({
      hasData: false,
      totalTrips: 0,
      totalHours: 0,
      avgSafetyScore: profile?.safetyRating || 100,
      totalDrowsinessEvents: 0,
      totalYawnEvents: 0,
      totalPhoneEvents: 0,
      totalAlerts: 0,
      recentTripsTrend: [],
      hourlyRiskDistribution: []
    });
  }

  const completedTrips = trips.filter(t => t.status === 'COMPLETED');
  const totalSeconds = trips.reduce((sum, t) => sum + (t.durationSeconds || 0), 0);
  const totalDrowsiness = trips.reduce((sum, t) => sum + (t.drowsinessEventsCount || 0), 0);
  const totalYawns = trips.reduce((sum, t) => sum + (t.yawningEventsCount || 0), 0);
  const totalPhones = trips.reduce((sum, t) => sum + (t.phoneDistractionEventsCount || 0), 0);
  const totalAlerts = trips.reduce((sum, t) => sum + (t.totalAlertsCount || 0), 0);

  const avgScore = completedTrips.length > 0 
    ? Math.round(completedTrips.reduce((sum, t) => sum + (t.safetyScore || 100), 0) / completedTrips.length)
    : 100;

  const recentTripsTrend = trips.slice(0, 10).reverse().map((t, idx) => ({
    tripIndex: idx + 1,
    id: t.id,
    date: t.startTime.split('T')[0],
    safetyScore: t.safetyScore,
    averageRisk: t.averageRisk,
    maxRisk: t.maxRisk,
    phoneEvents: t.phoneDistractionEventsCount,
    fatigueEvents: t.drowsinessEventsCount
  }));

  res.json({
    hasData: true,
    totalTrips: trips.length,
    completedTrips: completedTrips.length,
    totalHours: Number((totalSeconds / 3600).toFixed(2)),
    avgSafetyScore: avgScore,
    totalDrowsinessEvents: totalDrowsiness,
    totalYawnEvents: totalYawns,
    totalPhoneEvents: totalPhones,
    totalAlerts,
    recentTripsTrend
  });
});

// --- Machine Learning Workflow & Inference ---
apiRouter.get('/ml/workflow', (req, res) => {
  res.json({
    framework: 'SafeDrive AI 16-Step Rigorous ML Lifecycle',
    steps: ML_WORKFLOW_STEPS
  });
});

apiRouter.get('/ml/benchmarks', (req, res) => {
  res.json({
    dataset: 'NTHU Driver Drowsiness + YawDD Biometric Ensemble (12,500 samples)',
    targetMetric: 'Recall & F1 Score (Safety-Critical)',
    models: BENCHMARK_MODELS
  });
});

apiRouter.post('/ml/predict', (req, res) => {
  const input: MLFeatureInput = req.body;
  if (input.ear === undefined || input.mar === undefined || input.perclos === undefined) {
    return res.status(400).json({ error: 'Features ear, mar, and perclos are mandatory' });
  }

  const prediction = predictDriverState(input);
  res.json(prediction);
});

// --- Database Download & Export Endpoints ---
const handleDatabaseDownload = (req: any, res: Response, defaultName = 'safedrive.json') => {
  try {
    const filename = req.path.toLowerCase().includes('safadrive') ? 'safadrive.json' : defaultName;
    const data = db.getExportableDatabase();
    
    if (req.query.inline === 'true') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.json(data);
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.send(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('[API Download Error]', err);
    res.status(500).json({ error: 'Failed to download database file', details: err?.message });
  }
};

apiRouter.get('/database/download', requireAuth, (req, res) => handleDatabaseDownload(req, res, 'safedrive.json'));
apiRouter.get('/database/export', requireAuth, (req, res) => handleDatabaseDownload(req, res, 'safedrive.json'));
apiRouter.get('/download/safedrive.json', requireAuth, (req, res) => handleDatabaseDownload(req, res, 'safedrive.json'));
apiRouter.get('/download/safadrive.json', requireAuth, (req, res) => handleDatabaseDownload(req, res, 'safedrive.json'));
apiRouter.get('/safedrive.json', requireAuth, (req, res) => handleDatabaseDownload(req, res, 'safedrive.json'));
apiRouter.get('/safadrive.json', requireAuth, (req, res) => handleDatabaseDownload(req, res, 'safedrive.json'));
