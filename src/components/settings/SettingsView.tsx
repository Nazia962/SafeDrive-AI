/**
 * SafeDrive AI - System & Telemetry Settings View
 */

import React, { useState } from 'react';
import {
  Sliders,
  Eye,
  Smartphone,
  Volume2,
  Shield,
  Layers,
  Trash2,
  Save,
  RotateCcw,
  Check,
  Download,
  FileJson
} from 'lucide-react';
import type { SystemSettings } from '../../types';
import { api } from '../../services/api';

interface SettingsViewProps {
  settings: SystemSettings;
  onSettingsUpdated: (updated: SystemSettings) => void;
  onClearAllHistory: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSettingsUpdated,
  onClearAllHistory
}) => {
  const [formData, setFormData] = useState<SystemSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownload = async (filename: 'safedrive.json' | 'safadrive.json' = 'safedrive.json') => {
    setDownloading(true);
    try {
      await api.downloadDatabase(filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Download database error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateSettings(formData);
      onSettingsUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Settings save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!window.confirm('Reset all thresholds and configuration to baseline factory defaults?')) return;
    const defaults: SystemSettings = {
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
    setFormData(defaults);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System & Telemetry Settings</h1>
          <p className="mt-1 text-xs text-gray-600">
            Configure biometric thresholds, neural object detection parameters, acoustic alarms, and privacy policies.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 flex items-center space-x-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            id="settings-save-btn"
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center space-x-1.5 shadow-xs"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>{savedSuccess ? 'Settings Saved!' : saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Biometric Settings */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-gray-100 text-gray-900 font-bold text-sm">
            <Eye className="w-4 h-4 text-blue-600" />
            <span>Biometric Vision Thresholds</span>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
              <span>EAR Closure Threshold: {formData.earClosureThreshold}</span>
              <span className="text-gray-400 font-normal">Default: 0.22</span>
            </div>
            <input
              type="range"
              min="0.15"
              max="0.30"
              step="0.01"
              value={formData.earClosureThreshold}
              onChange={e => setFormData({ ...formData, earClosureThreshold: parseFloat(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Frames where Eye Aspect Ratio falls below this value are classified as closed eyelids.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
              <span>Prolonged Eye Closure (Microsleep): {formData.prolongedClosureSeconds}s</span>
              <span className="text-gray-400 font-normal">Default: 1.2s</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="2.5"
              step="0.1"
              value={formData.prolongedClosureSeconds}
              onChange={e => setFormData({ ...formData, prolongedClosureSeconds: parseFloat(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Consecutive eyelid closure exceeding this trigger activates high-priority audio microsleep alert.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
              <span>MAR Yawn Threshold: {formData.marYawnThreshold}</span>
              <span className="text-gray-400 font-normal">Default: 0.58</span>
            </div>
            <input
              type="range"
              min="0.45"
              max="0.75"
              step="0.01"
              value={formData.marYawnThreshold}
              onChange={e => setFormData({ ...formData, marYawnThreshold: parseFloat(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Mouth Aspect Ratio exceeding this value flags potential yawning episodes.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
              <span>PERCLOS Window Fatigue Threshold: {formData.perclosFatigueThreshold}%</span>
              <span className="text-gray-400 font-normal">Default: 30%</span>
            </div>
            <input
              type="range"
              min="15"
              max="50"
              step="1"
              value={formData.perclosFatigueThreshold}
              onChange={e => setFormData({ ...formData, perclosFatigueThreshold: parseInt(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Proportion of eyelid closure time across rolling 60-second window before declaring clinical fatigue.
            </p>
          </div>
        </div>

        {/* 2. Phone Detection Settings */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-gray-100 text-gray-900 font-bold text-sm">
            <Smartphone className="w-4 h-4 text-red-600" />
            <span>Mobile Phone Object Detection Engine</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
            <div>
              <div className="text-xs font-bold text-gray-900">Enable Real-Time Phone Detection</div>
              <div className="text-[11px] text-gray-500">TF.js COCO-SSD MobileNet v2 neural object detector</div>
            </div>
            <input
              type="checkbox"
              checked={formData.phoneDetectionEnabled}
              onChange={e => setFormData({ ...formData, phoneDetectionEnabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
              <span>Phone Confidence Threshold: {(formData.phoneConfidenceThreshold * 100).toFixed(0)}%</span>
              <span className="text-gray-400 font-normal">Default: 65%</span>
            </div>
            <input
              type="range"
              min="0.40"
              max="0.85"
              step="0.05"
              value={formData.phoneConfidenceThreshold}
              onChange={e => setFormData({ ...formData, phoneConfidenceThreshold: parseFloat(e.target.value) })}
              className="w-full accent-blue-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
              <span>Temporal Confirmation Frames: {formData.phoneConfirmationFrames} frames (~0.7s)</span>
              <span className="text-gray-400 font-normal">Default: 5 frames</span>
            </div>
            <input
              type="range"
              min="2"
              max="15"
              step="1"
              value={formData.phoneConfirmationFrames}
              onChange={e => setFormData({ ...formData, phoneConfirmationFrames: parseInt(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Phone must remain visible for N consecutive frames before confirming distraction to eliminate false alarms.
            </p>
          </div>
        </div>

        {/* 3. Audio & Voice Warnings */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-gray-100 text-gray-900 font-bold text-sm">
            <Volume2 className="w-4 h-4 text-amber-600" />
            <span>Acoustic Alarm & Spoken Voice Warnings</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
            <div>
              <div className="text-xs font-bold text-gray-900">Synthetic Dual-Tone Acoustic Chimes</div>
              <div className="text-[11px] text-gray-500">Oscillating 980Hz/780Hz warning sounds via Web Audio API</div>
            </div>
            <input
              type="checkbox"
              checked={formData.acousticAlertsEnabled}
              onChange={e => setFormData({ ...formData, acousticAlertsEnabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
            <div>
              <div className="text-xs font-bold text-gray-900">Spoken Voice Warnings</div>
              <div className="text-[11px] text-gray-500">Natural voice prompts ("Warning. Put your phone away")</div>
            </div>
            <input
              type="checkbox"
              checked={formData.voiceWarningsEnabled}
              onChange={e => setFormData({ ...formData, voiceWarningsEnabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
              <span>Alert Volume: {formData.alertVolume}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={formData.alertVolume}
              onChange={e => setFormData({ ...formData, alertVolume: parseInt(e.target.value) })}
              className="w-full accent-blue-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
              <span>Alarm Cooldown: {formData.alertCooldownSeconds}s</span>
              <span className="text-gray-400 font-normal">Prevents alarm fatigue</span>
            </div>
            <input
              type="range"
              min="2"
              max="10"
              step="1"
              value={formData.alertCooldownSeconds}
              onChange={e => setFormData({ ...formData, alertCooldownSeconds: parseFloat(e.target.value) })}
              className="w-full accent-blue-600"
            />
          </div>
        </div>

        {/* 4. Risk Engine Sensitivity & Privacy */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-gray-100 text-gray-900 font-bold text-sm">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Risk Sensitivity & Privacy Controls</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Risk Engine Sensitivity Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['LOW', 'NORMAL', 'HIGH'] as const).map(lvl => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setFormData({ ...formData, sensitivity: lvl })}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                    formData.sensitivity === lvl 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' 
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              HIGH sensitivity is recommended for commercial night transport and highway driving.
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <div className="text-xs font-bold text-gray-900 mb-1">Edge Computing & Privacy Guarantee</div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              SafeDrive AI processes all camera video streams client-side in browser memory. Raw video is
              never transmitted or stored on cloud servers. Only derived numerical telemetry (EAR, MAR, PERCLOS) is retained.
            </p>
          </div>

          {/* Database Download / Export */}
          <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
                <FileJson className="w-4 h-4 text-blue-600" />
                <span>Download Database (safedrive.json)</span>
              </div>
              <div className="text-[11px] text-gray-500">
                Export complete atomic JSON store (trips, events, telemetry logs, driver profiles)
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                id="download-safedrive-json-btn"
                onClick={() => handleDownload('safedrive.json')}
                disabled={downloading}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center space-x-1.5 transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading ? 'Downloading...' : 'Download safedrive.json'}</span>
              </button>
              <a
                href="/safedrive.json"
                download="safedrive.json"
                className="px-2.5 py-1.5 text-xs font-medium rounded-xl text-gray-600 border border-gray-200 hover:bg-gray-50"
                title="Direct link download fallback"
              >
                Direct Link
              </a>
            </div>
          </div>

          {downloadSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Database file downloaded successfully.</span>
            </div>
          )}

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-red-600">Erase All Driving Telemetry</div>
              <div className="text-[11px] text-gray-500">Purge all logged trips and biometrics</div>
            </div>
            <button
              type="button"
              onClick={onClearAllHistory}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-red-200 text-red-600 hover:bg-red-50"
            >
              Erase Records
            </button>
          </div>
        </div>

      </form>

    </div>
  );
};
