/**
 * SafeDrive AI - Notification Center View
 * Auto-generated safety notifications with filtering and read status
 */

import React, { useState } from 'react';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Smartphone,
  Eye,
  Info,
  Trash2,
  CheckCheck,
  Filter
} from 'lucide-react';
import type { NotificationItem } from '../../types';
import { api } from '../../services/api';

interface NotificationCenterViewProps {
  notifications: NotificationItem[];
  onRefreshNotifications: () => void;
  onNavigate: (tab: string) => void;
}

export const NotificationCenterView: React.FC<NotificationCenterViewProps> = ({
  notifications,
  onRefreshNotifications,
  onNavigate
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filtered = notifications.filter(n => {
    if (filterType === 'ALL') return true;
    if (filterType === 'UNREAD') return !n.isRead;
    return n.type === filterType;
  });

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      onRefreshNotifications();
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      onRefreshNotifications();
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteNotification(id);
      onRefreshNotifications();
    } catch (err) {
      console.error('Delete notification error:', err);
    }
  };

  const getIcon = (type: string, severity: string) => {
    if (type === 'PHONE') return <Smartphone className="w-4 h-4 text-red-600" />;
    if (type === 'DROWSINESS') return <Eye className="w-4 h-4 text-amber-600" />;
    if (severity === 'CRITICAL') return <AlertTriangle className="w-4 h-4 text-red-600" />;
    return <Info className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Safety Notification Center</h1>
          <p className="mt-1 text-xs text-gray-600">
            Real-time audit log of fatigue alerts, phone distraction interventions, and completed trip reports.
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            id="notif-mark-all-read-btn"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 flex items-center space-x-1.5 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {['ALL', 'UNREAD', 'PHONE', 'DROWSINESS', 'TRIP', 'SYSTEM'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterType(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterType === cat
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-800">No notifications in this view.</h3>
            <p className="text-xs text-gray-500 mt-1">
              Safety interventions and trip reports will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`p-4 transition-colors flex items-start justify-between gap-4 ${
                  item.isRead ? 'bg-white hover:bg-gray-50/60' : 'bg-blue-50/30 hover:bg-blue-50/50'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div className={`p-2 rounded-xl border mt-0.5 shrink-0 ${
                    item.severity === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                    item.severity === 'HIGH' ? 'bg-orange-50 border-orange-200' :
                    item.severity === 'WARNING' ? 'bg-amber-50 border-amber-200' :
                    'bg-blue-50 border-blue-200'
                  }`}>
                    {getIcon(item.type, item.severity)}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-gray-900">{item.title}</span>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      )}
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        item.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                        item.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                        item.severity === 'WARNING' ? 'bg-amber-100 text-amber-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.severity}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex items-center space-x-3 mt-2 text-[11px] text-gray-400">
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                      {item.tripId && (
                        <>
                          <span>•</span>
                          <button
                            onClick={() => onNavigate('history')}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            Related Trip #{item.tripId.substring(item.tripId.length - 6)}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  {!item.isRead && (
                    <button
                      onClick={() => handleMarkRead(item.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                      title="Mark as read"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100 transition-colors"
                    title="Dismiss notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
