import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Users, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AnimatedPage from '../../components/ui/AnimatedPage.jsx';
import { PageHeader, Btn, Modal, FormGrid, FormActions, Field, Input, Select, Textarea, EmptyState } from '../../components/ui/DesignSystem.jsx';
import apiClient from '../../api/client.js';

const TYPES = {
  HUMAN:     { label: 'Humaine',  icon: '👤', color: '#6366f1' },
  EQUIPMENT: { label: 'Matériel', icon: '🖥️', color: '#f59e0b' },
  SOFTWARE:  { label: 'Logiciel', icon: '💾', color: '#3b82f6' },
  BUDGET:    { label: 'Budget',   icon: '💰', color: '#10b981' },
};

const STATUS = {
  AVAILABLE:   { label: 'Disponible',   color: '#10b981' },
  ASSIGNED:    { label: 'Affectée',     color: '#3b82f6' },
  BUSY:        { label: 'Occupée',      color: '#f59e0b' },
  UNAVAILABLE: { label: 'Indisponible', color: '#ef4444' },
};

function ResourceModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:      item?.name      || '',
    type:      item?.type      || 'HUMAN',
    status:    item?.status    || 'AVAILABLE',
    project:   item?.project   || '',
    skills:    item?.skills    || '',
    capacity:  item?.capacity  ?? 100,
    startDate: item?.startDate ? item.startDate.slice(0,10) : '',
    endDate:   item?.endDate   ? item.endDate.slice(0,10)   : '',
    cost:      item?.cost      || '',
    notes:     item?.notes     || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name) return toast.error('Nom requis');
    setSaving(true);
    try {
      if (item) {
        await apiClient.put(`/resources/${item.id}`, form);
        toast.success('Ressource mise à jour');
      } else {
        await apiClient.post('/resources', form);
        toast.success('Ressource ajoutée');
      }
      onSaved();
    } catch (e) { toast.error(e?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={item ? `Modifier — ${item.name}` : 'Nouvelle ressource'} onClose={onClose} width={580}>
      <FormGrid cols={2}>
        <Field label="Nom / Désignation *"><Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="ex: Ahmed Benali" /></Field>
        <Field label="Type de ressource">
          <Select value={form.type} onChange={e => set('type', e.target.value)}>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </Select>
        </Field>
        <Field label="Statut">
          <Select value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label="Projet affecté"><Input value={form.project} onChange={e => set('project', e.target.value)} placeholder="ex: Refonte ERP" /></Field>
        <Field label="Capacité (%)"><Input type="number" min="0" max="100" value={form.capacity} onChange={e => set('capacity', e.target.value)} /></Field>
        <Field label="Coût / unité (DA)"><Input type="number" value={form.cost} onChange={e => set('cost', e.target.value)} placeholder="0" /></Field>
        <Field label="Date début"><Input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} /></Field>
        <Field label="Date fin"><Input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} /></Field>
      </FormGrid>
      <FormGrid cols={1}>
        <Field label="Compétences"><Input value={form.skills} onChange={e => set('skills', e.target.value)} placeholder="ex: React, Node.js" /></Field>
        <Field label="Notes"><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} /></Field>
      </FormGrid>
      <FormActions>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : item ? 'Enregistrer' : 'Ajouter'}</Btn>
      </FormActions>
    </Modal>
  );
}

export default function ResourcesPage() {
  const qc = useQueryClient();
  const [modal, setModal]       = useState(null);
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [stFilter, setStFilter]     = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['project-resources'],
    queryFn: () => apiClient.get('/resources').then(r => r.data),
  });

  const items   = data || [];
  const refresh = () => qc.invalidateQueries({ queryKey: ['project-resources'] });

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette ressource ?')) return;
    try {
      await apiClient.delete(`/resources/${id}`);
      toast.success('Supprimée');
      refresh();
    } catch { toast.error('Erreur'); }
  };

  const filtered = items.filter(i => {
    const mt = !typeFilter || i.type === typeFilter;
    const ms = !stFilter   || i.status === stFilter;
    const mq = !search     || [i.name, i.project, i.skills].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    return mt && ms && mq;
  });

  const available = items.filter(i => i.status === 'AVAILABLE').length;
  const assigned  = items.filter(i => i.status === 'ASSIGNED').length;
  const avgCap    = items.length ? Math.round(items.reduce((s, i) => s + Number(i.capacity || 0), 0) / items.length) : 0;

  return (
    <AnimatedPage>
      <div className="erp-page">
        <PageHeader icon="👥" title="Ressources projets" subtitle="Planifiez et optimisez l'affectation des ressources humaines et matérielles"
          actions={<Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>Ajouter une ressource</Btn>}
        />

        <div className="erp-kpi-grid">
          {[
            { label: 'Total ressources', value: items.length, color: '#6366f1', icon: <Users size={18} /> },
            { label: 'Disponibles',      value: available,    color: '#10b981', icon: <Users size={18} /> },
            { label: 'Affectées',        value: assigned,     color: '#3b82f6', icon: <Users size={18} /> },
            { label: 'Charge moyenne',   value: `${avgCap}%`, color: '#f59e0b', icon: <TrendingUp size={18} /> },
          ].map((k, i) => (
            <div key={i} className="erp-kpi" style={{ '--kpi-color': k.color }}>
              <div className="erp-kpi__icon" style={{ background: k.color + '22', color: k.color }}>{k.icon}</div>
              <div><div className="erp-kpi__value" style={{ color: k.color }}>{k.value}</div><div className="erp-kpi__label">{k.label}</div></div>
            </div>
          ))}
        </div>

        {/* Type filter pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(TYPES).map(([k, v]) => {
            const count  = items.filter(i => i.type === k).length;
            const active = typeFilter === k;
            return (
              <button key={k} onClick={() => setTypeFilter(active ? '' : k)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: active ? v.color + '20' : 'var(--bg-card)', border: `1px solid ${active ? v.color + '50' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: active ? v.color : 'var(--text-muted)' }}>
                {v.icon} {v.label} <span style={{ fontSize: 10, background: active ? v.color : '#334155', color: active ? 'white' : 'var(--text-muted)', borderRadius: 10, padding: '1px 6px' }}>{count}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-input" style={{ maxWidth: 280 }}>
            <Search size={14} className="search-input__icon" />
            <input placeholder="Nom, projet, compétence…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="filters-bar">
            <select value={stFilter} onChange={e => setStFilter(e.target.value)}>
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{filtered.length} ressource{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="👥" title="Aucune ressource" description="Ajoutez vos ressources humaines et matérielles."
            action={<Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>Ajouter</Btn>} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {filtered.map(item => {
              const t  = TYPES[item.type]   || TYPES.HUMAN;
              const st = STATUS[item.status] || STATUS.AVAILABLE;
              const cap      = Number(item.capacity || 0);
              const capColor = cap >= 90 ? '#ef4444' : cap >= 70 ? '#f59e0b' : '#10b981';
              return (
                <div key={item.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: t.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{t.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: t.color, fontWeight: 600 }}>{t.label}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: st.color, background: st.color + '18', padding: '3px 8px', borderRadius: 5 }}>{st.label}</span>
                  </div>

                  {item.project && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--accent-primary)' }}>📁</span> {item.project}
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Charge</span>
                      <span style={{ fontWeight: 700, color: capColor }}>{cap}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(cap, 100)}%`, background: capColor, borderRadius: 3, transition: 'width .4s' }} />
                    </div>
                  </div>

                  {item.skills && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {item.skills.split(',').slice(0, 4).map((s, i) => (
                        <span key={i} style={{ fontSize: 10, background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 7px', borderRadius: 4 }}>{s.trim()}</span>
                      ))}
                    </div>
                  )}

                  {item.startDate && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      📅 {new Date(item.startDate).toLocaleDateString('fr-FR')}
                      {item.endDate && <> → {new Date(item.endDate).toLocaleDateString('fr-FR')}</>}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
                    <Btn variant="secondary" size="sm" icon={<Edit2  size={11} />} onClick={() => setModal({ type: 'edit', data: item })}>Modifier</Btn>
                    <Btn variant="danger"    size="sm" icon={<Trash2 size={11} />} onClick={() => handleDelete(item.id)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(modal?.type === 'create' || modal?.type === 'edit') && (
          <ResourceModal item={modal.data} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />
        )}
      </div>
    </AnimatedPage>
  );
}
