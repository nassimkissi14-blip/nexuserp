import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/index.js';
import { X, Bell, CheckCircle, AlertTriangle, Info, TrendingUp, Zap } from 'lucide-react';

const NOTIF_TYPES = {
  SUCCESS:  { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)',  icon: <CheckCircle size={16}/> },
  WARNING:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)',  icon: <AlertTriangle size={16}/> },
  ERROR:    { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)',   icon: <X size={16}/> },
  INFO:     { color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.2)',  icon: <Info size={16}/> },
  AI:       { color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.2)',   icon: <Zap size={16}/> },
  KPI:      { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.2)',  icon: <TrendingUp size={16}/> },
};

// Hook global pour déclencher des notifications depuis n'importe quel composant
let _addToast = null;
export const notify = (message, type = 'INFO', title = null, duration = 4000) => {
  if (_addToast) _addToast({ message, type, title, duration, id: Date.now() });
};

export default function NotificationCenter() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    _addToast = (toast) => {
      setToasts(prev => [...prev, toast]);
      if (toast.duration > 0) {
        setTimeout(() => removeToast(toast.id), toast.duration);
      }
    };
    return () => { _addToast = null; };
  }, []);

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 10,
      zIndex: 9998, maxWidth: 380, width: '100%',
    }}>
      {toasts.map(toast => {
        const t = NOTIF_TYPES[toast.type] || NOTIF_TYPES.INFO;
        return (
          <div key={toast.id} style={{
            background: '#111827', border: `1px solid ${t.border}`,
            borderLeft: `4px solid ${t.color}`,
            borderRadius: 12, padding: '14px 16px',
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 16px ${t.color}22`,
            display: 'flex', alignItems: 'flex-start', gap: 12,
            animation: 'slideInRight 0.3s ease',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ color: t.color, flexShrink: 0, marginTop: 1 }}>{t.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {toast.title && (
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 3 }}>
                  {toast.title}
                </div>
              )}
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{toast.message}</div>
            </div>
            <button onClick={() => removeToast(toast.id)}
              style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
              <X size={14}/>
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}