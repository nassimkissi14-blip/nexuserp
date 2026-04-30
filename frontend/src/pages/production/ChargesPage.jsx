import { useQuery } from '@tanstack/react-query';
import { RefreshCw, BarChart2, AlertTriangle, CheckCircle } from 'lucide-react';
import { gpaoAPI } from '../../api/client.js';

const fmt = n => Number(n || 0).toFixed(1);

function getWeeksInRange(charges) {
  const allWeeks = new Set();
  charges.forEach(row => Object.keys(row.charges).forEach(w => allWeeks.add(w)));
  return Array.from(allWeeks).sort();
}

function fmtWeek(weekKey) {
  const d = new Date(weekKey);
  const day = d.getDate();
  const month = d.toLocaleString('fr-FR', { month: 'short' });
  return `${day} ${month}`;
}

function LoadBar({ load, capacity }) {
  if (!capacity) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>;
  const pct = Math.min(100, (load / capacity) * 100);
  const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 90 }}>
      <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <div style={{ fontSize: 11, color, fontWeight: 600, textAlign: 'right' }}>{fmt(load)}h / {fmt(capacity)}h</div>
    </div>
  );
}

export default function ChargesPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['gpao-charges'],
    queryFn: () => gpaoAPI.charges().then(r => r.data),
    staleTime: 60000,
  });

  const charges = data || [];
  const weeks = getWeeksInRange(charges);

  const overloadedWcs = charges.filter(row => {
    const maxLoad = Math.max(...Object.values(row.charges));
    return maxLoad > row.capacity;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title"><BarChart2 size={22} style={{ display: 'inline', marginRight: 8 }} />Tableau de charges</h1>
          <p className="page-subtitle">Charges par poste de travail et par semaine (OFs fermes et lancés)</p>
        </div>
        <button className="btn btn--ghost" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {!isLoading && overloadedWcs.length > 0 && (
        <div style={{ background: '#ef444415', border: '1px solid #ef444433', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ef4444' }}>
          <AlertTriangle size={16} />
          <strong>{overloadedWcs.length} poste(s) surchargé(s)</strong> — {overloadedWcs.map(w => w.workCenter.name).join(', ')}
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement…</div>
      ) : charges.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 56 }}>📊</div>
          <p style={{ marginTop: 12 }}>Aucune charge à afficher.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Les charges apparaissent une fois les OFs jalonnés et affermis avec des opérations planifiées.</p>
        </div>
      ) : (
        <>
          {/* Résumé par poste */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 20 }}>
            {charges.map(row => {
              const totalLoad = Object.values(row.charges).reduce((s, h) => s + h, 0);
              const capacity = row.capacity;
              const pct = capacity ? (totalLoad / (capacity * weeks.length)) * 100 : 0;
              const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';
              return (
                <div key={row.workCenter.id} style={{ background: 'var(--bg-card)', border: `1px solid ${pct >= 100 ? '#ef444444' : 'var(--border)'}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{row.workCenter.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{row.workCenter.code} — Cap. {fmt(capacity)}h/sem.</div>
                  <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 12, color, fontWeight: 600 }}>{fmt(totalLoad)}h totales — {fmt(pct)}% chargé</div>
                </div>
              );
            })}
          </div>

          {/* Tableau semaine par semaine */}
          {weeks.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 12px', background: 'var(--bg-card)', borderBottom: '2px solid var(--border)', minWidth: 160 }}>Poste</th>
                    <th style={{ textAlign: 'center', padding: '8px 12px', background: 'var(--bg-card)', borderBottom: '2px solid var(--border)', minWidth: 80, color: 'var(--text-muted)', fontSize: 11 }}>Capacité/sem.</th>
                    {weeks.map(w => (
                      <th key={w} style={{ textAlign: 'center', padding: '8px 12px', background: 'var(--bg-card)', borderBottom: '2px solid var(--border)', minWidth: 120 }}>
                        <div style={{ fontWeight: 700 }}>S{getWeekNumber(w)}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>{fmtWeek(w)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {charges.map(row => (
                    <tr key={row.workCenter.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                        {row.workCenter.name}
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{row.workCenter.code}</div>
                      </td>
                      <td style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--text-muted)' }}>{fmt(row.capacity)}h</td>
                      {weeks.map(w => {
                        const load = row.charges[w] || 0;
                        return (
                          <td key={w} style={{ padding: '8px 12px' }}>
                            <LoadBar load={load} capacity={row.capacity} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function getWeekNumber(weekKey) {
  const d = new Date(weekKey);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d - startOfYear) / 86400000);
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}
