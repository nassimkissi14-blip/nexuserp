import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Cpu, Edit2, Trash2, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../api/client.js';
import AnimatedPage from '../../components/ui/AnimatedPage.jsx';
import { useConfirm } from '../../components/ui/ConfirmModal.jsx';
import {
  PageHeader, Btn, Modal, FormGrid, FormActions,
  Field, Input, Select, EmptyState, Badge, Card, KpiCard, ProgressBar
} from '../../components/ui/DesignSystem.jsx';

/* ── API ─────────────────────────────────────── */
const api = {
  workcenters: ()      => apiClient.get('/production/workcenters'),
  createWC:    (d)     => apiClient.post('/production/workcenters', d),
  updateWC:    (id, d) => apiClient.patch(`/production/workcenters/${id}`, d),
  deleteWC:    (id)    => apiClient.delete(`/production/workcenters/${id}`),
  orders:      ()      => apiClient.get('/production/orders', { params: { status: 'IN_PROGRESS' } }),
};

const WC_STATUS = {
  ACTIVE:      { label: 'Actif',        color: '#10b981' },
  MAINTENANCE: { label: 'Maintenance',  color: '#f59e0b' },
  INACTIVE:    { label: 'Inactif',      color: '#64748b' },
};
const WC_TYPES = ['ASSEMBLY', 'MACHINING', 'WELDING', 'PAINTING', 'PACKAGING', 'QUALITY', 'OTHER'];
const WC_TYPE_LABELS = {
  ASSEMBLY: 'Assemblage', MACHINING: 'Usinage', WELDING: 'Soudure',
  PAINTING: 'Peinture', PACKAGING: 'Emballage', QUALITY: 'Contrôle qualité', OTHER: 'Autre',
};
const WC_TYPE_ICONS = {
  ASSEMBLY: '🔩', MACHINING: '⚙️', WELDING: '🔥', PAINTING: '🎨',
  PACKAGING: '📦', QUALITY: '🔍', OTHER: '🏭',
};

/* ── FORM MODAL ─────────────────────────────── */
function WCModal({ wc, onClose, onSave, loading }) {
  const [form, setForm] = useState({
    code:     wc?.code     || '',
    name:     wc?.name     || '',
    type:     wc?.type     || 'ASSEMBLY',
    capacity: wc?.capacity || 8,
    status:   wc?.status   || 'ACTIVE',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal title={wc ? `Modifier — ${wc.name}` : 'Nouveau poste de charge'} onClose={onClose} width={520}>
      <FormGrid cols={2}>
        <Field label="Code du poste">
          <Input value={form.code} onChange={e => set('code', e.target.value)} placeholder="ex: WC-01" />
        </Field>
        <Field label="Nom *">
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="ex: Soudure TIG" />
        </Field>
        <Field label="Type d'opération">
          <Select value={form.type} onChange={e => set('type', e.target.value)}>
            {WC_TYPES.map(t => <option key={t} value={t}>{WC_TYPE_ICONS[t]} {WC_TYPE_LABELS[t]}</option>)}
          </Select>
        </Field>
        <Field label="Capacité (heures / jour)">
          <Input type="number" value={form.capacity} onChange={e => set('capacity', e.target.value)} min="1" max="24" />
        </Field>
        <Field label="Statut" span={2}>
          <Select value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(WC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
      </FormGrid>
      <FormActions>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn variant="primary" loading={loading} onClick={() => onSave(form)}>
          {wc ? 'Enregistrer' : 'Créer le poste'}
        </Btn>
      </FormActions>
    </Modal>
  );
}

/* ── WORK CENTER CARD ───────────────────────── */
function WCCard({ wc, activeOrders, onEdit, onDelete }) {
  const s       = WC_STATUS[wc.status] || WC_STATUS.ACTIVE;
  const load    = activeOrders.filter(o =>
    o.operations?.some(op => op.workCenterId === wc.id && op.status === 'IN_PROGRESS')
  ).length;
  const loadPct = Math.min(100, Math.round((load * 8 / Math.max(1, wc.capacity)) * 100));
  const barColor = loadPct > 90 ? '#ef4444' : loadPct > 70 ? '#f59e0b' : '#10b981';

  return (
    <Card style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Top accent stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.color }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 6, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 46, height: 46, background: s.color + '22', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            {WC_TYPE_ICONS[wc.type] || '🏭'}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{wc.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {wc.code && <span style={{ marginRight: 6 }}>{wc.code}</span>}
              {WC_TYPE_LABELS[wc.type] || wc.type}
            </div>
          </div>
        </div>
        <Badge color={s.color}>{s.label}</Badge>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '10px 12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--text-muted)', marginBottom: 3, fontWeight: 700 }}>Capacité</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-primary)' }}>{wc.capacity}<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>h/j</span></div>
        </div>
        <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '10px 12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--text-muted)', marginBottom: 3, fontWeight: 700 }}>Charge</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: barColor }}>{loadPct}<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 1 }}>%</span></div>
        </div>
      </div>

      {/* Utilisation bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Utilisation</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: barColor }}>{load} OF actif{load !== 1 ? 's' : ''}</span>
        </div>
        <ProgressBar value={loadPct} max={100} color={barColor} height={7} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn variant="secondary" size="sm" style={{ flex: 1 }} icon={<Edit2 size={12} />} onClick={onEdit}>
          Modifier
        </Btn>
        <Btn variant="secondary" size="sm" icon={<Trash2 size={12} />} onClick={onDelete}
          style={{ color: 'var(--accent-danger)' }} />
      </div>
    </Card>
  );
}

/* ── MAIN PAGE ──────────────────────────────── */
export default function WorkCentersPage() {
  const qc = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirm();
  const [modal, setModal] = useState(null);

  const inv = () => qc.invalidateQueries({ queryKey: ['prod-wc'] });

  const { data: wcRes, isLoading } = useQuery({ queryKey: ['prod-wc'],    queryFn: api.workcenters });
  const { data: ordersRes }        = useQuery({ queryKey: ['prod-orders'], queryFn: api.orders });

  const workcenters  = wcRes?.data    || [];
  const activeOrders = ordersRes?.data || [];

  const createWC = useMutation({
    mutationFn: api.createWC,
    onSuccess: () => { inv(); setModal(null); toast.success('Poste créé'); },
    onError:   e  => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const updateWC = useMutation({
    mutationFn: ({ id, data }) => api.updateWC(id, data),
    onSuccess: () => { inv(); setModal(null); toast.success('Poste mis à jour'); },
    onError:   e  => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const deleteWC = useMutation({
    mutationFn: api.deleteWC,
    onSuccess: () => { inv(); toast.success('Poste supprimé'); },
    onError:   e  => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const activeWC  = workcenters.filter(w => w.status === 'ACTIVE').length;
  const maintWC   = workcenters.filter(w => w.status === 'MAINTENANCE').length;
  const totalCap  = workcenters.reduce((s, w) => s + (w.capacity || 0), 0);
  const avgLoad   = workcenters.length > 0 ? Math.round(
    workcenters.reduce((s, w) => {
      const load = activeOrders.filter(o => o.operations?.some(op => op.workCenterId === w.id && op.status === 'IN_PROGRESS')).length;
      return s + Math.min(100, Math.round((load * 8 / Math.max(1, w.capacity)) * 100));
    }, 0) / workcenters.length
  ) : 0;

  return (
    <AnimatedPage>
      <div className="erp-page">

        <PageHeader
          icon="⚙️"
          title="Postes de charge"
          subtitle="Gérez vos centres de travail, capacités et taux d'utilisation"
          actions={
            <Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>
              Nouveau poste
            </Btn>
          }
        />

        {/* KPIs */}
        <div className="erp-kpi-grid">
          {[
            { icon: <Cpu size={18} />,        label: 'Total postes',    value: workcenters.length, sub: 'centres de travail',       color: '#6366f1' },
            { icon: <CheckCircle size={18} />, label: 'Opérationnels',   value: activeWC,           sub: 'postes disponibles',       color: '#10b981' },
            { icon: <Zap size={18} />,         label: 'Capacité totale', value: `${totalCap}h`,     sub: 'heures disponibles / jour', color: '#f59e0b' },
            { icon: <AlertTriangle size={18}/>, label: 'Charge moy.',    value: `${avgLoad}%`,      sub: maintWC > 0 ? `${maintWC} en maintenance` : 'utilisation actuelle', color: avgLoad > 80 ? '#ef4444' : '#6366f1' },
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

        {/* Content */}
        {isLoading ? (
          <div className="dashboard-loading"><div className="spinner" /><span>Chargement…</span></div>
        ) : workcenters.length === 0 ? (
          <EmptyState
            icon="⚙️"
            title="Aucun poste de charge"
            description="Définissez vos ateliers et centres de travail pour planifier la production."
            action={<Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>Créer le premier poste</Btn>}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {workcenters.map(wc => (
              <WCCard
                key={wc.id}
                wc={wc}
                activeOrders={activeOrders}
                onEdit={() => setModal({ type: 'edit', data: wc })}
                onDelete={async () => {
                  const ok = await confirm({ title: `Supprimer le poste "${wc.name}" ?`, confirmLabel: 'Supprimer', variant: 'danger' });
                  if (ok) deleteWC.mutate(wc.id);
                }}
              />
            ))}
          </div>
        )}

        {/* Modal */}
        {(modal?.type === 'create' || modal?.type === 'edit') && (
          <WCModal
            wc={modal.data}
            loading={createWC.isPending || updateWC.isPending}
            onClose={() => setModal(null)}
            onSave={(form) => {
              if (modal.data) updateWC.mutate({ id: modal.data.id, data: form });
              else createWC.mutate(form);
            }}
          />
        )}
      </div>
      {confirmModal}
    </AnimatedPage>
  );
}
