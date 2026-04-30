import { useState } from 'react';
import { Download, RefreshCw, FileText, TrendingUp, Users, Package, Truck } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import AnimatedPage from '../components/ui/AnimatedPage.jsx';
import { PageHeader, Btn } from '../components/ui/DesignSystem.jsx';

const fmtDZD = n => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M DA` : `${(n/1_000).toFixed(0)}k DA`;

const REPORT_TYPES = [
  { key: 'executive',  label: 'Rapport exécutif',     icon: '📊', color: '#6366f1', desc: 'Vue d\'ensemble dirigeants' },
  { key: 'sales',      label: 'Performance ventes',   icon: '💰', color: '#10b981', desc: 'Analyse des revenus & tendances' },
  { key: 'hr',         label: 'Rapport RH',            icon: '👥', color: '#f59e0b', desc: 'Effectifs, absences, performances' },
  { key: 'ops',        label: 'Opérations',            icon: '⚙️', color: '#3b82f6', desc: 'Production, stock, logistique' },
];

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const SALES_DATA = MONTHS.map((month, i) => ({
  month,
  actual:    Math.round(4200000 + Math.random() * 1400000 + i * 90000),
  target:    Math.round(4500000 + i * 100000),
  growth:    parseFloat((8 + Math.random() * 14).toFixed(1)),
}));

const DEPT_PERF = [
  { dept: 'Ventes',       score: 88, revenue: 18400000, color: '#10b981' },
  { dept: 'Production',   score: 75, revenue: 0,         color: '#6366f1' },
  { dept: 'Logistique',   score: 82, revenue: 0,         color: '#3b82f6' },
  { dept: 'RH',           score: 91, revenue: 0,         color: '#f59e0b' },
  { dept: 'Finance',      score: 79, revenue: 0,         color: '#8b5cf6' },
];

const HR_DATA = [
  { name: 'Présents',    value: 142, color: '#10b981' },
  { name: 'Congés',      value: 18,  color: '#f59e0b' },
  { name: 'Absents',     value: 7,   color: '#ef4444' },
  { name: 'Télétravail', value: 23,  color: '#6366f1' },
];

const OPS_DATA = MONTHS.slice(0, 6).map((month, i) => ({
  month,
  production: Math.round(280 + Math.random() * 80 + i * 5),
  livraisons: Math.round(95 + Math.random() * 30 + i * 3),
  incidents:  Math.floor(Math.random() * 6),
}));

const AI_SUMMARY = [
  { icon: '📈', label: 'Croissance CA estimée Q3', value: '+18.4%', color: '#10b981' },
  { icon: '⚠️', label: 'Risques identifiés',        value: '3',     color: '#ef4444' },
  { icon: '💡', label: 'Opportunités détectées',    value: '7',     color: '#6366f1' },
  { icon: '🎯', label: 'Objectifs atteints',         value: '11/14', color: '#f59e0b' },
];

const SCHEDULED = [
  { name: 'Rapport mensuel exécutif',  freq: 'Mensuel',     next: '01/05/2026', status: 'actif' },
  { name: 'Performance ventes hebdo',  freq: 'Hebdomadaire',next: '18/04/2026', status: 'actif' },
  { name: 'Bilan RH trimestriel',      freq: 'Trimestriel', next: '01/07/2026', status: 'actif' },
  { name: 'Rapport incidents prod.',   freq: 'Hebdomadaire',next: '18/04/2026', status: 'pause' },
];

function TooltipCustom({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0a1228', border: '1px solid #1e2d4a', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      {label && <div style={{ color: '#f0f4ff', fontWeight: 700, marginBottom: 6 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
          <span style={{ color: '#8899bb' }}>{p.name}:</span>
          <strong style={{ color: '#f0f4ff' }}>{typeof p.value === 'number' && p.value > 100000 ? fmtDZD(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function AIReportsPage() {
  const [activeReport, setActiveReport] = useState('executive');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => setGenerating(false), 1800);
  };

  return (
    <AnimatedPage>
      <div className="erp-page">
        <PageHeader icon="📋" title="Rapports IA" subtitle="Rapports intelligents générés automatiquement — analyses approfondies et recommandations"
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="secondary" icon={<Download size={14} />}>Exporter PDF</Btn>
              <Btn variant="primary" icon={<RefreshCw size={14} style={{ animation: generating ? 'spin 1s linear infinite' : undefined }} />} onClick={handleGenerate}>
                {generating ? 'Génération…' : 'Générer rapport'}
              </Btn>
            </div>
          }
        />

        {/* AI Summary KPIs */}
        <div className="erp-kpi-grid">
          {AI_SUMMARY.map((s, i) => (
            <div key={i} className="erp-kpi" style={{ '--kpi-color': s.color }}>
              <div className="erp-kpi__icon" style={{ background: s.color + '22', color: s.color, fontSize: 20 }}>{s.icon}</div>
              <div>
                <div className="erp-kpi__value" style={{ color: s.color }}>{s.value}</div>
                <div className="erp-kpi__label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Report type tabs */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {REPORT_TYPES.map(r => (
            <button key={r.key} onClick={() => setActiveReport(r.key)}
              style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 18px', background: activeReport === r.key ? r.color + '15' : 'var(--bg-card)', border: `1px solid ${activeReport === r.key ? r.color + '50' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer', transition: 'all .15s', minWidth: 150, textAlign: 'left' }}>
              <span style={{ fontSize: 20 }}>{r.icon}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: activeReport === r.key ? r.color : 'var(--text-primary)' }}>{r.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.desc}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'start' }}>

          {/* Main chart area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {activeReport === 'executive' && (
              <>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Évolution du chiffre d'affaires vs objectifs</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Analyse IA des écarts et prévisions automatiques</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={SALES_DATA} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={n => `${(n/1000000).toFixed(1)}M`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<TooltipCustom />} />
                      <Bar dataKey="actual" name="Réalisé"  fill="#6366f1" opacity={0.85} radius={[3,3,0,0]} />
                      <Bar dataKey="target" name="Objectif" fill="#334155" opacity={0.6}  radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Performance par département</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {DEPT_PERF.map((d, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{d.dept}</span>
                          <span style={{ color: d.color, fontWeight: 700 }}>{d.score}/100</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${d.score}%`, background: d.color, borderRadius: 4, transition: 'width .6s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeReport === 'sales' && (
              <>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Croissance mensuelle des ventes (%)</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Taux de croissance mois par mois — détectés par IA</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={SALES_DATA} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={n => `${n}%`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<TooltipCustom />} />
                      <Line type="monotone" dataKey="growth" name="Croissance %" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'CA total YTD',     value: fmtDZD(SALES_DATA.reduce((s,d) => s + d.actual, 0)), color: '#6366f1' },
                    { label: 'Objectif YTD',     value: fmtDZD(SALES_DATA.reduce((s,d) => s + d.target, 0)), color: '#f59e0b' },
                    { label: 'Croissance moy.',  value: `+${(SALES_DATA.reduce((s,d) => s + d.growth, 0) / SALES_DATA.length).toFixed(1)}%`, color: '#10b981' },
                  ].map((c, i) => (
                    <div key={i} style={{ padding: '16px', background: c.color + '10', border: `1px solid ${c.color}25`, borderRadius: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{c.value}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{c.label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeReport === 'hr' && (
              <>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Répartition des effectifs aujourd'hui</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={HR_DATA} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={3}>
                          {HR_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [`${v} employés`, n]} contentStyle={{ background: '#0a1228', border: '1px solid #1e2d4a', borderRadius: 8, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
                      {HR_DATA.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{d.name}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: d.color }}>{d.value}</span>
                        </div>
                      ))}
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{HR_DATA.reduce((s, d) => s + d.value, 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Recommandations IA — RH</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                    {[
                      { icon: '💡', text: 'Le département Ventes montre un taux d\'absentéisme de +23% vs moyenne. Investiguer les causes.', color: '#f59e0b' },
                      { icon: '📈', text: 'Les performances des équipes Tech ont progressé de 15% grâce aux formations récentes.', color: '#10b981' },
                      { icon: '⚠️', text: '3 postes critiques à pourvoir dans les 30 prochains jours selon les départs prévus.', color: '#ef4444' },
                    ].map((r, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, padding: '12px 14px', background: r.color + '0e', border: `1px solid ${r.color}20`, borderRadius: 8 }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{r.icon}</span>
                        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{r.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeReport === 'ops' && (
              <>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>KPIs opérationnels — 6 derniers mois</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Production (unités) · Livraisons · Incidents</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={OPS_DATA} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<TooltipCustom />} />
                      <Bar dataKey="production" name="Production" fill="#6366f1" opacity={0.85} radius={[3,3,0,0]} />
                      <Bar dataKey="livraisons" name="Livraisons" fill="#10b981" opacity={0.8}  radius={[3,3,0,0]} />
                      <Bar dataKey="incidents"  name="Incidents"  fill="#ef4444" opacity={0.7}  radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Unités produites',  value: OPS_DATA.reduce((s,d) => s + d.production, 0).toLocaleString('fr-FR'), color: '#6366f1' },
                    { label: 'Livraisons',         value: OPS_DATA.reduce((s,d) => s + d.livraisons, 0).toLocaleString('fr-FR'), color: '#10b981' },
                    { label: 'Incidents totaux',   value: OPS_DATA.reduce((s,d) => s + d.incidents, 0), color: '#ef4444' },
                  ].map((c, i) => (
                    <div key={i} style={{ padding: '16px', background: c.color + '10', border: `1px solid ${c.color}25`, borderRadius: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{c.value}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{c.label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right panel: scheduled reports */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Rapports programmés</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {SCHEDULED.map((s, i) => (
                  <div key={i} style={{ padding: '11px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: s.status === 'actif' ? '#10b981' : '#f59e0b', background: (s.status === 'actif' ? '#10b981' : '#f59e0b') + '18', padding: '2px 6px', borderRadius: 4 }}>
                        {s.status === 'actif' ? 'Actif' : 'Pausé'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.freq} · Prochain: {s.next}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Formats d'export</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { fmt: 'PDF', icon: '📄', color: '#ef4444' },
                  { fmt: 'Excel', icon: '📊', color: '#10b981' },
                  { fmt: 'CSV', icon: '📋', color: '#6366f1' },
                  { fmt: 'PowerPoint', icon: '🖥️', color: '#f59e0b' },
                ].map((f, i) => (
                  <button key={i} onClick={() => {}}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'transparent', border: `1px solid var(--border)`, borderRadius: 7, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'left', transition: 'all .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ fontSize: 16 }}>{f.icon}</span>
                    <span style={{ flex: 1 }}>Exporter en {f.fmt}</span>
                    <Download size={12} style={{ color: 'var(--text-muted)' }} />
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Dernière mise à jour</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                <div>🕐 <strong style={{ color: 'var(--text-secondary)' }}>14/04/2026 à 09:42</strong></div>
                <div style={{ marginTop: 4 }}>📊 Données analysées: <strong style={{ color: 'var(--text-secondary)' }}>4 856 enregistrements</strong></div>
                <div style={{ marginTop: 4 }}>🤖 Modèle: <strong style={{ color: '#818cf8' }}>NexusAI v2.1</strong></div>
                <div style={{ marginTop: 4 }}>⏱️ Temps d'analyse: <strong style={{ color: 'var(--text-secondary)' }}>1.4s</strong></div>
              </div>
            </div>
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </AnimatedPage>
  );
}
