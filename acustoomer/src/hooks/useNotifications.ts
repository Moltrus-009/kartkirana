import { useCallback, useEffect, useMemo, useState } from 'react';
import { NotificationItem } from '../types';
import { dbService } from '../services/dbService';

export const useNotifications = (userId?: string) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      setNotifications(await dbService.getNotifications(userId));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markRead = useCallback(async (notificationId: string) => {
    if (!userId) return;
    setNotifications(current => current.map(item => item.id === notificationId ? { ...item, read: true } : item));
    await dbService.markNotificationRead(userId, notificationId);
  }, [userId]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const unread = notifications.filter(item => !item.read);
    setNotifications(current => current.map(item => ({ ...item, read: true })));
    await Promise.all(unread.map(item => dbService.markNotificationRead(userId, item.id)));
  }, [notifications, userId]);

  const unreadCount = useMemo(() => notifications.filter(item => !item.read).length, [notifications]);

  return { notifications, unreadCount, loading, refresh, markRead, markAllRead };
};
