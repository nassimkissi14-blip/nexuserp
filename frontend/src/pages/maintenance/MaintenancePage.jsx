import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Wrench, AlertTriangle, CheckCircle, Clock,
  Activity, Settings, FileText, RefreshCw, Zap,
  ShieldAlert, Calendar, BarChart2, ChevronDown, ChevronRight, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ui/ConfirmModal.jsx';
import apiClient from '../../api/client.js';

/* ── API ─────────────────────────────────────────────────────────── */
const api = {
  dashboard:   ()        => apiClient.get('/maintenance/dashboard'),
  equipment:   (p)       => apiClient.get('/maintenance/equipment', { params: p }),
  createEquip: (d)       => apiClient.post('/maintenance/equipment', d),
  updateEquip: (id, d)   => apiClient.patch(`/maintenance/equipment/${id}`, d),
  deleteEquip: (id)      => apiClient.delete(`/maintenance/equipment/${id}`),
  requests:    (p)       => apiClient.get('/maintenance/requests', { params: p }),
  createReq:   (d)       => apiClient.post('/maintenance/requests', d),
  updateReq:   (id, d)   => apiClient.patch(`/maintenance/requests/${id}`, d),
  deleteReq:   (id)      => apiClient.delete(`/maintenance/requests/${id}`),
  orders:      (p)       => apiClient.get('/maintenance/orders', { params: p }),
  createOrder: (d)       => apiClient.post('/maintenance/orders', d),
  updateOrder: (id, d)   => apiClient.patch(`/maintenance/orders/${id}`, d),
  deleteOrder: (id)      => apiClient.delete(`/maintenance/orders/${id}`),
  logs:        (p)       => apiClient.get('/maintenance/logs', { params: p }),
  reliability: ()        => apiClient.get('/maintenance/reliability'),
};

/* ── Constants ───────────────────────────────────────────────────── */
const EQUIP_STATUS = {
  ACTIVE:      { label: 'Opérationnel', color: '#10b981', bg: '#10b98122', dot: '#10b981' },
  DOWN:        { label: 'En panne',     color: '#ef4444', bg: '#ef444422', dot: '#ef4444' },
  MAINTENANCE: { label: 'Maintenance',  color: '#f59e0b', bg: '#f59e0b22', dot: '#f59e0b' },
  RETIRED:     { label: 'Retraité',     color: '#475569', bg: '#47556922', dot: '#475569' },
};
const REQ_STATUS = {
  OPEN:        { label: 'Ouverte',  color: '#ef4444' },
  IN_PROGRESS: { label: 'En cours', color: '#f59e0b' },
  RESOLVED:    { label: 'Résolue',  color: '#10b981' },
  CLOSED:      { label: 'Fermée',   color: '#64748b' },
};
const REQ_TYPE = {
  CORRECTIVE:  { label: 'Corrective',  color: '#ef4444' },
  PREVENTIVE:  { label: 'Préventive',  color: '#6366f1' },
  BREAKDOWN:   { label: 'Panne',       color: '#f59e0b' },
  IMPROVEMENT: { label: 'Amélioration',color: '#10b981' },
};
const PRIORITY = {
  LOW:      { label: 'Faible',    color: '#64748b' },
  MEDIUM:   { label: 'Moyenne',   color: '#3b82f6' },
  HIGH:     { label: 'Haute',     color: '#f59e0b' },
  CRITICAL: { label: 'Critique',  color: '#ef4444' },
};
const ORDER_STATUS = {
  PLANNED:     { label: 'Planifié',  color: '#6366f1' },
  IN_PROGRESS: { label: 'En cours',  color: '#f59e0b' },
  COMPLETED:   { label: 'Terminé',   color: '#10b981' },
  CANCELLED:   { label: 'Annulé',    color: '#64748b' },
};

const fmtDate     = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmtDateTime = d => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const daysUntil   = d => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;

/* ── Badge ────────────────────────────────────────────────────────── */
const Badge = ({ map, value }) => {
  const s = map[value] || { label: value, color: '#64748b' };
  return (
    <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.color + '22', color: s.color }}>
      {s.label}
    </span>
  );
};

/* ── Modal ────────────────────────────────────────────────────────── */
const Modal = ({ title, onClose, children, width = 560 }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: width }} onClick={e => e.stopPropagation()}>
      <div className="modal__header">
        <h3>{title}</h3>
        <button className="modal__close" onClick={onClose}><X size={15} /></button>
      </div>
      <div className="modal__body">{children}</div>
    </div>
  </div>
);

/* ── Traffic light indicator ──────────────────────────────────────── */
const StatusLight = ({ status, size = 12 }) => {
  const s = EQUIP_STATUS[status] || EQUIP_STATUS.ACTIVE;
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span style={{ width: size, height: size, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {(status === 'DOWN') && (
        <span style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: s.dot, animation: 'ping 1.2s ease-out infinite', opacity: 0.6
        }} />
      )}
    </span>
  );
};

/* ══════════════════════════════════════════════════════════════════
   EQUIPMENT MODAL
══════════════════════════════════════════════════════════════════ */
function EquipmentModal({ equip, onClose, onSave }) {
  const [form, setForm] = useState({
    code: equip?.code || '', name: equip?.name || '',
    type: equip?.type || '', location: equip?.location || '',
    manufacturer: equip?.manufacturer || '', model: equip?.model || '',
    serialNumber: equip?.serialNumber || '',
    purchaseDate: equip?.purchaseDate?.slice(0, 10) || '',
    nextMaintenance: equip?.nextMaintenance?.slice(0, 10) || '',
    status: equip?.status || 'ACTIVE',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal title={equip ? `Modifier — ${equip.name}` : 'Nouvel équipement'} onClose={onClose} width={600}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label>
          <span className="form__label">Code</span>
          <input className="form__input" value={form.code} onChange={e => set('code', e.target.value)} placeholder="EQ-001" />
        </label>
        <label>
          <span className="form__label">Nom *</span>
          <input className="form__input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="ex: Tour CNC #1" />
        </label>
        <label>
          <span className="form__label">Type</span>
          <input className="form__input" value={form.type} onChange={e => set('type', e.target.value)} placeholder="ex: Machine-outil" />
        </label>
        <label>
          <span className="form__label">Localisation</span>
          <input className="form__input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="ex: Atelier A" />
        </label>
        <label>
          <span className="form__label">Fabricant</span>
          <input className="form__input" value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} />
        </label>
        <label>
          <span className="form__label">Modèle</span>
          <input className="form__input" value={form.model} onChange={e => set('model', e.target.value)} />
        </label>
        <label>
          <span className="form__label">N° de série</span>
          <input className="form__input" value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} />
        </label>
        <label>
          <span className="form__label">Date d'achat</span>
          <input className="form__input" type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} />
        </label>
        <label>
          <span className="form__label">Prochaine maintenance</span>
          <input className="form__input" type="date" value={form.nextMaintenance} onChange={e => set('nextMaintenance', e.target.value)} />
        </label>
        <label>
          <span className="form__label">Statut</span>
          <select className="form__input" value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(EQUIP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="btn btn--secondary" onClick={onClose}>Annuler</button>
        <button className="btn btn--primary" onClick={() => onSave(form)}>{equip ? 'Enregistrer' : 'Créer'}</button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════
   REQUEST MODAL
══════════════════════════════════════════════════════════════════ */
function RequestModal({ req, equipment, onClose, onSave }) {
  const [form, setForm] = useState({
    equipmentId: req?.equipmentId || '',
    title: req?.title || '',
    description: req?.description || '',
    type: req?.type || 'CORRECTIVE',
    priority: req?.priority || 'MEDIUM',
    status: req?.status || 'OPEN',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal title={req ? 'Modifier la demande' : 'Nouvelle demande de maintenance'} onClose={onClose}>
      <label style={{ marginBottom: 12, display: 'block' }}>
        <span className="form__label">Équipement *</span>
        <select className="form__input" value={form.equipmentId} onChange={e => set('equipmentId', e.target.value)}>
          <option value="">Sélectionner…</option>
          {equipment.map(e => <option key={e.id} value={e.id}>{e.name} — {e.code}</option>)}
        </select>
      </label>
      <label style={{ marginBottom: 12, display: 'block' }}>
        <span className="form__label">Titre *</span>
        <input className="form__input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="ex: Vibrations anormales" />
      </label>
      <label style={{ marginBottom: 12, display: 'block' }}>
        <span className="form__label">Description</span>
        <textarea className="form__input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Détails…" />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label>
          <span className="form__label">Type</span>
          <select className="form__input" value={form.type} onChange={e => set('type', e.target.value)}>
            {Object.entries(REQ_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label>
          <span className="form__label">Priorité</span>
          <select className="form__input" value={form.priority} onChange={e => set('priority', e.target.value)}>
            {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        {req && (
          <label style={{ gridColumn: '1/-1' }}>
            <span className="form__label">Statut</span>
            <select className="form__input" value={form.status} onChange={e => set('status', e.target.value)}>
              {Object.entries(REQ_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="btn btn--secondary" onClick={onClose}>Annuler</button>
        <button className="btn btn--primary" onClick={() => onSave(form)}>{req ? 'Enregistrer' : 'Signaler'}</button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ORDER MODAL
══════════════════════════════════════════════════════════════════ */
function OrderModal({ order, equipment, requests, onClose, onSave }) {
  const [form, setForm] = useState({
    equipmentId: order?.equipmentId || '',
    requestId: order?.requestId || '',
    title: order?.title || '',
    type: order?.type || 'CORRECTIVE',
    plannedDate: order?.plannedDate?.slice(0, 10) || '',
    estimatedHours: order?.estimatedHours || '',
    status: order?.status || 'PLANNED',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal title={order ? 'Modifier l\'ordre' : 'Nouvel ordre de maintenance'} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label style={{ gridColumn: '1/-1' }}>
          <span className="form__label">Titre *</span>
          <input className="form__input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="ex: Remplacement roulement" />
        </label>
        <label>
          <span className="form__label">Équipement *</span>
          <select className="form__input" value={form.equipmentId} onChange={e => set('equipmentId', e.target.value)}>
            <option value="">—</option>
            {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>
        <label>
          <span className="form__label">Demande liée</span>
          <select className="form__input" value={form.requestId} onChange={e => set('requestId', e.target.value)}>
            <option value="">— Aucune —</option>
            {requests.filter(r => r.status !== 'CLOSED').map(r => <option key={r.id} value={r.id}>{r.number} — {r.title}</option>)}
          </select>
        </label>
        <label>
          <span className="form__label">Type</span>
          <select className="form__input" value={form.type} onChange={e => set('type', e.target.value)}>
            {Object.entries(REQ_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label>
          <span className="form__label">Date planifiée</span>
          <input className="form__input" type="date" value={form.plannedDate} onChange={e => set('plannedDate', e.target.value)} />
        </label>
        <label>
          <span className="form__label">Heures estimées</span>
          <input className="form__input" type="number" value={form.estimatedHours} onChange={e => set('estimatedHours', e.target.value)} placeholder="0" />
        </label>
        {order && (
          <label>
            <span className="form__label">Statut</span>
            <select className="form__input" value={form.status} onChange={e => set('status', e.target.value)}>
              {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="btn btn--secondary" onClick={onClose}>Annuler</button>
        <button className="btn btn--primary" onClick={() => onSave(form)}>{order ? 'Enregistrer' : 'Créer l\'ordre'}</button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MACHINE CARD (Equipment grid)
══════════════════════════════════════════════════════════════════ */
function MachineCard({ equip, onEdit, onRequest, onDelete }) {
  const s        = EQUIP_STATUS[equip.status] || EQUIP_STATUS.ACTIVE;
  const days     = daysUntil(equip.nextMaintenance);
  const isUrgent = days !== null && days <= 7;
  const isOverdue= days !== null && days < 0;

  return (
    <div style={{
      background: '#1e293b',
      border: `1px solid ${equip.status === 'DOWN' ? '#ef444466' : '#334155'}`,
      borderRadius: 12,
      padding: '16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Status stripe */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: s.dot,
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9' }}>{equip.name}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{equip.code}{equip.location ? ` · ${equip.location}` : ''}</div>
        </div>
        {/* Traffic light */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {['ACTIVE', 'MAINTENANCE', 'DOWN'].map(st => (
            <div key={st} style={{
              width: 14, height: 14, borderRadius: '50%',
              background: equip.status === st ? EQUIP_STATUS[st].dot : '#1e293b',
              border: `2px solid ${equip.status === st ? EQUIP_STATUS[st].dot : '#334155'}`,
              boxShadow: equip.status === st ? `0 0 6px ${EQUIP_STATUS[st].dot}` : 'none',
              transition: 'all .3s',
            }} />
          ))}
        </div>
      </div>

      {/* Status badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: s.bg, borderRadius: 20, padding: '4px 12px', marginBottom: 12 }}>
        <StatusLight status={equip.status} size={8} />
        <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.label}</span>
      </div>

      {/* Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
        <div style={{ background: '#0f172a', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: .5 }}>Dernier entretien</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginTop: 2 }}>{fmtDate(equip.lastMaintenance)}</div>
        </div>
        <div style={{ background: isOverdue ? '#ef444411' : isUrgent ? '#f59e0b11' : '#0f172a', borderRadius: 8, padding: '8px 10px', border: isOverdue ? '1px solid #ef444433' : isUrgent ? '1px solid #f59e0b33' : 'none' }}>
          <div style={{ fontSize: 10, color: isOverdue ? '#ef4444' : isUrgent ? '#f59e0b' : '#475569', textTransform: 'uppercase', letterSpacing: .5 }}>Prochain entretien</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: isOverdue ? '#ef4444' : isUrgent ? '#f59e0b' : '#94a3b8', marginTop: 2 }}>
            {fmtDate(equip.nextMaintenance)}
            {days !== null && <span style={{ fontSize: 10, marginLeft: 4 }}>({isOverdue ? `${-days}j dépassé` : `J-${days}`})</span>}
          </div>
        </div>
      </div>

      {/* Manufacturer */}
      {equip.manufacturer && (
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 12 }}>
          {equip.manufacturer}{equip.model ? ` · ${equip.model}` : ''}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn--sm btn--secondary" style={{ flex: 1 }} onClick={onEdit}>
          <Settings size={12} /> Modifier
        </button>
        <button
          className="btn btn--sm"
          style={{ flex: 1, background: '#ef444411', color: '#ef4444', border: '1px solid #ef444433' }}
          onClick={onRequest}
        >
          <AlertTriangle size={12} /> Signaler
        </button>
        {onDelete && (
          <button
            className="btn btn--sm"
            style={{ background: '#ef444411', color: '#ef4444', border: '1px solid #ef444433', padding: '4px 8px' }}
            title="Supprimer"
            onClick={onDelete}
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAINTENANCE PAGE (MAIN)
══════════════════════════════════════════════════════════════════ */
export default function MaintenancePage() {
  const qc = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirm();
  const [tab, setTab] = useState('overview');
  const [modal, setModal] = useState(null);

  const inv = (...keys) => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));

  /* ── Queries */
  const { data: dash, refetch: refetchDash } = useQuery({
    queryKey: ['maint-dashboard'], queryFn: api.dashboard,
  });
  const { data: equipData }  = useQuery({ queryKey: ['equipment'],     queryFn: () => api.equipment() });
  const { data: reqData }    = useQuery({ queryKey: ['maint-requests'],queryFn: () => api.requests() });
  const { data: orderData }  = useQuery({ queryKey: ['maint-orders'],  queryFn: () => api.orders() });
  const { data: logsData }        = useQuery({ queryKey: ['maint-logs'],        queryFn: () => api.logs({ limit: 20 }) });
  const { data: reliabilityData } = useQuery({ queryKey: ['maint-reliability'], queryFn: api.reliability, enabled: tab === 'reliability' });

  const equipment   = equipData?.data        || [];
  const requests    = reqData?.data          || [];
  const orders      = orderData?.data        || [];
  const logs        = logsData?.data         || [];
  const reliability = reliabilityData?.data  || null;

  /* ── Mutations */
  const createEquip = useMutation({
    mutationFn: api.createEquip,
    onSuccess: () => { inv('equipment', 'maint-dashboard'); setModal(null); toast.success('Équipement créé'); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const updateEquip = useMutation({
    mutationFn: ({ id, data }) => api.updateEquip(id, data),
    onSuccess: () => { inv('equipment', 'maint-dashboard'); setModal(null); toast.success('Mis à jour'); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const deleteEquip = useMutation({
    mutationFn: api.deleteEquip,
    onSuccess: () => { inv('equipment', 'maint-dashboard'); toast.success('Équipement supprimé'); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const createReq = useMutation({
    mutationFn: api.createReq,
    onSuccess: () => { inv('maint-requests', 'maint-dashboard'); setModal(null); toast.success('Demande signalée'); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const updateReq = useMutation({
    mutationFn: ({ id, data }) => api.updateReq(id, data),
    onSuccess: () => { inv('maint-requests', 'maint-dashboard'); setModal(null); toast.success('Mis à jour'); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const deleteReq = useMutation({
    mutationFn: api.deleteReq,
    onSuccess: () => { inv('maint-requests', 'maint-dashboard'); toast.success('Demande supprimée'); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const createOrder = useMutation({
    mutationFn: api.createOrder,
    onSuccess: () => { inv('maint-orders', 'maint-dashboard'); setModal(null); toast.success('Ordre créé'); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const updateOrder = useMutation({
    mutationFn: ({ id, data }) => api.updateOrder(id, data),
    onSuccess: () => { inv('maint-orders', 'maint-dashboard'); setModal(null); toast.success('Mis à jour'); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const deleteOrder = useMutation({
    mutationFn: api.deleteOrder,
    onSuccess: () => { inv('maint-orders', 'maint-dashboard'); toast.success('Ordre supprimé'); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });

  /* ── Derived stats */
  const downEquip      = equipment.filter(e => e.status === 'DOWN');
  const maintEquip     = equipment.filter(e => e.status === 'MAINTENANCE');
  const activeEquip    = equipment.filter(e => e.status === 'ACTIVE');
  const availability   = equipment.length > 0 ? Math.round((activeEquip.length / equipment.length) * 100) : 100;
  const openReqs       = requests.filter(r => r.status === 'OPEN' || r.status === 'IN_PROGRESS');
  const criticalReqs   = requests.filter(r => r.priority === 'CRITICAL' && r.status !== 'RESOLVED' && r.status !== 'CLOSED');
  const upcomingMaint  = equipment
    .filter(e => e.nextMaintenance)
    .map(e => ({ ...e, daysLeft: daysUntil(e.nextMaintenance) }))
    .filter(e => e.daysLeft !== null && e.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const tabs = [
    { key: 'overview',     label: 'Vue d\'ensemble', icon: <Activity size={14} /> },
    { key: 'equipment',    label: 'Équipements',      icon: <Settings size={14} /> },
    { key: 'requests',     label: 'Demandes',          icon: <AlertTriangle size={14} /> },
    { key: 'orders',       label: 'Ordres',            icon: <Wrench size={14} /> },
    { key: 'history',      label: 'Historique',        icon: <FileText size={14} /> },
    { key: 'reliability',  label: 'MTBF / MTTR',       icon: <TrendingUp size={14} /> },
  ];

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#0f172a' }}>

      {/* ── Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
            🔧 Maintenance
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
            Supervision machines · Pannes · Interventions · Préventif
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--secondary" onClick={() => { refetchDash(); inv('equipment', 'maint-requests', 'maint-orders'); }}>
            <RefreshCw size={14} />
          </button>
          <button className="btn btn--secondary" onClick={() => setModal({ type: 'request' })}>
            <AlertTriangle size={14} /> Signaler
          </button>
          <button className="btn btn--primary" onClick={() => setModal({ type: 'equip' })}>
            <Plus size={14} /> Équipement
          </button>
        </div>
      </div>

      {/* ── Machine-down ALERT BANNER */}
      {downEquip.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #ef444422, #ef444411)',
          border: '1px solid #ef444466',
          borderRadius: 12,
          padding: '14px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <ShieldAlert size={20} color="#ef4444" />
            <span style={{ color: '#ef4444', fontWeight: 800, fontSize: 14 }}>
              ALERTE — {downEquip.length} machine{downEquip.length > 1 ? 's' : ''} EN PANNE
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {downEquip.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ef444422', border: '1px solid #ef444433', borderRadius: 8, padding: '4px 12px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ color: '#fca5a5', fontSize: 12, fontWeight: 600 }}>{e.name}</span>
                {e.location && <span style={{ color: '#ef4444', fontSize: 11 }}>· {e.location}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          {
            icon: <BarChart2 size={18} />,
            label: 'Disponibilité',
            value: `${availability}%`,
            color: availability >= 90 ? '#10b981' : availability >= 75 ? '#f59e0b' : '#ef4444',
            sub: `${activeEquip.length}/${equipment.length} machines opérationnelles`,
            bar: true,
            pct: availability,
          },
          {
            icon: <Zap size={18} />,
            label: 'Pannes actives',
            value: downEquip.length,
            color: downEquip.length === 0 ? '#10b981' : '#ef4444',
            sub: downEquip.length === 0 ? 'Aucune panne en cours' : `${maintEquip.length} en maintenance`,
          },
          {
            icon: <AlertTriangle size={18} />,
            label: 'Demandes ouvertes',
            value: openReqs.length,
            color: criticalReqs.length > 0 ? '#ef4444' : '#f59e0b',
            sub: `${criticalReqs.length} critique${criticalReqs.length !== 1 ? 's' : ''}`,
          },
          {
            icon: <CheckCircle size={18} />,
            label: 'Interventions (mois)',
            value: orders.filter(o => o.status === 'COMPLETED' && new Date(o.updatedAt) > new Date(Date.now() - 30 * 86400000)).length,
            color: '#6366f1',
            sub: `${orders.filter(o => o.status === 'IN_PROGRESS').length} en cours`,
          },
        ].map((k, i) => (
          <div key={i} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, background: k.color + '22', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, flexShrink: 0 }}>
                {k.icon}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>{k.label}</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: k.color, lineHeight: 1, marginBottom: 4 }}>{k.value}</div>
            {k.bar && (
              <div style={{ background: '#0f172a', borderRadius: 99, height: 5, margin: '6px 0', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${k.pct}%`, background: k.color, borderRadius: 99 }} />
              </div>
            )}
            <div style={{ fontSize: 11, color: '#64748b' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #1e293b', paddingBottom: 2 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: '8px 8px 0 0',
            background: tab === t.key ? '#1e293b' : 'transparent',
            border: 'none', borderBottom: tab === t.key ? '2px solid #f59e0b' : '2px solid transparent',
            color: tab === t.key ? '#f59e0b' : '#64748b', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'all .2s',
          }}>
            {t.icon} {t.label}
            {t.key === 'requests' && openReqs.length > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 800 }}>
                {openReqs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          TAB: OVERVIEW
      ══════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          {/* Left: Machine status grid */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
                État des machines ({equipment.length})
              </h3>
              <button className="btn btn--sm btn--secondary" onClick={() => setTab('equipment')}>
                Voir tout <ChevronRight size={12} />
              </button>
            </div>
            {equipment.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                <Settings size={36} style={{ marginBottom: 10, opacity: 0.3 }} />
                <p style={{ fontSize: 13 }}>Aucun équipement. Ajoutez vos machines.</p>
                <button className="btn btn--primary" style={{ marginTop: 8 }} onClick={() => setModal({ type: 'equip' })}>
                  <Plus size={13} /> Ajouter
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {equipment.slice(0, 8).map(e => (
                  <MachineCard
                    key={e.id}
                    equip={e}
                    onEdit={() => setModal({ type: 'equip', data: e })}
                    onRequest={() => setModal({ type: 'request', equipId: e.id })}
                    onDelete={async () => { const ok = await confirm({ title: `Supprimer "${e.name}" ?`, confirmLabel: 'Supprimer', variant: 'danger' }); if (ok) deleteEquip.mutate(e.id); }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right panel: alerts + upcoming */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Critical alerts */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldAlert size={14} color="#ef4444" /> Alertes critiques
                </h4>
                <button className="btn btn--sm btn--secondary" onClick={() => setModal({ type: 'request' })}>
                  <Plus size={12} />
                </button>
              </div>
              {criticalReqs.length === 0 && downEquip.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#10b981', fontSize: 13 }}>
                  <CheckCircle size={20} style={{ marginBottom: 6 }} />
                  <div>Aucune alerte active</div>
                </div>
              ) : (
                <div>
                  {downEquip.map(e => (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ef444411', border: '1px solid #ef444433', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5' }}>{e.name}</div>
                        <div style={{ fontSize: 11, color: '#ef4444' }}>Machine en panne</div>
                      </div>
                      <button
                        className="btn btn--sm"
                        style={{ background: '#ef444422', color: '#ef4444', border: 'none', padding: '3px 8px', fontSize: 11 }}
                        onClick={() => setModal({ type: 'request', equipId: e.id })}
                      >
                        Intervenir
                      </button>
                    </div>
                  ))}
                  {criticalReqs.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f59e0b11', border: '1px solid #f59e0b33', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fde68a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                        <div style={{ fontSize: 11, color: '#f59e0b' }}>{r.equipment?.name} · {r.number}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming maintenance */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '16px', flex: 1 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} color="#6366f1" /> Maintenance préventive
              </h4>
              {upcomingMaint.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#475569', fontSize: 12 }}>
                  Aucune échéance dans les 30 jours
                </div>
              ) : (
                upcomingMaint.map(e => {
                  const isLate  = e.daysLeft < 0;
                  const isClose = e.daysLeft <= 3;
                  const color   = isLate ? '#ef4444' : isClose ? '#f59e0b' : '#6366f1';
                  return (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '8px 10px', background: '#0f172a', borderRadius: 8 }}>
                      <div style={{ width: 36, height: 36, background: color + '22', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color }}>{isLate ? `-${-e.daysLeft}` : `J-${e.daysLeft}`}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{fmtDate(e.nextMaintenance)}</div>
                      </div>
                      <button
                        className="btn btn--sm"
                        style={{ background: color + '22', color, border: `1px solid ${color}33`, padding: '3px 8px', fontSize: 11 }}
                        onClick={() => setModal({ type: 'order', equipId: e.id })}
                      >
                        Planifier
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: EQUIPMENT
      ══════════════════════════════════════════ */}
      {tab === 'equipment' && (
        <div>
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {Object.entries(EQUIP_STATUS).map(([k, v]) => {
              const count = equipment.filter(e => e.status === k).length;
              return count > 0 ? (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, background: v.bg, border: `1px solid ${v.dot}33`, borderRadius: 20, padding: '4px 12px' }}>
                  <StatusLight status={k} size={8} />
                  <span style={{ fontSize: 12, color: v.color, fontWeight: 600 }}>{v.label}</span>
                  <span style={{ fontSize: 11, color: v.color, fontWeight: 800 }}>{count}</span>
                </div>
              ) : null;
            })}
            <button className="btn btn--primary btn--sm" style={{ marginLeft: 'auto' }} onClick={() => setModal({ type: 'equip' })}>
              <Plus size={13} /> Ajouter
            </button>
          </div>
          {equipment.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <Settings size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p>Aucun équipement enregistré.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {equipment.map(e => (
                <MachineCard
                  key={e.id}
                  equip={e}
                  onEdit={() => setModal({ type: 'equip', data: e })}
                  onRequest={() => setModal({ type: 'request', equipId: e.id })}
                  onDelete={async () => { const ok = await confirm({ title: `Supprimer "${e.name}" ?`, confirmLabel: 'Supprimer', variant: 'danger' }); if (ok) deleteEquip.mutate(e.id); }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: REQUESTS
      ══════════════════════════════════════════ */}
      {tab === 'requests' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn--primary" onClick={() => setModal({ type: 'request' })}>
              <Plus size={14} /> Nouvelle demande
            </button>
          </div>
          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <AlertTriangle size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p>Aucune demande.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {requests.map(r => {
                const pri  = PRIORITY[r.priority] || { label: r.priority, color: '#64748b' };
                const stat = REQ_STATUS[r.status] || { label: r.status, color: '#64748b' };
                const typ  = REQ_TYPE[r.type]     || { label: r.type, color: '#64748b' };
                return (
                  <div key={r.id} style={{ background: '#1e293b', border: `1px solid ${r.priority === 'CRITICAL' ? '#ef444444' : '#334155'}`, borderLeft: `4px solid ${pri.color}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 700 }}>{r.number}</span>
                        <span style={{ fontSize: 11, background: typ.color + '22', color: typ.color, borderRadius: 20, padding: '1px 8px', fontWeight: 600 }}>{typ.label}</span>
                        <span style={{ fontSize: 11, background: pri.color + '22', color: pri.color, borderRadius: 20, padding: '1px 8px', fontWeight: 600 }}>{pri.label}</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {r.equipment?.name && <span>{r.equipment.name} · </span>}
                        {fmtDateTime(r.reportedAt)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, background: stat.color + '22', color: stat.color, borderRadius: 20, padding: '3px 10px', fontWeight: 600 }}>{stat.label}</span>
                      <button className="btn btn--sm btn--secondary" onClick={() => setModal({ type: 'request', data: r })}>Modifier</button>
                      <button className="btn btn--sm" style={{ background: '#ef444411', color: '#ef4444', border: '1px solid #ef444433', padding: '4px 8px' }}
                        title="Supprimer" onClick={async () => { const ok = await confirm({ title: 'Supprimer cette demande ?', confirmLabel: 'Supprimer', variant: 'danger' }); if (ok) deleteReq.mutate(r.id); }}>
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: ORDERS
      ══════════════════════════════════════════ */}
      {tab === 'orders' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn--primary" onClick={() => setModal({ type: 'order' })}>
              <Plus size={14} /> Nouvel ordre
            </button>
          </div>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <Wrench size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p>Aucun ordre de maintenance.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
              {orders.map(o => {
                const stat = ORDER_STATUS[o.status] || { label: o.status, color: '#64748b' };
                const typ  = REQ_TYPE[o.type]       || { label: o.type, color: '#64748b' };
                return (
                  <div key={o.id} style={{ background: '#1e293b', border: `1px solid ${stat.color}33`, borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 700 }}>{o.number}</span>
                      <span style={{ fontSize: 11, background: stat.color + '22', color: stat.color, borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>{stat.label}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{o.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                      <span style={{ background: typ.color + '22', color: typ.color, borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 600, marginRight: 8 }}>{typ.label}</span>
                      {o.equipment?.name}
                      {o.plannedDate && <span style={{ marginLeft: 8 }}>📅 {fmtDate(o.plannedDate)}</span>}
                    </div>
                    {o.estimatedHours && (
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                        ⏱ {o.estimatedHours}h estimées
                        {o.actualHours ? ` · ${o.actualHours}h réelles` : ''}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn--sm btn--secondary" style={{ flex: 1 }} onClick={() => setModal({ type: 'order', data: o })}>
                        Modifier
                      </button>
                      <button className="btn btn--sm" style={{ background: '#ef444411', color: '#ef4444', border: '1px solid #ef444433', padding: '4px 8px' }}
                        title="Supprimer" onClick={async () => { const ok = await confirm({ title: 'Supprimer cet ordre ?', confirmLabel: 'Supprimer', variant: 'danger' }); if (ok) deleteOrder.mutate(o.id); }}>
                        <X size={12} />
                      </button>
                      {o.status === 'PLANNED' && (
                        <button
                          className="btn btn--sm"
                          style={{ flex: 1, background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b33' }}
                          onClick={() => updateOrder.mutate({ id: o.id, data: { status: 'IN_PROGRESS' } })}
                        >
                          <Play size={12} /> Démarrer
                        </button>
                      )}
                      {o.status === 'IN_PROGRESS' && (
                        <button
                          className="btn btn--sm"
                          style={{ flex: 1, background: '#10b98122', color: '#10b981', border: '1px solid #10b98133' }}
                          onClick={() => updateOrder.mutate({ id: o.id, data: { status: 'COMPLETED' } })}
                        >
                          <CheckCircle size={12} /> Terminer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: HISTORY
      ══════════════════════════════════════════ */}
      {tab === 'history' && (
        <div>
          <h3 style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
            Journal des interventions (20 dernières)
          </h3>
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <FileText size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p>Aucune entrée dans l'historique.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderLeft: '2px solid #1e293b', paddingLeft: 20 }}>
              {logs.map((log, i) => (
                <div key={log.id || i} style={{ position: 'relative', paddingBottom: 16 }}>
                  {/* Timeline dot */}
                  <div style={{ position: 'absolute', left: -27, top: 4, width: 10, height: 10, borderRadius: '50%', background: '#334155', border: '2px solid #0f172a' }} />
                  <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{log.action}</span>
                      <span style={{ fontSize: 11, color: '#475569' }}>{fmtDateTime(log.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {log.equipment?.name && <span style={{ color: '#94a3b8', fontWeight: 600 }}>{log.equipment.name} — </span>}
                      {log.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: RELIABILITY (MTBF / MTTR)
      ══════════════════════════════════════════ */}
      {tab === 'reliability' && (
        <div>
          {/* KPIs globaux */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'MTBF Global', value: reliability?.globalMtbf != null ? `${reliability.globalMtbf} h` : '—', sub: 'Temps moyen entre pannes', color: '#6366f1', icon: '⏱️' },
              { label: 'MTTR Global', value: reliability?.globalMttr != null ? `${reliability.globalMttr} h` : '—', sub: 'Temps moyen de réparation', color: '#f59e0b', icon: '🔧' },
              { label: 'Disponibilité', value: reliability?.equipment?.length > 0
                  ? (() => { const withA = reliability.equipment.filter(e => e.availability != null); return withA.length > 0 ? `${Math.round(withA.reduce((s,e) => s + e.availability, 0) / withA.length * 10)/10} %` : '—'; })()
                  : '—', sub: 'MTBF / (MTBF + MTTR)', color: '#10b981', icon: '✅' },
            ].map(k => (
              <div key={k.label} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginTop: 2 }}>{k.label}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Formules */}
          <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#a5b4fc', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <span>📐 <strong>MTBF</strong> = Temps opérationnel ÷ Nombre de pannes</span>
            <span>📐 <strong>MTTR</strong> = Σ(Temps réparation) ÷ Nombre de réparations</span>
            <span>📐 <strong>Disponibilité</strong> = MTBF ÷ (MTBF + MTTR) × 100</span>
          </div>

          {/* Tableau par équipement */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  {['Équipement', 'Code', 'Pannes', 'Résolues', 'MTBF (h)', 'MTTR (h)', 'Disponibilité'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!reliability ? (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Chargement...</td></tr>
                ) : reliability.equipment?.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Aucun équipement</td></tr>
                ) : reliability.equipment?.map(eq => (
                  <tr key={eq.equipmentId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{eq.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{eq.code}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: eq.failureCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.1)', color: eq.failureCount > 0 ? '#f87171' : '#34d399', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
                        {eq.failureCount}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{eq.resolvedCount}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#6366f1' }}>
                      {eq.mtbf != null ? eq.mtbf : <span style={{ color: '#475569' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>
                      {eq.mttr != null ? eq.mttr : <span style={{ color: '#475569' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {eq.availability != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#0f172a', borderRadius: 3, overflow: 'hidden', maxWidth: 80 }}>
                            <div style={{ height: '100%', width: `${Math.min(eq.availability, 100)}%`, background: eq.availability >= 90 ? '#10b981' : eq.availability >= 70 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: eq.availability >= 90 ? '#10b981' : eq.availability >= 70 ? '#f59e0b' : '#ef4444' }}>
                            {eq.availability} %
                          </span>
                        </div>
                      ) : <span style={{ color: '#475569', fontSize: 12 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, fontSize: 11, color: '#475569', textAlign: 'center' }}>
            * Basé sur les demandes de type Panne/Correctif avec date de résolution enregistrée
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════ */}
      {modal?.type === 'equip' && (
        <EquipmentModal
          equip={modal.data}
          onClose={() => setModal(null)}
          onSave={(form) => {
            if (modal.data) updateEquip.mutate({ id: modal.data.id, data: form });
            else createEquip.mutate(form);
          }}
        />
      )}
      {modal?.type === 'request' && (
        <RequestModal
          req={modal.data}
          equipment={equipment}
          onClose={() => setModal(null)}
          onSave={(form) => {
            const data = modal.equipId ? { ...form, equipmentId: modal.equipId } : form;
            if (modal.data) updateReq.mutate({ id: modal.data.id, data });
            else createReq.mutate(data);
          }}
        />
      )}
      {modal?.type === 'order' && (
        <OrderModal
          order={modal.data}
          equipment={equipment}
          requests={requests}
          onClose={() => setModal(null)}
          onSave={(form) => {
            const data = modal.equipId ? { ...form, equipmentId: modal.equipId } : form;
            if (modal.data) updateOrder.mutate({ id: modal.data.id, data });
            else createOrder.mutate(data);
          }}
        />
      )}

      {/* Ping animation style */}
      <style>{`
        @keyframes ping {
          0%   { transform: scale(1);   opacity: .6; }
          75%  { transform: scale(2.2); opacity: 0;  }
          100% { transform: scale(2.2); opacity: 0;  }
        }
      `}</style>
      {confirmModal}
    </div>
  );
}
