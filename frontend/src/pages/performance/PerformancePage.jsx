import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Plus, X, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ui/ConfirmModal.jsx';
import apiClient from '../../api/client.js';

const fetchEmployees   = () => apiClient.get('/employees?limit=200&status=ACTIVE');
const fetchEvaluations = () => apiClient.get('/evaluations?limit=500');
const createEval       = (data) => apiClient.post('/evaluations', data);
const deleteEval       = (id)   => apiClient.delete(`/evaluations/${id}`);

const CRITERIA = [
  { key: 'presence',     label: 'Présence',        icon: '📅', color: '#6366f1' },
  { key: 'quality',      label: 'Qualité travail',  icon: '⭐', color: '#10b981' },
  { key: 'productivity', label: 'Productivité',     icon: '⚡', color: '#f59e0b' },
  { key: 'teamwork',     label: 'Travail équipe',   icon: '🤝', color: '#8b5cf6' },
  { key: 'innovation',   label: 'Initiative',       icon: '💡', color: '#ef4444' },
];

const COLORS = ['#6366f1','#10b981','#f59e0b','#8b5cf6','#ef4444','#3b82f6','#06b6d4','#a855f7','#f97316','#84cc16'];

const calcGlobal = (goals) => {
  if (!goals || typeof goals !== 'object') return 0;
  const vals = CRITERIA.map(c => Number(goals[c.key] || 0));
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
};

const getBadge = (score) => {
  if (score >= 95) return { label: 'Exceptionnel', color: '#f59e0b', icon: '🏆' };
  if (score >= 90) return { label: 'Excellent',    color: '#6366f1', icon: '⭐' };
  if (score >= 80) return { label: 'Bien',         color: '#10b981', icon: '✅' };
  if (score >= 70) return { label: 'Satisfaisant', color: '#3b82f6', icon: '👍' };
  if (score > 0)   return { label: 'À améliorer',  color: '#ef4444', icon: '📈' };
  return               { label: 'Non évalué',   color: '#64748b', icon: '—' };
};

/* ── Modal ajout évaluation ─────────────────────────────────────── */
function EvalModal({ employees, onClose, onSave, isLoading }) {
  const currentPeriod = `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
  const [form, setForm] = useState({
    employeeId: employees[0]?.id || '',
    period: currentPeriod,
    comments: '',
    goals: { presence: 80, quality: 80, productivity: 80, teamwork: 80, innovation: 80 },
  });

  const avg = calcGlobal(form.goals);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setGoal = (k, v) => setForm(f => ({ ...f, goals: { ...f.goals, [k]: Number(v) } }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.employeeId) return toast.error('Sélectionnez un employé');
    onSave({ ...form, score: avg });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>➕ Nouvelle évaluation</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div className="form-group">
              <label>Employé *</label>
              <select value={form.employeeId} onChange={e => set('employeeId', e.target.value)} required>
                <option value="">-- Choisir --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} — {emp.department}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Période</label>
              <input value={form.period} onChange={e => set('period', e.target.value)} placeholder="2026-Q2" required />
            </div>
          </div>

          {/* Score global */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: avg >= 80 ? '#10b981' : avg >= 60 ? '#f59e0b' : '#ef4444', lineHeight: 1 }}>{avg}%</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Score global calculé</div>
          </div>

          {/* Critères */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
            {CRITERIA.map(c => (
              <div key={c.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{c.icon} {c.label}</span>
                  <span style={{ fontWeight: 700, color: c.color }}>{form.goals[c.key]}%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={5}
                  value={form.goals[c.key]}
                  onChange={e => setGoal(c.key, e.target.value)}
                  style={{ width: '100%', accentColor: c.color }}
                />
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Commentaires</label>
            <textarea value={form.comments} onChange={e => set('comments', e.target.value)}
              rows={3} style={{ width: '100%', resize: 'vertical', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', padding: '8px 12px', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
              placeholder="Points forts, axes d'amélioration…" />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn--ghost" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn--primary" disabled={isLoading}>
              {isLoading ? 'Enregistrement…' : '✅ Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function PerformancePage() {
  const qc = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirm();
  const [selected, setSelected]   = useState(null);
  const [sortBy, setSortBy]       = useState('score');
  const [showModal, setShowModal] = useState(false);
  const [filterDept, setFilterDept] = useState('');

  const { data: empData, isLoading: empLoading } = useQuery({ queryKey: ['employees-perf'], queryFn: fetchEmployees });
  const { data: evalData, isLoading: evalLoading } = useQuery({ queryKey: ['evaluations'], queryFn: fetchEvaluations });

  const employees   = empData?.data  || [];
  const evaluations = evalData?.data || [];

  const createMut = useMutation({
    mutationFn: createEval,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evaluations'] }); setShowModal(false); toast.success('✅ Évaluation enregistrée'); },
    onError: (err) => toast.error(err?.message || 'Erreur'),
  });
  const deleteMut = useMutation({
    mutationFn: deleteEval,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evaluations'] }); toast.success('Évaluation supprimée'); },
  });

  // Build employee performance map: last eval per employee
  const perfMap = {};
  for (const ev of evaluations) {
    const eid = ev.employeeId;
    if (!perfMap[eid] || new Date(ev.createdAt) > new Date(perfMap[eid].createdAt)) {
      perfMap[eid] = ev;
    }
  }

  const depts = [...new Set(employees.map(e => e.department))].sort();

  const enriched = employees
    .filter(e => !filterDept || e.department === filterDept)
    .map((emp, idx) => {
      const ev     = perfMap[emp.id];
      const goals  = ev?.goals || {};
      const global = ev ? calcGlobal(goals) : 0;
      const color  = COLORS[idx % COLORS.length];
      return { ...emp, ev, goals, global, color };
    });

  const sorted = [...enriched].sort((a, b) => {
    if (sortBy === 'score') return b.global - a.global;
    if (sortBy === 'name')  return a.firstName.localeCompare(b.firstName);
    if (sortBy === 'dept')  return a.department.localeCompare(b.department);
    return 0;
  });

  const evaluated  = enriched.filter(e => e.global > 0);
  const avgGlobal  = evaluated.length ? Math.round(evaluated.reduce((s, e) => s + e.global, 0) / evaluated.length) : 0;
  const topPerf    = [...sorted].filter(e => e.global > 0).slice(0, 3);

  const isLoading = empLoading || evalLoading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🏆 Scores de Performance</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Score moyen : <strong style={{ color: '#6366f1' }}>{avgGlobal}%</strong> · {evaluated.length} / {enriched.length} employés évalués
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Filtre département */}
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '7px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
            <option value="">Tous les départements</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {/* Tri */}
          {[['score','📊 Score'],['name','🔤 Nom'],['dept','🏢 Dept']].map(([k,l]) => (
            <button key={k} onClick={() => setSortBy(k)} style={{
              padding: '7px 14px', borderRadius: 8, border: '1px solid',
              background: sortBy === k ? '#6366f1' : 'transparent',
              borderColor: sortBy === k ? '#6366f1' : 'var(--border)',
              color: sortBy === k ? 'white' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 12, transition: 'all .2s',
            }}>{l}</button>
          ))}
          <button className="btn btn--primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Évaluer
          </button>
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 72, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
        </div>
      )}

      {!isLoading && employees.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Aucun employé trouvé</div>
          <div style={{ fontSize: 13 }}>Ajoutez des employés dans la section RH d'abord.</div>
        </div>
      )}

      {/* PODIUM TOP 3 */}
      {!isLoading && topPerf.length >= 2 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 28 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>🏆 Top performances</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 24 }}>
            {[topPerf[1], topPerf[0], topPerf[2]].filter(Boolean).map((e, idx) => {
              const rank = idx === 1 ? 0 : idx === 0 ? 1 : 2;
              const medals  = ['🥇','🥈','🥉'];
              const heights = [80, 60, 45];
              const sizes   = [68, 56, 52];
              const fgColors = ['#f59e0b','#94a3b8','#cd7f32'];
              return (
                <div key={e.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  {rank === 0 && <div style={{ fontSize: 24 }}>👑</div>}
                  <div style={{ width: sizes[rank], height: sizes[rank], borderRadius: '50%', background: e.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: rank === 0 ? 20 : 15, fontWeight: 700, color: e.color, border: `${rank === 0 ? 3 : 2}px solid ${e.color}${rank === 0 ? '' : '66'}`, boxShadow: rank === 0 ? `0 0 20px ${e.color}44` : undefined }}>
                    {e.firstName[0]}{e.lastName[0]}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: rank === 0 ? 14 : 12, fontWeight: 600, color: 'var(--text-primary)' }}>{e.firstName}</div>
                    <div style={{ fontSize: rank === 0 ? 22 : 18, fontWeight: 800, color: fgColors[rank] }}>{e.global}%</div>
                  </div>
                  <div style={{ width: 80, height: heights[rank], background: `linear-gradient(to top, ${fgColors[rank]}44, transparent)`, borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: rank === 0 ? 26 : 20 }}>
                    {medals[rank]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LISTE */}
      {!isLoading && sorted.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((emp, i) => {
            const badge     = getBadge(emp.global);
            const isOpen    = selected === emp.id;
            const evalsList = evaluations.filter(ev => ev.employeeId === emp.id);

            return (
              <div key={emp.id}
                style={{ background: 'var(--bg-card)', border: `1px solid ${isOpen ? emp.color : 'var(--border)'}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'border-color .2s' }}
                onClick={() => setSelected(isOpen ? null : emp.id)}>

                {/* Ligne principale */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px' }}>
                  {/* Rang */}
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: i < 3 && emp.global > 0 ? ['#f59e0b','#94a3b8','#cd7f32'][i] + '33' : 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: i < 3 && emp.global > 0 ? ['#f59e0b','#94a3b8','#cd7f32'][i] : 'var(--text-muted)', flexShrink: 0 }}>
                    {emp.global > 0 ? i + 1 : '—'}
                  </div>

                  {/* Avatar */}
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: emp.color + '28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: emp.color, border: `2px solid ${emp.color}55`, flexShrink: 0 }}>
                    {emp.firstName[0]}{emp.lastName[0]}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{emp.firstName} {emp.lastName}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{emp.position} · {emp.department}</div>
                  </div>

                  {/* Badge */}
                  <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: badge.color + '20', color: badge.color, flexShrink: 0, border: `1px solid ${badge.color}30` }}>
                    {badge.icon} {badge.label}
                  </span>

                  {/* Score */}
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 56 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: emp.global > 0 ? emp.color : 'var(--text-muted)' }}>
                      {emp.global > 0 ? `${emp.global}%` : '—'}
                    </div>
                    {evalsList.length > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{evalsList.length} éval.</div>
                    )}
                  </div>

                  {/* Barre */}
                  {emp.global > 0 && (
                    <div style={{ width: 90, flexShrink: 0 }}>
                      <div style={{ height: 5, background: 'var(--bg-primary)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${emp.global}%`, background: `linear-gradient(90deg, ${emp.color}, ${emp.color}aa)`, borderRadius: 3, transition: 'width .8s ease' }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Détail */}
                {isOpen && (
                  <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
                    {emp.global > 0 ? (
                      <>
                        {/* Critères de la dernière évaluation */}
                        <div style={{ marginTop: 16, marginBottom: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                            Dernière évaluation — {emp.ev?.period}
                            {emp.ev?.comments && <span style={{ marginLeft: 10, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{emp.ev.comments}</span>}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                            {CRITERIA.map(c => {
                              const val = Number(emp.goals[c.key] || 0);
                              return (
                                <div key={c.key} style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 18, marginBottom: 6 }}>{c.icon}</div>
                                  <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 6px' }}>
                                    <svg viewBox="0 0 56 56" style={{ width: 56, height: 56, transform: 'rotate(-90deg)' }}>
                                      <circle cx="28" cy="28" r="22" fill="none" stroke="var(--bg-primary)" strokeWidth="5" />
                                      <circle cx="28" cy="28" r="22" fill="none" stroke={c.color} strokeWidth="5"
                                        strokeDasharray={`${(val / 100) * 138.2} 138.2`} strokeLinecap="round" />
                                    </svg>
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: c.color }}>
                                      {val}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{c.label}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Historique */}
                        {evalsList.length > 1 && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Historique</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {evalsList.slice(0, 5).map(ev => (
                                <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'var(--bg-primary)', borderRadius: 7, fontSize: 12 }}>
                                  <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>{ev.period}</span>
                                  <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${ev.score}%`, background: emp.color, borderRadius: 3 }} />
                                  </div>
                                  <span style={{ fontWeight: 700, color: emp.color, minWidth: 38 }}>{Math.round(ev.score)}%</span>
                                  <button onClick={async () => { const ok = await confirm({ title: 'Supprimer cette évaluation ?', confirmLabel: 'Supprimer', variant: 'danger' }); if (ok) deleteMut.mutate(ev.id); }}
                                    style={{ background: 'none', border: 'none', color: '#ef444488', cursor: 'pointer', padding: '0 4px', fontSize: 14 }}>✕</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ paddingTop: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        <div style={{ marginBottom: 10 }}>Aucune évaluation pour cet employé</div>
                        <button className="btn btn--primary" style={{ fontSize: 12 }}
                          onClick={() => setShowModal(true)}>
                          <Star size={13} style={{ marginRight: 6 }} /> Évaluer maintenant
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <EvalModal
          employees={employees}
          isLoading={createMut.isPending}
          onClose={() => setShowModal(false)}
          onSave={(data) => createMut.mutate(data)}
        />
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      {confirmModal}
    </div>
  );
}
