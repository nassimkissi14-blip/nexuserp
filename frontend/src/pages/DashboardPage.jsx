import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/index.js';
import DeptDashboardPage from './DeptDashboardPage.jsx';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, ShoppingCart,
  FileText, AlertTriangle, RefreshCw, ArrowRight,
  CheckCircle, Package,
} from 'lucide-react';
import apiClient from '../api/client.js';

const fetchAnalytics = () => apiClient.get('/analytics/overview').then(r => r.data);

const fmtDZD = n => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M DA`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k DA`;
  return `${v} DA`;
};
const fmtNum = n => Number(n || 0).toLocaleString('fr-DZ');

const FULL_DASH_ROLES = ['ADMIN', 'SUPER_ADMIN', 'DIRECTOR'];
const FULL_DASH_DEPTS = ['direction', 'admin', ''];

const STATUS_COLOR = {
  DRAFT: '#64748b', CONFIRMED: '#8b5cf6', PROCESSING: '#f59e0b',
  SHIPPED: '#3b82f6', DELIVERED: '#10b981', CANCELLED: '#ef4444',
  PAID: '#10b981', SENT: '#3b82f6', OVERDUE: '#ef4444', PENDING: '#f59e0b',
};
const STATUS_FR = {
  DRAFT: 'Brouillon', CONFIRMED: 'Confirmée', PROCESSING: 'En cours',
  SHIPPED: 'Expédiée', DELIVERED: 'Livrée', CANCELLED: 'Annulée',
  PAID: 'Payée', SENT: 'Envoyée', OVERDUE: 'En retard', PENDING: 'En attente',
};

/* ── KPI Card ────────────────────────────────────────────────────── */
function KpiCard({ icon, label, value, sub, growth, color, danger }) {
  const positive = growth >= 0;
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${danger ? color + '55' : 'var(--border)'}`,
      borderRadius: 12,
      padding: '18px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
        {growth !== undefined && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 700, color: positive ? '#10b981' : '#ef4444', background: positive ? '#10b98115' : '#ef444415', padding: '3px 8px', borderRadius: 20 }}>
            {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {positive ? '+' : ''}{growth}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: danger ? color : 'var(--text-primary)', lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ── Quick Action Card ───────────────────────────────────────────── */
function QuickLink({ icon, label, desc, route, color }) {
  const nav = useNavigate();
  return (
    <div onClick={() => nav(route)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', transition: 'border-color .15s, transform .15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateX(3px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0, fontSize: 16 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{desc}</div>
      </div>
      <ArrowRight size={14} color="var(--text-muted)" />
    </div>
  );
}

/* ── Custom Bar Tooltip ──────────────────────────────────────────── */
const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
          <span style={{ color: 'var(--text-muted)' }}>{p.name}</span>
          <strong>{fmtDZD(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user } = useAuthStore();
  const [refreshKey, setRefreshKey] = useState(0);

  const rawDept    = (user?.department || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const isFullDash = FULL_DASH_DEPTS.includes(rawDept) || FULL_DASH_ROLES.includes(user?.role);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['analytics-simple', refreshKey],
    queryFn: fetchAnalytics,
    staleTime: 30000,
    refetchInterval: 60000,
    enabled: isFullDash,
  });

  // Conditional return AFTER all hooks
  if (!isFullDash) return <DeptDashboardPage />;

  const d      = data;
  const kpis   = d?.kpis    || {};
  const charts = d?.charts  || {};
  const meta   = d?.meta    || {};
  const recent = d?.recentOrders || [];

  const revenue    = kpis.revenue?.value || 0;
  const revGrowth  = kpis.revenue?.growth;
  const orders     = kpis.orders?.value  || 0;
  const unpaid     = kpis.unpaid?.value  || 0;
  const lowStock   = meta?.lowStockCount || 0;
  const pendingL   = meta?.pendingLeaves || 0;
  const overdueInv = meta?.overdueInvoices || 0;

  const trend = charts.revenueTrend || [];

  /* ── Alerts ─────────────────────────────────────────────────────── */
  const alerts = [
    overdueInv > 0 && { color: '#ef4444', text: `${overdueInv} facture${overdueInv > 1 ? 's' : ''} en retard` },
    lowStock   > 0 && { color: '#f59e0b', text: `${lowStock} rupture${lowStock > 1 ? 's' : ''} de stock` },
    pendingL   > 0 && { color: '#6366f1', text: `${pendingL} congé${pendingL > 1 ? 's' : ''} en attente` },
  ].filter(Boolean);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
            {greeting()}, {user?.firstName} 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, textTransform: 'capitalize' }}>
            {today}
          </p>
        </div>
        <button
          onClick={() => { setRefreshKey(k => k + 1); refetch(); }}
          disabled={isFetching}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}
        >
          <RefreshCw size={13} style={{ animation: isFetching ? 'spin 1s linear infinite' : undefined }} />
          Actualiser
        </button>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────── */}
      {!isLoading && (
        alerts.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {alerts.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: a.color + '12', border: `1px solid ${a.color}38`, borderRadius: 8, padding: '7px 14px', fontSize: 12.5, color: a.color, fontWeight: 600 }}>
                <AlertTriangle size={13} /> {a.text}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '8px 16px', fontSize: 12.5, color: '#10b981', fontWeight: 500 }}>
            <CheckCircle size={14} /> Tout fonctionne normalement — Aucune alerte active
          </div>
        )
      )}

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {[1,2,3,4,5].map(i => <div key={i} style={{ height: 110, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
          <KpiCard
            icon={<TrendingUp size={18} />}
            label="Chiffre d'affaires"
            sub="Ce mois"
            value={fmtDZD(revenue)}
            growth={revGrowth}
            color="#6366f1"
          />
          <KpiCard
            icon={<ShoppingCart size={18} />}
            label="Commandes"
            sub="Ce mois"
            value={fmtNum(orders)}
            color="#8b5cf6"
          />
          <KpiCard
            icon={<Users size={18} />}
            label="Employés actifs"
            value={fmtNum(kpis.employees?.value ?? 0)}
            color="#10b981"
          />
          <KpiCard
            icon={<Package size={18} />}
            label="Clients"
            value={fmtNum(kpis.customers?.value ?? 0)}
            color="#3b82f6"
          />
          <KpiCard
            icon={<FileText size={18} />}
            label="Factures impayées"
            value={fmtDZD(unpaid)}
            color="#ef4444"
            danger={unpaid > 0}
          />
        </div>
      )}

      {/* ── Chart + Quick Links ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>

        {/* Revenue chart */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Chiffre d'affaires — 6 derniers mois</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>Revenus mensuels en DA</div>
          {isLoading ? (
            <div style={{ height: 200, background: 'var(--bg-primary)', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ) : trend.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Aucune donnée disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={n => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}k` : n} width={44} />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="revenue" name="CA" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quick links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Accès rapide</div>
          <QuickLink icon="👥" label="Employés"   desc="Gérer les RH"       route="/rh/employees"     color="#6366f1" />
          <QuickLink icon="🧾" label="Factures"   desc="Facturation"        route="/finance/invoices"  color="#10b981" />
          <QuickLink icon="📋" label="Commandes"  desc="Suivi des ventes"   route="/sales/orders"      color="#8b5cf6" />
          <QuickLink icon="🤝" label="Clients"    desc="CRM"                route="/crm/customers"     color="#3b82f6" />
          <QuickLink icon="📦" label="Stock"      desc="Inventaire"         route="/stock/products"    color="#f59e0b" />
          <QuickLink icon="📁" label="Projets"    desc="Suivi de projets"   route="/projects/list"     color="#06b6d4" />
        </div>
      </div>

      {/* ── Recent Orders ───────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Dernières commandes</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Les 5 commandes les plus récentes</div>
          </div>
        </div>
        {isLoading ? (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 36, background: 'var(--bg-primary)', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
          </div>
        ) : recent.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Aucune commande récente
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Référence', 'Client', 'Montant', 'Date', 'Statut'].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.slice(0, 5).map((o, i) => (
                <tr key={o.id} style={{ borderBottom: i < Math.min(recent.length, 5) - 1 ? '1px solid var(--border)' : undefined }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{o.reference || o.orderNumber}</td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{o.customer?.name || '—'}</td>
                  <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtDZD(o.totalAmount)}</td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{new Date(o.orderDate || o.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: (STATUS_COLOR[o.status] || '#64748b') + '20', color: STATUS_COLOR[o.status] || '#64748b' }}>
                      {STATUS_FR[o.status] || o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
      `}</style>
    </div>
  );
}
