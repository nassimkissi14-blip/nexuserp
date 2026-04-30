import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import AnimatedPage from '../../components/ui/AnimatedPage.jsx';
import { PageHeader, Btn } from '../../components/ui/DesignSystem.jsx';
import apiClient from '../../api/client.js';

const fmtDZD = n => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M DA` : n >= 1_000 ? `${(n/1_000).toFixed(0)}k DA` : `${n} DA`;

const REPORTS = [
  { key: 'pl',       label: 'Compte de résultat',   icon: '📊', desc: 'Produits, charges et bénéfice net' },
  { key: 'cashflow', label: 'Flux de trésorerie',   icon: '💵', desc: 'Entrées et sorties de liquidités' },
  { key: 'balance',  label: 'Bilan patrimonial',    icon: '⚖️', desc: 'Actif, passif et capitaux propres' },
  { key: 'aging',    label: 'Balance âgée clients', icon: '🕐', desc: 'Créances par ancienneté' },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0a1228', border: '1px solid #1e2d4a', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      {label && <div style={{ color: '#f0f4ff', fontWeight: 700, marginBottom: 6 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
          <span style={{ color: '#8899bb' }}>{p.name}:</span>
          <strong style={{ color: '#f0f4ff' }}>{fmtDZD(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

export default function FinanceReportsPage() {
  const [activeReport, setActiveReport] = useState('pl');
  const [period, setPeriod] = useState('year');

  const { data: finData, isLoading, refetch } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => apiClient.get('/analytics/finance-summary').then(r => r.data),
    staleTime: 60_000,
  });

  const pl       = finData?.pl       || [];
  const cashflow = finData?.cashflow  || [];
  const aging    = finData?.aging     || [];
  const balance  = finData?.balance   || {};
  const kpis     = finData?.kpis      || {};

  const plFiltered = period === 'year' ? pl :
    period === 'semester' ? pl.slice(0, 6) :
    period === 'q1' ? pl.slice(0, 3) :
    period === 'q2' ? pl.slice(3, 6) : pl;

  const cfFiltered = period === 'year' ? cashflow :
    period === 'semester' ? cashflow.slice(0, 6) :
    period === 'q1' ? cashflow.slice(0, 3) :
    period === 'q2' ? cashflow.slice(3, 6) : cashflow;

  if (isLoading) return (
    <AnimatedPage>
      <div className="erp-page">
        <PageHeader icon="📊" title="Rapports financiers" subtitle="Analysez la santé financière de votre entreprise" />
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement des données financières…</div>
      </div>
    </AnimatedPage>
  );

  return (
    <AnimatedPage>
      <div className="erp-page">
        <PageHeader icon="📊" title="Rapports financiers" subtitle="Analysez la santé financière de votre entreprise"
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={period} onChange={e => setPeriod(e.target.value)}
                style={{ padding: '7px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }}>
                <option value="year">Année en cours</option>
                <option value="q1">1er trimestre</option>
                <option value="q2">2e trimestre</option>
                <option value="semester">Semestre</option>
              </select>
              <Btn variant="secondary" icon={<RefreshCw size={14} />} onClick={() => refetch()}>Actualiser</Btn>
              <Btn variant="secondary" icon={<Download size={14} />}>Exporter PDF</Btn>
            </div>
          }
        />

        {/* KPIs */}
        <div className="erp-kpi-grid">
          {[
            { label: 'Chiffre d\'affaires', value: fmtDZD(kpis.totalRevenue || 0), sub: 'depuis janv.', color: '#6366f1', trend: 'up' },
            { label: 'Bénéfice net',        value: fmtDZD(kpis.totalProfit  || 0), sub: `Marge ${kpis.profitMargin || 0}%`, color: '#10b981', trend: 'up' },
            { label: 'Créances clients',    value: fmtDZD(kpis.totalReceivables || 0), sub: 'non encaissées', color: '#f59e0b', trend: 'down' },
            { label: 'Flux de tréso.',      value: fmtDZD(kpis.netCashflow || 0), sub: 'solde cumulé', color: '#3b82f6', trend: kpis.netCashflow >= 0 ? 'up' : 'down' },
          ].map((k, i) => (
            <div key={i} className="erp-kpi" style={{ '--kpi-color': k.color }}>
              <div className="erp-kpi__icon" style={{ background: k.color + '22', color: k.color }}>
                {k.trend === 'up' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              </div>
              <div>
                <div className="erp-kpi__value" style={{ color: k.color, fontSize: 15 }}>{k.value}</div>
                <div className="erp-kpi__label">{k.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Report selector */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {REPORTS.map(r => (
            <button key={r.key} onClick={() => setActiveReport(r.key)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '12px 18px', background: activeReport === r.key ? 'rgba(99,102,241,0.12)' : 'var(--bg-card)', border: `1px solid ${activeReport === r.key ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer', minWidth: 160 }}>
              <span style={{ fontSize: 20 }}>{r.icon}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: activeReport === r.key ? '#818cf8' : 'var(--text-primary)' }}>{r.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.desc}</span>
            </button>
          ))}
        </div>

        {/* Chart area */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '22px 24px' }}>

          {activeReport === 'pl' && (
            <>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Compte de résultat — Évolution mensuelle</div>
              {plFiltered.every(m => m.revenue === 0 && m.expenses === 0) ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                  Aucune donnée financière pour cette période.<br />Créez des factures et des entrées de trésorerie pour voir les graphiques.
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={plFiltered} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={n => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : `${(n/1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="revenue"  name="CA"       fill="#6366f1" opacity={0.85} radius={[3,3,0,0]} />
                      <Bar dataKey="expenses" name="Charges"  fill="#ef4444" opacity={0.7}  radius={[3,3,0,0]} />
                      <Bar dataKey="profit"   name="Bénéfice" fill="#10b981" opacity={0.9}  radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                      { label: 'Total produits', value: fmtDZD(plFiltered.reduce((s,d) => s + d.revenue, 0)),  color: '#6366f1' },
                      { label: 'Total charges',  value: fmtDZD(plFiltered.reduce((s,d) => s + d.expenses, 0)), color: '#ef4444' },
                      { label: 'Résultat net',   value: fmtDZD(plFiltered.reduce((s,d) => s + d.profit, 0)),   color: '#10b981' },
                    ].map((c, i) => (
                      <div key={i} style={{ padding: '14px 16px', background: c.color + '10', border: `1px solid ${c.color}25`, borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: c.color }}>{c.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{c.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {activeReport === 'cashflow' && (
            <>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Flux de trésorerie — Entrées vs Sorties</div>
              {cfFiltered.every(m => m.inflow === 0 && m.outflow === 0) ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                  Aucune entrée de trésorerie trouvée.<br />Créez des entrées dans le module Trésorerie pour voir les flux.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cfFiltered} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={n => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : `${(n/1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="inflow"  name="Entrées"  stroke="#10b981" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="outflow" name="Sorties"  stroke="#ef4444" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="net"     name="Flux net" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </>
          )}

          {activeReport === 'balance' && (
            <>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Bilan — Actifs et engagements</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  { label: 'Valeur des stocks',    value: balance.stockValue || 0,        color: '#6366f1', icon: '📦', desc: 'Inventaire au prix d\'achat' },
                  { label: 'Créances clients',      value: balance.receivables || 0,       color: '#f59e0b', icon: '💳', desc: 'Factures non encaissées' },
                  { label: 'Trésorerie nette',      value: balance.treasuryBalance || 0,   color: '#10b981', icon: '💰', desc: 'Solde entrées–sorties' },
                ].map((item, i) => (
                  <div key={i} style={{ padding: '20px', background: item.color + '10', border: `1px solid ${item.color}25`, borderRadius: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>{item.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>{fmtDZD(item.value)}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeReport === 'aging' && (
            <>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Balance âgée — Créances clients par ancienneté</div>
              {aging.every(a => a.amount === 0) ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                  Aucune créance client en suspens.<br />Toutes les factures sont réglées ou il n'y en a pas encore.
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                    {aging.map((d, i) => (
                      <div key={i} style={{ padding: '18px', background: d.color + '12', border: `1px solid ${d.color}30`, borderRadius: 10, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: d.color, fontWeight: 700, marginBottom: 8 }}>{d.range}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: d.color }}>{fmtDZD(d.amount)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{d.count} facture{d.count !== 1 ? 's' : ''}</div>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={aging} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={n => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : `${(n/1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="amount" name="Montant" radius={[4,4,0,0]}>
                        {aging.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
