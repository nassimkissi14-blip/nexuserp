import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Play, CheckSquare, AlertTriangle, Clock, CheckCircle, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { gpaoAPI } from '../../api/client.js';

const fmtDate     = d => d ? new Date(d).toLocaleDateString('fr-FR')  : '—';
const fmtDateTime = d => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtH        = h => h != null ? `${Number(h).toFixed(2)}h` : '—';

/* ── Margin badge ─────────────────────────────── */
function MarginBadge({ marginDays, isLate }) {
  if (isLate) return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#ef444422', color:'#ef4444', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>
      <AlertTriangle size={12}/> {Math.abs(marginDays).toFixed(1)}j retard
    </span>
  );
  if (marginDays < 3) return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#f59e0b22', color:'#f59e0b', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>
      <Clock size={12}/> {marginDays.toFixed(1)}j marge
    </span>
  );
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#10b98122', color:'#10b981', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>
      <CheckCircle size={12}/> {marginDays.toFixed(1)}j marge
    </span>
  );
}

/* ── Mini Gantt bar ───────────────────────────── */
function GanttBar({ earlyStart, earlyEnd, lateStart, lateEnd, needDate, isLate }) {
  const now = Date.now();
  const totalRange = new Date(needDate).getTime() - now;
  if (totalRange <= 0) return null;
  const pct = d => Math.max(0, Math.min(100, ((new Date(d).getTime() - now) / totalRange) * 100));
  const eL = pct(earlyStart), eW = pct(earlyEnd) - eL;
  const lL = pct(lateStart),  lW = pct(lateEnd)  - lL;
  return (
    <div style={{ position:'relative', height:18, background:'var(--bg)', borderRadius:4, overflow:'hidden', minWidth:160 }}>
      <div style={{ position:'absolute', left:`${lL}%`, width:`${lW}%`, height:'100%', background: isLate?'#ef444433':'#6366f133', borderRadius:4 }}/>
      <div style={{ position:'absolute', left:`${eL}%`, width:`${eW}%`, height:'100%', background: isLate?'#ef4444':'#6366f1', borderRadius:4, opacity:.85 }}/>
      <div style={{ position:'absolute', right:0, width:2, height:'100%', background:'#ef4444' }} title="Date besoin"/>
    </div>
  );
}

/* ── Calculation detail panel ─────────────────── */
function CalcDetail({ r }) {
  const hasPhases = r.phases && r.phases.length > 0;

  return (
    <div style={{ padding:'16px 20px', background:'var(--bg)', borderTop:'1px solid var(--border)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>

      {/* ── Durée de fabrication ── */}
      <div>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
          ⏱ Calcul de la durée de fabrication
          {r.routingCode && <span style={{ fontWeight:400, color:'var(--text-muted)', fontFamily:'monospace', fontSize:11 }}>Gamme : {r.routingCode}</span>}
        </div>

        {!hasPhases ? (
          <div style={{ background:'#f59e0b11', border:'1px solid #f59e0b44', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#f59e0b' }}>
            ⚠ {r.durationNote || 'Aucune gamme active — durée basée sur le délai produit'}
          </div>
        ) : (
          <>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:'2px solid var(--border)' }}>
                  <th style={{ textAlign:'left',  padding:'4px 8px', color:'var(--text-muted)', fontWeight:600 }}>#</th>
                  <th style={{ textAlign:'left',  padding:'4px 8px', color:'var(--text-muted)', fontWeight:600 }}>Opération</th>
                  <th style={{ textAlign:'left',  padding:'4px 8px', color:'var(--text-muted)', fontWeight:600 }}>Poste</th>
                  <th style={{ textAlign:'right', padding:'4px 8px', color:'var(--text-muted)', fontWeight:600 }}>Réglage</th>
                  <th style={{ textAlign:'right', padding:'4px 8px', color:'var(--text-muted)', fontWeight:600 }}>Fab (×{r.quantity})</th>
                  <th style={{ textAlign:'right', padding:'4px 8px', color:'var(--text-muted)', fontWeight:600 }}>Transfert</th>
                  <th style={{ textAlign:'right', padding:'4px 8px', color:'#6366f1', fontWeight:700 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {r.phases.map((p, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid var(--border)', background: i%2 ? 'var(--bg-card)' : 'transparent' }}>
                    <td style={{ padding:'5px 8px', color:'var(--text-muted)', fontFamily:'monospace' }}>{String(p.sequence).padStart(2,'0')}</td>
                    <td style={{ padding:'5px 8px', fontWeight:500 }}>{p.name}</td>
                    <td style={{ padding:'5px 8px', color:'var(--text-muted)', fontSize:11 }}>{p.workCenter?.name || '—'}</td>
                    <td style={{ padding:'5px 8px', textAlign:'right', fontFamily:'monospace' }}>{fmtH(p.setupTime)}</td>
                    <td style={{ padding:'5px 8px', textAlign:'right', fontFamily:'monospace' }}>
                      <span style={{ color:'var(--text-muted)' }}>{fmtH(p.machineTimeUnit)}×{r.quantity} = </span>
                      {fmtH(p.machineTimeTotal)}
                    </td>
                    <td style={{ padding:'5px 8px', textAlign:'right', fontFamily:'monospace' }}>{fmtH(p.transferTime)}</td>
                    <td style={{ padding:'5px 8px', textAlign:'right', fontWeight:700, color:'#6366f1', fontFamily:'monospace' }}>{fmtH(p.durationHours)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:'2px solid var(--border)' }}>
                  <td colSpan={6} style={{ padding:'6px 8px', fontWeight:700, textAlign:'right' }}>Durée totale</td>
                  <td style={{ padding:'6px 8px', fontWeight:800, color:'#6366f1', fontFamily:'monospace', fontSize:14 }}>{fmtH(r.durationHours)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Phase timeline */}
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6, fontWeight:600 }}>Enchaînement des opérations (au plus tôt)</div>
              <div style={{ display:'grid', gap:4 }}>
                {r.phases.map((p, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11 }}>
                    <div style={{ width:60, color:'var(--text-muted)', fontFamily:'monospace', flexShrink:0 }}>{fmtDateTime(p.scheduledStart)}</div>
                    <div style={{ flex:1, background:'#6366f133', borderRadius:4, padding:'3px 8px', color:'#6366f1', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {p.name} — {fmtH(p.durationHours)}
                    </div>
                    <div style={{ width:60, color:'var(--text-muted)', fontFamily:'monospace', flexShrink:0 }}>{fmtDateTime(p.scheduledEnd)}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Jalonnement ── */}
      <div>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', marginBottom:10 }}>
          📅 Détail du jalonnement
        </div>

        {/* Formulas */}
        <div style={{ display:'grid', gap:8 }}>
          {[
            {
              label: '🟢 Début au plus tôt',
              value: fmtDateTime(r.earlyStart),
              formula: r.calcDetail?.earlyStartSource,
              color: '#10b981',
            },
            {
              label: '🟢 Fin au plus tôt',
              value: fmtDateTime(r.earlyEnd),
              formula: r.calcDetail?.earlyEndFormula,
              color: '#10b981',
            },
            {
              label: '🔵 Début au plus tard',
              value: fmtDateTime(r.lateStart),
              formula: r.calcDetail?.lateStartFormula,
              color: '#6366f1',
            },
            {
              label: '🔵 Fin au plus tard',
              value: fmtDateTime(r.lateEnd),
              formula: r.calcDetail?.lateEndSource,
              color: '#6366f1',
            },
            {
              label: '🔴 Date de besoin',
              value: fmtDate(r.needDate),
              formula: 'Date planifiée de livraison',
              color: '#ef4444',
            },
          ].map((row, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'160px 1fr', gap:8, alignItems:'start', padding:'6px 10px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:6 }}>
              <div style={{ fontSize:12, fontWeight:600, color:row.color }}>{row.label}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700 }}>{row.value}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{row.formula}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Margin detail */}
        <div style={{ marginTop:12, padding:'10px 14px', background: r.isLate?'#ef444411':'#10b98111', border:`1px solid ${r.isLate?'#ef444433':'#10b98133'}`, borderRadius:8 }}>
          <div style={{ fontSize:12, fontWeight:700, color: r.isLate?'#ef4444':'#10b981', marginBottom:4 }}>
            {r.isLate ? '⚠ OF en retard' : '✅ OF dans les délais'}
          </div>
          <div style={{ fontSize:12, color:'var(--text-secondary)', fontFamily:'monospace' }}>
            {r.calcDetail?.marginFormula}
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
            La marge est la différence entre la date de besoin et la fin au plus tôt.
            {r.isLate ? ' Une marge négative indique un retard.' : ' Une marge positive indique que l\'OF peut être décalé.'}
          </div>
        </div>

        {/* Slack (float) */}
        {!r.isLate && (
          <div style={{ marginTop:8, padding:'8px 12px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:6, fontSize:12 }}>
            <span style={{ color:'var(--text-muted)' }}>Marge libre (float) : </span>
            <strong style={{ color:'#6366f1' }}>{Math.abs(r.marginDays).toFixed(1)} jours</strong>
            <span style={{ color:'var(--text-muted)' }}> — l'OF peut démarrer jusqu'au {fmtDate(r.lateStart)} sans créer de retard</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── MAIN PAGE ────────────────────────────────── */
export default function SchedulingPage() {
  const [result, setResult]     = useState(null);
  const [expanded, setExpanded] = useState(null); // id of expanded OF row

  const schedMut = useMutation({
    mutationFn: () => gpaoAPI.runScheduling({}),
    onSuccess: res => {
      setResult(res.data ?? res);
      setExpanded(null);
      const s = (res.data ?? res).summary;
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
          <p className="page-subtitle">Calcul au plus tôt / au plus tard — marges, gammes opératoires et chemin critique</p>
        </div>
        <button className="btn btn--primary" disabled={schedMut.isPending} onClick={() => schedMut.mutate()} style={{ display:'flex', alignItems:'center', gap:8 }}>
          {schedMut.isPending ? <RefreshCw size={15} className="spin"/> : <Play size={15}/>}
          {schedMut.isPending ? 'Calcul en cours…' : 'Lancer le jalonnement'}
        </button>
      </div>

      {/* KPI summary */}
      {summary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'OFs traités',       value:summary.total,               color:'#6366f1', icon:'📋' },
            { label:'À l\'heure',        value:summary.onTime,              color:'#10b981', icon:'✅' },
            { label:'En retard',         value:summary.late,                color:'#ef4444', icon:'⚠️' },
            { label:'Chemin critique',   value:summary.criticalPath?.length||0, color:'#f59e0b', icon:'🚨' },
          ].map((s,i) => (
            <div key={i} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:16 }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {results.length > 0 ? (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
          {/* Table header */}
          <div style={{ overflowX:'auto' }}>
            <table className="data-table" style={{ minWidth:900 }}>
              <thead>
                <tr>
                  <th style={{ width:32 }}/>
                  <th>N° OF</th>
                  <th>Article</th>
                  <th style={{ textAlign:'right' }}>Qté</th>
                  <th>Gamme</th>
                  <th style={{ textAlign:'center' }}>Durée totale</th>
                  <th>Au plus tôt</th>
                  <th>Au plus tard</th>
                  <th>Date besoin</th>
                  <th>Marge</th>
                  <th style={{ minWidth:160 }}>Gantt</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <>
                    <tr
                      key={r.id}
                      style={{ background: r.isLate ? '#ef44440a' : undefined, cursor:'pointer' }}
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    >
                      <td style={{ textAlign:'center', color:'var(--text-muted)' }}>
                        {expanded === r.id ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                      </td>
                      <td style={{ fontFamily:'monospace', fontSize:12, fontWeight:700 }}>{r.number}</td>
                      <td style={{ fontWeight:500, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.product}</td>
                      <td style={{ textAlign:'right' }}>{r.quantity}</td>
                      <td style={{ fontSize:11, color: r.routingCode ? 'var(--text-secondary)' : '#f59e0b', fontFamily:'monospace' }}>
                        {r.routingCode || '⚠ Sans gamme'}
                      </td>
                      <td style={{ textAlign:'center' }}>
                        <span style={{ fontFamily:'monospace', fontWeight:700, color:'#6366f1', fontSize:13 }}>{fmtH(r.durationHours)}</span>
                        {r.phases?.length > 0 && <div style={{ fontSize:10, color:'var(--text-muted)' }}>{r.phases.length} opération(s)</div>}
                      </td>
                      <td style={{ fontSize:11 }}>
                        <div style={{ fontWeight:600 }}>{fmtDateTime(r.earlyStart)}</div>
                        <div style={{ color:'var(--text-muted)' }}>→ {fmtDateTime(r.earlyEnd)}</div>
                      </td>
                      <td style={{ fontSize:11, color:'var(--text-muted)' }}>
                        <div>{fmtDateTime(r.lateStart)}</div>
                        <div>→ {fmtDateTime(r.lateEnd)}</div>
                      </td>
                      <td style={{ fontSize:12 }}>{fmtDate(r.needDate)}</td>
                      <td><MarginBadge marginDays={r.marginDays} isLate={r.isLate}/></td>
                      <td>
                        <GanttBar earlyStart={r.earlyStart} earlyEnd={r.earlyEnd} lateStart={r.lateStart} lateEnd={r.lateEnd} needDate={r.needDate} isLate={r.isLate}/>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn btn--ghost" style={{ fontSize:11, padding:'4px 10px' }} onClick={() => firmMut.mutate(r.id)}>
                          <CheckSquare size={12}/> Affermir
                        </button>
                      </td>
                    </tr>
                    {expanded === r.id && (
                      <tr key={`${r.id}-detail`}>
                        <td colSpan={12} style={{ padding:0, borderBottom:'2px solid var(--accent-primary)' }}>
                          <CalcDetail r={r}/>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !schedMut.isPending && (
        <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>
          <div style={{ fontSize:56 }}>📊</div>
          <p style={{ marginTop:12, fontSize:15 }}>Cliquez sur <strong>« Lancer le jalonnement »</strong> pour calculer les dates au plus tôt / au plus tard.</p>
          <p style={{ fontSize:12, marginTop:8 }}>
            Nécessite des OFs en statut <strong>SUGGESTED</strong> ou <strong>FIRM</strong>.<br/>
            La durée est calculée depuis la gamme de fabrication (réglage + fabrication × quantité + transfert).<br/>
            Sans gamme, le délai d'obtention du produit est utilisé.
          </p>
        </div>
      )}
    </div>
  );
}
