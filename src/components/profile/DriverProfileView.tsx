/**
 * SafeDrive AI - Driver Identity & Telematics Profile View
 */

import React, { useState } from 'react';
import {
  UserCheck,
  Shield,
  Award,
  Car,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  Lock,
  Save
} from 'lucide-react';
import type { DriverProfile } from '../../types';
import { api } from '../../services/api';

interface DriverProfileViewProps {
  profile: DriverProfile | null;
  onProfileUpdated: (updated: DriverProfile) => void;
}

export const DriverProfileView: React.FC<DriverProfileViewProps> = ({
  profile,
  onProfileUpdated
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    emergencyContact: profile?.emergencyContact || '',
    vehicleModel: profile?.vehicleModel || '',
    licensePlate: profile?.licensePlate || '',
    driverLicense: profile?.driverLicense || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateProfile(formData);
      onProfileUpdated(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Update profile error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Profile Summary */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-md">
            {profile?.name ? profile.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'DR'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">{profile?.name || 'Driver'}</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Verified Driver
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              ID: <span className="font-mono">{profile?.id || 'prof_01'}</span> • Registered: {profile?.registrationDate || '2025-01-10'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right pr-4 border-r border-gray-200">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Cumulative Safety Rating</span>
            <div className="text-2xl font-bold text-emerald-600">{profile?.safetyRating || 100} / 100</div>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            id="driver-edit-profile-btn"
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {isEditing ? 'Cancel Editing' : 'Edit Telematics Profile'}
          </button>
        </div>
      </div>

      {/* Profile Details & Vehicle Specification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Driver Telematics Credentials */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
            Driver & Vehicle Credentials
          </h2>

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Driver License ID</label>
                  <input
                    type="text"
                    value={formData.driverLicense}
                    onChange={e => setFormData({ ...formData, driverLicense: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={formData.emergencyContact}
                    onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Vehicle Model</label>
                  <input
                    type="text"
                    value={formData.vehicleModel}
                    onChange={e => setFormData({ ...formData, vehicleModel: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">License Plate</label>
                  <input
                    type="text"
                    value={formData.licensePlate}
                    onChange={e => setFormData({ ...formData, licensePlate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-200"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-2 text-xs rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[11px] font-semibold text-gray-400 uppercase">Driver License</span>
                <div className="font-bold text-gray-900 mt-1 font-mono">{profile?.driverLicense || 'DL-99482-TX'}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[11px] font-semibold text-gray-400 uppercase">Account Email</span>
                <div className="font-bold text-gray-900 mt-1">{profile?.email || 'driver@safedrive.ai'}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[11px] font-semibold text-gray-400 uppercase">Contact Phone</span>
                <div className="font-bold text-gray-900 mt-1">{profile?.phone || '+1 (555) 382-9901'}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[11px] font-semibold text-gray-400 uppercase">Emergency Contact</span>
                <div className="font-bold text-gray-900 mt-1">{profile?.emergencyContact || 'Sarah Mercer (+1 555 382-9902)'}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[11px] font-semibold text-gray-400 uppercase">Connected Vehicle</span>
                <div className="font-bold text-gray-900 mt-1">{profile?.vehicleModel || '2024 Volvo EX90 (ADAS Pilot)'}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[11px] font-semibold text-gray-400 uppercase">License Plate</span>
                <div className="font-bold text-gray-900 mt-1 font-mono">{profile?.licensePlate || 'SFD-2026'}</div>
              </div>
            </div>
          )}

          {/* Cumulative Metrics Bar */}
          <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100">
              <span className="text-[10px] uppercase font-bold text-blue-600">Logged Sessions</span>
              <div className="text-lg font-bold text-gray-900 mt-0.5">{profile?.totalTrips || 0}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100">
              <span className="text-[10px] uppercase font-bold text-purple-600">Driving Hours</span>
              <div className="text-lg font-bold text-gray-900 mt-0.5">{profile?.totalDrivingHours?.toFixed(1) || '0.0'}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100">
              <span className="text-[10px] uppercase font-bold text-amber-600">Fatigue Incidents</span>
              <div className="text-lg font-bold text-gray-900 mt-0.5">{profile?.fatigueIncidentsTotal || 0}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-red-50/50 border border-red-100">
              <span className="text-[10px] uppercase font-bold text-red-600">Phone Violations</span>
              <div className="text-lg font-bold text-gray-900 mt-0.5">{profile?.phoneIncidentsTotal || 0}</div>
            </div>
          </div>
        </div>

        {/* Right: Certified Driver Safety Badges */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Certified Safety Badges</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Badges are strictly unlocked only when verifiable telemetry conditions are met in real driving sessions.
            </p>

            <div className="space-y-3">
              {profile?.badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    badge.earned 
                      ? 'bg-emerald-50/50 border-emerald-200' 
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-lg ${badge.earned ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-gray-500'}`}>
                        {badge.earned ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-xs font-bold text-gray-900">{badge.title}</span>
                    </div>
                    {badge.earned ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        UNLOCKED
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-gray-500">
                        LOCKED
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1.5 leading-snug">
                    {badge.description}
                  </p>
                  {badge.earnedAt && (
                    <div className="text-[10px] text-emerald-600 font-medium mt-1">
                      Awarded on {badge.earnedAt}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 text-[11px] text-gray-400">
            Automated verification via SafeDrive Telematics Engine.
          </div>
        </div>

      </div>

    </div>
  );
};
