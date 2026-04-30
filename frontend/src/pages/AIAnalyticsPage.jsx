import { useState } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { RefreshCw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AnimatedPage from '../components/ui/AnimatedPage.jsx';
import { PageHeader, Btn } from '../components/ui/DesignSystem.jsx';
import apiClient from '../api/client.js';

const fmtDZD = n => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M DA` : `${(n/1_000).toFixed(0)}k DA`;

const TYPE_LABELS = {
  anomaly:     { label: 'Anomalie',    color: '#ef4444' },
  trend:       { label: 'Tendance',    color: '#10b981' },
  risk:        { label: 'Risque',      color: '#f59e0b' },
  opportunity: { label: 'Opportunité', color: '#6366f1' },
  prediction:  { label: 'Prédiction',  color: '#8b5cf6' },
  efficiency:  { label: 'Efficacité',  color: '#3b82f6' },
};

/* Compute AI insights from real analytics data */
function computeInsights(analytics, finance) {
  const kpis    = analytics?.kpis   || {};
  const charts  = analytics?.charts || {};
  const meta    = analytics?.meta   || {};
  const insights = [];

  /* Revenue growth anomaly */
  const growth = kpis.revenue?.growth || 0;
  if (Math.abs(growth) > 15) {
    insights.push({
      id: 'rev-anomaly', type: 'anomaly', icon: '⚠️', color: '#ef4444',
      title: growth > 0 ? 'Pic de revenus inhabituel' : 'Baisse de revenus inhabituelle',
      desc: `Le CA a ${growth > 0 ? 'augmenté' : 'baissé'} de ${Math.abs(growth)}% par rapport au mois précédent. ${growth > 0 ? 'Vérifiez la capacité de traitement.' : 'Analysez les causes de cette baisse.'}`,
      action: 'Voir les commandes',
    });
  }

  /* Positive revenue trend */
  if (growth > 5) {
    insights.push({
      id: 'rev-trend', type: 'trend', icon: '📈', color: '#10b981',
      title: 'Tendance positive des ventes',
      desc: `Croissance de +${growth}% ce mois. CA actuel: ${fmtDZD(kpis.revenue?.value || 0)}.`,
      action: 'Voir les projections',
    });
  }

  /* Low stock risk */
  if (meta.lowStockCount > 0) {
    insights.push({
      id: 'low-stock', type: 'risk', icon: '🚨', color: '#f59e0b',
      title: `Stock critique sur ${meta.lowStockCount} produit${meta.lowStockCount > 1 ? 's' : ''}`,
      desc: `${meta.lowStockCount} produit${meta.lowStockCount > 1 ? 's ont' : ' a'} atteint le seuil minimum de stock. Approvisionnement recommandé.`,
      action: 'Lancer réappro.',
    });
  }

  /* Unpaid invoices risk */
  const unpaid = kpis.unpaid?.value || 0;
  if (unpaid > 0) {
    insights.push({
      id: 'unpaid', type: 'risk', icon: '🚨', color: '#f59e0b',
      title: `${fmtDZD(unpaid)} de créances impayées`,
      desc: `${kpis.unpaid?.growth || 0} factures en retard. Relances clients recommandées.`,
      action: 'Voir les factures',
    });
  }

  /* Maintenance opportunity */
  if (meta.openMaintenanceRequests > 3) {
    insights.push({
      id: 'maint', type: 'efficiency', icon: '⚡', color: '#3b82f6',
      title: `${meta.openMaintenanceRequests} demandes de maintenance ouvertes`,
      desc: `Un backlog de maintenance important peut affecter la disponibilité des équipements. Planifiez les interventions.`,
      action: 'Analyser',
    });
  }

  /* Revenue prediction based on trend */
  const revTrend = charts.revenueTrend || [];
  if (revTrend.length >= 3) {
    const last3 = revTrend.slice(-3);
    const avgRev = last3.reduce((s, r) => s + r.revenue, 0) / 3;
    const predicted = Math.round(avgRev * (1 + (growth / 100)));
    insights.push({
      id: 'prediction', type: 'prediction', icon: '🔮', color: '#8b5cf6',
      title: 'Prévision CA mois prochain',
      desc: `Basé sur les 3 derniers mois, le CA estimé est de ${fmtDZD(predicted)} ±10%.`,
      action: 'Voir le détail',
    });
  }

  /* Active projects opportunity */
  if (meta.activeProjects > 0) {
    insights.push({
      id: 'projects', type: 'opportunity', icon: '💡', color: '#6366f1',
      title: `${meta.activeProjects} projet${meta.activeProjects > 1 ? 's' : ''} actif${meta.activeProjects > 1 ? 's' : ''}`,
      desc: `Coordonnez les ressources entre projets pour maximiser l'efficacité et réduire les délais de livraison.`,
      action: 'Gérer les projets',
    });
  }

  return insights;
}

/* Compute health scores from real data */
function computeHealthScores(analytics, finance) {
  const kpis = analytics?.kpis || {};
  const meta = analytics?.meta || {};

  const revGrowth = kpis.revenue?.growth || 0;
  const salesScore = Math.min(100, Math.max(0, 70 + revGrowth * 1.5));

  const prodEff    = kpis.efficiency?.value || 0;
  const prodScore  = Math.min(100, Math.max(0, prodEff));

  const stockRatio = meta.lowStockCount || 0;
  const stockScore = Math.max(10, 100 - stockRatio * 10);

  const delivScore = Math.min(100, Math.max(50, kpis.availability?.value || 85));

  const unpaid   = kpis.unpaid?.value || 0;
  const revenue  = kpis.revenue?.value || 1;
  const finScore = Math.max(20, 100 - Math.min(80, (unpaid / revenue) * 200));

  const maintReqs  = meta.openMaintenanceRequests || 0;
  const maintScore = Math.max(20, 100 - maintReqs * 5);

  return [
    { metric: 'Ventes',      score: Math.round(salesScore) },
    { metric: 'Production',  score: Math.round(prodScore)  },
    { metric: 'Stock',       score: Math.round(stockScore) },
    { metric: 'Livraisons',  score: Math.round(delivScore) },
    { metric: 'Finance',     score: Math.round(finScore)   },
    { metric: 'Maintenance', score: Math.round(maintScore) },
  ];
}

export default function AIAnalyticsPage() {
  const [filter, setFilter] = useState('all');
  const qc = useQueryClient();

  const { data: analyticsData, isFetching } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => apiClient.get('/analytics/overview', { params: { period: '6m' } }).then(r => r.data),
    staleTime: 60_000,
  });

  const { data: finData } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => apiClient.get('/analytics/finance-summary').then(r => r.data),
    staleTime: 60_000,
  });

  const insights    = computeInsights(analyticsData, finData);
  const radarData   = computeHealthScores(analyticsData, finData);
  const score       = radarData.length ? Math.round(radarData.reduce((s, d) => s + d.score, 0) / radarData.length) : 0;

  /* Build prediction chart from revenue trend + projected */
  const revTrend  = (analyticsData?.charts?.revenueTrend || []);
  const predChart = revTrend.map((r, i) => ({
    month:     r.month,
    actual:    r.revenue || null,
    predicted: null,
  }));
  if (revTrend.length > 0) {
    const last3 = revTrend.slice(-3);
    const avgRev = last3.reduce((s, r) => s + r.revenue, 0) / Math.max(last3.length, 1);
    const growth = (analyticsData?.kpis?.revenue?.growth || 0) / 100;
    const FUTURE_MONTHS = ['Mois+1', 'Mois+2', 'Mois+3'];
    FUTURE_MONTHS.forEach((m, i) => {
      predChart.push({ month: m, actual: null, predicted: Math.round(avgRev * Math.pow(1 + growth, i + 1)) });
    });
  }

  const displayed = filter === 'all' ? insights : insights.filter(i => i.type === filter);

  const typeCounts = {};
  insights.forEach(i => { typeCounts[i.type] = (typeCounts[i.type] || 0) + 1; });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['analytics-overview'] });
    qc.invalidateQueries({ queryKey: ['finance-summary'] });
  };

  return (
    <AnimatedPage>
      <div className="erp-page">
        <PageHeader icon="🔮" title="Analyses IA" subtitle="Intelligence artificielle appliquée à vos données ERP — insights et prédictions automatiques"
          actions={
            <Btn variant="secondary" icon={<RefreshCw size={14} style={{ animation: isFetching ? 'spin 1s linear infinite' : undefined }} />} onClick={refresh}>
              {isFetching ? 'Analyse…' : 'Relancer l\'IA'}
            </Btn>
          }
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'start' }}>

          {/* Main: Insights */}
          <div>
            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <button onClick={() => setFilter('all')}
                style={{ padding: '6px 14px', background: filter === 'all' ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)', border: `1px solid ${filter === 'all' ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: filter === 'all' ? 700 : 400, color: filter === 'all' ? '#818cf8' : 'var(--text-muted)' }}>
                Tous ({insights.length})
              </button>
              {Object.entries(TYPE_LABELS).map(([k, v]) => {
                const count = typeCounts[k] || 0;
                if (!count) return null;
                return (
                  <button key={k} onClick={() => setFilter(k)}
                    style={{ padding: '6px 14px', background: filter === k ? v.color + '18' : 'var(--bg-card)', border: `1px solid ${filter === k ? v.color + '50' : 'var(--border)'}`, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: filter === k ? 700 : 400, color: filter === k ? v.color : 'var(--text-muted)' }}>
                    {v.label} ({count})
                  </button>
                );
              })}
            </div>

            {displayed.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                {isFetching ? 'Analyse des données en cours…' : 'Aucun insight détecté pour le moment. Ajoutez des données ERP pour activer l\'IA.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {displayed.map(insight => {
                  const tl = TYPE_LABELS[insight.type];
                  return (
                    <div key={insight.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: `4px solid ${insight.color}`, borderRadius: 'var(--radius-lg)', padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: insight.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{insight.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{insight.title}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: insight.color, background: insight.color + '18', padding: '2px 8px', borderRadius: 4 }}>{tl?.label}</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>{insight.desc}</p>
                      </div>
                      <button style={{ fontSize: 12, fontWeight: 600, color: insight.color, background: insight.color + '12', border: `1px solid ${insight.color}30`, borderRadius: 6, padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {insight.action} →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Prediction chart */}
            {predChart.length > 0 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px', marginTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Prévision CA — Historique + Projection IA</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Ligne pleine = réalisé · Tirets = prédiction basée sur la tendance actuelle</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={predChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={n => n ? `${(n/1000000).toFixed(1)}M` : ''} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => v ? fmtDZD(v) : '—'} contentStyle={{ background: '#0a1228', border: '1px solid #1e2d4a', borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="actual"    name="Réalisé"    stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} connectNulls={false} />
                    <Line type="monotone" dataKey="predicted" name="Prédiction" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 3" dot={{ fill: '#8b5cf6', r: 3 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Right: Score radar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, textAlign: 'center' }}>Score de santé ERP</div>
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: score >= 80 ? '#10b981' : score >= 65 ? '#f59e0b' : '#ef4444' }}>{score}</span>
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/100</span>
              </div>
              <div style={{ textAlign: 'center', fontSize: 12, color: score >= 80 ? '#10b981' : score >= 65 ? '#f59e0b' : '#ef4444', marginBottom: 12, fontWeight: 600 }}>
                {score >= 80 ? '🟢 Excellent' : score >= 65 ? '🟡 Correct' : '🔴 À améliorer'}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
                {[...radarData].sort((a, b) => a.score - b.score).slice(0, 3).map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-muted)' }}>⚠️ {d.metric}</span>
                    <span style={{ fontWeight: 700, color: d.score < 65 ? '#ef4444' : '#f59e0b' }}>{d.score}/100</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Résumé IA</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: '⚠️', count: insights.filter(i => i.type === 'anomaly' || i.type === 'risk').length, label: 'alertes actives', color: '#ef4444' },
                  { icon: '📈', count: insights.filter(i => i.type === 'trend').length,       label: 'tendances détectées', color: '#10b981' },
                  { icon: '💡', count: insights.filter(i => i.type === 'opportunity').length, label: 'opportunités',        color: '#6366f1' },
                  { icon: '🔮', count: insights.filter(i => i.type === 'prediction').length,  label: 'prédictions actives', color: '#8b5cf6' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: s.color + '0e', borderRadius: 6, border: `1px solid ${s.color}20` }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.icon} {s.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </AnimatedPage>
  );
}
