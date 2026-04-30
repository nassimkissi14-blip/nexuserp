import { useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AnimatedPage from '../../components/ui/AnimatedPage.jsx';
import { PageHeader, Btn, Modal, FormGrid, FormActions, Field, Input, Select, Textarea, EmptyState } from '../../components/ui/DesignSystem.jsx';
import apiClient from '../../api/client.js';

const TYPES = {
  ROAD:    { label: 'Routier',    icon: '🚛', color: '#6366f1' },
  AIR:     { label: 'Aérien',    icon: '✈️', color: '#3b82f6' },
  SEA:     { label: 'Maritime',  icon: '🚢', color: '#0ea5e9' },
  RAIL:    { label: 'Ferroviaire', icon: '🚂', color: '#f59e0b' },
  EXPRESS: { label: 'Express',   icon: '⚡', color: '#10b981' },
};

function CarrierModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:    item?.name    || '',
    type:    item?.type    || 'ROAD',
    phone:   item?.phone   || '',
    email:   item?.email   || '',
    address: item?.address || '',
    notes:   item?.notes   || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name) return toast.error('Nom requis');
    setSaving(true);
    try {
      if (item) {
        await apiClient.put(`/carriers/${item.id}`, form);
        toast.success('Transporteur mis à jour');
      } else {
        await apiClient.post('/carriers', form);
        toast.success('Transporteur ajouté');
      }
      onSaved();
    } catch (e) { toast.error(e?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={item ? `Modifier — ${item.name}` : 'Nouveau transporteur'} onClose={onClose} width={520}>
      <FormGrid cols={2}>
        <Field label="Nom *"><Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nom du transporteur" /></Field>
        <Field label="Type">
          <Select value={form.type} onChange={e => set('type', e.target.value)}>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </Select>
        </Field>
        <Field label="Téléphone"><Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+213 …" /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@…" /></Field>
      </FormGrid>
      <FormGrid cols={1}>
        <Field label="Adresse"><Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Adresse…" /></Field>
        <Field label="Notes"><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Conditions, zones desservies…" /></Field>
      </FormGrid>
      <FormActions>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : item ? 'Modifier' : 'Ajouter'}</Btn>
      </FormActions>
    </Modal>
  );
}

export default function CarriersPage() {
  const qc = useQueryClient();
  const [modal, setModal]   = useState(null);
  const [search, setSearch] = useState('');
  const [typeF, setTypeF]   = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['carriers'],
    queryFn: () => apiClient.get('/carriers').then(r => r.data),
  });

  const items   = data || [];
  const refresh = () => qc.invalidateQueries({ queryKey: ['carriers'] });

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce transporteur ?')) return;
    try {
      await apiClient.delete(`/carriers/${id}`);
      toast.success('Supprimé');
      refresh();
    } catch { toast.error('Erreur'); }
  };

  const filtered = items.filter(i => {
    const mt = !typeF  || i.type === typeF;
    const mq = !search || i.name.toLowerCase().includes(search.toLowerCase());
    return mt && mq;
  });

  return (
    <AnimatedPage>
      <div className="erp-page">
        <PageHeader icon="🚚" title="Transporteurs" subtitle="Gérez vos partenaires logistiques et transporteurs"
          actions={<Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>Ajouter</Btn>}
        />

        <div className="erp-kpi-grid">
          {Object.entries(TYPES).map(([k, v]) => {
            const count = items.filter(i => i.type === k).length;
            return (
              <div key={k} className="erp-kpi" style={{ '--kpi-color': v.color }}>
                <div className="erp-kpi__icon" style={{ background: v.color + '22', color: v.color, fontSize: 20 }}>{v.icon}</div>
                <div><div className="erp-kpi__value" style={{ color: v.color }}>{count}</div><div className="erp-kpi__label">{v.label}</div></div>
              </div>
            );
          })}
        </div>

        {/* Type filter pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['', ...Object.keys(TYPES)].map(k => {
            const v      = k ? TYPES[k] : null;
            const active = typeF === k;
            const count  = k ? items.filter(i => i.type === k).length : items.length;
            return (
              <button key={k || 'all'} onClick={() => setTypeF(k)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: active ? (v?.color || '#6366f1') + '20' : 'var(--bg-card)', border: `1px solid ${active ? (v?.color || '#6366f1') + '50' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: active ? (v?.color || '#818cf8') : 'var(--text-muted)' }}>
                {v ? v.icon : '🌐'} {v ? v.label : 'Tous'} <span style={{ fontSize: 10, background: active ? (v?.color || '#6366f1') : '#334155', color: active ? 'white' : 'var(--text-muted)', borderRadius: 10, padding: '1px 6px' }}>{count}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-input" style={{ maxWidth: 280 }}>
            <Search size={14} className="search-input__icon" />
            <input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} transporteur{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🚚" title="Aucun transporteur" description="Ajoutez vos partenaires logistiques."
            action={<Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>Ajouter</Btn>} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {filtered.map(item => {
              const t = TYPES[item.type] || TYPES.ROAD;
              return (
                <div key={item.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 42, height: 42, background: t.color + '18', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{t.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: t.color, fontWeight: 600 }}>{t.label}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: item.isActive ? '#10b981' : '#ef4444', background: (item.isActive ? '#10b981' : '#ef4444') + '18', padding: '3px 8px', borderRadius: 5 }}>
                      {item.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                    {item.phone   && <span>📞 {item.phone}</span>}
                    {item.email   && <span>✉️ {item.email}</span>}
                    {item.address && <span>📍 {item.address}</span>}
                  </div>

                  {item.notes && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{item.notes}</p>}

                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
                    <Btn variant="secondary" size="sm" icon={<Edit2  size={11} />} onClick={() => setModal({ type: 'edit', data: item })}>Modifier</Btn>
                    <Btn variant="danger"    size="sm" icon={<Trash2 size={11} />} onClick={() => handleDelete(item.id)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(modal?.type === 'create' || modal?.type === 'edit') && (
          <CarrierModal item={modal.data} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />
        )}
      </div>
    </AnimatedPage>
  );
}
