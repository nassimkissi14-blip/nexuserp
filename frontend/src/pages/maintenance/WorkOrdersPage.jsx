import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Wrench, Play, CheckCircle, Clock, XCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../api/client.js';
import AnimatedPage from '../../components/ui/AnimatedPage.jsx';
import {
  PageHeader, Btn, Modal, FormGrid, FormActions,
  Field, Input, Select, EmptyState, Badge,
} from '../../components/ui/DesignSystem.jsx';

/* ── API ─────────────────────────────────────── */
const api = {
  orders:      (p)     => apiClient.get('/maintenance/orders', { params: p }),
  createOrder: (d)     => apiClient.post('/maintenance/orders', d),
  updateOrder: (id, d) => apiClient.patch(`/maintenance/orders/${id}`, d),
  equipment:   ()      => apiClient.get('/maintenance/equipment'),
  requests:    ()      => apiClient.get('/maintenance/requests'),
};

const ORDER_STATUS = {
  PLANNED:     { label: 'Planifié',  color: '#6366f1' },
  IN_PROGRESS: { label: 'En cours',  color: '#f59e0b' },
  COMPLETED:   { label: 'Terminé',   color: '#10b981' },
  CANCELLED:   { label: 'Annulé',    color: '#64748b' },
};
const ORDER_TYPE = {
  CORRECTIVE:  { label: 'Corrective',    color: '#ef4444', icon: '🔧' },
  PREVENTIVE:  { label: 'Préventive',    color: '#6366f1', icon: '🗓️' },
  BREAKDOWN:   { label: 'Urgente',       color: '#f59e0b', icon: '⚡' },
  IMPROVEMENT: { label: 'Amélioration',  color: '#10b981', icon: '✨' },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

/* ── ORDER FORM ─────────────────────────────── */
function OrderModal({ order, equipment, requests, defaultType, onClose, onSave, loading }) {
  const [form, setForm] = useState({
    title:          order?.title          || '',
    equipmentId:    order?.equipmentId    || '',
    requestId:      order?.requestId      || '',
    type:           order?.type           || defaultType || 'CORRECTIVE',
    plannedDate:    order?.plannedDate?.slice(0, 10) || '',
    estimatedHours: order?.estimatedHours || '',
    actualHours:    order?.actualHours    || '',
    laborCost:      order?.laborCost      || '',
    partsCost:      order?.partsCost      || '',
    status:         order?.status         || 'PLANNED',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.equipmentId) { toast.error('Sélectionner un équipement'); return; }
    if (!form.title.trim()) { toast.error('Titre requis'); return; }
    onSave(form);
  };

  return (
    <Modal title={order ? `Modifier — ${order.number}` : 'Nouvel ordre de maintenance'} onClose={onClose} width={620}>
      <FormGrid cols={1}>
        <Field label="Intitulé de l'intervention *">
          <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="ex: Remplacement roulement broche X" />
        </Field>
      </FormGrid>
      <FormGrid cols={2}>
        <Field label="Équipement *">
          <Select value={form.equipmentId} onChange={e => set('equipmentId', e.target.value)}>
            <option value="">— Sélectionner —</option>
            {equipment.map(e => <option key={e.id} value={e.id}>{e.name}{e.code ? ` (${e.code})` : ''}</option>)}
          </Select>
        </Field>
        <Field label="Demande liée">
          <Select value={form.requestId} onChange={e => set('requestId', e.target.value)}>
            <option value="">— Aucune —</option>
            {requests.filter(r => r.status === 'OPEN' || r.status === 'IN_PROGRESS').map(r => (
              <option key={r.id} value={r.id}>{r.number} — {r.title?.slice(0, 35)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Type d'intervention">
          <Select value={form.type} onChange={e => set('type', e.target.value)}>
            {Object.entries(ORDER_TYPE).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </Select>
        </Field>
        <Field label="Date planifiée">
          <Input type="date" value={form.plannedDate} onChange={e => set('plannedDate', e.target.value)} />
        </Field>
        <Field label="Durée estimée (h)">
          <Input type="number" value={form.estimatedHours} onChange={e => set('estimatedHours', e.target.value)} placeholder="0" min="0" step="0.5" />
        </Field>
        {order && (
          <>
            <Field label="Durée réelle (h)">
              <Input type="number" value={form.actualHours} onChange={e => set('actualHours', e.target.value)} placeholder="0" min="0" step="0.5" />
            </Field>
            <Field label="Coût main d'œuvre (DA)">
              <Input type="number" value={form.laborCost} onChange={e => set('laborCost', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Coût pièces (DA)">
              <Input type="number" value={form.partsCost} onChange={e => set('partsCost', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Statut" span={2}>
              <Select value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </Field>
          </>
        )}
      </FormGrid>
      <FormActions>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn variant="primary" loading={loading} onClick={handleSave}>
          {order ? 'Enregistrer' : 'Créer l\'ordre'}
        </Btn>
      </FormActions>
    </Modal>
  );
}

/* ── ORDER CARD ─────────────────────────────── */
function OrderCard({ order, onEdit, onStart, onComplete, onCancel }) {
  const stat = ORDER_STATUS[order.status] || { label: order.status, color: '#64748b' };
  const typ  = ORDER_TYPE[order.type]    || { label: order.type, color: '#64748b', icon: '🔧' };
  const totalCost = (Number(order.laborCost || 0) + Number(order.partsCost || 0)).toLocaleString('fr-DZ');
  const isLate = order.plannedDate && new Date(order.plannedDate) < new Date() && order.status !== 'COMPLETED';

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${isLate && order.status !== 'COMPLETED' ? 'rgba(239,68,68,0.3)' : `${stat.color}33`}`,
      borderRadius: 'var(--radius-lg)',
      padding: '16px 18px',
      transition: 'var(--transition)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{typ.icon}</span>
          <span style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 700, fontFamily: 'monospace' }}>{order.number}</span>
          <Badge color={typ.color}>{typ.label}</Badge>
          {isLate && order.status !== 'COMPLETED' && <Badge color="#ef4444">En retard</Badge>}
        </div>
        <Badge color={stat.color} dot>{stat.label}</Badge>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{order.title}</div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
        {order.equipment?.name && <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{order.equipment.name}</span>}
        {order.plannedDate && <span style={{ marginLeft: 8 }}>📅 {fmtDate(order.plannedDate)}</span>}
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Durée est.', value: order.estimatedHours ? `${order.estimatedHours}h` : '—' },
          { label: 'Durée réelle', value: order.actualHours ? `${order.actualHours}h` : '—' },
          { label: 'Coût total', value: (order.laborCost || order.partsCost) ? `${totalCost} DA` : '—' },
        ].map((m, i) => (
          <div key={i} style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '7px 10px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>{m.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 2 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Btn variant="secondary" size="sm" onClick={onEdit} style={{ flex: 1 }}>Modifier</Btn>
        {order.status === 'PLANNED' && (
          <Btn variant="warning" size="sm" icon={<Play size={12} />} onClick={onStart} style={{ flex: 1 }}>
            Démarrer
          </Btn>
        )}
        {order.status === 'IN_PROGRESS' && (
          <Btn variant="success" size="sm" icon={<CheckCircle size={12} />} onClick={onComplete} style={{ flex: 1 }}>
            Terminer
          </Btn>
        )}
        {(order.status === 'PLANNED' || order.status === 'IN_PROGRESS') && (
          <Btn variant="secondary" size="sm" icon={<XCircle size={12} />} onClick={onCancel}
            style={{ color: 'var(--accent-danger)', flex: 'none' }} />
        )}
      </div>
    </div>
  );
}

/* ── MAIN PAGE ──────────────────────────────── */
export default function WorkOrdersPage({ defaultType }) {
  const qc = useQueryClient();
  const [modal, setModal]         = useState(null);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [typeFilter, setType]     = useState(defaultType || '');

  const inv = () => {
    qc.invalidateQueries({ queryKey: ['maint-orders'] });
    qc.invalidateQueries({ queryKey: ['maint-dashboard'] });
    qc.invalidateQueries({ queryKey: ['equipment'] });
  };

  const { data: orderData, isLoading } = useQuery({
    queryKey: ['maint-orders'],
    queryFn: () => api.orders(),
    staleTime: 30_000,
  });
  const { data: equipData } = useQuery({
    queryKey: ['equipment'],
    queryFn: api.equipment,
    staleTime: 60_000,
  });
  const { data: reqData } = useQuery({
    queryKey: ['maint-requests-all'],
    queryFn: api.requests,
    staleTime: 30_000,
  });

  const orders    = orderData?.data || [];
  const equipment = equipData?.data || [];
  const requests  = reqData?.data   || [];

  const filtered = orders.filter(o => {
    const matchStatus = !statusFilter || o.status === statusFilter;
    const matchType   = !typeFilter   || o.type   === typeFilter;
    const matchSearch = !search || o.title?.toLowerCase().includes(search.toLowerCase())
      || o.number?.toLowerCase().includes(search.toLowerCase())
      || o.equipment?.name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchType && matchSearch;
  });

  const createOrder = useMutation({
    mutationFn: api.createOrder,
    onSuccess: () => { inv(); setModal(null); toast.success('Ordre créé'); },
    onError:   e  => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const updateOrder = useMutation({
    mutationFn: ({ id, data }) => api.updateOrder(id, data),
    onSuccess: () => { inv(); setModal(null); toast.success('Mis à jour'); },
    onError:   e  => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const quickStatus = (id, status) => updateOrder.mutate({ id, data: { status } });

  const planned   = orders.filter(o => o.status === 'PLANNED'     && (!typeFilter || o.type === typeFilter)).length;
  const inProg    = orders.filter(o => o.status === 'IN_PROGRESS' && (!typeFilter || o.type === typeFilter)).length;
  const completed = orders.filter(o => o.status === 'COMPLETED'   && (!typeFilter || o.type === typeFilter)).length;
  const totalHours = orders
    .filter(o => o.actualHours && (!typeFilter || o.type === typeFilter))
    .reduce((s, o) => s + Number(o.actualHours || 0), 0);

  const isCorrectif = defaultType === 'CORRECTIVE';
  const pageTitle   = isCorrectif ? 'Maintenance corrective' : 'Ordres de maintenance';
  const pageSubtitle = isCorrectif
    ? 'Interventions correctives suite à pannes ou incidents signalés'
    : 'Planifiez, exécutez et clôturez les interventions sur vos équipements';

  return (
    <AnimatedPage>
      <div className="erp-page">

        <PageHeader
          icon={isCorrectif ? '🔧' : '📋'}
          title={pageTitle}
          subtitle={pageSubtitle}
          actions={
            <Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>
              {isCorrectif ? 'Nouvelle intervention' : 'Nouvel ordre'}
            </Btn>
          }
        />

        {/* KPIs */}
        <div className="erp-kpi-grid">
          {[
            { icon: <Clock size={18} />,       label: 'Planifiés',    value: planned,                      sub: 'à démarrer',              color: '#6366f1' },
            { icon: <Wrench size={18} />,      label: 'En cours',     value: inProg,                       sub: 'interventions actives',   color: '#f59e0b' },
            { icon: <CheckCircle size={18} />, label: 'Terminés',     value: completed,                    sub: 'interventions clôturées', color: '#10b981' },
            { icon: <Clock size={18} />,       label: 'Heures réal.', value: `${totalHours.toFixed(1)}h`,  sub: 'temps total passé',       color: '#6366f1' },
          ].map((k, i) => (
            <div key={i} className="erp-kpi" style={{ '--kpi-color': k.color }}>
              <div className="erp-kpi__icon" style={{ background: k.color + '22', color: k.color }}>{k.icon}</div>
              <div>
                <div className="erp-kpi__value" style={{ color: k.color }}>{k.value}</div>
                <div className="erp-kpi__label">{k.label}</div>
                <div className="erp-kpi__sub">{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-input" style={{ maxWidth: 300 }}>
            <Search size={14} className="search-input__icon" />
            <input placeholder="Rechercher un ordre…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="filters-bar">
            <select value={statusFilter} onChange={e => setStatus(e.target.value)}>
              <option value="">Tous les statuts</option>
              {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          {!isCorrectif && (
            <div className="filters-bar">
              <select value={typeFilter} onChange={e => setType(e.target.value)}>
                <option value="">Tous les types</option>
                {Object.entries(ORDER_TYPE).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {filtered.length} ordre{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="dashboard-loading"><div className="spinner" /><span>Chargement des ordres…</span></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={isCorrectif ? '🔧' : '📋'}
            title={orders.filter(o => !typeFilter || o.type === typeFilter).length === 0
              ? (isCorrectif ? 'Aucune intervention corrective' : 'Aucun ordre de maintenance')
              : 'Aucun résultat'}
            description={isCorrectif
              ? 'Les interventions correctives apparaissent ici lors de pannes signalées.'
              : 'Créez votre premier ordre d\'intervention.'}
            action={<Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>
              {isCorrectif ? 'Créer une intervention' : 'Créer le premier ordre'}
            </Btn>}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
            {filtered.map(o => (
              <OrderCard
                key={o.id}
                order={o}
                onEdit={() => setModal({ type: 'edit', data: o })}
                onStart={() => quickStatus(o.id, 'IN_PROGRESS')}
                onComplete={() => quickStatus(o.id, 'COMPLETED')}
                onCancel={() => {
                  if (window.confirm('Annuler cet ordre ?')) quickStatus(o.id, 'CANCELLED');
                }}
              />
            ))}
          </div>
        )}

        {/* Modal */}
        {(modal?.type === 'create' || modal?.type === 'edit') && (
          <OrderModal
            order={modal.data}
            equipment={equipment}
            requests={requests}
            defaultType={defaultType}
            loading={createOrder.isPending || updateOrder.isPending}
            onClose={() => setModal(null)}
            onSave={(form) => {
              if (modal.data) updateOrder.mutate({ id: modal.data.id, data: form });
              else createOrder.mutate(form);
            }}
          />
        )}
      </div>
    </AnimatedPage>
  );
}
