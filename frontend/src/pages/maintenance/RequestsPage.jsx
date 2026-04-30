import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, AlertTriangle, CheckCircle, Clock, Filter, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../api/client.js';
import AnimatedPage from '../../components/ui/AnimatedPage.jsx';
import {
  PageHeader, Btn, Modal, FormGrid, FormActions,
  Field, Input, Select, Textarea, EmptyState, Badge, StatusBadge, KpiCard
} from '../../components/ui/DesignSystem.jsx';

/* ── API ─────────────────────────────────────── */
const api = {
  requests:    (p)     => apiClient.get('/maintenance/requests', { params: p }),
  createReq:   (d)     => apiClient.post('/maintenance/requests', d),
  updateReq:   (id, d) => apiClient.patch(`/maintenance/requests/${id}`, d),
  equipment:   ()      => apiClient.get('/maintenance/equipment'),
};

const REQ_STATUS = {
  OPEN:        { label: 'Ouverte',   color: '#ef4444' },
  IN_PROGRESS: { label: 'En cours',  color: '#f59e0b' },
  RESOLVED:    { label: 'Résolue',   color: '#10b981' },
  CLOSED:      { label: 'Fermée',    color: '#64748b' },
};
const REQ_TYPE = {
  CORRECTIVE:  { label: 'Corrective',    color: '#ef4444' },
  PREVENTIVE:  { label: 'Préventive',    color: '#6366f1' },
  BREAKDOWN:   { label: 'Panne urgente', color: '#f59e0b' },
  IMPROVEMENT: { label: 'Amélioration',  color: '#10b981' },
};
const PRIORITY = {
  LOW:      { label: 'Faible',   color: '#64748b' },
  MEDIUM:   { label: 'Moyenne',  color: '#3b82f6' },
  HIGH:     { label: 'Haute',    color: '#f59e0b' },
  CRITICAL: { label: 'Critique', color: '#ef4444' },
};

const fmtDateTime = d => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

/* ── REQUEST FORM ───────────────────────────── */
function RequestModal({ req, equipment, onClose, onSave, loading }) {
  const [form, setForm] = useState({
    equipmentId: req?.equipmentId || '',
    title:       req?.title       || '',
    description: req?.description || '',
    type:        req?.type        || 'CORRECTIVE',
    priority:    req?.priority    || 'MEDIUM',
    status:      req?.status      || 'OPEN',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal title={req ? `Modifier — ${req.number}` : 'Nouvelle demande de maintenance'} onClose={onClose} width={580}>
      <FormGrid cols={1}>
        <Field label="Équipement concerné *">
          <Select value={form.equipmentId} onChange={e => set('equipmentId', e.target.value)}>
            <option value="">Sélectionner un équipement…</option>
            {equipment.map(e => (
              <option key={e.id} value={e.id}>{e.name}{e.code ? ` — ${e.code}` : ''}{e.location ? ` (${e.location})` : ''}</option>
            ))}
          </Select>
        </Field>
        <Field label="Titre de la demande *">
          <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="ex: Vibrations anormales sur la broche" />
        </Field>
        <Field label="Description / Symptômes observés">
          <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Décrivez le problème en détail…" />
        </Field>
      </FormGrid>
      <FormGrid cols={2}>
        <Field label="Type d'intervention">
          <Select value={form.type} onChange={e => set('type', e.target.value)}>
            {Object.entries(REQ_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label="Niveau de priorité">
          <Select value={form.priority} onChange={e => set('priority', e.target.value)}>
            {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        {req && (
          <Field label="Statut" span={2}>
            <Select value={form.status} onChange={e => set('status', e.target.value)}>
              {Object.entries(REQ_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
        )}
      </FormGrid>
      <FormActions>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn variant="primary" loading={loading} onClick={() => onSave(form)}>
          {req ? 'Enregistrer' : 'Signaler la demande'}
        </Btn>
      </FormActions>
    </Modal>
  );
}

/* ── REQUEST ROW ────────────────────────────── */
function RequestRow({ req, onEdit, onClose: onCloseReq }) {
  const pri  = PRIORITY[req.priority]  || { label: req.priority,  color: '#64748b' };
  const stat = REQ_STATUS[req.status]  || { label: req.status,    color: '#64748b' };
  const typ  = REQ_TYPE[req.type]      || { label: req.type,      color: '#64748b' };
  const isCritical = req.priority === 'CRITICAL' && (req.status === 'OPEN' || req.status === 'IN_PROGRESS');

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${isCritical ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
      borderLeft: `4px solid ${pri.color}`,
      borderRadius: 'var(--radius-lg)',
      padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
      transition: 'var(--transition)',
    }}>
      {/* Priority dot */}
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: pri.color, flexShrink: 0, position: 'relative' }}>
        {isCritical && <span style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: `2px solid ${pri.color}`, animation: 'erp-ping 1.4s ease-out infinite', display: 'block' }} />}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 700, fontFamily: 'monospace' }}>{req.number}</span>
          <Badge color={typ.color}>{typ.label}</Badge>
          <Badge color={pri.color}>{pri.label}</Badge>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{req.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {req.equipment?.name && <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{req.equipment.name}</span>}
          {req.equipment?.name && <span> · </span>}
          <span>{fmtDateTime(req.reportedAt)}</span>
        </div>
        {req.description && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>
            {req.description}
          </div>
        )}
      </div>

      {/* Status + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Badge color={stat.color} dot>{stat.label}</Badge>
        <Btn variant="secondary" size="sm" onClick={onEdit}>Modifier</Btn>
        {(req.status === 'OPEN' || req.status === 'IN_PROGRESS') && (
          <Btn variant="success" size="sm" onClick={onCloseReq} icon={<CheckCircle size={12} />}>
            Résoudre
          </Btn>
        )}
      </div>
    </div>
  );
}

/* ── MAIN PAGE ──────────────────────────────── */
export default function RequestsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const inv = () => {
    qc.invalidateQueries({ queryKey: ['maint-requests'] });
    qc.invalidateQueries({ queryKey: ['maint-dashboard'] });
  };

  const { data: reqData, isLoading } = useQuery({ queryKey: ['maint-requests'], queryFn: () => api.requests(), staleTime: 30_000 });
  const { data: equipData }          = useQuery({ queryKey: ['equipment'],       queryFn: api.equipment,        staleTime: 60_000 });

  const requests  = reqData?.data  || [];
  const equipment = equipData?.data || [];

  const filtered = requests.filter(r => {
    const matchStatus = !statusFilter || r.status === statusFilter;
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.number?.toLowerCase().includes(search.toLowerCase()) || r.equipment?.name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const createReq = useMutation({
    mutationFn: api.createReq,
    onSuccess: () => { inv(); setModal(null); toast.success('Demande signalée'); },
    onError:   e  => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const updateReq = useMutation({
    mutationFn: ({ id, data }) => api.updateReq(id, data),
    onSuccess: () => { inv(); setModal(null); toast.success('Demande mise à jour'); },
    onError:   e  => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const open     = requests.filter(r => r.status === 'OPEN').length;
  const inProg   = requests.filter(r => r.status === 'IN_PROGRESS').length;
  const resolved = requests.filter(r => r.status === 'RESOLVED').length;
  const critical = requests.filter(r => r.priority === 'CRITICAL' && r.status !== 'CLOSED' && r.status !== 'RESOLVED').length;

  return (
    <AnimatedPage>
      <div className="erp-page">

        <PageHeader
          icon="🚨"
          title="Demandes de maintenance"
          subtitle="Signalez, suivez et résolvez les incidents et besoins d'intervention"
          actions={
            <Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>
              Signaler un incident
            </Btn>
          }
        />

        {/* KPIs */}
        <div className="erp-kpi-grid">
          {[
            { icon: <AlertTriangle size={18} />, label: 'Ouvertes',     value: open,     sub: 'en attente d\'intervention', color: '#ef4444' },
            { icon: <Clock size={18} />,          label: 'En cours',    value: inProg,   sub: 'intervention démarrée',      color: '#f59e0b' },
            { icon: <CheckCircle size={18} />,    label: 'Résolues',    value: resolved, sub: 'incidents clos',             color: '#10b981' },
            { icon: <AlertTriangle size={18} />,  label: 'Critiques',   value: critical, sub: 'priorité maximale active',   color: critical > 0 ? '#ef4444' : '#64748b' },
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
          <div className="search-input" style={{ maxWidth: 320 }}>
            <Search size={14} className="search-input__icon" />
            <input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="filters-bar">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Tous les statuts</option>
              {Object.entries(REQ_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="dashboard-loading"><div className="spinner" /><span>Chargement des demandes…</span></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="✅"
            title={requests.length === 0 ? 'Aucune demande' : 'Aucun résultat'}
            description={requests.length === 0 ? 'Signalez un incident ou un besoin de maintenance.' : 'Modifiez vos filtres de recherche.'}
            action={requests.length === 0 && <Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>Signaler le premier incident</Btn>}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(r => (
              <RequestRow
                key={r.id}
                req={r}
                onEdit={() => setModal({ type: 'edit', data: r })}
                onClose={() => updateReq.mutate({ id: r.id, data: { status: 'RESOLVED' } })}
              />
            ))}
          </div>
        )}

        {/* Modal */}
        {(modal?.type === 'create' || modal?.type === 'edit') && (
          <RequestModal
            req={modal.data}
            equipment={equipment}
            loading={createReq.isPending || updateReq.isPending}
            onClose={() => setModal(null)}
            onSave={(form) => {
              if (modal.data) updateReq.mutate({ id: modal.data.id, data: form });
              else createReq.mutate(form);
            }}
          />
        )}
      </div>
    </AnimatedPage>
  );
}
