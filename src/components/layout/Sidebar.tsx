/**
 * SafeDrive AI - Sidebar Navigation
 */

import React from 'react';
import {
  LayoutDashboard,
  Video,
  History,
  BarChart3,
  UserCheck,
  Bell,
  Settings
} from 'lucide-react';

interface SidebarProps {
  currentTab?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onSelectTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
  unreadCount?: number;
  unreadNotificationsCount?: number;
  isOpen?: boolean;
  isSimulationMode?: boolean;
  onToggleSimulation?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  activeTab,
  onTabChange,
  onSelectTab,
  onNavigate,
  unreadCount,
  unreadNotificationsCount,
  isOpen = true
}) => {
  const handleTab = (tab: string) => {
    if (typeof onTabChange === 'function') {
      onTabChange(tab);
    }
    if (typeof onSelectTab === 'function') {
      onSelectTab(tab);
    }
    if (typeof onNavigate === 'function') {
      onNavigate(tab);
    }
  };

  const active = activeTab || currentTab || 'dashboard';
  const effectiveUnread = unreadNotificationsCount ?? unreadCount ?? 0;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'monitoring', label: 'Live Monitoring', icon: Video, badge: 'Live AI' },
    { id: 'history', label: 'Trip History', icon: History },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'profile', label: 'Driver Profile', icon: UserCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell, count: effectiveUnread },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const getItemStyle = (id: string) => {
    switch (id) {
      case 'monitoring':
        return { backgroundColor: '#f7f0f0' };
      case 'history':
        return { backgroundColor: '#f6f3f3' };
      case 'analytics':
        return { backgroundColor: '#f6f1f1' };
      case 'profile':
        return { backgroundColor: '#f8efef' };
      case 'notifications':
        return { backgroundColor: '#f9f5f5' };
      case 'settings':
        return { backgroundColor: '#fff6f6' };
      default:
        return undefined;
    }
  };

  return (
    <aside 
      className={`${isOpen ? 'flex' : 'hidden md:flex'} w-64 bg-white border-r border-gray-200 flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]`}
      style={{ backgroundColor: '#b3fcba', color: '#271028', borderColor: '#ebe5eb' }}
    >
      <div className="p-4 space-y-1" style={{ backgroundColor: '#b3fcba' }}>
        <div 
          className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: '#000000', backgroundColor: '#b3fcba' }}
        >
          Platform Navigation
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            const customStyle = getItemStyle(item.id);

            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleTab(item.id)}
                style={customStyle}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon 
                    className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} 
                    style={item.id === 'dashboard' ? { backgroundColor: '#fbf8f8', color: '#fa0e6e' } : undefined}
                  />
                  <span
                    style={item.id === 'dashboard' ? { backgroundColor: '#f2e3e3', borderColor: '#9714e6', color: '#fa0e6e' } : undefined}
                  >
                    {item.label}
                  </span>
                </div>

                {item.badge && (
                  <span 
                    className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700"
                    style={item.id === 'monitoring' ? { color: '#fa0f6e', backgroundColor: '#f6dada' } : undefined}
                  >
                    {item.badge}
                  </span>
                )}

                {item.count !== undefined && item.count > 0 && (
                  <span 
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700"
                    style={item.id === 'notifications' ? { backgroundColor: '#f6dada' } : undefined}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
