/**
 * SafeDrive AI - Database & Persistence Layer
 * Atomic file-backed store for Driver Safety & Telemetry
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import type { 
  User, 
  DriverProfile, 
  Trip, 
  FatigueEvent, 
  PhoneEvent, 
  DistractionEvent, 
  SafetyAlert, 
  NotificationItem, 
  SystemSettings 
} from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'safedrive.json');

export interface DatabaseSchema {
  users: User[];
  passwords: Record<string, string>; // userId -> hashedPassword
  driverProfiles: DriverProfile[];
  trips: Trip[];
  fatigueEvents: FatigueEvent[];
  phoneEvents: PhoneEvent[];
  distractionEvents: DistractionEvent[];
  alerts: SafetyAlert[];
  notifications: NotificationItem[];
  settings: Record<string, SystemSettings>; // userId -> settings
}

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

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
    this.ensureDefaultDriver();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('[DB] Error loading database file, initializing fresh store:', err);
    }

    return {
      users: [],
      passwords: {},
      driverProfiles: [],
      trips: [],
      fatigueEvents: [],
      phoneEvents: [],
      distractionEvents: [],
      alerts: [],
      notifications: [],
      settings: {}
    };
  }

  public save(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp`;
      const exportable = this.getExportableDatabase();
      const exportableStr = JSON.stringify(exportable, null, 2);
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);


    } catch (err) {
      console.error('[DB] Error saving database:', err);
    }
  }

  public getExportableDatabase(): Omit<DatabaseSchema, 'passwords'> {
    const { passwords: _passwords, ...rest } = this.data;
    return rest;
  }

  private ensureDefaultDriver(): void {
    if (this.data.users.length === 0) {
      const defaultId = 'driver_default_01';
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync('SafeDrive2026!', salt);

      const defaultUser: User = {
        id: defaultId,
        email: 'driver@safedrive.ai',
        name: 'Alex Mercer',
        role: 'driver',
        createdAt: new Date().toISOString()
      };

      const defaultProfile: DriverProfile = {
        id: 'prof_01',
        userId: defaultId,
        name: 'Alex Mercer',
        driverLicense: 'DL-99482-TX',
        email: 'driver@safedrive.ai',
        phone: '+1 (555) 382-9901',
        emergencyContact: 'Sarah Mercer (+1 555 382-9902)',
        vehicleModel: '2024 Volvo EX90 (ADAS Pilot)',
        licensePlate: 'SFD-2026',
        registrationDate: '2025-01-10',
        safetyRating: 92,
        totalDrivingHours: 0,
        totalTrips: 0,
        fatigueIncidentsTotal: 0,
        distractionIncidentsTotal: 0,
        phoneIncidentsTotal: 0,
        badges: [
          {
            id: 'b1',
            title: 'Vigilant Highway Driver',
            description: 'Maintained 0 high-risk fatigue triggers across 5 consecutive highway trips.',
            earned: false
          },
          {
            id: 'b2',
            title: 'Zero Phone Distraction',
            description: 'Completed 10 hours of active driving without a single mobile phone pickup.',
            earned: false
          },
          {
            id: 'b3',
            title: 'Night Radar Calibrated',
            description: 'Successfully passed low-light facial mesh calibration in dark cab conditions.',
            earned: true,
            earnedAt: '2026-02-14'
          }
        ]
      };

      this.data.users.push(defaultUser);
      this.data.passwords[defaultId] = hash;
      this.data.driverProfiles.push(defaultProfile);
      this.data.settings[defaultId] = { ...defaultSettings };

      // Initialize welcome notification
      this.data.notifications.push({
        id: 'notif_welcome',
        userId: defaultId,
        type: 'SYSTEM',
        severity: 'INFO',
        title: 'SafeDrive AI Online',
        message: 'Camera sensor & real-time computer vision ready. Initiate monitoring to track alertness.',
        timestamp: new Date().toISOString(),
        isRead: false
      });

      this.save();
    }
  }

  // --- User Queries ---
  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public createUser(user: User, passwordPlain: string): User {
    const salt = bcrypt.genSaltSync(10);
    this.data.passwords[user.id] = bcrypt.hashSync(passwordPlain, salt);
    this.data.users.push(user);

    // Create corresponding profile & settings
    this.data.driverProfiles.push({
      id: `prof_${Date.now()}`,
      userId: user.id,
      name: user.name,
      driverLicense: 'DL-PENDING',
      email: user.email,
      phone: '',
      emergencyContact: '',
      vehicleModel: 'Standard Passenger Vehicle',
      licensePlate: 'PENDING',
      registrationDate: new Date().toISOString().split('T')[0],
      safetyRating: 100,
      totalDrivingHours: 0,
      totalTrips: 0,
      fatigueIncidentsTotal: 0,
      distractionIncidentsTotal: 0,
      phoneIncidentsTotal: 0,
      badges: [
        {
          id: 'b1',
          title: 'Vigilant Highway Driver',
          description: 'Maintained 0 high-risk fatigue triggers across 5 consecutive trips.',
          earned: false
        },
        {
          id: 'b2',
          title: 'Zero Phone Distraction',
          description: 'Completed 10 hours of active driving without a single mobile phone pickup.',
          earned: false
        },
        {
          id: 'b3',
          title: 'Night Radar Calibrated',
          description: 'Passed low-light facial mesh calibration in dark conditions.',
          earned: false
        }
      ]
    });

    this.data.settings[user.id] = { ...defaultSettings };
    this.save();
    return user;
  }

  public verifyPassword(userId: string, plain: string): boolean {
    const hash = this.data.passwords[userId];
    if (!hash) return false;
    return bcrypt.compareSync(plain, hash);
  }

  public setPassword(userId: string, newPlain: string): void {
    const salt = bcrypt.genSaltSync(10);
    this.data.passwords[userId] = bcrypt.hashSync(newPlain, salt);
    this.save();
  }

  // --- Driver Profile Queries ---
  public getProfileByUserId(userId: string): DriverProfile | undefined {
    return this.data.driverProfiles.find(p => p.userId === userId);
  }

  public updateProfile(userId: string, updates: Partial<DriverProfile>): DriverProfile | undefined {
    const prof = this.getProfileByUserId(userId);
    if (!prof) return undefined;
    Object.assign(prof, updates);
    this.save();
    return prof;
  }

  // --- Settings ---
  public getSettings(userId: string): SystemSettings {
    if (!this.data.settings[userId]) {
      this.data.settings[userId] = { ...defaultSettings };
      this.save();
    }
    return this.data.settings[userId];
  }

  public updateSettings(userId: string, updates: Partial<SystemSettings>): SystemSettings {
    const current = this.getSettings(userId);
    this.data.settings[userId] = { ...current, ...updates };
    this.save();
    return this.data.settings[userId];
  }

  // --- Trips ---
  public getTrips(userId: string): Trip[] {
    return this.data.trips
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }

  public getTripById(tripId: string): Trip | undefined {
    return this.data.trips.find(t => t.id === tripId);
  }

  public getActiveTrip(userId: string): Trip | undefined {
    return this.data.trips.find(t => t.userId === userId && t.status === 'ACTIVE');
  }

  public createTrip(trip: Trip): Trip {
    this.data.trips.push(trip);
    this.save();
    return trip;
  }

  public updateTrip(tripId: string, updates: Partial<Trip>): Trip | undefined {
    const trip = this.getTripById(tripId);
    if (!trip) return undefined;
    Object.assign(trip, updates);
    this.save();
    return trip;
  }

  public completeTrip(tripId: string, finalSummary?: Partial<Trip>): Trip | undefined {
    const trip = this.getTripById(tripId);
    if (!trip) return undefined;
    trip.status = 'COMPLETED';
    trip.endTime = new Date().toISOString();
    if (finalSummary) {
      Object.assign(trip, finalSummary);
    }

    // Update driver cumulative profile
    const profile = this.getProfileByUserId(trip.userId);
    if (profile) {
      profile.totalTrips += 1;
      profile.totalDrivingHours += Number((trip.durationSeconds / 3600).toFixed(2));
      profile.fatigueIncidentsTotal += trip.drowsinessEventsCount + trip.yawningEventsCount;
      profile.phoneIncidentsTotal += trip.phoneDistractionEventsCount;
      
      // Recompute rolling safety score
      const allCompleted = this.data.trips.filter(t => t.userId === trip.userId && t.status === 'COMPLETED');
      if (allCompleted.length > 0) {
        const avgScore = Math.round(
          allCompleted.reduce((acc, curr) => acc + (curr.safetyScore || 100), 0) / allCompleted.length
        );
        profile.safetyRating = avgScore;
      }

      // Check badge rules
      const b1 = profile.badges.find(b => b.id === 'b1');
      if (b1 && !b1.earned && profile.totalTrips >= 5 && profile.fatigueIncidentsTotal === 0) {
        b1.earned = true;
        b1.earnedAt = new Date().toISOString().split('T')[0];
      }
      const b2 = profile.badges.find(b => b.id === 'b2');
      if (b2 && !b2.earned && profile.totalDrivingHours >= 10 && profile.phoneIncidentsTotal === 0) {
        b2.earned = true;
        b2.earnedAt = new Date().toISOString().split('T')[0];
      }
    }

    // Auto notification
    this.data.notifications.push({
      id: `notif_trip_${Date.now()}`,
      userId: trip.userId,
      type: 'TRIP',
      severity: trip.safetyScore >= 80 ? 'INFO' : 'WARNING',
      title: `Trip Completed (Score: ${trip.safetyScore}/100)`,
      message: `Duration: ${Math.round(trip.durationSeconds / 60)} min. ${trip.phoneDistractionEventsCount} phone and ${trip.drowsinessEventsCount} drowsiness events recorded.`,
      timestamp: new Date().toISOString(),
      isRead: false,
      tripId: trip.id
    });

    this.save();
    return trip;
  }

  public deleteTrip(tripId: string): boolean {
    const idx = this.data.trips.findIndex(t => t.id === tripId);
    if (idx === -1) return false;
    this.data.trips.splice(idx, 1);
    this.save();
    return true;
  }

  public clearAllTrips(userId: string): void {
    this.data.trips = this.data.trips.filter(t => t.userId !== userId);
    this.data.fatigueEvents = [];
    this.data.phoneEvents = [];
    this.data.distractionEvents = [];
    this.data.alerts = [];
    
    // Reset driver counters
    const prof = this.getProfileByUserId(userId);
    if (prof) {
      prof.totalTrips = 0;
      prof.totalDrivingHours = 0;
      prof.fatigueIncidentsTotal = 0;
      prof.distractionIncidentsTotal = 0;
      prof.phoneIncidentsTotal = 0;
      prof.safetyRating = 100;
    }
    this.save();
  }

  // --- Events & Alerts ---
  public addFatigueEvent(ev: FatigueEvent): void {
    this.data.fatigueEvents.push(ev);
    const trip = this.getTripById(ev.tripId);
    if (trip) {
      trip.events.push(ev);
      if (ev.type === 'YAWNING') {
        trip.yawningEventsCount += 1;
      } else {
        trip.drowsinessEventsCount += 1;
      }
    }
    this.save();
  }

  public addPhoneEvent(ev: PhoneEvent): void {
    this.data.phoneEvents.push(ev);
    const trip = this.getTripById(ev.tripId);
    if (trip) {
      trip.events.push(ev);
      trip.phoneDistractionEventsCount += 1;
    }
    this.save();
  }

  public addDistractionEvent(ev: DistractionEvent): void {
    this.data.distractionEvents.push(ev);
    const trip = this.getTripById(ev.tripId);
    if (trip) {
      trip.events.push(ev);
    }
    this.save();
  }

  public addAlert(alert: SafetyAlert): void {
    this.data.alerts.push(alert);
    const trip = this.getTripById(alert.tripId);
    if (trip) {
      trip.totalAlertsCount += 1;
    }
    this.save();
  }

  // --- Notifications ---
  public getNotifications(userId: string): NotificationItem[] {
    return this.data.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addNotification(notif: NotificationItem): void {
    this.data.notifications.unshift(notif);
    if (this.data.notifications.length > 100) {
      this.data.notifications.pop();
    }
    this.save();
  }

  public markNotificationAsRead(id: string): boolean {
    const item = this.data.notifications.find(n => n.id === id);
    if (!item) return false;
    item.isRead = true;
    this.save();
    return true;
  }

  public markAllNotificationsRead(userId: string): void {
    this.data.notifications
      .filter(n => n.userId === userId)
      .forEach(n => { n.isRead = true; });
    this.save();
  }

  public deleteNotification(id: string): boolean {
    const idx = this.data.notifications.findIndex(n => n.id === id);
    if (idx === -1) return false;
    this.data.notifications.splice(idx, 1);
    this.save();
    return true;
  }
}

export const db = new Database();
