/**
 * SafeDrive AI - Main Application Component
 * Driver Drowsiness, Distraction, and Phone Detection System
 */

import React, { useState, useEffect, useCallback } from 'react';

import type {
  Trip,
  DriverProfile,
  NotificationItem,
  SystemSettings,
  MLBenchmark,
  TelemetryPoint,
} from './types';

import { api } from './services/api';

import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { LiveMonitoringView } from './components/monitoring/LiveMonitoringView';
import { TripHistoryView } from './components/history/TripHistoryView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { DriverProfileView } from './components/profile/DriverProfileView';
import { NotificationCenterView } from './components/notification/NotificationCenterView';
import { SettingsView } from './components/settings/SettingsView';
import { AcademicVivaView } from './components/viva/AcademicVivaView';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  // Global application state
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [benchmarks, setBenchmarks] = useState<MLBenchmark[]>([]);
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);

  // Latest telemetry
  const [latestTelemetry, setLatestTelemetry] =
    useState<TelemetryPoint>({
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
      phoneConfidence: 0,
      roadAttention: 'FOCUSED_ON_ROAD',
      cnnEyeState: 'OPEN',
      cnnOpenProb: 0.95,
      contributingFactors: ['Driver road attention verified'],
    });

  // System settings
  const [settings, setSettings] = useState<SystemSettings>({
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
    localProcessingOnly: true,
  });

  // Load initial data from backend
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [
        tripsData,
        activeTripData,
        profileData,
        notifsData,
        settingsData,
        benchmarksData,
      ] = await Promise.all([
        api.getTrips(),
        api.getActiveTrip(),
        api.getProfile(),
        api.getNotifications(),
        api.getSettings(),
        api.getBenchmarks(),
      ]);

      setTrips(tripsData);
      setActiveTrip(activeTripData);
      setProfile(profileData);
      setNotifications(notifsData);
      setSettings(settingsData);
      setBenchmarks(benchmarksData);
    } catch (error) {
      console.warn(
        'Backend load notice. Using fallback defaults:',
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data loading
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Periodically refresh notifications
  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const notifs = await api.getNotifications();
        setNotifications(notifs);
      } catch {
        // Ignore notification refresh errors
      }
    }, 12000);

    return () => window.clearInterval(interval);
  }, []);

  // Trip started
  const handleTripStarted = (trip: Trip) => {
    setActiveTrip(trip);

    setTrips((previousTrips) => [
      trip,
      ...previousTrips.filter(
        (existingTrip) => existingTrip.id !== trip.id
      ),
    ]);
  };

  // Trip completed
  const handleTripCompleted = (completedTrip: Trip) => {
    setActiveTrip(null);

    setTrips((previousTrips) => [
      completedTrip,
      ...previousTrips.filter(
        (existingTrip) => existingTrip.id !== completedTrip.id
      ),
    ]);

    api.getProfile().then(setProfile).catch(() => {});
    api.getNotifications().then(setNotifications).catch(() => {});
  };

  // Telemetry update
  const handleTelemetryUpdate = (telemetry: TelemetryPoint) => {
    setLatestTelemetry(telemetry);
  };

  // Clear trip history
  const handleClearAllHistory = async () => {
    try {
      await api.clearAllTrips();

      setTrips([]);
      setActiveTrip(null);

      const updatedProfile = await api.getProfile();
      setProfile(updatedProfile);
    } catch (error) {
      console.error('Clear history error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col font-sans selection:bg-blue-500 selection:text-white">

      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        profile={profile}
        activeTrip={activeTrip}
        notifications={notifications}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() =>
          setSidebarOpen((previous) => !previous)
        }
        onNavigate={setActiveTab}
        isSimulationMode={isSimulationMode}
        onToggleSimulation={() =>
          setIsSimulationMode((previous) => !previous)
        }
      />

      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onNavigate={setActiveTab}
          isOpen={sidebarOpen}
          isSimulationMode={isSimulationMode}
          onToggleSimulation={() =>
            setIsSimulationMode((previous) => !previous)
          }
          unreadNotificationsCount={
            notifications.filter(
              (notification) => !notification.isRead
            ).length
          }
        />

        {/* Main content */}
        <main
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full"
          style={{ backgroundColor: '#fcd3d3' }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />

              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Initializing SafeDrive AI Telematics Engine...
              </p>
            </div>
          ) : (
            <>
              {/* Dashboard */}
              {activeTab === 'dashboard' && (
                <DashboardView
                  trips={trips}
                  activeTrip={activeTrip}
                  profile={profile}
                  settings={settings}
                  liveTelemetry={latestTelemetry}
                  onNavigate={setActiveTab}
                  onStartTrip={() =>
                    setActiveTab('monitoring')
                  }
                />
              )}

              {/* Live Monitoring */}
              {activeTab === 'monitoring' && (
                <LiveMonitoringView
                  settings={settings}
                  activeTrip={activeTrip}
                  isSimulationMode={isSimulationMode}
                  onToggleSimulation={() =>
                    setIsSimulationMode(
                      (previous) => !previous
                    )
                  }
                  onTripStarted={handleTripStarted}
                  onTripCompleted={handleTripCompleted}
                  onTelemetryUpdate={handleTelemetryUpdate}
                />
              )}

              {/* Trip History */}
              {activeTab === 'history' && (
                <TripHistoryView
                  trips={trips}
                  onRefreshTrips={async () => {
                    const freshTrips = await api.getTrips();
                    setTrips(freshTrips);
                  }}
                  onNavigate={setActiveTab}
                />
              )}

              {/* Analytics */}
              {activeTab === 'analytics' && (
                <AnalyticsView
                  trips={trips}
                  profile={profile}
                  onNavigate={setActiveTab}
                />
              )}

              {/* Driver Profile */}
              {activeTab === 'profile' && (
                <DriverProfileView
                  profile={profile}
                  onProfileUpdated={setProfile}
                />
              )}

              {/* Notifications */}
              {activeTab === 'notifications' && (
                <NotificationCenterView
                  notifications={notifications}
                  onRefreshNotifications={async () => {
                    const freshNotifications =
                      await api.getNotifications();

                    setNotifications(freshNotifications);
                  }}
                  onNavigate={setActiveTab}
                />
              )}

              {/* Settings */}
              {activeTab === 'settings' && (
                <SettingsView
                  settings={settings}
                  onSettingsUpdated={setSettings}
                  onClearAllHistory={handleClearAllHistory}
                />
              )}

              {/* Academic Viva */}
              {activeTab === 'viva' && (
                <AcademicVivaView
                  benchmarks={benchmarks}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
``