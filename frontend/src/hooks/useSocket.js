import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/index.js';
import { useMessagesStore } from '../store/index.js';
import { useModulesStore } from '../store/index.js';
import { useNotificationsStore } from '../store/index.js';
import { useSimulationStore } from '../store/simulationStore.js';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL)
  || `http://${window.location.hostname}:3001`;
let socketInstance = null;

export const useSocket = () => {
  const { token, isAuthenticated } = useAuthStore();
  const { addMessage, setTyping } = useMessagesStore();
  const { applyRemoteToggle } = useModulesStore();
  const { addNotification } = useNotificationsStore();
  const { addEvent, setRunning } = useSimulationStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    if (socketInstance?.connected) { socketRef.current = socketInstance; return; }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socketInstance = socket;
    socketRef.current = socket;

    socket.on('message:received', (message) => addMessage(message));
    socket.on('message:sent', (message) => addMessage(message));
    socket.on('message:typing', ({ userId }) => setTyping(userId, true));
    socket.on('message:stop_typing', ({ userId }) => setTyping(userId, false));
    socket.on('module:toggled', ({ moduleId, enabled }) => applyRemoteToggle(moduleId, enabled));
    socket.on('notification:new', (notification) => {
      addNotification(notification);
      if (notification.link) {
        toast(notification.title + ' — Cliquez sur 🔔 pour voir', {
          duration: 6000,
          icon: '👤',
        });
      }
    });
    socket.on('simulation:erp_event', (event) => addEvent(event));
    socket.on('simulation:status', ({ running, speed }) => setRunning(running, speed));
    socket.on('simulation:event', ({ sessionId, event }) => {
      if (sessionId && event) useSimulationStore.getState().addIndustrialEvent(sessionId, event);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketInstance = null;
    };
  }, [isAuthenticated, token]);

  const sendMessage = (receiverId, content) => socketRef.current?.emit('message:send', { receiverId, content });
  const sendTyping = (receiverId) => socketRef.current?.emit('message:typing', { receiverId });
  const sendStopTyping = (receiverId) => socketRef.current?.emit('message:stop_typing', { receiverId });
  const markMessagesRead = (senderId) => socketRef.current?.emit('message:read', { senderId });

  return { sendMessage, sendTyping, sendStopTyping, markMessagesRead };
};