/**
 * SafeDrive AI - Top Navigation Bar
 */

import React from 'react';
import { 
  ShieldAlert, 
  Video, 
  SlidersHorizontal, 
  Bell, 
  User, 
  CircleDot,
  Radio,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Menu
} from 'lucide-react';
import type { RiskLevel, User as UserType, DriverProfile, Trip, NotificationItem } from '../../types';

interface NavbarProps {
  currentTab?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
  isMonitoring?: boolean;
  activeTrip?: Trip | null;
  riskLevel?: RiskLevel;
  riskScore?: number;
  isSimulationMode?: boolean;
  onToggleSimulation?: () => void;
  unreadNotificationsCount?: number;
  notifications?: NotificationItem[];
  profile?: DriverProfile | null;
  user?: UserType | null;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  activeTab,
  onTabChange,
  onNavigate,
  isMonitoring,
  activeTrip,
  riskLevel = 'LOW',
  riskScore = 10,
  isSimulationMode = false,
  onToggleSimulation,
  unreadNotificationsCount,
  notifications,
  profile,
  user,
  sidebarOpen,
  onToggleSidebar,
  onOpenAuth,
  onLogout
}) => {
  const handleTab = (tab: string) => {
    if (typeof onTabChange === 'function') {
      onTabChange(tab);
    }
    if (typeof onNavigate === 'function') {
      onNavigate(tab);
    }
  };

  const effectiveRiskLevel = riskLevel;
  const effectiveScore = riskScore;
  const effectiveUnread = unreadNotificationsCount ?? (notifications ? notifications.filter(n => !n.isRead).length : 0);
  const effectiveUser = user || (profile ? { id: profile.id, name: profile.name, email: profile.email, role: 'DRIVER' as const } : null);
  const effectiveMonitoring = isMonitoring ?? !!activeTrip;

  const getRiskBadge = () => {
    switch (effectiveRiskLevel) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200',
          dot: 'bg-red-500 animate-ping',
          label: `CRITICAL RISK (${effectiveScore}%)`
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-50 text-orange-700 border-orange-200',
          dot: 'bg-orange-500 animate-pulse',
          label: `HIGH RISK (${effectiveScore}%)`
        };
      case 'MODERATE':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          label: `MODERATE RISK (${effectiveScore}%)`
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          label: `LOW RISK (${effectiveScore}%)`
        };
    }
  };

  const riskBadge = getRiskBadge();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 shadow-xs" style={{ backgroundColor: '#b3fcba' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between" style={{ backgroundColor: '#b3fcba' }}>
        
        {/* Brand Logo & Product Title */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleTab('dashboard')}>
          {onToggleSidebar && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSidebar();
              }}
              className="md:hidden p-1.5 -ml-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs" style={{ backgroundColor: '#fa0e6e' }}>
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-gray-900 text-lg tracking-tight">SafeDrive AI</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">Driver Fatigue & Distraction Platform</p>
          </div>
        </div>

        {/* Center Live Stream & Status Pill */}
        <div className="hidden md:flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${riskBadge.bg}`}>
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${riskBadge.dot}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${effectiveRiskLevel === 'CRITICAL' ? 'bg-red-600' : 'bg-emerald-600'}`}></span>
            </span>
            <span>Live AI Stream | {riskBadge.label}</span>
          </div>

          {effectiveMonitoring && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 animate-pulse">
              <Radio className="w-3 h-3 mr-1" />
              Active Trip Recording
            </span>
          )}
        </div>

        {/* Actions & Driver Profile */}
        <div className="flex items-center space-x-3">
          
          {/* Simulation Toggle */}
          {onToggleSimulation && (
            <button
              onClick={onToggleSimulation}
              id="simulation-toggle-btn"
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center space-x-1.5 ${
                isSimulationMode 
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs' 
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
              title="Toggle academic demonstration scenarios"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isSimulationMode ? 'Simulation: ON' : 'Simulation Mode'}</span>
            </button>
          )}

          {/* Notifications Button */}
          <button
            onClick={() => handleTab('notifications')}
            id="navbar-notifications-btn"
            className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {effectiveUnread > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-600 rounded-full px-1">
                {effectiveUnread}
              </span>
            )}
          </button>

          {/* User Profile / Auth */}
          {effectiveUser ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-gray-200">
              <div 
                className="flex items-center space-x-2 cursor-pointer group"
                onClick={() => handleTab('profile')}
              >
                <div 
                  className="w-8 h-8 rounded-full border border-blue-300 flex items-center justify-center font-bold"
                  style={{ color: '#fa0e6e', backgroundColor: '#e5e0e0', fontSize: '13px', lineHeight: '46px' }}
                >
                  {effectiveUser.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div className="hidden sm:block text-left">
                  <div 
                    className="font-semibold text-gray-900 group-hover:text-blue-600 truncate"
                    style={{ width: '57.1875px', fontSize: '15px' }}
                  >
                    {effectiveUser.name}
                  </div>
                  <div className="text-gray-500" style={{ fontSize: '13px' }}>Driver</div>
                </div>
              </div>
              {onLogout && (
                <button 
                  onClick={onLogout}
                  className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                >
                  Sign Out
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                if (onOpenAuth) onOpenAuth();
                else handleTab('profile');
              }}
              id="navbar-signin-btn"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
            >
              Sign In
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
