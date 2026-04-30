import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AnimatedPage from '../../components/ui/AnimatedPage.jsx';
import { PageHeader, Btn, Modal, FormGrid, FormActions, Field, Input, Select, Textarea, EmptyState } from '../../components/ui/DesignSystem.jsx';
import apiClient from '../../api/client.js';

const fmtDZD = n => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M DA` : `${(n/1_000).toFixed(0)}k DA`;

const CATEGORIES = ['TRANSPORT','HEBERGEMENT','REPAS','MATERIEL','FORMATION','COMMUNICATION','AUTRE'];
const CAT_ICONS  = { TRANSPORT:'🚗', HEBERGEMENT:'🏨', REPAS:'🍽️', MATERIEL:'📦', FORMATION:'📚', COMMUNICATION:'📞', AUTRE:'📎' };

const STATUS_CFG = {
  PENDING:    { label: 'En attente',  color: '#f59e0b' },
  APPROVED:   { label: 'Approuvée',   color: '#10b981' },
  REJECTED:   { label: 'Rejetée',     color: '#ef4444' },
  REIMBURSED: { label: 'Remboursée',  color: '#6366f1' },
};

function ExpenseModal({ item, employees, onClose, onSaved }) {
  const [form, setForm] = useState({
    employeeId:  item?.employeeId  || '',
    title:       item?.title       || '',
    amount:      item?.amount      || '',
    date:        item?.date ? item.date.slice(0,10) : '',
    category:    item?.category    || 'TRANSPORT',
    description: item?.description || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.employeeId || !form.title || !form.amount || !form.date)
      return toast.error('Champs requis manquants');
    setSaving(true);
    try {
      if (item) {
        await apiClient.put(`/expenses/${item.id}`, form);
        toast.success('Note mise à jour');
      } else {
        await apiClient.post('/expenses', form);
        toast.success('Note de frais créée');
      }
      onSaved();
    } catch (e) {
      toast.error(e?.message || 'Erreur');
    } finally { setSaving(false); }
  };

  return (
    <Modal title={item ? 'Modifier la note de frais' : 'Nouvelle note de frais'} onClose={onClose} width={560}>
      <FormGrid cols={2}>
        <Field label="Employé *">
          <Select value={form.employeeId} onChange={e => set('employeeId', e.target.value)}>
            <option value="">Sélectionner…</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName} – {e.department}</option>
            ))}
          </Select>
        </Field>
        <Field label="Catégorie">
          <Select value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
          </Select>
        </Field>
        <Field label="Intitulé *">
          <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="ex: Billet Alger–Paris" />
        </Field>
        <Field label="Montant (DA) *">
          <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" />
        </Field>
        <Field label="Date *">
          <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
      </FormGrid>
      <FormGrid cols={1}>
        <Field label="Description">
          <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Détails supplémentaires…" />
        </Field>
      </FormGrid>
      <FormActions>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : item ? 'Modifier' : 'Créer'}</Btn>
      </FormActions>
    </Modal>
  );
}

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [modal, setModal]     = useState(null);
  const [search, setSearch]   = useState('');
  const [stFilter, setStFilter] = useState('');

  const { data: expData, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => apiClient.get('/expenses').then(r => r.data),
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-simple'],
    queryFn: () => apiClient.get('/employees?limit=200').then(r => r.data),
  });

  const items     = expData || [];
  const employees = empData || [];

  const refresh = () => qc.invalidateQueries({ queryKey: ['expenses'] });

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette note de frais ?')) return;
    try {
      await apiClient.delete(`/expenses/${id}`);
      toast.success('Supprimée');
      refresh();
    } catch { toast.error('Erreur'); }
  };

  const handleStatus = async (id, status) => {
    try {
      await apiClient.patch(`/expenses/${id}/status`, { status });
      toast.success(`Statut → ${STATUS_CFG[status]?.label}`);
      refresh();
    } catch { toast.error('Erreur'); }
  };

  const filtered = items.filter(i => {
    const ms = !stFilter || i.status === stFilter;
    const mq = !search   || [i.title, i.category, i.employee?.firstName, i.employee?.lastName]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()));
    return ms && mq;
  });

  const totalAmt     = items.reduce((s, i) => s + i.amount, 0);
  const pendingCount = items.filter(i => i.status === 'PENDING').length;
  const approvedAmt  = items.filter(i => i.status === 'APPROVED').reduce((s, i) => s + i.amount, 0);

  return (
    <AnimatedPage>
      <div className="erp-page">
        <PageHeader icon="💸" title="Notes de frais" subtitle="Gérez les remboursements et suivez les dépenses professionnelles"
          actions={<Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>Nouvelle note</Btn>}
        />

        <div className="erp-kpi-grid">
          {[
            { label: 'Total soumis',    value: items.length,        color: '#6366f1' },
            { label: 'En attente',      value: pendingCount,        color: '#f59e0b' },
            { label: 'Montant total',   value: fmtDZD(totalAmt),    color: '#3b82f6' },
            { label: 'Approuvé (DA)',   value: fmtDZD(approvedAmt), color: '#10b981' },
          ].map((k, i) => (
            <div key={i} className="erp-kpi" style={{ '--kpi-color': k.color }}>
              <div className="erp-kpi__icon" style={{ background: k.color + '22', color: k.color, fontSize: 20 }}>💸</div>
              <div>
                <div className="erp-kpi__value" style={{ color: k.color }}>{k.value}</div>
                <div className="erp-kpi__label">{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-input" style={{ maxWidth: 280 }}>
            <Search size={14} className="search-input__icon" />
            <input placeholder="Titre, catégorie, employé…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="filters-bar">
            <select value={stFilter} onChange={e => setStFilter(e.target.value)}>
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="💸" title="Aucune note de frais" description="Créez votre première note de frais."
            action={<Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>Créer</Btn>} />
        ) : (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                  {['Employé','Titre','Catégorie','Montant (DA)','Date','Statut','Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.7 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const st  = STATUS_CFG[item.status] || STATUS_CFG.PENDING;
                  const emp = item.employee;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                        {emp ? `${emp.firstName} ${emp.lastName}` : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>{CAT_ICONS[item.category]} {item.category}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 700, color: '#6366f1' }}>{fmtDZD(item.amount)}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(item.date).toLocaleDateString('fr-FR')}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: st.color, background: st.color + '18', padding: '3px 8px', borderRadius: 5 }}>{st.label}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                          {item.status === 'PENDING' && (
                            <>
                              <button title="Approuver" onClick={() => handleStatus(item.id, 'APPROVED')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981' }}><CheckCircle size={15} /></button>
                              <button title="Rejeter"   onClick={() => handleStatus(item.id, 'REJECTED')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><XCircle   size={15} /></button>
                            </>
                          )}
                          {item.status === 'APPROVED' && (
                            <button onClick={() => handleStatus(item.id, 'REIMBURSED')} style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', background: '#6366f110', border: '1px solid #6366f130', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>Rembourser</button>
                          )}
                          <Btn variant="secondary" size="sm" icon={<Edit2  size={11} />} onClick={() => setModal({ type: 'edit', data: item })} />
                          <Btn variant="danger"    size="sm" icon={<Trash2 size={11} />} onClick={() => handleDelete(item.id)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {(modal?.type === 'create' || modal?.type === 'edit') && (
          <ExpenseModal
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
