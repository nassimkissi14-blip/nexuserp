import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/index.js';
import DeptDashboardPage from './DeptDashboardPage.jsx';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Users, ShoppingCart,
  FileText, AlertTriangle, RefreshCw, ArrowRight,
  CheckCircle, Package, Zap,
} from 'lucide-react';
import apiClient from '../api/client.js';
import { useTheme } from '../context/ThemeContext.jsx';

const fetchAnalytics = (period) => apiClient.get('/analytics/overview', { params: { period } }).then(r => r.data);

const PERIODS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'month', label: 'Ce mois'     },
  { value: 'year',  label: 'Cette année' },
];

const fmtDZD = n => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M DA`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k DA`;
  return `${v} DA`;
};
const fmtNum = n => Number(n || 0).toLocaleString('fr-DZ');

const FULL_DASH_ROLES = ['ADMIN', 'SUPER_ADMIN', 'DIRECTOR'];
const FULL_DASH_DEPTS = ['direction', 'admin', ''];

const STATUS_COLORS = {
  DRAFT: '#64748b', CONFIRMED: '#8b5cf6', PROCESSING: '#f59e0b',
  SHIPPED: '#3b82f6', DELIVERED: '#10b981', CANCELLED: '#ef4444',
  PAID: '#10b981', SENT: '#3b82f6', OVERDUE: '#ef4444', PENDING: '#f59e0b',
};
const STATUS_FR = {
  DRAFT: 'Brouillon', CONFIRMED: 'Confirmée', PROCESSING: 'En cours',
  SHIPPED: 'Expédiée', DELIVERED: 'Livrée', CANCELLED: 'Annulée',
  PAID: 'Payée', SENT: 'Envoyée', OVERDUE: 'En retard', PENDING: 'En attente',
};

/* ── Custom Tooltip ────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label, fmt = 'dzd' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 2 }}>
          <span style={{ color: 'var(--text-muted)' }}>{p.name}</span>
          <strong style={{ color: p.color }}>{fmt === 'dzd' ? fmtDZD(p.value) : fmtNum(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

const DonutTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
      <span style={{ color: p.payload.fill, fontWeight: 700 }}>{STATUS_FR[p.name] || p.name}</span>
      <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{p.value}</span>
    </div>
  );
};

/* ── KPI Card ────────────────────────────────────────────────────── */
function KpiCard({ icon, label, value, sub, growth, color, danger, index = 0 }) {
  const positive = !danger && growth >= 0;
  const { darkMode } = useTheme();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      style={{
        background: darkMode ? 'var(--bg-card)' : `${color}07`,
        border: `1px solid ${danger ? color + '44' : (darkMode ? 'var(--border)' : color + '28')}`,
        borderRadius: 14,
        padding: '18px 20px',
        position: 'relative', overflow: 'hidden', cursor: 'default',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      <div style={{ position: 'absolute', top: -10, right: -10, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${color}${darkMode ? '22' : '35'}, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: darkMode ? color + '18' : color + '28', border: `1px solid ${darkMode ? color + '30' : color + '55'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
          {icon}
        </div>
        {growth !== undefined && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, color: positive ? '#10b981' : '#ef4444', background: positive ? '#10b98115' : '#ef444415', padding: '3px 8px', borderRadius: 20, border: `1px solid ${positive ? '#10b98130' : '#ef444430'}` }}>
            {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {positive ? '+' : ''}{growth}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: danger ? color : 'var(--text-primary)', lineHeight: 1, marginBottom: 4, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.7 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
    </motion.div>
  );
}

/* ── Donut chart with legend ─────────────────────────────────────── */
function DonutChart({ title, data, total, emptyMsg }) {
  const hasData = data && data.some(d => d.value > 0);
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', height: '100%' }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</div>
      {!hasData ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, color: 'var(--text-muted)', fontSize: 13 }}>
          <span style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}>📊</span>
          {emptyMsg || 'Aucune donnée'}
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.filter(d => d.value > 0)}
                  cx="50%" cy="50%"
                  innerRadius={52} outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.filter(d => d.value > 0).map((entry, i) => (
                    <Cell key={i} fill={entry.color || STATUS_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            {total !== undefined && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{total}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>total</div>
              </div>
            )}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
            {data.filter(d => d.value > 0).map((entry, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color || STATUS_COLORS[entry.name] || '#64748b', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{STATUS_FR[entry.name] || entry.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{entry.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── SVG Ring (for single metric) ───────────────────────────────── */
function RingMetric({ value, max = 100, color, label, fmt = 'pct', size = 110 }) {
  const pct = Math.min(1, (Number(value) || 0) / (Number(max) || 100));
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const display = fmt === 'pct' ? `${Math.round(pct * 100)}%` : fmt === 'dzd' ? fmtDZD(value) : fmtNum(value);
  const { darkMode } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)'} strokeWidth={10} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={10}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.23, 1, 0.32, 1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{display}</span>
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.7 }}>{label}</span>
    </div>
  );
}

/* ── Quick Action ───────────────────────────────────────────────── */
function QuickLink({ icon, label, desc, route, color }) {
  const nav = useNavigate();
  return (
    <div
      onClick={() => nav(route)}
      style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 13px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', transition: 'all .15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateX(3px)'; e.currentTarget.style.background = color + '08'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'var(--bg-card)'; }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 9, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{desc}</div>
      </div>
      <ArrowRight size={13} color="var(--text-muted)" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user } = useAuthStore();
  const [refreshKey, setRefreshKey] = useState(0);
  const [period, setPeriod] = useState('month');

  const { darkMode } = useTheme();
  const rawDept    = (user?.department || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const isFullDash = FULL_DASH_DEPTS.includes(rawDept) || FULL_DASH_ROLES.includes(user?.role);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['analytics-simple', refreshKey, period],
    queryFn: () => fetchAnalytics(period),
    staleTime: 30000,
    refetchInterval: 60000,
    enabled: isFullDash,
  });

  if (!isFullDash) return <DeptDashboardPage />;

  const d       = data || {};
  const kpis    = d.kpis    || {};
  const charts  = d.charts  || {};
  const meta    = d.meta    || {};
  const recent  = d.recentOrders || [];

  const revenue    = kpis.revenue?.value     || 0;
  const revGrowth  = kpis.revenue?.growth;
  const orders     = kpis.orders?.value      || 0;
  const unpaid     = kpis.unpaid?.value      || 0;
  const efficiency = kpis.efficiency?.value  || 0;
  const availability = kpis.availability?.value ?? 100;
  const lowStock   = meta.lowStockCount      || 0;
  const pendingL   = meta.pendingLeaves      || 0;
  const overdueInv = meta.overdueInvoices    || 0;

  const trend = charts.revenueTrend || [];

  // Orders by status for donut
  const ordersByStatus = (charts.ordersByStatus || []).map(s => ({
    name:  s.name,
    value: s.value,
    color: STATUS_COLORS[s.name] || '#64748b',
  }));
  const totalOrdersAll = ordersByStatus.reduce((s, o) => s + o.value, 0);

  // Cost distribution donut
  const costDist = charts.costDistribution || [];

  // Top customers
  const topCust = (charts.topCustomers || []).slice(0, 6);

  /* Alerts */
  const alerts = [
    overdueInv > 0 && { color: '#ef4444', icon: '🧾', text: `${overdueInv} facture${overdueInv > 1 ? 's' : ''} en retard` },
    lowStock   > 0 && { color: '#f59e0b', icon: '📦', text: `${lowStock} rupture${lowStock > 1 ? 's' : ''} de stock` },
    pendingL   > 0 && { color: '#6366f1', icon: '🏖️', text: `${pendingL} congé${pendingL > 1 ? 's' : ''} en attente` },
  ].filter(Boolean);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const periodLabel = PERIODS.find(p => p.value === period)?.label;

  return (
    <>
      <style>{`
        @keyframes dashSpin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes dashPulse { 0%,100% { opacity: 1 } 50% { opacity: .4 } }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '24px 28px', maxWidth: 1440, margin: '0 auto' }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: -0.7, background: 'var(--grad-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {greeting()}, {user?.firstName} 👋
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 5, textTransform: 'capitalize' }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {isFetching && <span style={{ marginLeft: 10, fontSize: 11, color: '#6366f1', fontWeight: 600, textTransform: 'none' }}>● Mise à jour…</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <div className="tabs-bar" style={{ padding: 3 }}>
              {PERIODS.map(p => (
                <button key={p.value} className={`tab-btn${period === p.value ? ' active' : ''}`} onClick={() => setPeriod(p.value)}>
                  {p.label}
                </button>
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => { setRefreshKey(k => k + 1); refetch(); }}
              disabled={isFetching}
              className="btn btn--ghost btn--sm"
              style={{ gap: 6 }}
            >
              <RefreshCw size={13} style={{ animation: isFetching ? 'dashSpin 1s linear infinite' : undefined }} />
              Actualiser
            </motion.button>
          </div>
        </div>

        {/* ── Alerts ─────────────────────────────────────────────── */}
        {!isLoading && (
          alerts.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {alerts.map((a, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, background: a.color + '12', border: `1px solid ${a.color}35`, borderRadius: 10, padding: '8px 16px', fontSize: 12.5, color: a.color, fontWeight: 600, borderLeft: `3px solid ${a.color}` }}>
                  <span>{a.icon}</span> {a.text}
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderLeft: '3px solid #10b981', borderRadius: 10, padding: '10px 18px', fontSize: 13, color: '#10b981', fontWeight: 600 }}>
              <CheckCircle size={15} /> Tout fonctionne normalement — Aucune alerte active
            </motion.div>
          )
        )}

        {/* ── KPI Cards ─────────────────────────────────────────── */}
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 110, background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', animation: 'dashPulse 1.4s ease-in-out infinite' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
            <KpiCard index={0} icon={<TrendingUp size={17} />} label="Chiffre d'affaires" sub={periodLabel} value={fmtDZD(revenue)} growth={revGrowth} color="#6366f1" />
            <KpiCard index={1} icon={<ShoppingCart size={17} />} label="Commandes" sub={periodLabel} value={fmtNum(orders)} color="#8b5cf6" />
            <KpiCard index={2} icon={<Users size={17} />} label="Employés actifs" value={fmtNum(kpis.employees?.value ?? 0)} color="#10b981" />
            <KpiCard index={3} icon={<Package size={17} />} label="Clients" value={fmtNum(kpis.customers?.value ?? 0)} color="#3b82f6" />
            <KpiCard index={4} icon={<FileText size={17} />} label="Factures impayées" value={fmtDZD(unpaid)} color="#ef4444" danger={unpaid > 0} />
          </div>
        )}

        {/* ── Row: Area chart + Donut ───────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>

          {/* Revenue Area Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.15 }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Chiffre d'affaires — 6 mois</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Revenus, coûts et profit mensuel</div>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 11, fontWeight: 600 }}>
                {[{ color: '#6366f1', label: 'CA' }, { color: '#10b981', label: 'Profit' }, { color: '#ef4444', label: 'Coûts' }].map(l => (
                  <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)' }}>
                    <span style={{ width: 10, height: 3, borderRadius: 2, background: l.color, display: 'inline-block' }} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
            {isLoading ? (
              <div style={{ height: 220, background: 'var(--bg-primary)', borderRadius: 8, animation: 'dashPulse 1.4s ease-in-out infinite' }} />
            ) : trend.length === 0 ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 36, opacity: 0.3 }}>📉</span> Aucune donnée disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.07)'} />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={n => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}k` : n} width={44} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="CA" stroke="#6366f1" fill="url(#gradRevenue)" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="profit"  name="Profit" stroke="#10b981" fill="url(#gradProfit)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="cost"    name="Coûts" stroke="#ef4444" fill="url(#gradCost)" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Orders by status donut */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.2 }}>
            <DonutChart
              title="Commandes par statut"
              data={ordersByStatus}
              total={totalOrdersAll}
              emptyMsg="Aucune commande"
            />
          </motion.div>
        </div>

        {/* ── Row: Performance rings + Top customers + Cost donut ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 240px', gap: 16 }}>

          {/* Performance rings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.25 }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>Performance</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
              <RingMetric value={efficiency} color="#f59e0b" label="Efficacité prod." size={120} />
              <RingMetric value={availability} color="#10b981" label="Dispo. machines" size={120} />
            </div>
          </motion.div>

          {/* Top customers bar chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.3 }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Top clients</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>Chiffre d'affaires par client</div>
            {isLoading ? (
              <div style={{ height: 200, background: 'var(--bg-primary)', borderRadius: 8, animation: 'dashPulse 1.4s ease-in-out infinite' }} />
            ) : topCust.length === 0 ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 36, opacity: 0.3 }}>🤝</span> Aucun client
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topCust} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={n => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}k` : n} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="revenue" name="CA" fill="#8b5cf6" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Cost distribution donut */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.35 }}>
            <DonutChart
              title="Répartition des coûts"
              data={costDist}
              emptyMsg="Aucun coût enregistré"
            />
          </motion.div>
        </div>

        {/* ── Recent Orders ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.38 }}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}
        >
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Dernières commandes</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Les 5 commandes les plus récentes</div>
            </div>
          </div>
          {isLoading ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 36, background: 'var(--bg-primary)', borderRadius: 8, animation: 'dashPulse 1.4s ease-in-out infinite' }} />)}
            </div>
          ) : recent.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Aucune commande récente</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Référence', 'Client', 'Montant', 'Date', 'Statut'].map(h => (
                    <th key={h} style={{ padding: '10px 22px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.slice(0, 5).map((o, i) => (
                  <tr key={o.id} style={{ borderBottom: i < 4 ? '1px solid var(--border)' : undefined, transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '13px 22px', fontSize: 13, fontWeight: 700, color: '#6366f1', fontFamily: 'monospace' }}>{o.reference || o.orderNumber}</td>
                    <td style={{ padding: '13px 22px', fontSize: 13, color: 'var(--text-secondary)' }}>{o.customer?.name || '—'}</td>
                    <td style={{ padding: '13px 22px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fmtDZD(o.totalAmount)}</td>
                    <td style={{ padding: '13px 22px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{new Date(o.orderDate || o.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td style={{ padding: '13px 22px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: (STATUS_COLORS[o.status] || '#64748b') + '18', color: STATUS_COLORS[o.status] || '#64748b' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_COLORS[o.status] || '#64748b' }} />
                        {STATUS_FR[o.status] || o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>

        {/* ── Bottom: Quick actions ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.42 }}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}
        >
          <div className="section-header" style={{ marginBottom: 14 }}>
            <div className="section-header__title"><Zap size={13} /> Accès rapide</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
            <QuickLink icon="👥" label="Employés"   desc="Gérer les RH"       route="/rh/employees"     color="#6366f1" />
            <QuickLink icon="🧾" label="Factures"   desc="Facturation"        route="/finance/invoices"  color="#10b981" />
            <QuickLink icon="📋" label="Commandes"  desc="Suivi des ventes"   route="/sales/orders"      color="#8b5cf6" />
            <QuickLink icon="🤝" label="Clients"    desc="CRM"                route="/crm/customers"     color="#3b82f6" />
            <QuickLink icon="📦" label="Stock"      desc="Inventaire"         route="/stock/products"    color="#f59e0b" />
            <QuickLink icon="📁" label="Projets"    desc="Suivi de projets"   route="/projects/list"     color="#06b6d4" />
          </div>
        </motion.div>

        <div style={{ height: 8 }} />
      </div>
    </>
  );
}
