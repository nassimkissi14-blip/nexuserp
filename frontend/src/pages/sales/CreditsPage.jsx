import { useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AnimatedPage from '../../components/ui/AnimatedPage.jsx';
import { PageHeader, Btn, Modal, FormGrid, FormActions, Field, Input, Select, Textarea, EmptyState } from '../../components/ui/DesignSystem.jsx';
import apiClient from '../../api/client.js';

const fmtDZD = n => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M DA` : `${(n/1_000).toFixed(0)}k DA`;

const STATUS_CFG = {
  DRAFT:     { label: 'Brouillon', color: '#64748b' },
  ISSUED:    { label: 'Émis',      color: '#3b82f6' },
  APPLIED:   { label: 'Appliqué', color: '#10b981' },
  REFUNDED:  { label: 'Remboursé', color: '#6366f1' },
  CANCELLED: { label: 'Annulé',   color: '#ef4444' },
};

function CreditModal({ item, customers, onClose, onSaved }) {
  const [form, setForm] = useState({
    customerId: item?.customerId || '',
    invoiceRef: item?.invoiceRef || '',
    amount:     item?.amount     || '',
    reason:     item?.reason     || '',
    issuedAt:   item?.issuedAt ? item.issuedAt.slice(0,10) : new Date().toISOString().slice(0,10),
    status:     item?.status     || 'DRAFT',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.customerId || !form.amount || !form.issuedAt)
      return toast.error('Client, montant et date requis');
    setSaving(true);
    try {
      if (item) {
        await apiClient.put(`/credits/${item.id}`, form);
        toast.success('Avoir mis à jour');
      } else {
        await apiClient.post('/credits', form);
        toast.success('Avoir créé');
      }
      onSaved();
    } catch (e) { toast.error(e?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={item ? `Modifier — ${item.reference}` : 'Nouvel avoir'} onClose={onClose} width={520}>
      <FormGrid cols={2}>
        <Field label="Client *">
          <Select value={form.customerId} onChange={e => set('customerId', e.target.value)}>
            <option value="">Sélectionner…</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Facture liée">
          <Input value={form.invoiceRef} onChange={e => set('invoiceRef', e.target.value)} placeholder="ex: FAC-2026-0042" />
        </Field>
        <Field label="Montant (DA) *">
          <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" />
        </Field>
        <Field label="Date d'émission *">
          <Input type="date" value={form.issuedAt} onChange={e => set('issuedAt', e.target.value)} />
        </Field>
        {item && (
          <Field label="Statut">
            <Select value={form.status} onChange={e => set('status', e.target.value)}>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
        )}
      </FormGrid>
      <FormGrid cols={1}>
        <Field label="Motif">
          <Textarea value={form.reason} onChange={e => set('reason', e.target.value)} rows={2} placeholder="Raison de l'avoir…" />
        </Field>
      </FormGrid>
      <FormActions>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : item ? 'Modifier' : 'Créer'}</Btn>
      </FormActions>
    </Modal>
  );
}

export default function CreditsPage() {
  const qc = useQueryClient();
  const [modal, setModal]       = useState(null);
  const [search, setSearch]     = useState('');
  const [stFilter, setStFilter] = useState('');

  const { data: creditData, isLoading } = useQuery({
    queryKey: ['credits'],
    queryFn: () => apiClient.get('/credits').then(r => r.data),
  });

  const { data: custData } = useQuery({
    queryKey: ['customers-simple'],
    queryFn: () => apiClient.get('/customers?limit=200').then(r => r.data),
  });

  const items     = creditData || [];
  const customers = custData   || [];
  const refresh   = () => qc.invalidateQueries({ queryKey: ['credits'] });

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cet avoir ?')) return;
    try {
      await apiClient.delete(`/credits/${id}`);
      toast.success('Supprimé');
      refresh();
    } catch { toast.error('Erreur'); }
  };

  const handleIssue = async (id) => {
    try {
      await apiClient.put(`/credits/${id}`, { status: 'ISSUED' });
      toast.success('Avoir émis');
      refresh();
    } catch { toast.error('Erreur'); }
  };

  const handleApply = async (id) => {
    try {
      await apiClient.put(`/credits/${id}`, { status: 'APPLIED' });
      toast.success('Avoir appliqué');
      refresh();
    } catch { toast.error('Erreur'); }
  };

  const filtered = items.filter(i => {
    const ms = !stFilter || i.status === stFilter;
    const mq = !search   || [i.reference, i.invoiceRef, i.customer?.name].some(f => f?.toLowerCase().includes(search?.toLowerCase()));
    return ms && mq;
  });

  const totalAmt  = items.reduce((s, i) => s + i.amount, 0);
  const draftCnt  = items.filter(i => i.status === 'DRAFT').length;
  const issuedAmt = items.filter(i => i.status === 'ISSUED').reduce((s, i) => s + i.amount, 0);

  return (
    <AnimatedPage>
      <div className="erp-page">
        <PageHeader icon="📄" title="Avoirs" subtitle="Gérez vos notes de crédit et remboursements clients"
          actions={<Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>Nouvel avoir</Btn>}
        />

        <div className="erp-kpi-grid">
          {[
            { label: 'Total avoirs',    value: items.length,       color: '#6366f1' },
            { label: 'Brouillons',      value: draftCnt,           color: '#64748b' },
            { label: 'Montant total',   value: fmtDZD(totalAmt),   color: '#3b82f6' },
            { label: 'En attente (DA)', value: fmtDZD(issuedAmt),  color: '#f59e0b' },
          ].map((k, i) => (
            <div key={i} className="erp-kpi" style={{ '--kpi-color': k.color }}>
              <div className="erp-kpi__icon" style={{ background: k.color + '22', color: k.color, fontSize: 20 }}>📄</div>
              <div><div className="erp-kpi__value" style={{ color: k.color }}>{k.value}</div><div className="erp-kpi__label">{k.label}</div></div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-input" style={{ maxWidth: 280 }}>
            <Search size={14} className="search-input__icon" />
            <input placeholder="Référence, client, facture…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="filters-bar">
            <select value={stFilter} onChange={e => setStFilter(e.target.value)}>
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} avoir{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="📄" title="Aucun avoir" description="Créez votre premier avoir client."
            action={<Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>Créer</Btn>} />
        ) : (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                  {['Référence','Client','Facture liée','Montant (DA)','Date','Statut','Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.7 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const st = STATUS_CFG[item.status] || STATUS_CFG.DRAFT;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 700, color: '#818cf8' }}>{item.reference}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--text-secondary)' }}>{item.customer?.name || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>{item.invoiceRef || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 700, color: '#10b981' }}>{fmtDZD(item.amount)}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(item.issuedAt).toLocaleDateString('fr-FR')}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: st.color, background: st.color + '18', padding: '3px 8px', borderRadius: 5 }}>{st.label}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {item.status === 'DRAFT'   && <button onClick={() => handleIssue(item.id)} style={{ fontSize: 10, fontWeight: 700, color: '#3b82f6', background: '#3b82f610', border: '1px solid #3b82f630', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>Émettre</button>}
                          {item.status === 'ISSUED'  && <button onClick={() => handleApply(item.id)} style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: '#10b98110', border: '1px solid #10b98130', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>Appliquer</button>}
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
          <CreditModal
            item={modal.data}
            customers={customers}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); refresh(); }}
          />
        )}
      </div>
    </AnimatedPage>
  );
}
