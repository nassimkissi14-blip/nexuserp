import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { analyticsAPI } from '../../api/client.js';
import { AlertTriangle, Zap, ChevronDown, ChevronRight, X, RefreshCw } from 'lucide-react';

const SEVERITY_CFG = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Critique', dot: '#ef4444' },
  HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.10)', label: 'Élevé',   dot: '#f97316' },
  MEDIUM:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.09)', label: 'Moyen',   dot: '#f59e0b' },
  LOW:      { color: '#6366f1', bg: 'rgba(99,102,241,0.09)', label: 'Faible',  dot: '#6366f1' },
};

const TYPE_ICON = {
  FINANCIAL:   '🧾',
  STOCK:       '📦',
  HR:          '👤',
  PROJECTS:    '🎯',
  MAINTENANCE: '🔧',
  PURCHASES:   '🏭',
};

function AlertCard({ alert, onDismiss }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const cfg = SEVERITY_CFG[alert.severity] || SEVERITY_CFG.LOW;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.22 }}
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.color}33`,
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: 10,
        marginBottom: 8,
        overflow: 'hidden',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>{TYPE_ICON[alert.type] || '⚠️'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.title}</span>
            <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, background: cfg.color + '22', color: cfg.color, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cfg.label}</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#4a5568', marginTop: 2 }}>{alert.description}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {open ? <ChevronDown size={13} color="#4a5568" /> : <ChevronRight size={13} color="#4a5568" />}
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(alert.id); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3d5068', padding: 2, display: 'flex', borderRadius: 4 }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && alert.items?.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 14px 10px 14px', borderTop: `1px solid ${cfg.color}1a` }}>
              {alert.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, borderBottom: i < alert.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <span style={{ color: '#8899bb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{item.label}</span>
                  <span style={{ color: cfg.color, fontWeight: 600, flexShrink: 0 }}>
                    {item.daysLate !== undefined ? `${item.daysLate}j de retard` : item.value}
                  </span>
                </div>
              ))}
              <button
                onClick={() => navigate(alert.route)}
                style={{
                  marginTop: 8, width: '100%', padding: '6px 0',
                  background: cfg.color + '18', border: `1px solid ${cfg.color}33`,
                  borderRadius: 6, color: cfg.color, fontSize: 11.5, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Voir les détails →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function SmartAlertsWidget() {
  const [dismissed, setDismissed] = useState([]);
  const [collapsed, setCollapsed] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['smart-alerts'],
    queryFn: () => analyticsAPI.smartAlerts().then(r => r.data),
    staleTime: 60_000,
    refetchInterval: 180_000,
  });

  const alerts = (data?.alerts || []).filter(a => !dismissed.includes(a.id));
  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  const highCount     = alerts.filter(a => a.severity === 'HIGH').length;

  const dismiss = (id) => setDismissed(d => [...d, id]);
  const dismissAll = () => setDismissed(d => [...d, ...alerts.map(a => a.id)]);

  if (!isLoading && alerts.length === 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #0a1228 0%, #0d1b35 100%)',
        border: '1px solid #10b98133',
        borderLeft: '3px solid #10b981',
        borderRadius: 16, padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={18} color="#10b981" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>Tout est nominal</div>
          <div style={{ fontSize: 12, color: '#4a5568', marginTop: 2 }}>Aucune alerte active — excellente santé opérationnelle</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a1228 0%, #0d1b35 100%)',
      border: '1px solid #1e3a5f',
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid #1e2d4a', cursor: 'pointer' }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <AlertTriangle size={16} color="#ef4444" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#e2e8f0' }}>Alertes Intelligentes</div>
          <div style={{ fontSize: 11, color: '#4a5568', marginTop: 1 }}>
            {isLoading ? 'Chargement…' : `${alerts.length} alerte(s) active(s)`}
            {criticalCount > 0 && <span style={{ color: '#ef4444', fontWeight: 700 }}> — {criticalCount} critique(s)</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {criticalCount > 0 && (
            <motion.span
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              style={{ background: '#ef4444', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}
            >
              {criticalCount}
            </motion.span>
          )}
          {highCount > 0 && (
            <span style={{ background: 'rgba(249,115,22,0.2)', color: '#f97316', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>
              {highCount}
            </span>
          )}
          <motion.button
            whileHover={{ rotate: 180 }} transition={{ duration: 0.4 }}
            onClick={(e) => { e.stopPropagation(); refetch(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3d5068', padding: 2, display: 'flex' }}
          >
            <RefreshCw size={12} style={{ opacity: isRefetching ? 1 : 0.6 }} />
          </motion.button>
          {collapsed ? <ChevronRight size={14} color="#4a5568" /> : <ChevronDown size={14} color="#4a5568" />}
        </div>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '12px 14px' }}>
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#4a5568', fontSize: 13 }}>Analyse en cours…</div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {alerts.map(a => <AlertCard key={a.id} alert={a} onDismiss={dismiss} />)}
                </AnimatePresence>
              )}
              {alerts.length > 1 && (
                <button
                  onClick={dismissAll}
                  style={{ width: '100%', marginTop: 4, padding: '6px 0', background: 'rgba(255,255,255,0.03)', border: '1px solid #1e2d4a', borderRadius: 8, color: '#3d5068', fontSize: 11, cursor: 'pointer' }}
                >
                  Tout ignorer
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
