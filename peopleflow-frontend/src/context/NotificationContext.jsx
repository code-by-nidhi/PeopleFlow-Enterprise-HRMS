import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL, tokenStore, refreshSession } from '../api/client';
import { notificationsApi } from '../api/endpoints';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getPreference } from '../utils/preferences';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated, user, refreshProfile } = useAuth();
  const toast = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  // Incremented on every real-time event so pages can refetch their data
  const [version, setVersion] = useState(0);
  // Exposed so pages such as the office QR kiosk can subscribe to their own events
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const userId = user?._id;

  const refreshUnread = useCallback(async () => {
    try {
      const res = await notificationsApi.list({ limit: 1 });
      setUnreadCount(res.data.meta.unreadCount);
    } catch {
      // Badge simply stays as-is
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setUnreadCount(0);
      return undefined;
    }

    refreshUnread();

    const socket = io(API_URL, {
      // Evaluated on every (re)connect so an expired token is never reused
      auth: (cb) => cb({ token: tokenStore.get() }),
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;
    setSocket(socket);

    socket.on('connect_error', async (error) => {
      if (/token|auth/i.test(error.message)) {
        try {
          await refreshSession();
          socket.connect();
        } catch {
          socket.disconnect();
        }
      }
    });

    socket.on('notification', (notification) => {
      setUnreadCount((count) => count + 1);
      setVersion((v) => v + 1);
      toast.info(notification.title, notification.message);

      if (notification.type === 'leave' || notification.type === 'account') refreshProfile();

      if (getPreference('desktopNotifications') && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, { body: notification.message, icon: '/favicon.svg' });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [isAuthenticated, userId, refreshUnread, refreshProfile, toast]);

  const value = useMemo(() => ({
    unreadCount,
    setUnreadCount,
    refreshUnread,
    version,
    socket,
  }), [unreadCount, refreshUnread, version, socket]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used inside NotificationProvider');
  return context;
}
