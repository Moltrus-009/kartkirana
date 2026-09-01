import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCheck, Gift, PackageCheck, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationItem } from '../types';

const getNotificationIcon = (type: NotificationItem['type']) => {
  if (type === 'offer') return Gift;
  if (type === 'delivery') return Truck;
  if (type === 'order') return PackageCheck;
  return Bell;
};

const formatNotificationTime = (value: unknown) => {
  const source = value as { toDate?: () => Date };
  const date = source?.toDate ? source.toDate() : new Date(String(value));
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications(user?.uid);

  const openNotification = async (notification: NotificationItem) => {
    if (!notification.read) await markRead(notification.id);
    if (notification.link?.startsWith('/')) navigate(notification.link);
  };

  return (
    <div className="app-flow-page w-full overflow-x-hidden pb-24 text-left">
      <div className="app-page-header sticky top-0 z-30 -mx-3 mb-4 flex items-center justify-between px-3 py-3.5">
        <div className="flex items-center gap-2.5">
          <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="app-icon-button">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white">Notifications</h1>
            <p className="text-[10px] font-bold text-slate-400">{unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'You are all caught up'}</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => void markAllRead()} className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-black text-[#0B74E8] hover:bg-blue-50 dark:hover:bg-blue-950/30">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(item => <div key={item} className="h-24 rounded-[20px] shimmer" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex min-h-[65vh] flex-col items-center justify-center px-8 text-center">
          <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-[#0B74E8] dark:bg-blue-950/30">
            <Bell className="h-11 w-11" />
          </div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">No notifications yet</h2>
          <p className="mt-2 max-w-sm text-xs font-semibold leading-relaxed text-slate-400">Order, delivery and offer updates meant for your account will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notification => {
            const Icon = getNotificationIcon(notification.type);
            return (
              <button
                key={notification.id}
                onClick={() => void openNotification(notification)}
                className={`flex w-full gap-3 rounded-[20px] border p-4 text-left shadow-[0_8px_24px_-20px_rgba(5,10,36,0.45)] transition ${notification.read ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800' : 'border-blue-200 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-950/25'}`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${notification.read ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300' : 'bg-[#0B74E8] text-white'}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <strong className="text-xs font-black text-slate-900 dark:text-white">{notification.title}</strong>
                    {!notification.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                  </span>
                  <span className="mt-1 block text-[11px] font-semibold leading-relaxed text-slate-500 dark:text-slate-300">{notification.body}</span>
                  <span className="mt-2 block text-[9px] font-bold uppercase tracking-wide text-slate-400">{formatNotificationTime(notification.createdAt)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
