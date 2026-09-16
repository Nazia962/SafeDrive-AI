/**
 * SafeDrive AI - Trip History View
 * Search, Risk Filtering, Sorting, Deep Session Diagnostics, and Telemetry Inspection
 */

import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  ArrowUpDown,
  Car,
  AlertTriangle,
  Smartphone,
  Eye,
  Trash2,
  ExternalLink,
  Clock,
  ShieldCheck,
  X,
  Download,
  FileJson
} from 'lucide-react';
import type { Trip, RiskLevel } from '../../types';
import { api } from '../../services/api';

interface TripHistoryViewProps {
  trips: Trip[];
  onRefreshTrips: () => void;
  onNavigate: (tab: string) => void;
}

export const TripHistoryView: React.FC<TripHistoryViewProps> = ({
  trips,
  onRefreshTrips,
  onNavigate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | RiskLevel>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'duration'>('date');
  const [inspectTrip, setInspectTrip] = useState<Trip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadDatabase = async () => {
    setIsDownloading(true);
    try {
      await api.downloadDatabase('safedrive.json');
    } catch (err) {
      console.error('Download database error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Filter & Sort Logic
  const filteredTrips = trips
    .filter(t => {
      const matchesSearch = t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        new Date(t.startTime).toLocaleDateString().includes(searchTerm);
      
      const tripRiskLevel: RiskLevel = t.maxRisk >= 80 ? 'CRITICAL' : t.maxRisk >= 60 ? 'HIGH' : t.maxRisk >= 35 ? 'MODERATE' : 'LOW';
      const matchesRisk = riskFilter === 'ALL' || tripRiskLevel === riskFilter;

      return matchesSearch && matchesRisk;
    })
    .sort((a, b) => {
      if (sortBy === 'score') return b.safetyScore - a.safetyScore;
      if (sortBy === 'duration') return b.durationSeconds - a.durationSeconds;
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });

  const handleDeleteTrip = async (id: string) => {
    if (!window.confirm('Delete this trip record permanently from database?')) return;
    try {
      await api.deleteTrip(id);
      if (inspectTrip?.id === id) setInspectTrip(null);
      onRefreshTrips();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Erase all trip history records permanently? This cannot be undone.')) return;
    try {
      setIsDeleting(true);
      await api.clearAllTrips();
      setInspectTrip(null);
      onRefreshTrips();
    } catch (err) {
      console.error('Clear all error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Trip History & Incident Logs</h1>
          <p className="mt-1 text-xs text-gray-600">
            Database-backed driving telemetry records, risk evaluations, and safety interventions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadDatabase}
            disabled={isDownloading}
            id="trip-download-json-btn"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 flex items-center space-x-1.5 transition-colors shadow-2xs"
            title="Download database file (safedrive.json)"
          >
            <FileJson className="w-3.5 h-3.5" />
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? 'Downloading...' : 'Download safedrive.json'}</span>
          </button>

          {trips.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isDeleting}
              id="trip-clear-all-btn"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 flex items-center space-x-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Clearing...' : 'Clear All History'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Trip ID or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          
          {/* Risk Level Filter */}
          <div className="flex items-center space-x-1 bg-gray-50 p-1 rounded-xl border border-gray-200 text-xs">
            {(['ALL', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setRiskFilter(lvl)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  riskFilter === lvl 
                    ? 'bg-white text-gray-900 shadow-2xs font-bold' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 font-medium focus:outline-hidden"
          >
            <option value="date">Sort: Recent First</option>
            <option value="score">Sort: Safety Score</option>
            <option value="duration">Sort: Trip Duration</option>
          </select>

        </div>

      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {filteredTrips.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-800">No trips recorded yet.</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Initiate a live monitoring session in the Live Monitoring Hub to log real biometric telemetry into the database.
            </p>
            <button
              onClick={() => onNavigate('monitoring')}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 shadow-xs"
            >
              Start Live Monitoring
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4">Trip ID</th>
                  <th className="py-3.5 px-4">Start Time</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Safety Score</th>
                  <th className="py-3.5 px-4">Peak Risk</th>
                  <th className="py-3.5 px-4">Phone Events</th>
                  <th className="py-3.5 px-4">Fatigue Events</th>
                  <th className="py-3.5 px-4">Alerts</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTrips.map((trip) => {
                  const durationMin = Math.round((trip.durationSeconds || 0) / 60);
                  const isCritical = trip.maxRisk >= 80;
                  const isHigh = trip.maxRisk >= 60 && trip.maxRisk < 80;

                  return (
                    <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        #{trip.id.substring(trip.id.length - 8)}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {new Date(trip.startTime).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 font-medium">
                        {durationMin} min
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          trip.safetyScore >= 85 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          trip.safetyScore >= 70 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {trip.safetyScore} / 100
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`font-semibold ${isCritical ? 'text-red-600' : isHigh ? 'text-orange-600' : 'text-gray-700'}`}>
                          {trip.maxRisk}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {trip.phoneDistractionEventsCount > 0 ? (
                          <span className="text-red-600 font-bold flex items-center space-x-1">
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>{trip.phoneDistractionEventsCount}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {trip.drowsinessEventsCount > 0 ? (
                          <span className="text-amber-600 font-bold flex items-center space-x-1">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{trip.drowsinessEventsCount}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 font-medium">
                        {trip.totalAlertsCount}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setInspectTrip(trip)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => handleDeleteTrip(trip.id)}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deep Inspection Modal / Drawer */}
      {inspectTrip && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-xl border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Session Diagnostics</span>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                  Trip #{inspectTrip.id.substring(inspectTrip.id.length - 8)}
                </h3>
              </div>
              <button
                onClick={() => setInspectTrip(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="text-[11px] font-semibold text-gray-500 uppercase">Safety Score</span>
                <div className="text-lg font-bold text-gray-900">{inspectTrip.safetyScore} / 100</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="text-[11px] font-semibold text-gray-500 uppercase">Duration</span>
                <div className="text-lg font-bold text-gray-900">{Math.round(inspectTrip.durationSeconds / 60)} min</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="text-[11px] font-semibold text-gray-500 uppercase">Phone Events</span>
                <div className="text-lg font-bold text-red-600">{inspectTrip.phoneDistractionEventsCount}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="text-[11px] font-semibold text-gray-500 uppercase">Fatigue Events</span>
                <div className="text-lg font-bold text-amber-600">{inspectTrip.drowsinessEventsCount}</div>
              </div>
            </div>

            {/* Event Log inside Trip */}
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Recorded Incident Events ({inspectTrip.events.length})
              </h4>
              {inspectTrip.events.length === 0 ? (
                <p className="text-xs text-gray-500 italic p-3 bg-gray-50 rounded-xl">
                  No high-risk fatigue or phone distraction events occurred during this session.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {inspectTrip.events.map((ev, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-gray-900">
                          {'type' in ev ? ev.type : 'PHONE_USAGE'}
                        </span>
                        <span className="text-gray-500 ml-2 font-mono">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <span className="font-bold text-red-600">
                        {ev.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setInspectTrip(null)}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold text-xs hover:bg-gray-800"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
