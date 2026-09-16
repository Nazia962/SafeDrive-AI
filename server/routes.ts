import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { requireAuth, generateToken } from './auth';
import { BENCHMARK_MODELS, ML_WORKFLOW_STEPS, predictDriverState, MLFeatureInput } from './ml_engine';
import type { User, Trip, FatigueEvent, PhoneEvent, DistractionEvent, SafetyAlert, SystemSettings, DriverProfile } from '../src/types';

const defaultSettings: SystemSettings = {
  earClosureThreshold: 0.22,
  prolongedClosureSeconds: 1.2,
  marYawnThreshold: 0.58,
  yawnDurationSeconds: 1.8,
  perclosFatigueThreshold: 30,
  phoneDetectionEnabled: true,
  phoneConfidenceThreshold: 0.65,
  phoneConfirmationFrames: 5,
  phoneAlertCooldownSeconds: 4.0,
  acousticAlertsEnabled: true,
  voiceWarningsEnabled: true,
  alertVolume: 80,
  alertCooldownSeconds: 4.0,
  sensitivity: 'NORMAL',
  showFaceMeshOverlay: true,
  showBoundingBoxes: true,
  targetFPS: 30,
  telemetryRetentionDays: 30,
  anonymizeTelemetry: false,
  localProcessingOnly: true
};

export const apiRouter = new Hono<{ Bindings: { safedrive_db: D1Database, JWT_SECRET: string }, Variables: { user: User } }>();

// --- Health Check ---
apiRouter.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    system: 'SafeDrive AI Telematics Core (Workers)',
    version: '2.4.0-rc1',
    timestamp: new Date().toISOString()
  });
});

// --- Authentication Routes ---
apiRouter.post('/auth/register', async (c) => {
  const { email, password, name } = await c.req.json();
  if (!email || !password || !name) {
    return c.json({ error: 'Name, email, and password are required' }, 400);
  }

  const { results: existing } = await c.env.safedrive_db.prepare('SELECT id FROM users WHERE email = ?').bind(email).all();
  if (existing && existing.length > 0) {
    return c.json({ error: 'User already exists with this email' }, 409);
  }

  const user: User = {
    id: `user_${Date.now()}`,
    email,
    name,
    role: 'driver',
    createdAt: new Date().toISOString()
  };

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  await c.env.safedrive_db.prepare('INSERT INTO users (id, email, name, role, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(user.id, user.email, user.name, user.role, user.createdAt).run();
  
  await c.env.safedrive_db.prepare('INSERT INTO passwords (user_id, hash) VALUES (?, ?)')
    .bind(user.id, hash).run();

  const defaultBadges = [
    { id: 'b1', title: 'Vigilant Highway Driver', description: 'Maintained 0 high-risk fatigue triggers across 5 consecutive trips.', earned: false },
    { id: 'b2', title: 'Zero Phone Distraction', description: 'Completed 10 hours of active driving without a single mobile phone pickup.', earned: false },
    { id: 'b3', title: 'Night Radar Calibrated', description: 'Passed low-light facial mesh calibration in dark conditions.', earned: false }
  ];

  await c.env.safedrive_db.prepare(`INSERT INTO driver_profiles 
    (id, user_id, name, driver_license, email, phone, emergency_contact, vehicle_model, license_plate, registration_date, badges_json) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(`prof_${Date.now()}`, user.id, user.name, 'DL-PENDING', user.email, '', '', 'Standard Passenger Vehicle', 'PENDING', new Date().toISOString().split('T')[0], JSON.stringify(defaultBadges)).run();

  await c.env.safedrive_db.prepare('INSERT INTO settings (user_id, settings_json) VALUES (?, ?)')
    .bind(user.id, JSON.stringify(defaultSettings)).run();

  const token = await generateToken(user, c.env.JWT_SECRET);
  return c.json({ user, token }, 201);
});

apiRouter.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const { results: users } = await c.env.safedrive_db.prepare('SELECT id, email, name, role, created_at as createdAt FROM users WHERE email = ?').bind(email).all();
  if (!users || users.length === 0) {
    return c.json({ error: 'Invalid email or password credentials' }, 401);
  }
  const user = users[0] as unknown as User;

  const { results: passwords } = await c.env.safedrive_db.prepare('SELECT hash FROM passwords WHERE user_id = ?').bind(user.id).all();
  if (!passwords || passwords.length === 0 || !bcrypt.compareSync(password, passwords[0].hash as string)) {
    return c.json({ error: 'Invalid email or password credentials' }, 401);
  }

  const token = await generateToken(user, c.env.JWT_SECRET);
  return c.json({ user, token });
});

apiRouter.use('/*', requireAuth);

apiRouter.get('/auth/me', async (c) => {
  const user = c.get('user');
  const { results: profiles } = await c.env.safedrive_db.prepare('SELECT * FROM driver_profiles WHERE user_id = ?').bind(user.id).all();
  let profile = profiles[0] as any;
  if (profile && profile.badges_json) {
    profile.badges = JSON.parse(profile.badges_json);
  }
  return c.json({ user, profile });
});

// --- Driver Profile ---
apiRouter.get('/profile', async (c) => {
  const user = c.get('user');
  const { results: profiles } = await c.env.safedrive_db.prepare('SELECT * FROM driver_profiles WHERE user_id = ?').bind(user.id).all();
  if (!profiles || profiles.length === 0) return c.json({ error: 'Profile not found' }, 404);
  const profile = profiles[0] as any;
  profile.badges = JSON.parse(profile.badges_json || '[]');
  return c.json(profile);
});

apiRouter.put('/profile', async (c) => {
  const user = c.get('user');
  const updates = await c.req.json();
  
  // Prevent arbitrary modification of critical fields
  delete updates.id;
  delete updates.user_id;
  
  // Update allowed fields
  const allowedFields = ['name', 'driver_license', 'phone', 'emergency_contact', 'vehicle_model', 'license_plate'];
  const updateClauses = [];
  const bindValues = [];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateClauses.push(`${field} = ?`);
      bindValues.push(updates[field]);
    }
  }
  
  if (updateClauses.length > 0) {
    bindValues.push(user.id);
    await c.env.safedrive_db.prepare(`UPDATE driver_profiles SET ${updateClauses.join(', ')} WHERE user_id = ?`)
      .bind(...bindValues).run();
  }
  
  const { results: profiles } = await c.env.safedrive_db.prepare('SELECT * FROM driver_profiles WHERE user_id = ?').bind(user.id).all();
  const profile = profiles[0] as any;
  profile.badges = JSON.parse(profile.badges_json || '[]');
  return c.json(profile);
});

// --- Settings ---
apiRouter.get('/settings', async (c) => {
  const user = c.get('user');
  const { results } = await c.env.safedrive_db.prepare('SELECT settings_json FROM settings WHERE user_id = ?').bind(user.id).all();
  if (!results || results.length === 0) return c.json(defaultSettings);
  return c.json(JSON.parse(results[0].settings_json as string));
});

apiRouter.put('/settings', async (c) => {
  const user = c.get('user');
  const updates = await c.req.json();
  
  const { results } = await c.env.safedrive_db.prepare('SELECT settings_json FROM settings WHERE user_id = ?').bind(user.id).all();
  let currentSettings = { ...defaultSettings };
  if (results && results.length > 0) {
    currentSettings = { ...currentSettings, ...JSON.parse(results[0].settings_json as string) };
  }
  
  const newSettings = { ...currentSettings, ...updates };
  await c.env.safedrive_db.prepare('UPDATE settings SET settings_json = ? WHERE user_id = ?')
    .bind(JSON.stringify(newSettings), user.id).run();
    
  return c.json(newSettings);
});

// --- Trips ---
apiRouter.get('/trips', async (c) => {
  const user = c.get('user');
  const { results } = await c.env.safedrive_db.prepare('SELECT * FROM trips WHERE user_id = ? ORDER BY start_time DESC').bind(user.id).all();
  return c.json(results || []);
});

apiRouter.get('/trips/:id', async (c) => {
  const user = c.get('user');
  const tripId = c.req.param('id');
  const { results } = await c.env.safedrive_db.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?').bind(tripId, user.id).all();
  if (!results || results.length === 0) return c.json({ error: 'Trip not found' }, 404);
  const trip = results[0] as any;
  
  const { results: events } = await c.env.safedrive_db.prepare(`
    SELECT 'FATIGUE' as eventCategory, * FROM fatigue_events WHERE trip_id = ?
    UNION ALL
    SELECT 'PHONE' as eventCategory, * FROM phone_events WHERE trip_id = ?
    UNION ALL
    SELECT 'DISTRACTION' as eventCategory, * FROM distraction_events WHERE trip_id = ?
  `).bind(tripId, tripId, tripId).all();
  
  trip.events = events || [];
  
  const { results: telemetry } = await c.env.safedrive_db.prepare('SELECT point_json FROM telemetry WHERE trip_id = ? ORDER BY timestamp ASC').bind(tripId).all();
  trip.telemetryHistory = telemetry?.map(t => JSON.parse(t.point_json as string)) || [];
  
  return c.json(trip);
});

apiRouter.post('/trips', async (c) => {
  const user = c.get('user');
  const tripId = `trip_${Date.now()}`;
  
  await c.env.safedrive_db.prepare(`INSERT INTO trips 
    (id, user_id, start_time, duration_seconds, status, average_risk, max_risk, safety_score, drowsiness_events_count, yawning_events_count, phone_distraction_events_count, total_alerts_count) 
    VALUES (?, ?, ?, 0, 'ACTIVE', 0, 0, 100, 0, 0, 0, 0)`)
    .bind(tripId, user.id, new Date().toISOString()).run();
    
  return c.json({ id: tripId, userId: user.id, startTime: new Date().toISOString(), status: 'ACTIVE', events: [], telemetryHistory: [] }, 201);
});

apiRouter.put('/trips/:id/complete', async (c) => {
  const user = c.get('user');
  const tripId = c.req.param('id');
  const updates = await c.req.json();
  
  const { results } = await c.env.safedrive_db.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?').bind(tripId, user.id).all();
  if (!results || results.length === 0) return c.json({ error: 'Trip not found' }, 404);
  
  const endTime = new Date().toISOString();
  await c.env.safedrive_db.prepare(`UPDATE trips SET status = 'COMPLETED', end_time = ?, duration_seconds = ?, average_risk = ?, max_risk = ?, safety_score = ? WHERE id = ? AND user_id = ?`)
    .bind(endTime, updates.durationSeconds || 0, updates.averageRisk || 0, updates.maxRisk || 0, updates.safetyScore || 100, tripId, user.id).run();
  
  return c.json({ success: true });
});

apiRouter.delete('/trips/:id', async (c) => {
  const user = c.get('user');
  const tripId = c.req.param('id');
  const result = await c.env.safedrive_db.prepare('DELETE FROM trips WHERE id = ? AND user_id = ?').bind(tripId, user.id).run();
  if (result.meta.changes === 0) return c.json({ error: 'Trip not found' }, 404);
  return c.json({ success: true });
});

apiRouter.delete('/trips', async (c) => {
  const user = c.get('user');
  await c.env.safedrive_db.prepare('DELETE FROM trips WHERE user_id = ?').bind(user.id).run();
  return c.json({ success: true, message: 'All trip history cleared' });
});

// --- Events & Alerts ---
apiRouter.post('/events/fatigue', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  // Verify trip ownership
  const { results } = await c.env.safedrive_db.prepare('SELECT id FROM trips WHERE id = ? AND user_id = ?').bind(body.tripId, user.id).all();
  if (!results || results.length === 0) return c.json({ error: 'Trip not found' }, 404);
  
  const eventId = `fatigue_${Date.now()}`;
  await c.env.safedrive_db.prepare(`INSERT INTO fatigue_events (id, trip_id, timestamp, type, duration_seconds, severity, ear_value, mar_value, alert_triggered) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(eventId, body.tripId, new Date().toISOString(), body.type || 'PROLONGED_CLOSURE', body.durationSeconds || 1.5, body.severity || 'HIGH', body.earValue || null, body.marValue || null, body.alertTriggered ?? true).run();
  
  if (body.type === 'YAWNING') {
    await c.env.safedrive_db.prepare('UPDATE trips SET yawning_events_count = yawning_events_count + 1 WHERE id = ?').bind(body.tripId).run();
  } else {
    await c.env.safedrive_db.prepare('UPDATE trips SET drowsiness_events_count = drowsiness_events_count + 1 WHERE id = ?').bind(body.tripId).run();
  }
  
  return c.json({ id: eventId }, 201);
});

apiRouter.post('/events/phone', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { results } = await c.env.safedrive_db.prepare('SELECT id FROM trips WHERE id = ? AND user_id = ?').bind(body.tripId, user.id).all();
  if (!results || results.length === 0) return c.json({ error: 'Trip not found' }, 404);
  
  const eventId = `phone_${Date.now()}`;
  await c.env.safedrive_db.prepare(`INSERT INTO phone_events (id, trip_id, timestamp, confidence, duration_seconds, severity, driver_gaze_diverted, alert_triggered, bounding_box_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(eventId, body.tripId, new Date().toISOString(), body.confidence || 0.85, body.durationSeconds || 1.2, body.severity || 'HIGH', body.driverGazeDiverted ?? true, body.alertTriggered ?? true, body.boundingBox ? JSON.stringify(body.boundingBox) : null).run();
  
  await c.env.safedrive_db.prepare('UPDATE trips SET phone_distraction_events_count = phone_distraction_events_count + 1 WHERE id = ?').bind(body.tripId).run();
  
  await c.env.safedrive_db.prepare(`INSERT INTO notifications (id, user_id, type, severity, title, message, timestamp, trip_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(`notif_phone_${Date.now()}`, user.id, 'PHONE', 'HIGH', 'Mobile Phone Distraction Detected', `Driver observed interacting with mobile phone during trip.`, new Date().toISOString(), body.tripId).run();

  return c.json({ id: eventId }, 201);
});

apiRouter.post('/events/distraction', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { results } = await c.env.safedrive_db.prepare('SELECT id FROM trips WHERE id = ? AND user_id = ?').bind(body.tripId, user.id).all();
  if (!results || results.length === 0) return c.json({ error: 'Trip not found' }, 404);
  
  const eventId = `dist_${Date.now()}`;
  await c.env.safedrive_db.prepare(`INSERT INTO distraction_events (id, trip_id, timestamp, type, duration_seconds, severity, alert_triggered) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(eventId, body.tripId, new Date().toISOString(), body.type || 'GAZE_AWAY', body.durationSeconds || 2.0, body.severity || 'MODERATE', body.alertTriggered ?? false).run();
  
  return c.json({ id: eventId }, 201);
});

apiRouter.post('/alerts', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { results } = await c.env.safedrive_db.prepare('SELECT id FROM trips WHERE id = ? AND user_id = ?').bind(body.tripId, user.id).all();
  if (!results || results.length === 0) return c.json({ error: 'Trip not found' }, 404);
  
  const alertId = `alert_${Date.now()}`;
  await c.env.safedrive_db.prepare(`INSERT INTO alerts (id, trip_id, timestamp, type, severity, message, acoustic_played, voice_spoken) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(alertId, body.tripId, new Date().toISOString(), body.type, body.severity, body.message, body.acousticPlayed ?? true, body.voiceSpoken ?? true).run();
  
  await c.env.safedrive_db.prepare('UPDATE trips SET total_alerts_count = total_alerts_count + 1 WHERE id = ?').bind(body.tripId).run();
  return c.json({ id: alertId }, 201);
});

// --- Telemetry Buffer Append ---
apiRouter.post('/trips/:id/telemetry', async (c) => {
  const user = c.get('user');
  const tripId = c.req.param('id');
  const point = await c.req.json();
  
  const { results } = await c.env.safedrive_db.prepare('SELECT id FROM trips WHERE id = ? AND user_id = ?').bind(tripId, user.id).all();
  if (!results || results.length === 0) return c.json({ error: 'Trip not found' }, 404);
  
  // Note: D1 is not ideal for high-frequency writes. In production, this should be batched.
  await c.env.safedrive_db.prepare('INSERT INTO telemetry (trip_id, timestamp, point_json) VALUES (?, ?, ?)')
    .bind(tripId, point.timestamp || Date.now(), JSON.stringify(point)).run();
    
  return c.json({ success: true }, 201);
});

// --- Notifications ---
apiRouter.get('/notifications', async (c) => {
  const user = c.get('user');
  const { results } = await c.env.safedrive_db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY timestamp DESC LIMIT 100').bind(user.id).all();
  return c.json(results || []);
});

apiRouter.patch('/notifications/:id/read', async (c) => {
  const user = c.get('user');
  const notifId = c.req.param('id');
  const result = await c.env.safedrive_db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').bind(notifId, user.id).run();
  return c.json({ success: result.meta.changes > 0 });
});

apiRouter.post('/notifications/mark-all-read', async (c) => {
  const user = c.get('user');
  await c.env.safedrive_db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').bind(user.id).run();
  return c.json({ success: true });
});

apiRouter.delete('/notifications/:id', async (c) => {
  const user = c.get('user');
  const notifId = c.req.param('id');
  const result = await c.env.safedrive_db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').bind(notifId, user.id).run();
  return c.json({ success: result.meta.changes > 0 });
});

// --- Analytics ---
apiRouter.get('/analytics', async (c) => {
  const user = c.get('user');
  
  const { results: trips } = await c.env.safedrive_db.prepare('SELECT * FROM trips WHERE user_id = ?').bind(user.id).all();
  const { results: profiles } = await c.env.safedrive_db.prepare('SELECT safety_rating FROM driver_profiles WHERE user_id = ?').bind(user.id).all();
  const safetyRating = profiles?.[0]?.safety_rating || 100;
  
  if (!trips || trips.length === 0) {
    return c.json({
      hasData: false, totalTrips: 0, totalHours: 0, avgSafetyScore: safetyRating,
      totalDrowsinessEvents: 0, totalYawnEvents: 0, totalPhoneEvents: 0, totalAlerts: 0,
      recentTripsTrend: [], hourlyRiskDistribution: []
    });
  }

  const completedTrips = trips.filter((t: any) => t.status === 'COMPLETED');
  const totalSeconds = trips.reduce((sum, t: any) => sum + (t.duration_seconds || 0), 0);
  const totalDrowsiness = trips.reduce((sum, t: any) => sum + (t.drowsiness_events_count || 0), 0);
  const totalYawns = trips.reduce((sum, t: any) => sum + (t.yawning_events_count || 0), 0);
  const totalPhones = trips.reduce((sum, t: any) => sum + (t.phone_distraction_events_count || 0), 0);
  const totalAlerts = trips.reduce((sum, t: any) => sum + (t.total_alerts_count || 0), 0);

  const avgScore = completedTrips.length > 0 
    ? Math.round(completedTrips.reduce((sum, t: any) => sum + (t.safety_score || 100), 0) / completedTrips.length)
    : 100;

  const recentTripsTrend = trips.slice(0, 10).map((t: any, idx: number) => ({
    tripIndex: idx + 1,
    id: t.id,
    date: t.start_time.split('T')[0],
    safetyScore: t.safety_score,
    averageRisk: t.average_risk,
    maxRisk: t.max_risk,
    phoneEvents: t.phone_distraction_events_count,
    fatigueEvents: t.drowsiness_events_count
  }));

  return c.json({
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

// --- ML Workflow ---
apiRouter.get('/ml/workflow', (c) => c.json({ framework: 'SafeDrive AI 16-Step Rigorous ML Lifecycle', steps: ML_WORKFLOW_STEPS }));
apiRouter.get('/ml/benchmarks', (c) => c.json({ dataset: 'NTHU Driver Drowsiness + YawDD Biometric Ensemble (12,500 samples)', targetMetric: 'Recall & F1 Score (Safety-Critical)', models: BENCHMARK_MODELS }));
apiRouter.post('/ml/predict', async (c) => {
  const input = await c.req.json() as MLFeatureInput;
  if (input.ear === undefined || input.mar === undefined || input.perclos === undefined) {
    return c.json({ error: 'Features ear, mar, and perclos are mandatory' }, 400);
  }
  const prediction = predictDriverState(input);
  return c.json(prediction);
});
