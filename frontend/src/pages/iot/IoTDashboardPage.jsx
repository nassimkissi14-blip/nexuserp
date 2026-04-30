import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Activity, Wifi, WifiOff, AlertTriangle, CheckCircle,
  Thermometer, Gauge, Zap, Droplets, Wind, RefreshCw,
  Plus, Settings, X, TrendingUp,
} from 'lucide-react';
import { io as socketIO } from 'socket.io-client';
import apiClient from '../../api/client.js';

/* ── API ─────────────────────────────────────────────────────────── */
const fetchDashboard = () => apiClient.get('/iot/dashboard').then(r => r.data);
const fetchHistory   = (id, min) => apiClient.get(`/iot/readings/${id}?minutes=${min}`).then(r => r.data);

/* ── Config ──────────────────────────────────────────────────────── */
const TYPE_CFG = {
  TEMPERATURE: { icon: Thermometer, color: '#f97316', label: 'Température' },
  PRESSURE:    { icon: Gauge,       color: '#6366f1', label: 'Pression'    },
  VIBRATION:   { icon: Activity,    color: '#f59e0b', label: 'Vibration'   },
  FLOW:        { icon: Droplets,    color: '#3b82f6', label: 'Débit'       },
  POWER:       { icon: Zap,         color: '#a855f7', label: 'Puissance'   },
  HUMIDITY:    { icon: Wind,        color: '#06b6d4', label: 'Humidité'    },
  SPEED:       { icon: TrendingUp,  color: '#10b981', label: 'Vitesse'     },
};

const STATUS_CFG = {
  NORMAL:   { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  label: 'Normal'   },
  WARNING:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Alerte'   },
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.14)',   label: 'Critique' },
  OFFLINE:  { color: '#4a5568', bg: 'rgba(74,85,104,0.12)',   label: 'Hors ligne'},
};

/* ── Animated gauge needle ────────────────────────────────────────── */
function RadialGauge({ value, min, max, warnHigh, critHigh, unit, size = 120 }) {
  const pct   = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -135 + pct * 270;
  const R = size / 2 - 10;
  const cx = size / 2, cy = size / 2;
  const toRad = d => d * Math.PI / 180;

  const arcPath = (sa, ea, r) => {
    const x1 = cx + r * Math.cos(toRad(sa)), y1 = cy + r * Math.sin(toRad(sa));
    const x2 = cx + r * Math.cos(toRad(ea)), y2 = cy + r * Math.sin(toRad(ea));
    return `M ${x1} ${y1} A ${r} ${r} 0 ${Math.abs(ea - sa) > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };

  const warnPct  = warnHigh  ? (warnHigh  - min) / (max - min) : 0.7;
  const critPct  = critHigh  ? (critHigh  - min) / (max - min) : 0.9;
  const warnAng  = -135 + warnPct * 270;
  const critAng  = -135 + critPct * 270;

  const needleX = cx + (R - 8) * Math.cos(toRad(angle));
  const needleY = cy + (R - 8) * Math.sin(toRad(angle));
  const color   = value > (critHigh || Infinity) ? '#ef4444' : value > (warnHigh || Infinity) ? '#f59e0b' : '#10b981';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={arcPath(-135, warnAng,  R)} fill="none" stroke="#10b981" strokeWidth={5} strokeLinecap="round" />
      <path d={arcPath(warnAng, critAng, R)} fill="none" stroke="#f59e0b" strokeWidth={5} strokeLinecap="round" />
      <path d={arcPath(critAng, 135, R)} fill="none" stroke="#ef4444" strokeWidth={5} strokeLinecap="round" />
      <path d={arcPath(-135, 135, R - 0)} fill="none" stroke="#1e2d4a" strokeWidth={5} strokeLinecap="round" opacity={0.3} />

      <line x1={cx} y1={cy} x2={needleX} y2={needleY}
        stroke={color} strokeWidth={2.5} strokeLinecap="round"
        style={{ transformOrigin: `${cx}px ${cy}px`, transition: 'all 0.5s ease' }} />
      <circle cx={cx} cy={cy} r={4} fill={color} />

      <text x={cx} y={cy + R * 0.55} textAnchor="middle" fill="#f0f4ff" fontSize={size * 0.14} fontWeight={800} fontFamily="Inter,sans-serif">
        {typeof value === 'number' ? value.toFixed(1) : '—'}
      </text>
      <text x={cx} y={cy + R * 0.75} textAnchor="middle" fill="#4a5568" fontSize={size * 0.09} fontFamily="Inter,sans-serif">
        {unit}
      </text>
    </svg>
  );
}

/* ── Sensor card ──────────────────────────────────────────────────── */
function SensorCard({ sensor, liveValue, liveStatus, onSelect, isSelected }) {
  const cfg    = TYPE_CFG[sensor.type] || TYPE_CFG.TEMPERATURE;
  const Icon   = cfg.icon;
  const status = liveStatus || sensor.latestStatus || 'OFFLINE';
  const value  = liveValue  ?? sensor.latestValue;
  const sCfg   = STATUS_CFG[status];

  return (
    <motion.div
      layout
      whileHover={{ y: -3, boxShadow: `0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.color}44` }}
      onClick={() => onSelect(sensor)}
      style={{
        background: isSelected ? `${cfg.color}10` : 'linear-gradient(135deg,#0a1228,#0d1b35)',
        border: `1px solid ${isSelected ? cfg.color : sCfg.color}44`,
        borderLeft: `3px solid ${isSelected ? cfg.color : sCfg.color}`,
        borderRadius: 14,
        padding: 18,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {status === 'CRITICAL' && (
        <motion.div
          animate={{ opacity: [0.15, 0.4, 0.15] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.06)', pointerEvents: 'none' }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={16} color={cfg.color} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#c5d0e8' }}>{sensor.name}</div>
            <div style={{ fontSize: 10.5, color: '#3d5068' }}>{sensor.location}</div>
          </div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, background: sCfg.bg, color: sCfg.color, padding: '3px 8px', borderRadius: 20, flexShrink: 0 }}>
          {sCfg.label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: sCfg.color, lineHeight: 1 }}>
            {value !== null && value !== undefined ? value.toFixed(1) : '—'}
          </div>
          <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>{sensor.unit}</div>
        </div>
        <RadialGauge
          value={value ?? 0}
          min={sensor.minValue ?? 0}
          max={sensor.maxValue ?? 100}
          warnHigh={sensor.warnHigh}
          critHigh={sensor.critHigh}
          unit={sensor.unit}
          size={80}
        />
      </div>

      {/* Protocol badge */}
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: status === 'OFFLINE' ? '#4a5568' : '#10b981', animation: status !== 'OFFLINE' ? 'pulse 2s ease-in-out infinite' : 'none' }} />
        <span style={{ fontSize: 9.5, color: '#3d5068', fontWeight: 600 }}>{sensor.protocol}</span>
      </div>
    </motion.div>
  );
}

/* ── History panel ────────────────────────────────────────────────── */
function HistoryPanel({ sensor, onClose }) {
  const [minutes, setMinutes] = useState(10);
  const { data, isLoading } = useQuery({
    queryKey: ['iot-history', sensor.id, minutes],
    queryFn: () => fetchHistory(sensor.id, minutes),
    refetchInterval: 5000,
  });

  const readings = data?.readings || [];
  const stats    = data?.stats || {};
  const cfg      = TYPE_CFG[sensor.type] || TYPE_CFG.TEMPERATURE;
  const chartData = readings.map(r => ({
    t: new Date(r.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    v: r.value,
    status: r.status,
  }));

  const statusColor = v => {
    if (v > (sensor.critHigh || Infinity)) return '#ef4444';
    if (v > (sensor.warnHigh || Infinity)) return '#f59e0b';
    return cfg.color;
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, background: '#060d1f', borderLeft: '1px solid #1e2d4a', zIndex: 300, display: 'flex', flexDirection: 'column', boxShadow: '-24px 0 80px rgba(0,0,0,0.7)' }}
    >
      <div style={{ padding: '18px 22px', borderBottom: '1px solid #1e2d4a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f4ff' }}>{sensor.name}</div>
          <div style={{ fontSize: 11, color: '#3d5068', marginTop: 2 }}>{sensor.location} · {sensor.protocol}</div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1e2d4a', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4a5568' }}>
          <X size={14} />
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: '14px 22px', borderBottom: '1px solid #1e2d4a' }}>
        {[
          { label: 'Dernier', value: stats.last?.toFixed(2), unit: sensor.unit },
          { label: 'Moyenne', value: stats.avg,   unit: sensor.unit },
          { label: 'Min',     value: stats.min,   unit: sensor.unit },
          { label: 'Max',     value: stats.max,   unit: sensor.unit },
        ].map(s => (
          <div key={s.label} style={{ background: '#0a1228', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#3d5068', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: cfg.color }}>{s.value ?? '—'}</div>
            <div style={{ fontSize: 9, color: '#3d5068' }}>{s.unit}</div>
          </div>
        ))}
      </div>

      {/* Window selector */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 22px', borderBottom: '1px solid #1e2d4a' }}>
        {[5, 10, 30, 60].map(m => (
          <button key={m} onClick={() => setMinutes(m)}
            style={{ padding: '4px 12px', borderRadius: 6, background: minutes === m ? cfg.color : 'rgba(255,255,255,0.04)', border: `1px solid ${minutes === m ? cfg.color : '#1e2d4a'}`, color: minutes === m ? '#fff' : '#4a5568', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
            {m}min
          </button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ flex: 1, padding: '18px 22px', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: '#3d5068' }}>Chargement…</div>
        ) : chartData.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: '#3d5068' }}>Aucune donnée sur cette période</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${sensor.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={cfg.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={cfg.color} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e2d4a" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#3d5068' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: '#3d5068' }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: '#0a1228', border: '1px solid #1e2d4a', borderRadius: 8, fontSize: 11 }}
                formatter={v => [`${v.toFixed(2)} ${sensor.unit}`, sensor.name]}
              />
              {sensor.warnHigh  && <CartesianGrid stroke="#f59e0b" strokeDasharray="4 4" vertical={false} y={sensor.warnHigh} horizontal={false} />}
              {sensor.critHigh  && <CartesianGrid stroke="#ef4444" strokeDasharray="4 4" vertical={false} y={sensor.critHigh} horizontal={false} />}
              <Area type="monotone" dataKey="v" stroke={cfg.color} strokeWidth={2} fill={`url(#grad-${sensor.id})`} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Threshold legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          {sensor.warnHigh && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#f59e0b' }}><div style={{ width: 16, height: 2, background: '#f59e0b' }} />Seuil alerte: {sensor.warnHigh} {sensor.unit}</div>}
          {sensor.critHigh && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#ef4444' }}><div style={{ width: 16, height: 2, background: '#ef4444' }} />Seuil critique: {sensor.critHigh} {sensor.unit}</div>}
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */
export default function IoTDashboardPage() {
  const [selected, setSelected]     = useState(null);
  const [liveData,  setLiveData]    = useState({});   // sensorId → { value, status }
  const [connected, setConnected]   = useState(false);
  const [lastTick,  setLastTick]    = useState(null);
  const [filterType, setFilterType] = useState('ALL');
  const socketRef = useRef(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['iot-dashboard'],
    queryFn: fetchDashboard,
    staleTime: 30_000,
  });

  const sensors  = data?.sensors  || [];
  const summary  = data?.summary  || {};

  /* ── Socket.IO live feed ─────────────────────────────────────── */
  useEffect(() => {
    const token = localStorage.getItem('nexuserp_token');
    if (!token) return;

    const socket = socketIO(import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;
    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('iot:readings', (readings) => {
      setLastTick(new Date());
      setLiveData(prev => {
        const next = { ...prev };
        readings.forEach(r => { next[r.sensorId] = { value: r.value, status: r.status }; });
        return next;
      });
    });

    return () => socket.disconnect();
  }, []);

  /* ── Filter ──────────────────────────────────────────────────── */
  const filtered = filterType === 'ALL' ? sensors : sensors.filter(s => s.type === filterType);
  const types = ['ALL', ...new Set(sensors.map(s => s.type))];

  /* ── Summary banner ──────────────────────────────────────────── */
  const liveCritical = Object.values(liveData).filter(d => d.status === 'CRITICAL').length;
  const liveWarning  = Object.values(liveData).filter(d => d.status === 'WARNING').length;

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
        @keyframes spin  { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#06b6d4', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 20, padding: '3px 10px' }}>IoT Live</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: connected ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
                {connected ? 'Connecté — flux temps réel' : 'Déconnecté'}
              </div>
              {lastTick && <span style={{ fontSize: 10, color: '#3d5068' }}>Dernier tick: {lastTick.toLocaleTimeString('fr-FR')}</span>}
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: -0.8, color: '#f0f4ff' }}>
              Supervision IoT
            </h1>
            <p style={{ fontSize: 12.5, color: '#4a5568', margin: '4px 0 0' }}>
              Capteurs industriels — données temps réel · Simulation Arena / FlexSim / Tecnomatix
            </p>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={refetch}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 8, color: '#06b6d4', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            <RefreshCw size={13} /> Actualiser
          </motion.button>
        </div>

        {/* ── Summary cards ─────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 22 }}>
          {[
            { label: 'Capteurs actifs', value: summary.total || 0,    color: '#06b6d4', icon: <Activity size={16} /> },
            { label: 'État normal',     value: summary.normal || 0,   color: '#10b981', icon: <CheckCircle size={16} /> },
            { label: 'En alerte',       value: (liveCritical || summary.warning || 0) + (liveWarning || 0), color: '#f59e0b', icon: <AlertTriangle size={16} /> },
            { label: 'Critiques',       value: liveCritical || summary.critical || 0, color: '#ef4444', icon: <AlertTriangle size={16} /> },
          ].map(c => (
            <motion.div key={c.label} whileHover={{ y: -2 }}
              style={{ background: 'linear-gradient(135deg,#0a1228,#0d1b35)', border: `1px solid ${c.color}33`, borderTop: `2px solid ${c.color}`, borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: c.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color }}>{c.icon}</div>
                <span style={{ fontSize: 10.5, color: '#3d5068', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{c.label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: c.color }}>{c.value}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Type filter ───────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          {types.map(t => {
            const cfg = TYPE_CFG[t];
            return (
              <button key={t} onClick={() => setFilterType(t)}
                style={{ padding: '5px 14px', borderRadius: 20, background: filterType === t ? (cfg?.color || '#6366f1') : 'rgba(255,255,255,0.04)', border: `1px solid ${filterType === t ? (cfg?.color || '#6366f1') : '#1e2d4a'}`, color: filterType === t ? '#fff' : '#4a5568', fontSize: 11.5, cursor: 'pointer', fontWeight: 600 }}>
                {t === 'ALL' ? 'Tous' : cfg?.label || t}
              </button>
            );
          })}
        </div>

        {/* ── Sensor grid ───────────────────────────────────────── */}
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {Array(9).fill(0).map((_, i) => (
              <div key={i} style={{ height: 180, background: '#0a1228', borderRadius: 14, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : (
          <motion.div
            layout
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}
          >
            <AnimatePresence>
              {filtered.map(s => (
                <SensorCard
                  key={s.id}
                  sensor={s}
                  liveValue={liveData[s.id]?.value}
                  liveStatus={liveData[s.id]?.status}
                  onSelect={setSelected}
                  isSelected={selected?.id === s.id}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {filtered.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#3d5068' }}>
            <Activity size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>Aucun capteur pour ce filtre</div>
          </div>
        )}
      </div>

      {/* ── Backdrop + detail panel ───────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 299, backdropFilter: 'blur(3px)' }}
            />
            <HistoryPanel sensor={selected} onClose={() => setSelected(null)} />
          </>
        )}
      </AnimatePresence>
    </>
  );
}
