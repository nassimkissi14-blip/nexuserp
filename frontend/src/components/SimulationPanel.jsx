import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Square, Zap, ChevronDown, ChevronUp, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api/client.js';
import { useSimulationStore } from '../store/simulationStore.js';

const simAPI = {
  status: () => apiClient.get('/simulation/status'),
  start:  (speed) => apiClient.post('/simulation/start', { speed }),
  stop:   () => apiClient.post('/simulation/stop'),
};

const SPEEDS = [
  { value: 'SLOW',   label: 'Lent',   ms: '8s' },
  { value: 'MEDIUM', label: 'Moyen',  ms: '4s' },
  { value: 'FAST',   label: 'Rapide', ms: '1.5s' },
];

const EVENT_ICONS = {
  stock_in:            { icon: '📥', color: '#10b981' },
  stock_out:           { icon: '📤', color: '#ef4444' },
  order_update:        { icon: '🛒', color: '#6366f1' },
  invoice_paid:        { icon: '💰', color: '#10b981' },
  maintenance_request: { icon: '🔧', color: '#f59e0b' },
  production_update:   { icon: '🏭', color: '#8b5cf6' },
};

export default function SimulationPanel() {
  const [open, setOpen]   = useState(false);
  const [speed, setSpeed] = useState('MEDIUM');
  const queryClient       = useQueryClient();
  const navigate          = useNavigate();

  const { running, events, clearEvents } = useSimulationStore();

  useQuery({
    queryKey: ['simulation-status'],
    queryFn: () => simAPI.status().then(r => {
      const { running: r2, speed: s } = r.data;
      useSimulationStore.getState().setRunning(r2, s);
      if (s) setSpeed(s);
      return r.data;
    }),
    refetchInterval: 10000,
  });

  const startMut = useMutation({
    mutationFn: () => simAPI.start(speed),
    onSuccess: () => {
      useSimulationStore.getState().setRunning(true, speed);
      toast.success(`🎮 Simulation démarrée (${SPEEDS.find(s => s.value === speed)?.label})`);
    },
    onError: () => toast.error('Erreur démarrage simulation'),
  });

  const stopMut = useMutation({
    mutationFn: () => simAPI.stop(),
    onSuccess: () => {
      useSimulationStore.getState().setRunning(false);
      queryClient.invalidateQueries();
      toast.success('⏹ Simulation arrêtée');
    },
    onError: () => toast.error('Erreur arrêt simulation'),
  });

  const isPending = startMut.isPending || stopMut.isPending;

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 1000,
      fontFamily: 'inherit', fontSize: 13,
    }}>
      {/* Expanded panel */}
      {open && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 16,
          marginBottom: 10,
          width: 320,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} color="#f59e0b" />
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Simulation ERP</span>
              {running && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#10b981', background: '#10b98120', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                  LIVE
                </span>
              )}
            </div>
            {events.length > 0 && (
              <button onClick={clearEvents} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }} title="Vider le log">
                <Trash2 size={13} />
              </button>
            )}
          </div>
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 6px' }}>Génère des événements métier réels en temps réel (stock, commandes, factures…)</p>
            <button onClick={() => { setOpen(false); navigate('/simulation/dashboard'); }}
              style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 11, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              <ExternalLink size={11} /> Simulation industrielle (Arena / Plant Sim)
            </button>
          </div>

          {/* Speed selector */}
          {!running && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {SPEEDS.map(s => (
                <button key={s.value}
                  onClick={() => setSpeed(s.value)}
                  style={{
                    flex: 1, padding: '5px 0', borderRadius: 8, border: '1px solid',
                    borderColor: speed === s.value ? '#6366f1' : 'var(--border)',
                    background: speed === s.value ? '#6366f115' : 'transparent',
                    color: speed === s.value ? '#6366f1' : 'var(--text-muted)',
                    cursor: 'pointer', fontWeight: 600, fontSize: 11,
                  }}>
                  {s.label}<br />
                  <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>{s.ms}/evt</span>
                </button>
              ))}
            </div>
          )}

          {/* Start / Stop */}
          <button
            onClick={() => running ? stopMut.mutate() : startMut.mutate()}
            disabled={isPending}
            style={{
              width: '100%', padding: '9px 0', borderRadius: 9, border: 'none',
              background: running ? '#ef444420' : '#6366f1',
              color: running ? '#ef4444' : '#fff',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              marginBottom: 14, opacity: isPending ? 0.6 : 1,
            }}>
            {running ? <Square size={14} /> : <Play size={14} />}
            {isPending ? 'En cours…' : running ? 'Arrêter la simulation' : 'Démarrer la simulation'}
          </button>

          {/* Event log */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {events.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: 12 }}>
                {running ? 'En attente du premier événement…' : 'Démarrez la simulation pour voir les événements'}
              </div>
            ) : events.map((evt, i) => {
              const meta = EVENT_ICONS[evt.type] || { icon: '🔔', color: '#94a3b8' };
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0',
                  borderBottom: i < events.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: 16, lineHeight: 1.2 }}>{meta.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.3 }}>{evt.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                      {new Date(evt.timestamp).toLocaleTimeString('fr-FR')}
                    </div>
                  </div>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: meta.color, marginTop: 6, flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 30, border: 'none',
          background: running ? '#6366f1' : 'var(--bg-card)',
          color: running ? '#fff' : 'var(--text-primary)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          cursor: 'pointer', fontWeight: 600, fontSize: 13,
          border: running ? 'none' : '1px solid var(--border)',
          transition: 'all 0.2s',
        }}>
        <Zap size={15} color={running ? '#fff' : '#f59e0b'} />
        Simulation
        {running && (
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
        )}
        {open ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
