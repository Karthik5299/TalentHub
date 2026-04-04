import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

// ── Events — must match backend EVENTS object ──────────────
export const EVENTS = {
  LEAVE_APPLIED:     'leave:applied',
  LEAVE_REVIEWED:    'leave:reviewed',
  LEAVE_CANCELLED:   'leave:cancelled',
  CLOCK_IN:          'attendance:clockIn',
  CLOCK_OUT:         'attendance:clockOut',
  PAYROLL_GENERATED: 'payroll:generated',
  REFRESH:           'refresh',
};

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { user }      = useAuth();
  const socketRef     = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Only connect when user is logged in
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Create socket connection
    const socket = io(SOCKET_URL, {
      auth:              { token },
      transports:        ['websocket', 'polling'],
      reconnection:      true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect',            () => { setConnected(true);  });
    socket.on('disconnect',         () => { setConnected(false); });
    socket.on('connect_error', (e)  => { console.warn('[Socket] connect error:', e.message); });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  // ── Subscribe to an event, auto-unsubscribe on unmount ───
  const on = (event, handler) => {
    const s = socketRef.current;
    if (!s) return () => {};
    s.on(event, handler);
    return () => s.off(event, handler);
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, on }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

// ── Hook: subscribe to a socket event inside any component ─
// Usage:  useSocketEvent(EVENTS.LEAVE_APPLIED, (data) => reload())
export function useSocketEvent(event, handler, deps = []) {
  const { socket } = useSocket() || {};

  useEffect(() => {
  if (!socket || !event || !handler) return;
  socket.on(event, handler);
  return () => socket.off(event, handler);
}, [socket, event, ...deps]);
}
