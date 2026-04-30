import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AnimatedPage from '../../components/ui/AnimatedPage.jsx';
import { PageHeader, Btn, Modal, FormGrid, FormActions, Field, Input, Select, Textarea, EmptyState } from '../../components/ui/DesignSystem.jsx';
import apiClient from '../../api/client.js';

const CRITERIA = [
  { key: 'performance',  label: 'Performance' },
  { key: 'quality',      label: 'Qualité' },
  { key: 'teamwork',     label: 'Travail en équipe' },
  { key: 'initiative',   label: 'Initiative' },
  { key: 'punctuality',  label: 'Ponctualité' },
];

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={20} fill={(hover || value) >= s ? '#f59e0b' : 'none'}
          stroke={(hover || value) >= s ? '#f59e0b' : '#475569'}
          style={{ cursor: onChange ? 'pointer' : 'default', transition: 'all .1s' }}
          onMouseEnter={() => onChange && setHover(s)}
          onMouseLeave={() => onChange && setHover(0)}
          onClick={() => onChange && onChange(s)} />
      ))}
    </div>
  );
}

function EvalModal({ item, employees, onClose, onSaved }) {
  const [form, setForm] = useState({
    employeeId: item?.employeeId || '',
    period:     item?.period     || '',
    comments:   item?.comments   || '',
  });
  const [scores, setScores] = useState(() => {
    if (item?.goals && typeof item.goals === 'object') return item.goals;
    return Object.fromEntries(CRITERIA.map(c => [c.key, 3]));
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const avgScore = parseFloat((Object.values(scores).reduce((a, b) => a + b, 0) / CRITERIA.length).toFixed(2));

  const handleSave = async () => {
    if (!form.employeeId || !form.period) return toast.error('Employé et période requis');
    setSaving(true);
    try {
      const payload = { ...form, score: avgScore, goals: scores };
      if (item) {
        await apiClient.put(`/evaluations/${item.id}`, payload);
        toast.success('Évaluation modifiée');
      } else {
        await apiClient.post('/evaluations', payload);
        toast.success('Évaluation créée');
      }
      onSaved();
    } catch (e) {
      toast.error(e?.message || 'Erreur');
    } finally { setSaving(false); }
  };

  return (
    <Modal title={item ? 'Modifier l\'évaluation' : 'Nouvelle évaluation'} onClose={onClose} width={580}>
      <FormGrid cols={2}>
        <Field label="Employé *">
          <Select value={form.employeeId} onChange={e => set('employeeId', e.target.value)}>
            <option value="">Sélectionner…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} – {e.department}</option>)}
          </Select>
        </Field>
        <Field label="Période *">
          <Input value={form.period} onChange={e => set('period', e.target.value)} placeholder="ex: T1 2026, Annuel 2025" />
        </Field>
      </FormGrid>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Critères d'évaluation</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {CRITERIA.map(c => (
            <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c.label}</span>
              <StarRating value={scores[c.key]} onChange={v => setScores(s => ({ ...s, [c.key]: v }))} />
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'right', marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          Score moyen : <strong style={{ color: '#f59e0b' }}>{avgScore}/5</strong>
        </div>
      </div>

      <FormGrid cols={1} style={{ marginTop: 12 }}>
        <Field label="Commentaires">
          <Textarea value={form.comments} onChange={e => set('comments', e.target.value)} rows={2} placeholder="Points forts, axes d'amélioration…" />
        </Field>
      </FormGrid>
      <FormActions>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : item ? 'Modifier' : 'Créer'}</Btn>
      </FormActions>
    </Modal>
  );
}

export default function EvaluationsPage() {
  const qc = useQueryClient();
  const [modal, setModal]   = useState(null);
  const [search, setSearch] = useState('');

  const { data: evalData, isLoading } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => apiClient.get('/evaluations').then(r => r.data),
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-simple'],
    queryFn: () => apiClient.get('/employees?limit=200').then(r => r.data),
  });

  const items     = evalData || [];
  const employees = empData  || [];

  const refresh = () => qc.invalidateQueries({ queryKey: ['evaluations'] });

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette évaluation ?')) return;
    try {
      await apiClient.delete(`/evaluations/${id}`);
      toast.success('Supprimée');
      refresh();
    } catch { toast.error('Erreur'); }
  };

  const filtered = items.filter(i => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [i.employee?.firstName, i.employee?.lastName, i.period].some(f => f?.toLowerCase().includes(q));
  });

  const avgAll = items.length ? parseFloat((items.reduce((s, i) => s + i.score, 0) / items.length).toFixed(1)) : 0;

  const scoreColor = (s) => s >= 4 ? '#10b981' : s >= 3 ? '#f59e0b' : '#ef4444';

  return (
    <AnimatedPage>
      <div className="erp-page">
        <PageHeader icon="⭐" title="Évaluations" subtitle="Suivez les performances et compétences de vos collaborateurs"
          actions={<Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>Nouvelle évaluation</Btn>}
        />

        <div className="erp-kpi-grid">
          {[
            { label: 'Total évaluations', value: items.length,                 color: '#6366f1' },
            { label: 'Score moyen',       value: `${avgAll}/5`,                color: '#f59e0b' },
            { label: 'Excellent (4-5)',   value: items.filter(i => i.score >= 4).length, color: '#10b981' },
            { label: 'À améliorer (<3)',  value: items.filter(i => i.score < 3).length,  color: '#ef4444' },
          ].map((k, i) => (
            <div key={i} className="erp-kpi" style={{ '--kpi-color': k.color }}>
              <div className="erp-kpi__icon" style={{ background: k.color + '22', color: k.color, fontSize: 20 }}>⭐</div>
              <div><div className="erp-kpi__value" style={{ color: k.color }}>{k.value}</div><div className="erp-kpi__label">{k.label}</div></div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-input" style={{ maxWidth: 300 }}>
            <Search size={14} className="search-input__icon" />
            <input placeholder="Employé, période…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} évaluation{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="⭐" title="Aucune évaluation" description="Créez une évaluation pour commencer à suivre les performances."
            action={<Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>Créer</Btn>} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {filtered.map(item => {
              const emp   = item.employee;
              const eval_ = item.evaluator;
              const goals = item.goals || {};
              return (
                <div key={item.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                        {emp ? `${emp.firstName} ${emp.lastName}` : '—'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{emp?.position} · {emp?.department}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor(item.score) }}>{item.score.toFixed(1)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>/5</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: '#818cf8', background: 'rgba(99,102,241,0.1)', borderRadius: 5, padding: '3px 8px', display: 'inline-block', marginBottom: 10 }}>
                    📅 {item.period}
                  </div>

                  {Object.keys(goals).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                      {CRITERIA.map(c => {
                        const s = goals[c.key] || 0;
                        return (
                          <div key={c.key}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 2 }}>
                              <span>{c.label}</span><span>{s}/5</span>
                            </div>
                            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${(s/5)*100}%`, background: scoreColor(s), borderRadius: 2 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {item.comments && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5, borderLeft: '3px solid var(--border)', paddingLeft: 8 }}>{item.comments}</p>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      Par {eval_ ? `${eval_.firstName} ${eval_.lastName}` : '—'}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn variant="secondary" size="sm" icon={<Edit2  size={11} />} onClick={() => setModal({ type: 'edit', data: item })}>Modifier</Btn>
                      <Btn variant="danger"    size="sm" icon={<Trash2 size={11} />} onClick={() => handleDelete(item.id)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(modal?.type === 'create' || modal?.type === 'edit') && (
          <EvalModal
            item={modal.data}
            employees={employees}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); refresh(); }}
          />
        )}
      </div>
    </AnimatedPage>
  );
}
