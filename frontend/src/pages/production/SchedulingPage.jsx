import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, CheckSquare, AlertTriangle, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { gpaoAPI } from '../../api/client.js';
import apiClient from '../../api/client.js';

const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmtDateTime = d => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

function MarginBadge({ marginDays, isLate }) {
  if (isLate) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ef444422', color: '#ef4444', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      <AlertTriangle size={12} /> {Math.abs(marginDays).toFixed(1)}j de retard
    </span>
  );
  if (marginDays < 3) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f59e0b22', color: '#f59e0b', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      <Clock size={12} /> {marginDays.toFixed(1)}j de marge
    </span>
  );
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#10b98122', color: '#10b981', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      <CheckCircle size={12} /> {marginDays.toFixed(1)}j de marge
    </span>
  );
}

function GanttBar({ earlyStart, earlyEnd, lateStart, lateEnd, needDate, isLate }) {
  const now = Date.now();
  const totalRange = new Date(needDate).getTime() - now;
  if (totalRange <= 0) return null;

  const toPercent = d => Math.max(0, Math.min(100, ((new Date(d).getTime() - now) / totalRange) * 100));

  const earlyL = toPercent(earlyStart);
  const earlyW = toPercent(earlyEnd) - earlyL;
  const lateL = toPercent(lateStart);
  const lateW = toPercent(lateEnd) - lateL;

  return (
    <div style={{ position: 'relative', height: 20, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden', minWidth: 180 }}>
      <div style={{ position: 'absolute', left: `${lateL}%`, width: `${lateW}%`, height: '100%', background: isLate ? '#ef444433' : '#6366f133', borderRadius: 4 }} />
      <div style={{ position: 'absolute', left: `${earlyL}%`, width: `${earlyW}%`, height: '100%', background: isLate ? '#ef4444' : '#6366f1', borderRadius: 4, opacity: 0.8 }} />
      <div style={{ position: 'absolute', right: 0, width: 2, height: '100%', background: '#ef4444' }} title="Date de besoin" />
    </div>
  );
}

export default function SchedulingPage() {
  const qc = useQueryClient();
  const [result, setResult] = useState(null);

  const schedMut = useMutation({
    mutationFn: () => gpaoAPI.runScheduling({}),
    onSuccess: (res) => {
      setResult(res.data);
      const s = res.data.summary;
      toast.success(`Jalonnement terminé — ${s.late} en retard sur ${s.total}`);
    },
    onError: e => toast.error(e?.message || 'Erreur lors du jalonnement'),
  });

  const firmMut = useMutation({
    mutationFn: gpaoAPI.firmOf,
    onSuccess: () => { toast.success('OF affermis'); schedMut.mutate(); },
    onError: e => toast.error(e?.message || 'Erreur'),
  });

  const results = result?.results || [];
  const summary = result?.summary;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 Jalonnement des OFs</h1>
          <p className="page-subtitle">Calcul au plus tôt / au plus tard — analyse des marges</p>
        </div>
        <button className="btn btn--primary" disabled={schedMut.isPending} onClick={() => schedMut.mutate()} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {schedMut.isPending ? <RefreshCw size={15} className="spin" /> : <Play size={15} />}
          {schedMut.isPending ? 'Calcul…' : 'Lancer le jalonnement'}
        </button>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'OFs traités', value: summary.total, color: '#6366f1', icon: '📋' },
            { label: 'À l\'heure', value: summary.onTime, color: '#10b981', icon: '✅' },
            { label: 'En retard', value: summary.late, color: '#ef4444', icon: '⚠️' },
            { label: 'Chemin critique', value: summary.criticalPath?.length || 0, color: '#f59e0b', icon: '🚨' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {results.length > 0 ? (
        <div className="table-card" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th>N° OF</th>
                <th>Article</th>
                <th style={{ textAlign: 'right' }}>Qté</th>
                <th>Au plus tôt</th>
                <th>Au plus tard</th>
                <th>Date besoin</th>
                <th style={{ textAlign: 'center' }}>Durée</th>
                <th>Marge</th>
                <th style={{ minWidth: 180 }}>Gantt</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.id} style={{ background: r.isLate ? '#ef44440a' : undefined }}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.number}</td>
                  <td style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.product}</td>
                  <td style={{ textAlign: 'right' }}>{r.quantity}</td>
                  <td style={{ fontSize: 12 }}>
                    <div>{fmtDateTime(r.earlyStart)}</div>
                    <div style={{ color: 'var(--text-muted)' }}>→ {fmtDateTime(r.earlyEnd)}</div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    <div>{fmtDateTime(r.lateStart)}</div>
                    <div>→ {fmtDateTime(r.lateEnd)}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>{fmtDate(r.needDate)}</td>
                  <td style={{ textAlign: 'center', fontSize: 12 }}>{r.durationHours?.toFixed(1)}h</td>
                  <td><MarginBadge marginDays={r.marginDays} isLate={r.isLate} /></td>
                  <td>
                    <GanttBar earlyStart={r.earlyStart} earlyEnd={r.earlyEnd} lateStart={r.lateStart} lateEnd={r.lateEnd} needDate={r.needDate} isLate={r.isLate} />
                  </td>
                  <td>
                    <button className="btn btn--ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => firmMut.mutate(r.id)}>
                      <CheckSquare size={12} /> Affermir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !schedMut.isPending && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 56 }}>📊</div>
          <p style={{ marginTop: 12 }}>Cliquez sur « Lancer le jalonnement » pour calculer les dates au plus tôt / au plus tard.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Nécessite des OFs en statut SUGGESTED ou FIRM avec une gamme de fabrication associée.</p>
        </div>
      )}
    </div>
  );
}
