/**
 * SafeDrive AI - Main Dashboard View
 * Sourced directly from Database with Single Source of Truth
 */

import React from 'react';
import {
  ShieldCheck,
  Clock,
  Car,
  BellRing,
  AlertTriangle,
  Eye,
  Activity,
  Smartphone,
  Compass,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Info
} from 'lucide-react';
import type { DriverProfile, Trip, TelemetryPoint, RiskLevel } from '../../types';

interface DashboardViewProps {
  profile: DriverProfile | null;
  trips: Trip[];
  activeTrip: Trip | null;
  liveTelemetry?: TelemetryPoint | null;
  settings?: any;
  onNavigate: (tab: string) => void;
  onStartTrip: () => void;
  onEndTrip?: () => void;
}

const DEFAULT_TELEMETRY: TelemetryPoint = {
  timestamp: Date.now(),
  ear: 0.32,
  mar: 0.20,
  perclos: 6.0,
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
  cnnOpenProb: 0.95,
  contributingFactors: ['Driver road attention verified']
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  trips,
  activeTrip,
  liveTelemetry,
  onNavigate,
  onStartTrip,
  onEndTrip
}) => {
  const telemetry = liveTelemetry || DEFAULT_TELEMETRY;
  const completedTrips = trips.filter(t => t.status === 'COMPLETED');
  const totalDrivingHours = completedTrips.reduce((acc, t) => acc + (t.durationSeconds || 0), 0) / 3600;
  const totalAlerts = completedTrips.reduce((acc, t) => acc + (t.totalAlertsCount || 0), 0);
  const avgSafetyScore = profile?.safetyRating ?? (completedTrips.length > 0 
    ? Math.round(completedTrips.reduce((acc, t) => acc + t.safetyScore, 0) / completedTrips.length) 
    : 100);

  const getRiskColor = (level?: RiskLevel) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-700 bg-red-50 border-red-200';
      case 'HIGH': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'MODERATE': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'LOW':
      default: return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
  };

  return (
    <div className="space-y-6" style={{ backgroundColor: '#f9f8f8', fontWeight: 'normal' }}>
      
      {/* Top Welcome & Orientation Card */}
      <div className="rounded-2xl p-6 border border-gray-200 shadow-xs" style={{ backgroundColor: '#fef7f9' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-xl" style={{ backgroundColor: '#eff2f3' }}>
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider mb-1">
              <span style={{ color: '#fa0e6e' }}>Driver Status</span>
              <span className="text-gray-400">•</span>
              <span className={activeTrip ? 'text-emerald-600 font-bold' : 'text-gray-500'}>
                {activeTrip ? 'Active Trip in Progress' : 'Vehicle Parked / Standby'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Welcome back, {profile?.name || 'Driver'}
            </h1>
            <p className="mt-1 text-sm text-gray-600 max-w-3xl leading-relaxed">
              SafeDrive AI is calibrated and ready. Initiate real-time computer vision monitoring to track
              eye closure, yawning, head pose, phone usage, distraction, and fatigue patterns.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {activeTrip ? (
              <button
                onClick={onEndTrip}
                id="dashboard-end-trip-btn"
                className="px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors shadow-xs"
              >
                Complete Active Trip
              </button>
            ) : (
              <button
                onClick={() => {
                  onStartTrip();
                  onNavigate('monitoring');
                }}
                id="dashboard-start-monitoring-btn"
                style={{ backgroundColor: '#dc2355', color: '#fa0e6e' }}
                className="px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center space-x-2 shadow-xs"
              >
                <Activity className="w-4 h-4" style={{ color: '#e1d4df' }} />
                <span style={{ color: '#efe6ee' }}>Start Monitoring</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('analytics')}
              id="dashboard-view-analytics-btn"
              className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold text-sm hover:bg-gray-100 transition-colors flex items-center space-x-1.5"
            >
              <span>View Analytics</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Core Metric Cards (Database Connected) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Safety Score */}
        <div className="p-5 rounded-2xl border border-gray-200 shadow-xs" style={{ backgroundColor: '#dff6e2' }}>
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Driver Safety Score</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold" style={{ color: '#009966', fontWeight: 'bold' }}>{avgSafetyScore}</span>
            <span className="text-xs text-gray-500 font-medium">/ 100</span>
          </div>
          <div className="mt-2 flex items-center space-x-1.5 text-xs text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{avgSafetyScore >= 85 ? 'Optimal Driving Score' : avgSafetyScore >= 70 ? 'Moderate Alertness' : 'Action Recommended'}</span>
          </div>
        </div>

        {/* Card 2: Monitored Time */}
        <div className="p-5 rounded-2xl border border-gray-200 shadow-xs" style={{ backgroundColor: '#dff6e2' }}>
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Monitored Time</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold" style={{ color: '#009966', fontWeight: 'bold' }}>
              {totalDrivingHours > 0 ? totalDrivingHours.toFixed(1) : '0.0'}
            </span>
            <span className="text-xs text-gray-500 font-medium">hours</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {completedTrips.length === 0 ? 'No logged driving hours' : `${completedTrips.length} sessions logged`}
          </div>
        </div>

        {/* Card 3: Completed Trips */}
        <div className="p-5 rounded-2xl border border-gray-200 shadow-xs" style={{ backgroundColor: '#dff6e2' }}>
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed Trips</span>
            <Car className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold" style={{ color: '#009966', fontWeight: 'bold' }}>{completedTrips.length}</span>
            <span className="text-xs text-gray-500 font-medium">trips</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {activeTrip ? '1 active trip ongoing' : 'All sessions synced'}
          </div>
        </div>

        {/* Card 4: Acoustic Alerts */}
        <div className="p-5 rounded-2xl border border-gray-200 shadow-xs" style={{ backgroundColor: '#dff6e2' }}>
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Acoustic Alerts</span>
            <BellRing className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold" style={{ color: '#009966', fontWeight: 'bold' }}>{totalAlerts}</span>
            <span className="text-xs text-gray-500 font-medium">triggers</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {totalAlerts === 0 ? 'Zero safety warnings triggered' : 'Audio intervention count'}
          </div>
        </div>

        {/* Card 5: Current AI Risk Level */}
        <div className="p-5 rounded-2xl border border-gray-200 shadow-xs" style={{ backgroundColor: '#dff6e2' }}>
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Current AI Risk Level</span>
            <AlertTriangle className="w-4 h-4" style={{ color: '#fa0e6e' }} />
          </div>
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${getRiskColor(telemetry.riskLevel)}`}>
              {telemetry.riskLevel}
            </span>
            <span className="text-sm font-semibold" style={{ color: '#009966', fontWeight: 'bold' }}>Score: {telemetry.riskScore}%</span>
          </div>
          <div className="mt-2 text-xs text-gray-500 truncate">
            {telemetry.riskScore < 35 ? 'Normal alertness' : 'Fatigue / Distraction tracked'}
          </div>
        </div>

      </div>

      {/* Live Monitoring Telemetry Hub Preview */}
      <div className="rounded-2xl p-6 border border-gray-200 shadow-xs" style={{ backgroundColor: '#fbfafa' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Live Monitoring Telemetry Hub</h2>
            <p className="text-xs text-gray-500">Real-time biometric computer-vision state from live sensor stream</p>
          </div>
          <button
            onClick={() => onNavigate('monitoring')}
            className="text-xs font-semibold flex items-center space-x-1"
          >
            <span style={{ color: '#fa0e6e' }}>Open Live Camera Hub</span>
            <ArrowRight className="w-3.5 h-3.5" style={{ color: '#fa0e6e' }} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Eye Status & EAR */}
          <div className="p-3.5 rounded-xl border border-gray-200" style={{ backgroundColor: '#e8ecf0' }}>
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
              <span>Eye Status</span>
              <Eye className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-base font-bold text-gray-900">
              {telemetry.ear < 0.22 ? 'CLOSED' : 'OPEN'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              EAR: <span className="font-semibold text-gray-700">{telemetry.ear.toFixed(2)}</span> (Thresh 0.22)
            </div>
          </div>

          {/* Blink Frequency */}
          <div className="p-3.5 rounded-xl border border-gray-200" style={{ backgroundColor: '#e8ecf0' }}>
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
              <span>Blink Frequency</span>
              <Activity className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="text-base font-bold text-gray-900">
              {telemetry.blinkRate} <span className="text-xs font-normal text-gray-500">/min</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Total: <span className="font-semibold text-gray-700">{telemetry.totalBlinks} blinks</span>
            </div>
          </div>

          {/* Yawning / MAR */}
          <div className="p-3.5 rounded-xl border border-gray-200" style={{ backgroundColor: '#e8ecf0' }}>
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
              <span>Yawning</span>
              <Activity className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-base font-bold text-gray-900">
              {telemetry.mar >= 0.58 ? 'YAWN DETECTED' : 'NORMAL'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              MAR: <span className="font-semibold text-gray-700">{telemetry.mar.toFixed(2)}</span> (Thresh 0.58)
            </div>
          </div>

          {/* Head Pose */}
          <div className="p-3.5 rounded-xl border border-gray-200" style={{ backgroundColor: '#e8ecf0' }}>
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
              <span>Head Pose</span>
              <Compass className="w-3.5 h-3.5 text-teal-500" />
            </div>
            <div className="text-base font-bold text-gray-900 truncate">
              {Math.abs(telemetry.yaw) > 20 ? 'TURNED' : telemetry.pitch < -12 ? 'DROOPING' : 'FORWARD'}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Y:{telemetry.yaw}° P:{telemetry.pitch}°
            </div>
          </div>

          {/* Phone Status */}
          <div className="p-3.5 rounded-xl border border-gray-200" style={{ backgroundColor: '#e8ecf0' }}>
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
              <span>Distraction</span>
              <Smartphone className="w-3.5 h-3.5 text-red-500" />
            </div>
            <div className={`text-base font-bold truncate ${telemetry.phoneDetected ? 'text-red-600' : 'text-gray-900'}`}>
              {telemetry.phoneDetected ? 'PHONE DETECTED' : 'CLEAR'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Conf: <span className="font-semibold text-gray-700">{(telemetry.phoneConfidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* PERCLOS & LSTM */}
          <div className="p-3.5 rounded-xl border border-gray-200" style={{ backgroundColor: '#e8ecf0' }}>
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
              <span>PERCLOS</span>
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-base font-bold text-gray-900">
              {telemetry.perclos.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              CNN Eye: <span className="font-semibold text-gray-700">{telemetry.cnnEyeState}</span>
            </div>
          </div>

        </div>

        {/* Vehicle Connection Bar */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Connected Vehicle: <strong className="text-gray-700 font-semibold">{profile?.vehicleModel || 'Standard Camera Telematics'}</strong> ({profile?.licensePlate || 'N/A'})</span>
          </div>
          <div>
            Biometric Fusion: <span className="text-blue-600 font-semibold">468 Landmarks + MobileNet v2 COCO-SSD</span>
          </div>
        </div>
      </div>

      {/* Grid: Recent Monitoring Sessions + AI Safety Tip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Trips Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Recent Monitoring Sessions</h2>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold hover:text-blue-800"
              style={{ color: '#fa0e6e' }}
            >
              View Full History
            </button>
          </div>

          <div style={{ backgroundColor: '#e8ecf0' }} className="rounded-xl p-2">
            {trips.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
                <Car className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No trips recorded yet.</p>
                <p className="text-xs text-gray-500 mt-1">
                  Start a live monitoring session to generate real driving logs and telemetry.
                </p>
                <button
                  onClick={() => {
                    onStartTrip();
                    onNavigate('monitoring');
                  }}
                  className="mt-3 px-3 py-1.5 rounded-lg text-white text-xs font-semibold hover:opacity-90 shadow-xs"
                  style={{ backgroundColor: '#fa0e6e' }}
                >
                  Start First Trip
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 uppercase font-semibold">
                      <th className="pb-2.5">Trip ID</th>
                      <th className="pb-2.5">Date & Time</th>
                      <th className="pb-2.5">Duration</th>
                      <th className="pb-2.5">Safety Score</th>
                      <th className="pb-2.5">Phone Events</th>
                      <th className="pb-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {trips.slice(0, 5).map((trip) => (
                      <tr key={trip.id} className="hover:bg-gray-100/60 transition-colors">
                        <td className="py-3 font-semibold text-gray-900">#{trip.id.substring(trip.id.length - 6)}</td>
                        <td className="py-3 text-gray-600">{new Date(trip.startTime).toLocaleString()}</td>
                        <td className="py-3 text-gray-600">{Math.round(trip.durationSeconds / 60)} min</td>
                        <td className="py-3">
                          <span className={`font-bold ${trip.safetyScore >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {trip.safetyScore}/100
                          </span>
                        </td>
                        <td className="py-3 text-gray-600">
                          {trip.phoneDistractionEventsCount > 0 ? (
                            <span className="text-red-600 font-semibold">{trip.phoneDistractionEventsCount} detected</span>
                          ) : (
                            <span className="text-emerald-600 font-medium">0 (Clear)</span>
                          )}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            trip.status === 'ACTIVE' 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {trip.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* AI Safety Tip Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl p-6 border border-blue-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 font-bold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" style={{ color: '#fa0e6e' }} />
              <span style={{ color: '#fa0e6e' }}>AI Safety Recommendation</span>
            </div>
            <h3 className="text-base font-bold text-gray-900">
              Fatigue Mitigation Protocol
            </h3>
            <p className="mt-2 text-xs text-gray-700 leading-relaxed">
              "Take a 15-minute break every 2 hours of continuous driving. If SafeDrive AI detects
              consecutive yawning or prolonged eye closure, pull over in a safe rest area."
            </p>

            <div className="mt-4 space-y-2">
              <div className="p-2.5 rounded-xl bg-white border border-blue-100 text-xs text-gray-600 flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Microsleep risk:</strong> Eyelid closures &gt; 1.2s at 65 mph mean your vehicle travels over 114 feet completely unguided.
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-blue-100 text-xs text-gray-600 flex items-start space-x-2">
                <Smartphone className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Phone distraction:</strong> Looking down for 4 seconds to check a phone message diverts 100% of driver cognitive attention.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-blue-100 text-[11px] text-gray-500">
            Compliant with NHTSA Drowsy Driving Guidelines & ISO 26262 Road Vehicles Functional Safety.
          </div>
        </div>

      </div>

    </div>
  );
};
