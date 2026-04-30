import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowUpRight, RefreshCw, Clock } from 'lucide-react';
import apiClient from '../api/client.js';
import { useAuthStore } from '../store/index.js';

const fetchDeptStats = () => apiClient.get('/dashboard/dept-stats').then(r => r.data);

/* ── Formatters ─────────────────────────────────────────────────── */
const fmtDZD = n => {
  const v = Number(n) || 0;
  return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M DA` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k DA` : `${v} DA`;
};
const fmtPct = n => `${Number(n) || 0}%`;
const fmtNum = n => Number(n || 0).toLocaleString('fr-DZ');

function applyFormatter(value, fmt) {
  if (fmt === 'dzd') return fmtDZD(value);
  if (fmt === 'pct') return fmtPct(value);
  return fmtNum(value);
}

/* ── Status badge config ────────────────────────────────────────── */
const STATUS_MAP = {
  ACTIVE:      { label: 'Actif',       color: '#10b981', bg: '#10b98118' },
  APPROVED:    { label: 'Approuvé',    color: '#10b981', bg: '#10b98118' },
  DELIVERED:   { label: 'Livré',       color: '#10b981', bg: '#10b98118' },
  COMPLETED:   { label: 'Terminé',     color: '#10b981', bg: '#10b98118' },
  PAID:        { label: 'Payé',        color: '#10b981', bg: '#10b98118' },
  DONE:        { label: 'Fait',        color: '#10b981', bg: '#10b98118' },
  RECEIVED:    { label: 'Reçu',        color: '#10b981', bg: '#10b98118' },
  IN:          { label: 'Entrée',      color: '#10b981', bg: '#10b98118' },

  PENDING:     { label: 'En attente',  color: '#f59e0b', bg: '#f59e0b18' },
  PROCESSING:  { label: 'En cours',    color: '#f59e0b', bg: '#f59e0b18' },
  IN_PROGRESS: { label: 'En cours',    color: '#f59e0b', bg: '#f59e0b18' },
  LOW:         { label: 'Stock bas',   color: '#f59e0b', bg: '#f59e0b18' },
  OPEN:        { label: 'Ouvert',      color: '#f59e0b', bg: '#f59e0b18' },
  SENT:        { label: 'Envoyé',      color: '#3b82f6', bg: '#3b82f618' },
  CONFIRMED:   { label: 'Confirmé',    color: '#8b5cf6', bg: '#8b5cf618' },
  ACCEPTED:    { label: 'Accepté',     color: '#8b5cf6', bg: '#8b5cf618' },
  PLANNED:     { label: 'Planifié',    color: '#6366f1', bg: '#6366f118' },
  PLANNING:    { label: 'Planification', color: '#6366f1', bg: '#6366f118' },
  DRAFT:       { label: 'Brouillon',   color: '#64748b', bg: '#64748b18' },
  OUT:         { label: 'Sortie',      color: '#f97316', bg: '#f9731618' },
  ADJUSTMENT:  { label: 'Ajustement',  color: '#8b5cf6', bg: '#8b5cf618' },

  CANCELLED:   { label: 'Annulé',      color: '#ef4444', bg: '#ef444418' },
  REJECTED:    { label: 'Refusé',      color: '#ef4444', bg: '#ef444418' },
  RUPTURE:     { label: 'Rupture',     color: '#ef4444', bg: '#ef444418' },
  INACTIVE:    { label: 'Inactif',     color: '#64748b', bg: '#64748b18' },
  TERMINATED:  { label: 'Résilié',     color: '#ef4444', bg: '#ef444418' },
  OVERDUE:     { label: 'En retard',   color: '#ef4444', bg: '#ef444418' },
  BREAKDOWN:   { label: 'En panne',    color: '#ef4444', bg: '#ef444418' },
  ON_HOLD:     { label: 'En pause',    color: '#f59e0b', bg: '#f59e0b18' },

  // leave types
  ANNUAL:      { label: 'Annuel',      color: '#6366f1', bg: '#6366f118' },
  SICK:        { label: 'Maladie',     color: '#f59e0b', bg: '#f59e0b18' },
  MATERNITY:   { label: 'Maternité',   color: '#8b5cf6', bg: '#8b5cf618' },
  PATERNITY:   { label: 'Paternité',   color: '#8b5cf6', bg: '#8b5cf618' },
  UNPAID:      { label: 'Sans solde',  color: '#64748b', bg: '#64748b18' },
  OTHER:       { label: 'Autre',       color: '#64748b', bg: '#64748b18' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, color: '#64748b', bg: '#64748b18' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 9px', borderRadius: 4,
      fontSize: 11, fontWeight: 600,
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.color}33`,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

/* ── Dept labels ────────────────────────────────────────────────── */
const DEPT_META = {
  rh:          { label: 'Ressources Humaines', icon: '👥', color: '#6366f1' },
  crm:         { label: 'Commercial / CRM',    icon: '📈', color: '#8b5cf6' },
  finance:     { label: 'Finance',             icon: '💰', color: '#10b981' },
  production:  { label: 'Production',          icon: '🏭', color: '#f59e0b' },
  maintenance: { label: 'Maintenance',         icon: '🔧', color: '#ef4444' },
  stock:       { label: 'Stock / Logistique',  icon: '📦', color: '#3b82f6' },
  projets:     { label: 'Projets',             icon: '🗂️', color: '#a855f7' },
  it:          { label: 'Informatique / IT',   icon: '⚙️', color: '#06b6d4' },
};

/* ── Animated counter ───────────────────────────────────────────── */
import { useEffect, useRef } from 'react';
function useCountUp(target, duration = 800) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  const t0  = useRef(null);
  const from = useRef(0);
  useEffect(() => {
    if (target === undefined || target === null) return;
    from.current = val;
    t0.current = null;
    const tick = (ts) => {
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

/* ── KPI card ───────────────────────────────────────────────────── */
function KpiCard({ icon, label, value, color, formatter, alert }) {
  const num = typeof value === 'number' ? value : parseFloat(value) || 0;
  const animated = useCountUp(num);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -2, boxShadow: `0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px ${color}33` }}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid var(--border)`,
        borderRadius: 'var(--radius-lg)',
        padding: '16px 18px 14px',
        position: 'relative', overflow: 'hidden',
        transition: 'border-color .2s, box-shadow .2s',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: 64, height: 64, background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`, transform: 'translate(16px,-16px)', pointerEvents: 'none' }} />
      {alert && (
        <div style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, background: color + '1e', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.9 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.8, lineHeight: 1 }}>
        {applyFormatter(animated, formatter)}
      </div>
    </motion.div>
  );
}

/* ── Data table ─────────────────────────────────────────────────── */
function DataTable({ title, headers, rows, loading }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const statuses = [...new Set((rows || []).map(r => r.status).filter(Boolean))];

  const filtered = (rows || []).filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return Object.values(r).some(v => String(v).toLowerCase().includes(q));
  });

  const cols = headers ? headers.slice(0, -1) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}
    >
      {/* Table header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', padding: '5px 10px', fontSize: 12, outline: 'none', width: 160, fontFamily: 'inherit' }}
          />
          {statuses.length > 1 && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', padding: '5px 10px', fontSize: 12, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              <option value="all">Tous</option>
              {statuses.map(s => (
                <option key={s} value={s}>{STATUS_MAP[s]?.label || s}</option>
              ))}
            </select>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{filtered.length} ligne{filtered.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Scrollable table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {cols.map((h, i) => (
                <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.7, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.7 }}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  {headers.map((_, j) => (
                    <td key={j} style={{ padding: '12px 16px' }}>
                      <div style={{ height: 14, background: 'var(--border)', borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite', width: j === 0 ? '80%' : '60%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={headers.length} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  {search || statusFilter !== 'all' ? 'Aucun résultat pour ce filtre' : 'Aucune donnée disponible'}
                </td>
              </tr>
            ) : filtered.map((row, ri) => {
              const colKeys = ['col1','col2','col3','col4','col5'].slice(0, cols.length);
              return (
                <tr
                  key={row.id || ri}
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {colKeys.map((k, ci) => (
                    <td key={ci} style={{ padding: '11px 16px', color: ci === 0 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: ci === 0 ? 600 : 400, whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row[k] ?? '—'}
                    </td>
                  ))}
                  <td style={{ padding: '11px 16px' }}>
                    <StatusBadge status={row.status} />
                  </td>
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
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dept-stats'],
    queryFn: fetchDeptStats,
    staleTime: 0,
  });

  const d    = data || {};
  const meta = DEPT_META[d.dept] || { label: 'Tableau de bord', icon: '📊', color: '#6366f1' };

  return (
    <>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
        @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>{meta.icon}</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: meta.color, background: meta.color + '18', border: `1px solid ${meta.color}30`, borderRadius: 20, padding: '2px 10px' }}>
                    {meta.label}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20, padding: '2px 10px' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    Temps réel
                  </span>
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: -0.8, color: 'var(--text-primary)' }}>
                  Tableau de bord — {meta.label}
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Bonjour {user?.firstName} · Vue en temps réel de votre département
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', align: 'center', gap: 10 }}>
            {d.dept && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px' }}>
                <Clock size={11} style={{ color: meta.color }} />
                {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={refetch}
              disabled={isFetching}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <RefreshCw size={12} style={{ animation: isFetching ? 'spin 1s linear infinite' : undefined }} />
              Actualiser
            </motion.button>
          </div>
        </motion.div>

        {/* ── KPI cards ── */}
        {(isLoading || (d.kpis && d.kpis.length > 0)) && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${isLoading ? 4 : Math.min(d.kpis?.length || 4, 5)}, 1fr)`,
            gap: 14,
            marginBottom: 24,
          }}>
            {isLoading
              ? Array(4).fill(0).map((_, i) => (
                  <div key={i} style={{ height: 100, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))
              : (d.kpis || []).map((kpi, i) => (
                  <KpiCard
                    key={i}
                    icon={kpi.icon}
                    label={kpi.label}
                    value={kpi.value}
                    color={kpi.color}
                    formatter={kpi.formatter}
                    alert={kpi.alert}
                  />
                ))
            }
          </div>
        )}

        {/* ── Main table ── */}
        {(isLoading || d.rows !== undefined) && (
          <div style={{ marginBottom: 20 }}>
            <DataTable
              title={d.title || 'Données'}
              headers={d.headers || []}
              rows={d.rows || []}
              loading={isLoading}
            />
          </div>
        )}

        {/* ── Second table (optional) ── */}
        {!isLoading && d.rows2 !== undefined && (
          <div style={{ marginBottom: 20 }}>
            <DataTable
              title={d.title2 || ''}
              headers={d.headers2 || []}
              rows={d.rows2 || []}
              loading={false}
            />
          </div>
        )}

        <div style={{ height: 32 }} />
      </div>
    </>
  );
}
