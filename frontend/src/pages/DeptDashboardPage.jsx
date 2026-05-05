import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { RefreshCw, Clock, Search, ChevronDown } from 'lucide-react';
import apiClient from '../api/client.js';
import { useAuthStore } from '../store/index.js';
import { useTheme } from '../context/ThemeContext.jsx';

const fetchDeptStats = (dept) =>
  apiClient.get('/dashboard/dept-stats', { params: dept ? { dept } : {} }).then(r => r.data);

/* ── Formatters ─────────────────────────────────────────────────── */
const fmtDZD = n => {
  const v = Number(n) || 0;
  return v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M DA` : v >= 1_000 ? `${(v/1_000).toFixed(0)}k DA` : `${v} DA`;
};
const fmtPct = n => `${Number(n)||0}%`;
const fmtNum = n => Number(n||0).toLocaleString('fr-DZ');
function applyFormatter(value, fmt) {
  if (fmt === 'dzd') return fmtDZD(value);
  if (fmt === 'pct') return fmtPct(value);
  return fmtNum(value);
}

/* ── Status config ──────────────────────────────────────────────── */
const STATUS_MAP = {
  // Positif / Terminé
  ACTIVE:      { label: 'Actif',           color: '#10b981' },
  APPROVED:    { label: 'Approuvé',        color: '#10b981' },
  DELIVERED:   { label: 'Livré',           color: '#10b981' },
  COMPLETED:   { label: 'Terminé',         color: '#10b981' },
  PAID:        { label: 'Payé',            color: '#10b981' },
  DONE:        { label: 'Lu',              color: '#10b981' },
  RECEIVED:    { label: 'Reçu',            color: '#10b981' },
  RESOLVED:    { label: 'Résolu',          color: '#10b981' },
  CLOSED:      { label: 'Fermé',           color: '#10b981' },
  IN:          { label: 'Entrée',          color: '#10b981' },
  // En cours / Neutre
  PENDING:     { label: 'En attente',      color: '#f59e0b' },
  PROCESSING:  { label: 'En traitement',   color: '#f59e0b' },
  IN_PROGRESS: { label: 'En cours',        color: '#3b82f6' },
  PAUSED:      { label: 'En pause',        color: '#f59e0b' },
  LOW:         { label: 'Stock bas',       color: '#f59e0b' },
  OPEN:        { label: 'Ouvert',          color: '#f59e0b' },
  SENT:        { label: 'Envoyé',          color: '#3b82f6' },
  SHIPPED:     { label: 'Expédié',         color: '#3b82f6' },
  CONFIRMED:   { label: 'Confirmé',        color: '#8b5cf6' },
  ACCEPTED:    { label: 'Accepté',         color: '#8b5cf6' },
  PLANNED:     { label: 'Planifié',        color: '#6366f1' },
  PLANNING:    { label: 'Planification',   color: '#6366f1' },
  FIRM:        { label: 'Ferme',           color: '#6366f1' },
  LAUNCHED:    { label: 'Lancé',           color: '#8b5cf6' },
  SUGGESTED:   { label: 'Suggéré',         color: '#64748b' },
  PARTIAL:     { label: 'Partiel',         color: '#f59e0b' },
  DRAFT:       { label: 'Brouillon',       color: '#64748b' },
  OUT:         { label: 'Sortie',          color: '#f97316' },
  ADJUSTMENT:  { label: 'Ajustement',      color: '#8b5cf6' },
  // Négatif / Alerte
  CANCELLED:   { label: 'Annulé',          color: '#ef4444' },
  REJECTED:    { label: 'Refusé',          color: '#ef4444' },
  RUPTURE:     { label: 'Rupture',         color: '#ef4444' },
  INACTIVE:    { label: 'Inactif',         color: '#64748b' },
  TERMINATED:  { label: 'Résilié',         color: '#ef4444' },
  OVERDUE:     { label: 'En retard',       color: '#ef4444' },
  BREAKDOWN:   { label: 'En panne',        color: '#ef4444' },
  DOWN:        { label: 'En panne',        color: '#ef4444' },
  // Maintenance / RH
  MAINTENANCE: { label: 'En maintenance',  color: '#f59e0b' },
  SUSPENDED:   { label: 'Suspendu',        color: '#f59e0b' },
  ON_HOLD:     { label: 'En pause',        color: '#f59e0b' },
  ON_LEAVE:    { label: 'En congé',        color: '#f59e0b' },
  // Types de congé (utilisés parfois comme statut)
  ANNUAL:      { label: 'Congé annuel',    color: '#6366f1' },
  SICK:        { label: 'Maladie',         color: '#f59e0b' },
  MATERNITY:   { label: 'Maternité',       color: '#8b5cf6' },
  PATERNITY:   { label: 'Paternité',       color: '#8b5cf6' },
  UNPAID:      { label: 'Sans solde',      color: '#64748b' },
  OTHER:       { label: 'Autre',           color: '#64748b' },
};

const statusColor = (s) => STATUS_MAP[s]?.color || '#64748b';
const statusLabel = (s) => STATUS_MAP[s]?.label || s;

function StatusBadge({ status }) {
  const c = statusColor(status);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: c, background: c + '18', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
      {statusLabel(status)}
    </span>
  );
}

/* ── Dept meta ──────────────────────────────────────────────────── */
const DEPT_META = {
  rh:            { label: 'Ressources Humaines', icon: '👥', color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  crm:           { label: 'Commercial & CRM',    icon: '📈', color: '#8b5cf6', gradient: 'linear-gradient(135deg,#8b5cf6,#a855f7)' },
  finance:       { label: 'Finance',             icon: '💰', color: '#10b981', gradient: 'linear-gradient(135deg,#059669,#10b981)' },
  production:    { label: 'Production',          icon: '🏭', color: '#f59e0b', gradient: 'linear-gradient(135deg,#d97706,#f59e0b)' },
  maintenance:   { label: 'Maintenance',         icon: '🔧', color: '#ef4444', gradient: 'linear-gradient(135deg,#dc2626,#ef4444)' },
  stock:         { label: 'Stock & Logistique',  icon: '📦', color: '#3b82f6', gradient: 'linear-gradient(135deg,#2563eb,#3b82f6)' },
  projets:       { label: 'Projets',             icon: '🗂️', color: '#a855f7', gradient: 'linear-gradient(135deg,#9333ea,#a855f7)' },
  it:            { label: 'Informatique & IT',   icon: '⚙️', color: '#06b6d4', gradient: 'linear-gradient(135deg,#0891b2,#06b6d4)' },
  communication: { label: 'Communication',       icon: '💬', color: '#f97316', gradient: 'linear-gradient(135deg,#ea580c,#f97316)' },
  achats:        { label: 'Achats',              icon: '🛒', color: '#8b5cf6', gradient: 'linear-gradient(135deg,#7c3aed,#8b5cf6)' },
  logistique:    { label: 'Logistique',          icon: '🚚', color: '#3b82f6', gradient: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' },
};

/* ── Animated counter ───────────────────────────────────────────── */
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  const t0  = useRef(null);
  const from = useRef(0);
  useEffect(() => {
    if (target == null) return;
    from.current = val;
    t0.current = null;
    const tick = ts => {
      if (!t0.current) t0.current = ts;
      const p = Math.min((ts - t0.current) / duration, 1);
      const e = 1 - Math.pow(1 - p, 4);
      setVal(Math.round(from.current + (target - from.current) * e));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);
  return val;
}

/* ── SVG Ring Progress ──────────────────────────────────────────── */
function RingProgress({ value, max = 100, color, label, formatter = 'pct', size = 110 }) {
  const num = typeof value === 'number' ? value : parseFloat(value) || 0;
  const animated = useCountUp(num);
  const pct = formatter === 'pct' ? Math.min(1, num / 100) : Math.min(1, num / Math.max(max, 1));
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const display = applyFormatter(animated, formatter);
  const { darkMode } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)'} strokeWidth={10} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.23,1,0.32,1)' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: size > 100 ? 18 : 15, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{display}</span>
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.7, maxWidth: size }}>{label}</span>
    </div>
  );
}

/* ── Premium KPI card ───────────────────────────────────────────── */
function KpiCard({ icon, label, value, color, formatter, alert, gradient, index = 0 }) {
  const num = typeof value === 'number' ? value : parseFloat(value) || 0;
  const animated = useCountUp(num);
  const { darkMode } = useTheme();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      style={{ background: darkMode ? 'var(--bg-card)' : `${color}08`, border: `1px solid ${darkMode ? 'var(--border)' : color + '30'}`, borderRadius: 16, padding: '20px 22px', position: 'relative', overflow: 'hidden', cursor: 'default' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: gradient || color }} />
      <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: `radial-gradient(circle,${color}${darkMode ? '22' : '30'},transparent 70%)`, pointerEvents: 'none' }} />
      {alert && (
        <motion.div animate={{ scale: [1,1.3,1] }} transition={{ repeat: Infinity, duration: 2 }}
          style={{ position: 'absolute', top: 14, right: 14, width: 9, height: 9, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px #ef4444aa' }} />
      )}
      <div style={{ width: 44, height: 44, borderRadius: 12, background: darkMode ? `${color}18` : `${color}28`, border: `1px solid ${darkMode ? color + '30' : color + '55'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -1, lineHeight: 1, color: 'var(--text-primary)', marginBottom: 6 }}>{applyFormatter(animated, formatter)}</div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
    </motion.div>
  );
}

/* ── Donut status chart ─────────────────────────────────────────── */
function StatusDonut({ rows, color, title }) {
  const counts = {};
  (rows || []).forEach(r => {
    if (!r.status) return;
    counts[r.status] = (counts[r.status] || 0) + 1;
  });
  const data = Object.entries(counts).map(([k, v]) => ({ name: k, value: v, color: statusColor(k) })).filter(d => d.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (data.length === 0) return null;
  const { darkMode } = useTheme();

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <span style={{ color: p.payload.color, fontWeight: 700 }}>{statusLabel(p.name)}</span>
        <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{p.value}</span>
      </div>
    );
  };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>{title || 'Répartition par statut'}</div>
      <div style={{ position: 'relative', height: 170 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={76} paddingAngle={3} dataKey="value" strokeWidth={0}>
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>total</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{statusLabel(d.name)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 60, height: 4, borderRadius: 2, background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <div style={{ width: `${(d.value/total*100).toFixed(0)}%`, height: '100%', background: d.color, borderRadius: 2, transition: 'width 1s ease' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', minWidth: 20, textAlign: 'right' }}>{d.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Mini bar chart ─────────────────────────────────────────────── */
function MiniBarChart({ title, data, dataKey, nameKey = 'name', color, fmt = 'num' }) {
  if (!data || data.length === 0) return null;
  const fmtVal = v => fmt === 'dzd' ? fmtDZD(v) : fmtNum(v);
  const { darkMode } = useTheme();
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{label}</div>
        <div style={{ color }}><strong>{fmtVal(payload[0].value)}</strong></div>
      </div>
    );
  };
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>{title}</div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.07)'} />
          <XAxis dataKey={nameKey} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
            tickFormatter={v => fmt === 'dzd' ? (v >= 1000 ? `${(v/1000).toFixed(0)}k` : v) : v} width={36} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey={dataKey} fill={color} radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Premium table ──────────────────────────────────────────────── */
function PremiumTable({ title, headers, rows, loading, color, gradient, index = 0 }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [focused, setFocused] = useState(false);
  const { darkMode } = useTheme();

  const statuses = [...new Set((rows || []).map(r => r.status).filter(Boolean))];
  const cols = headers ? headers.slice(0, -1) : [];
  const filtered = (rows || []).filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (!search) return true;
    return Object.values(r).some(v => String(v).toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 + index * 0.08 }}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}
    >
      <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 4, height: 18, borderRadius: 2, background: gradient || color }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}15`, border: `1px solid ${color}25`, borderRadius: 20, padding: '2px 9px' }}>{filtered.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-primary)', border: `1px solid ${focused ? color : 'var(--border)'}`, borderRadius: 10, padding: '6px 12px', transition: 'border-color .2s' }}>
            <Search size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              placeholder="Rechercher…"
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 12, width: 130, fontFamily: 'inherit' }} />
          </div>
          {statuses.length > 1 && (
            <div style={{ position: 'relative' }}>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)', padding: '6px 28px 6px 12px', fontSize: 12, outline: 'none', fontFamily: 'inherit', cursor: 'pointer', appearance: 'none' }}>
                <option value="all">Tous</option>
                {statuses.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
              <ChevronDown size={11} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            </div>
          )}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)' }}>
              {cols.map((h, i) => (
                <th key={i} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
              <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--border)' }}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  {(headers || ['','','','','']).map((_, j) => (
                    <td key={j} style={{ padding: '14px 20px' }}>
                      <div style={{ height: 13, background: 'var(--border)', borderRadius: 4, animation: 'deptPulse 1.4s ease-in-out infinite', width: j === 0 ? '70%' : '50%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={headers?.length || 5} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 32, opacity: 0.4 }}>📭</span>
                  <span>{search || statusFilter !== 'all' ? 'Aucun résultat' : 'Aucune donnée'}</span>
                </div>
              </td></tr>
            ) : filtered.map((row, ri) => {
              const colKeys = ['col1','col2','col3','col4','col5'].slice(0, cols.length);
              return (
                <tr key={row.id || ri}
                  style={{ borderBottom: '1px solid var(--border)', background: ri % 2 === 0 ? 'transparent' : (darkMode ? 'rgba(255,255,255,0.012)' : 'rgba(0,0,0,0.02)'), transition: 'background .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${color}08`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)'; }}
                >
                  {colKeys.map((k, ci) => (
                    <td key={ci} style={{ padding: '12px 20px', fontSize: 13, color: ci === 0 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: ci === 0 ? 600 : 400, whiteSpace: 'nowrap', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row[k] ?? '—'}
                    </td>
                  ))}
                  <td style={{ padding: '12px 20px' }}><StatusBadge status={row.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN DEPT DASHBOARD
══════════════════════════════════════════════════════════════════ */
export default function DeptDashboardPage() {
  const { user } = useAuthStore();
  const { dept: deptParam } = useParams();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dept-stats', deptParam],
    queryFn: () => fetchDeptStats(deptParam),
    staleTime: 0,
  });

  const d    = data || {};
  const meta = DEPT_META[d.dept] || { label: d.dept || 'Tableau de bord', icon: '📊', color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' };
  const kpis = d.kpis || [];

  // KPIs that are percentages → show as rings
  const pctKpis  = kpis.filter(k => k.formatter === 'pct');
  const statKpis = kpis.filter(k => k.formatter !== 'pct');

  // Mini bar: for stock dept show inventory, others show nothing extra
  const showInventoryBar = d.dept === 'stock' && (d.rows || []).length > 0;

  return (
    <>
      <style>{`
        @keyframes deptPulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes deptSpin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      <div style={{ padding: '28px 32px', maxWidth: 1440, margin: '0 auto' }}>

        {/* ── Hero header ── */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: `0 8px 32px ${meta.color}40`, flexShrink: 0 }}>
              {meta.icon}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: meta.color, background: `${meta.color}18`, border: `1px solid ${meta.color}30`, borderRadius: 20, padding: '3px 10px' }}>{meta.label}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20, padding: '3px 10px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'deptPulse 2s ease-in-out infinite' }} />
                  Temps réel
                </span>
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: -0.8, color: 'var(--text-primary)', lineHeight: 1.1 }}>Tableau de bord</h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '5px 0 0' }}>
                Bonjour <strong style={{ color: 'var(--text-secondary)' }}>{user?.firstName}</strong> — Vue en temps réel
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px' }}>
              <Clock size={12} style={{ color: meta.color }} />
              {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={refetch} disabled={isFetching}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: meta.gradient, border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 16px ${meta.color}40`, opacity: isFetching ? 0.7 : 1 }}>
              <RefreshCw size={13} style={{ animation: isFetching ? 'deptSpin 1s linear infinite' : undefined }} />
              Actualiser
            </motion.button>
          </div>
        </motion.div>

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isLoading ? 4 : Math.min(statKpis.length || 4, 5)}, 1fr)`, gap: 14, marginBottom: 20 }}>
          {isLoading
            ? Array(4).fill(0).map((_, i) => (
                <div key={i} style={{ height: 110, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', animation: 'deptPulse 1.4s ease-in-out infinite' }} />
              ))
            : statKpis.map((kpi, i) => (
                <KpiCard key={i} index={i} icon={kpi.icon} label={kpi.label} value={kpi.value} color={kpi.color} formatter={kpi.formatter} alert={kpi.alert} gradient={meta.gradient} />
              ))
          }
        </div>

        {/* ── Charts row ── */}
        {!isLoading && (d.rows?.length > 0 || pctKpis.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
            style={{ display: 'grid', gridTemplateColumns: pctKpis.length > 0 ? '1fr 200px' : '1fr', gap: 16, marginBottom: 20 }}
          >
            {/* Status donut from main rows */}
            {d.rows?.length > 0 && (
              <StatusDonut rows={d.rows} color={meta.color} title={`Répartition — ${d.title || 'Données'}`} />
            )}

            {/* Ring metrics for % KPIs */}
            {pctKpis.length > 0 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.7, alignSelf: 'flex-start' }}>Indicateurs</div>
                {pctKpis.map((kpi, i) => (
                  <RingProgress key={i} value={kpi.value} color={kpi.color} label={kpi.label} formatter="pct" size={120} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Second chart row: second table donut if exists ── */}
        {!isLoading && d.rows2?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
            style={{ marginBottom: 20 }}
          >
            <StatusDonut rows={d.rows2} color={meta.color} title={`Répartition — ${d.title2 || ''}`} />
          </motion.div>
        )}

        {/* ── Divider ── */}
        {!isLoading && (d.rows !== undefined || d.rows2 !== undefined) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Données détaillées</span>
            <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
          </div>
        )}

        {/* ── Tables ── */}
        {(isLoading || d.rows !== undefined) && (
          <div style={{ marginBottom: 20 }}>
            <PremiumTable title={d.title || 'Données'} headers={d.headers || []} rows={d.rows || []} loading={isLoading} color={meta.color} gradient={meta.gradient} index={0} />
          </div>
        )}
        {!isLoading && d.rows2 !== undefined && (
          <div style={{ marginBottom: 20 }}>
            <PremiumTable title={d.title2 || ''} headers={d.headers2 || []} rows={d.rows2 || []} loading={false} color={meta.color} gradient={meta.gradient} index={1} />
          </div>
        )}

        {/* ── Direction fallback ── */}
        {!isLoading && d.dept === 'direction' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🏢</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Direction</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Accédez au tableau de bord principal pour une vue d'ensemble.</p>
          </motion.div>
        )}

        <div style={{ height: 40 }} />
      </div>
    </>
  );
}
