-- SafeDrive AI D1 Schema Migration

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'driver',
    created_at TEXT NOT NULL
);

CREATE TABLE passwords (
    user_id TEXT PRIMARY KEY,
    hash TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE driver_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    driver_license TEXT,
    email TEXT,
    phone TEXT,
    emergency_contact TEXT,
    vehicle_model TEXT,
    license_plate TEXT,
    registration_date TEXT,
    safety_rating INTEGER DEFAULT 100,
    total_driving_hours REAL DEFAULT 0,
    total_trips INTEGER DEFAULT 0,
    fatigue_incidents_total INTEGER DEFAULT 0,
    distraction_incidents_total INTEGER DEFAULT 0,
    phone_incidents_total INTEGER DEFAULT 0,
    badges_json TEXT, -- Store badges array as JSON
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE settings (
    user_id TEXT PRIMARY KEY,
    settings_json TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE trips (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    duration_seconds INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    average_risk REAL DEFAULT 0,
    max_risk REAL DEFAULT 0,
    safety_score INTEGER DEFAULT 100,
    drowsiness_events_count INTEGER DEFAULT 0,
    yawning_events_count INTEGER DEFAULT 0,
    phone_distraction_events_count INTEGER DEFAULT 0,
    total_alerts_count INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_trips_user_id ON trips(user_id);

CREATE TABLE telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    point_json TEXT NOT NULL,
    FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

CREATE INDEX idx_telemetry_trip_id ON telemetry(trip_id);

CREATE TABLE fatigue_events (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    duration_seconds REAL DEFAULT 0,
    severity TEXT NOT NULL,
    ear_value REAL,
    mar_value REAL,
    alert_triggered BOOLEAN DEFAULT 1,
    FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE
);
CREATE INDEX idx_fatigue_trip_id ON fatigue_events(trip_id);

CREATE TABLE phone_events (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    confidence REAL DEFAULT 0,
    duration_seconds REAL DEFAULT 0,
    severity TEXT NOT NULL,
    driver_gaze_diverted BOOLEAN DEFAULT 1,
    alert_triggered BOOLEAN DEFAULT 1,
    bounding_box_json TEXT,
    FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE
);
CREATE INDEX idx_phone_trip_id ON phone_events(trip_id);

CREATE TABLE distraction_events (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    duration_seconds REAL DEFAULT 0,
    severity TEXT NOT NULL,
    alert_triggered BOOLEAN DEFAULT 0,
    FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE
);
CREATE INDEX idx_distraction_trip_id ON distraction_events(trip_id);

CREATE TABLE alerts (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    acoustic_played BOOLEAN DEFAULT 1,
    voice_spoken BOOLEAN DEFAULT 1,
    FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE
);
CREATE INDEX idx_alerts_trip_id ON alerts(trip_id);

CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    trip_id TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
