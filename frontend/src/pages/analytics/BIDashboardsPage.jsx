import { useState } from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, Package, ShoppingCart, Wrench, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import AnimatedPage from '../../components/ui/AnimatedPage.jsx';
import { PageHeader, Btn } from '../../components/ui/DesignSystem.jsx';
import apiClient from '../../api/client.js';

const fmtDZD = n => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M DA` : n >= 1_000 ? `${(n/1_000).toFixed(0)}k DA` : `${n || 0} DA`;
const fmtNum  = n => n >= 1_000 ? `${(n/1_000).toFixed(1)}k` : String(n || 0);

const VIEWS = [
  { key: 'commercial', label: '💰 Commercial',  desc: 'Ventes, clients et pipeline' },
  { key: 'operations', label: '🏭 Opérations', desc: 'Production et maintenance' },
  { key: 'rh',         label: '👥 RH',          desc: 'Effectifs et performances' },
  { key: 'finance',    label: '💳 Finance',     desc: 'Trésorerie et comptabilité' },
];

function ChartCard({ title, subtitle, children, span }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px', gridColumn: span ? `span ${span}` : undefined }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function KpiTile({ icon, label, value, sub, color, trend }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px', borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, background: color + '18', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        {trend !== undefined && <span style={{ fontSize: 11, fontWeight: 700, color: trend >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: 2 }}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {trend >= 0 ? '+' : ''}{trend}%
        </span>}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const CTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0a1228', border: '1px solid #1e2d4a', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      {label && <div style={{ color: '#f0f4ff', fontWeight: 700, marginBottom: 6 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#f0f4ff', marginBottom: 2 }}>
          <span style={{ color: '#8899bb' }}>{p.name}: </span>
          <strong>{typeof p.value === 'number' && p.value > 100000 ? fmtDZD(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

const DEPT_COLORS = ['#6366f1','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#0ea5e9'];

export default function BIDashboardsPage() {
  const [view, setView] = useState('commercial');

  const { data: analyticsData, refetch, isFetching } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => apiClient.get('/analytics/overview', { params: { period: '6m' } }).then(r => r.data),
    staleTime: 60_000,
  });

  const { data: finData } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => apiClient.get('/analytics/finance-summary').then(r => r.data),
    staleTime: 60_000,
  });

  const kpis    = analyticsData?.kpis     || {};
  const charts  = analyticsData?.charts   || {};
  const meta    = analyticsData?.meta     || {};
  const cfData  = finData?.cashflow       || [];

  /* Build revenue trend for area chart from API */
  const revTrend = (charts.revenueTrend || []).map(r => ({
    month:   r.month,
    ventes:  r.revenue  || 0,
    objectif: Math.round((r.revenue || 0) * 1.1), // target = revenue + 10%
  }));

  /* Prod trend */
  const prodTrend = (charts.productionTrend || []).map(r => ({
    month:   r.month,
    produit: r.produced || 0,
    defauts: r.defects  || 0,
  }));

  /* RH: by dept from top customers (use orders by status as proxy) */
  const topCustomers = (charts.topCustomers || []).slice(0, 5);

  /* Equipment status from meta */
  const totalEq = (meta.downEquip || 0) + Math.max(0, (kpis.availability?.value || 94) * 0.01 * 30);

  return (
    <AnimatedPage>
      <div className="erp-page">
        <PageHeader icon="📊" title="Tableaux de bord BI" subtitle="Vue consolidée de toutes vos activités — Business Intelligence en temps réel"
          actions={
            <Btn variant="secondary" icon={<RefreshCw size={14} style={{ animation: isFetching ? 'spin 1s linear infinite' : undefined }} />} onClick={() => refetch()}>
              Actualiser
            </Btn>
          }
        />

        {/* View selector */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              style={{ padding: '10px 18px', background: view === v.key ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)', border: `1px solid ${view === v.key ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: view === v.key ? 700 : 500, color: view === v.key ? '#818cf8' : 'var(--text-muted)' }}>
              {v.label}
            </button>
          ))}
        </div>

        {/* COMMERCIAL VIEW */}
        {view === 'commercial' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <KpiTile icon={<ShoppingCart size={18} />} label="CA mensuel" value={fmtDZD(kpis.revenue?.value || 0)} sub="ce mois" color="#6366f1" trend={kpis.revenue?.growth || 0} />
              <KpiTile icon={<Users size={18} />} label="Commandes" value={kpis.orders?.value || 0} sub="ce mois" color="#10b981" trend={0} />
              <KpiTile icon={<ShoppingCart size={18} />} label="Factures impayées" value={fmtDZD(kpis.unpaid?.value || 0)} sub="en attente" color="#f59e0b" trend={0} />
              <KpiTile icon={<TrendingUp size={18} />} label="Stock (valeur)" value={fmtDZD(kpis.stockValue?.value || 0)} sub="inventaire" color="#3b82f6" trend={0} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <ChartCard title="Évolution des ventes" subtitle="CA mensuel réel vs objectif estimé">
                {revTrend.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 12 }}>Aucune donnée de ventes</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={revTrend}>
                      <defs>
                        <linearGradient id="gVentes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={n => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : `${(n/1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CTooltip />} />
                      <Area type="monotone" dataKey="ventes" name="Ventes" stroke="#6366f1" fill="url(#gVentes)" strokeWidth={2.5} />
                      <Line type="monotone" dataKey="objectif" name="Objectif" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
              <ChartCard title="Top clients" subtitle="Par volume de commandes">
                {topCustomers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 12 }}>Aucune donnée client</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {topCustomers.map((c, i) => {
                      const maxVal = topCustomers[0]?.total || 1;
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmtDZD(c.total)}</span>
                          </div>
                          <div style={{ height: 5, background: 'var(--border)', borderRadius: 3 }}>
                            <div style={{ height: '100%', width: `${(c.total / maxVal) * 100}%`, background: '#6366f1', borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ChartCard>
            </div>
          </>
        )}

        {/* OPERATIONS VIEW */}
        {view === 'operations' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <KpiTile icon={<Package size={18} />}   label="Unités produites"      value={fmtNum(kpis.production?.value || 0)} sub="ce mois"     color="#f59e0b" trend={0} />
              <KpiTile icon={<TrendingUp size={18} />} label="Efficacité prod."      value={`${kpis.efficiency?.value || 0}%`}  sub="taux global" color="#10b981" trend={0} />
              <KpiTile icon={<Wrench size={18} />}    label="Demandes maintenance"  value={meta.openMaintenanceRequests || 0}  sub="ouvertes"    color="#ef4444" trend={0} />
              <KpiTile icon={<Package size={18} />}   label="Stock critique"         value={meta.lowStockCount || 0}           sub="produits"    color="#6366f1" trend={0} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <ChartCard title="Production mensuelle" subtitle="Unités produites vs défauts">
                {prodTrend.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 12 }}>Aucune donnée de production</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={prodTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CTooltip />} />
                      <Bar dataKey="produit" name="Produit" fill="#10b981" opacity={0.85} radius={[3,3,0,0]} />
                      <Bar dataKey="defauts" name="Défauts"  fill="#ef4444" opacity={0.8}  radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
              <ChartCard title="Inventaire — Niveaux de stock" subtitle="Produits par niveau (%)">
                {(charts.inventoryLevels || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 12 }}>Aucune donnée stock</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {(charts.inventoryLevels || []).slice(0, 6).map((p, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                          <span style={{ color: 'var(--text-secondary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.product}</span>
                          <span style={{ fontWeight: 700, color: p.level < 30 ? '#ef4444' : p.level < 60 ? '#f59e0b' : '#10b981' }}>{p.level}%</span>
                        </div>
                        <div style={{ height: 5, background: 'var(--border)', borderRadius: 3 }}>
                          <div style={{ height: '100%', width: `${p.level}%`, background: p.level < 30 ? '#ef4444' : p.level < 60 ? '#f59e0b' : '#10b981', borderRadius: 3 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ChartCard>
            </div>
          </>
        )}

        {/* RH VIEW */}
        {view === 'rh' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <KpiTile icon={<Users size={18} />} label="Effectif actif"    value={analyticsData?.meta?.activeProjects !== undefined ? '—' : '—'} sub="employés"       color="#6366f1" trend={0} />
              <KpiTile icon={<Users size={18} />} label="Congés en attente" value={meta.pendingLeaves || 0} sub="demandes"      color="#f59e0b" trend={0} />
              <KpiTile icon={<TrendingUp size={18} />} label="Projets actifs" value={meta.activeProjects || 0} sub="en cours" color="#10b981" trend={0} />
              <KpiTile icon={<Users size={18} />} label="Stock critique"    value={meta.lowStockCount || 0}   sub="produits"    color="#ef4444" trend={0} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <ChartCard title="Commandes par statut" subtitle="Répartition en cours">
                {(charts.ordersByStatus || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 12 }}>Aucune donnée</div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <ResponsiveContainer width={180} height={200}>
                      <PieChart>
                        <Pie data={charts.ordersByStatus} dataKey="count" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                          {(charts.ordersByStatus || []).map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(charts.ordersByStatus || []).map((d, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: DEPT_COLORS[i % DEPT_COLORS.length], display: 'inline-block' }} />
                            <span style={{ color: 'var(--text-secondary)' }}>{d.status}</span>
                          </div>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{d.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ChartCard>
              <ChartCard title="Production par produit" subtitle="Top produits fabriqués">
                {(charts.productionByProduct || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 12 }}>Aucune production</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {(charts.productionByProduct || []).slice(0, 5).map((p, i) => {
                      const max = Math.max(...(charts.productionByProduct || []).map(x => x.qty), 1);
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                            <span style={{ color: 'var(--text-secondary)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.product}</span>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.qty} unités</span>
                          </div>
                          <div style={{ height: 5, background: 'var(--border)', borderRadius: 3 }}>
                            <div style={{ height: '100%', width: `${(p.qty / max) * 100}%`, background: DEPT_COLORS[i % DEPT_COLORS.length], borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ChartCard>
            </div>
          </>
        )}

        {/* FINANCE VIEW */}
        {view === 'finance' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <KpiTile icon={<TrendingUp size={18} />} label="CA mensuel"       value={fmtDZD(kpis.revenue?.value || 0)}   sub="ce mois"    color="#10b981" trend={kpis.revenue?.growth || 0} />
              <KpiTile icon={<ShoppingCart size={18} />} label="Factures impayées" value={fmtDZD(kpis.unpaid?.value || 0)} sub="en retard"  color="#ef4444" trend={0} />
              <KpiTile icon={<Package size={18} />}   label="Valeur stock"     value={fmtDZD(kpis.stockValue?.value || 0)} sub="inventaire" color="#3b82f6" trend={0} />
              <KpiTile icon={<Wrench size={18} />}    label="Coût maintenance" value={fmtDZD(kpis.maintCost?.value || 0)} sub="cumulé"     color="#f59e0b" trend={0} />
            </div>
            <ChartCard title="Trésorerie — Entrées vs Sorties" subtitle="Flux mensuels réels" span={2}>
              {cfData.length === 0 || cfData.every(m => m.inflow === 0) ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 12 }}>
                  Aucune donnée de trésorerie.<br />Créez des entrées dans le module Trésorerie.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={cfData}>
                    <defs>
                      <linearGradient id="gIn"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.25} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}  /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={n => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : `${(n/1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CTooltip />} />
                    <Area type="monotone" dataKey="inflow"  name="Entrées" stroke="#10b981" fill="url(#gIn)"  strokeWidth={2.5} />
                    <Area type="monotone" dataKey="outflow" name="Sorties" stroke="#ef4444" fill="url(#gOut)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </AnimatedPage>
  );
}
