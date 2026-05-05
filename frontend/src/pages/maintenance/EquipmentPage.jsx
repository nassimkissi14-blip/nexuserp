import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Settings, Edit2, Trash2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../api/client.js';
import AnimatedPage from '../../components/ui/AnimatedPage.jsx';
import {
  PageHeader, Btn, Modal, FormGrid, FormActions,
  Field, Input, Select, Textarea, EmptyState, Badge,
  Card, AlertBanner, KpiCard
} from '../../components/ui/DesignSystem.jsx';

/* ── API ─────────────────────────────────────── */
const api = {
  equipment:   (p)     => apiClient.get('/maintenance/equipment', { params: p }),
  createEquip: (d)     => apiClient.post('/maintenance/equipment', d),
  updateEquip: (id, d) => apiClient.patch(`/maintenance/equipment/${id}`, d),
  deleteEquip: (id)    => apiClient.delete(`/maintenance/equipment/${id}`),
};

const EQUIP_STATUS = {
  ACTIVE:      { label: 'Opérationnel', color: '#10b981' },
  DOWN:        { label: 'En panne',     color: '#ef4444' },
  MAINTENANCE: { label: 'Maintenance',  color: '#f59e0b' },
  RETIRED:     { label: 'Retraité',     color: '#64748b' },
};

const FREQ_OPTIONS = [
  { value: '',          label: '— Non définie —' },
  { value: 'DAILY',     label: 'Quotidienne',              days: 1   },
  { value: 'WEEKLY',    label: 'Hebdomadaire (1×/semaine)', days: 7   },
  { value: 'BIWEEKLY',  label: 'Bihebdomadaire (2×/semaine)', days: 3.5 },
  { value: 'MONTHLY',   label: 'Mensuelle (1×/mois)',      days: 30  },
  { value: 'QUARTERLY', label: 'Trimestrielle (1×/trimestre)', days: 90  },
  { value: 'BIANNUAL',  label: 'Semestrielle (2×/an)',     days: 182 },
  { value: 'ANNUAL',    label: 'Annuelle (1×/an)',         days: 365 },
  { value: 'CUSTOM',    label: 'Personnalisée (intervalle en jours)', days: null },
];

const FREQ_LABEL = Object.fromEntries(FREQ_OPTIONS.filter(o => o.value).map(o => [o.value, o.label]));

function freqSummary(equip) {
  if (!equip.maintenanceFrequency) return null;
  const opt = FREQ_OPTIONS.find(o => o.value === equip.maintenanceFrequency);
  let txt = opt?.label || equip.maintenanceFrequency;
  if (equip.maintenanceFrequency === 'CUSTOM' && equip.maintenanceIntervalDays)
    txt = `Tous les ${equip.maintenanceIntervalDays} jours`;
  const taskCount = Array.isArray(equip.maintenanceTasks) ? equip.maintenanceTasks.length : 0;
  if (taskCount > 0) txt += ` · ${taskCount} tâche${taskCount > 1 ? 's' : ''}`;
  return txt;
}

const fmtDate   = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const daysUntil = d => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;

/* ── EQUIPMENT FORM ─────────────────────────── */
function EquipmentModal({ equip, onClose, onSave, loading }) {
  const [form, setForm] = useState({
    code:                    equip?.code                     || '',
    name:                    equip?.name                     || '',
    type:                    equip?.type                     || '',
    location:                equip?.location                 || '',
    manufacturer:            equip?.manufacturer             || '',
    model:                   equip?.model                    || '',
    serialNumber:            equip?.serialNumber             || '',
    purchaseDate:            equip?.purchaseDate?.slice(0, 10)    || '',
    nextMaintenance:         equip?.nextMaintenance?.slice(0, 10) || '',
    status:                  equip?.status                   || 'ACTIVE',
    maintenanceFrequency:    equip?.maintenanceFrequency     || '',
    maintenanceIntervalDays: equip?.maintenanceIntervalDays  != null ? String(equip.maintenanceIntervalDays) : '',
    maintenanceTasks:        Array.isArray(equip?.maintenanceTasks) ? equip.maintenanceTasks : [],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [newTask, setNewTask] = useState('');
  const taskInputRef = useRef(null);

  const addTask = () => {
    const t = newTask.trim();
    if (!t) return;
    set('maintenanceTasks', [...form.maintenanceTasks, t]);
    setNewTask('');
    taskInputRef.current?.focus();
  };
  const removeTask = (i) => set('maintenanceTasks', form.maintenanceTasks.filter((_, idx) => idx !== i));

  // When frequency changes, reset nextMaintenance to today so cron fires immediately
  const handleFreqChange = (freq) => {
    set('maintenanceFrequency', freq);
    if (freq) {
      set('nextMaintenance', new Date().toISOString().slice(0, 10));
    }
  };

  return (
    <Modal title={equip ? `Modifier — ${equip.name}` : 'Nouvel équipement'} onClose={onClose} width={680}>
      {/* ── Identification ── */}
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 10, marginTop: 4 }}>Identification</div>
      <FormGrid cols={2}>
        <Field label="Code machine">
          <Input value={form.code} onChange={e => set('code', e.target.value)} placeholder="EQ-001" />
        </Field>
        <Field label="Nom de l'équipement *">
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="ex: Tour CNC #1" />
        </Field>
        <Field label="Type / Catégorie">
          <Input value={form.type} onChange={e => set('type', e.target.value)} placeholder="ex: Machine-outil" />
        </Field>
        <Field label="Localisation">
          <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="ex: Atelier A - Ligne 2" />
        </Field>
        <Field label="Fabricant">
          <Input value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} placeholder="ex: HAAS" />
        </Field>
        <Field label="Modèle">
          <Input value={form.model} onChange={e => set('model', e.target.value)} placeholder="ex: VF-2" />
        </Field>
        <Field label="Numéro de série">
          <Input value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} />
        </Field>
        <Field label="Date d'achat">
          <Input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} />
        </Field>
        <Field label="Statut opérationnel" style={{ gridColumn: 'span 2' }}>
          <Select value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(EQUIP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
      </FormGrid>

      {/* ── Plan de maintenance préventive ── */}
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', margin: '20px 0 10px' }}>
        🔄 Plan de maintenance préventive
      </div>
      <FormGrid cols={2}>
        <Field label="Fréquence de maintenance" style={{ gridColumn: 'span 2' }}>
          <Select value={form.maintenanceFrequency} onChange={e => handleFreqChange(e.target.value)}>
            {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>

        {form.maintenanceFrequency === 'CUSTOM' && (
          <Field label="Intervalle entre maintenances (jours) *">
            <Input
              type="number" min="1" value={form.maintenanceIntervalDays}
              onChange={e => set('maintenanceIntervalDays', e.target.value)}
              placeholder="ex: 45"
            />
          </Field>
        )}

        <Field label="Prochaine maintenance préventive" style={{ gridColumn: 'span 2' }}>
          <Input type="date" value={form.nextMaintenance} onChange={e => set('nextMaintenance', e.target.value)} />
        </Field>
      </FormGrid>

      {/* ── Tâches à effectuer (checklist) ── */}
      {form.maintenanceFrequency && (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', margin: '20px 0 10px' }}>
            ✅ Tâches à effectuer à chaque visite
          </div>

          {/* Liste existante */}
          {form.maintenanceTasks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {form.maintenanceTasks.map((task, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                  <span style={{ width: 20, height: 20, borderRadius: 4, border: '2px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{task}</span>
                  <button onClick={() => removeTask(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Ajouter une tâche */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={taskInputRef}
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTask())}
              placeholder="ex: Lubrification des axes, Vérification tension courroie…"
              style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit' }}
            />
            <button onClick={addTask} disabled={!newTask.trim()}
              style={{ background: '#6366f1', border: 'none', borderRadius: 8, padding: '8px 16px', color: 'white', fontSize: 13, fontWeight: 700, cursor: newTask.trim() ? 'pointer' : 'not-allowed', opacity: newTask.trim() ? 1 : 0.5, fontFamily: 'inherit' }}>
              + Ajouter
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>Appuie sur Entrée ou clique + Ajouter. Ces tâches seront incluses dans chaque demande automatique.</div>
        </>
      )}

      <FormActions>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn variant="primary" loading={loading} onClick={() => onSave(form)}>
          {equip ? 'Enregistrer les modifications' : 'Créer l\'équipement'}
        </Btn>
      </FormActions>
    </Modal>
  );
}

/* ── MACHINE CARD ───────────────────────────── */
function MachineCard({ equip, onEdit, onDelete }) {
  const s       = EQUIP_STATUS[equip.status] || EQUIP_STATUS.ACTIVE;
  const days    = daysUntil(equip.nextMaintenance);
  const isLate  = days !== null && days < 0;
  const isClose = days !== null && days <= 7 && days >= 0;

  return (
    <Card style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Status stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.color }} />

      {/* Pulsing indicator for DOWN */}
      {equip.status === 'DOWN' && (
        <div style={{ position: 'absolute', top: 14, right: 14 }}>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'block' }} />
            <span style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: '2px solid #ef4444', animation: 'erp-ping 1.4s ease-out infinite', display: 'block' }} />
          </span>
        </div>
      )}

      <div style={{ marginTop: 10, marginBottom: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 48, height: 48, background: s.color + '15', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, border: `1px solid ${s.color}33` }}>
          ⚙️
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>{equip.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {equip.code && <span style={{ fontFamily: 'monospace', marginRight: 6 }}>{equip.code}</span>}
            {equip.location && <span>{equip.location}</span>}
          </div>
        </div>
      </div>

      {/* Status */}
      <div style={{ marginBottom: 12 }}>
        <Badge color={s.color} dot>{s.label}</Badge>
      </div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '8px 10px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 2 }}>Dernier entretien</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{fmtDate(equip.lastMaintenance)}</div>
        </div>
        <div style={{
          background: isLate ? 'rgba(239,68,68,0.08)' : isClose ? 'rgba(245,158,11,0.08)' : 'var(--bg-primary)',
          borderRadius: 'var(--radius)', padding: '8px 10px',
          border: `1px solid ${isLate ? '#ef444433' : isClose ? '#f59e0b33' : 'var(--border)'}`,
        }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: isLate ? '#ef4444' : isClose ? '#f59e0b' : 'var(--text-muted)', fontWeight: 700, marginBottom: 2 }}>Prochaine maint.</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: isLate ? '#ef4444' : isClose ? '#f59e0b' : 'var(--text-secondary)' }}>
            {fmtDate(equip.nextMaintenance)}
            {days !== null && <span style={{ fontSize: 10, marginLeft: 4, fontWeight: 800 }}>
              {isLate ? `(${-days}j dépassé)` : `(J-${days})`}
            </span>}
          </div>
        </div>
      </div>

      {equip.manufacturer && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
          {equip.manufacturer}{equip.model ? ` · ${equip.model}` : ''}
        </div>
      )}

      {/* Fréquence de maintenance */}
      {equip.maintenanceFrequency && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '6px 10px', marginBottom: 6 }}>
            <span style={{ fontSize: 13 }}>🔄</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#818cf8', flex: 1 }}>{freqSummary(equip)}</span>
          </div>
          {Array.isArray(equip.maintenanceTasks) && equip.maintenanceTasks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {equip.maintenanceTasks.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-secondary)' }}>
                  <span style={{ width: 15, height: 15, borderRadius: 3, border: '1.5px solid var(--border)', flexShrink: 0 }} />
                  {t}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

/* ── STATUS FILTER BAR ──────────────────────── */
function StatusFilterBar({ equipment, filter, setFilter }) {
  const counts = Object.keys(EQUIP_STATUS).reduce((acc, k) => {
    acc[k] = equipment.filter(e => e.status === k).length;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <button
        onClick={() => setFilter(null)}
        style={{
          background: !filter ? 'var(--accent-primary)' : 'var(--bg-card)',
          border: `1px solid ${!filter ? 'var(--accent-primary)' : 'var(--border)'}`,
          color: !filter ? 'white' : 'var(--text-secondary)',
          borderRadius: 'var(--radius)', padding: '6px 14px',
          cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all .2s',
        }}
      >
        Tous ({equipment.length})
      </button>
      {Object.entries(EQUIP_STATUS).map(([k, v]) => counts[k] > 0 && (
        <button
          key={k}
          onClick={() => setFilter(filter === k ? null : k)}
          style={{
            background: filter === k ? v.color + '22' : 'var(--bg-card)',
            border: `1px solid ${filter === k ? v.color : 'var(--border)'}`,
            color: filter === k ? v.color : 'var(--text-secondary)',
            borderRadius: 'var(--radius)', padding: '6px 14px',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all .2s',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: v.color }} />
          {v.label} ({counts[k]})
        </button>
      ))}
    </div>
  );
}

/* ── MAIN PAGE ──────────────────────────────── */
export default function EquipmentPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState(null);

  const inv = () => qc.invalidateQueries({ queryKey: ['equipment'] });

  const { data: equipData, isLoading } = useQuery({ queryKey: ['equipment'], queryFn: () => api.equipment() });
  const equipment = equipData?.data || [];

  const filtered = filter ? equipment.filter(e => e.status === filter) : equipment;

  const createEquip = useMutation({
    mutationFn: api.createEquip,
    onSuccess: () => { inv(); setModal(null); toast.success('Équipement créé'); },
    onError:   e  => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const updateEquip = useMutation({
    mutationFn: ({ id, data }) => api.updateEquip(id, data),
    onSuccess: () => { inv(); setModal(null); toast.success('Équipement mis à jour'); },
    onError:   e  => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const deleteEquip = useMutation({
    mutationFn: api.deleteEquip,
    onSuccess: () => { inv(); toast.success('Équipement supprimé'); },
    onError:   e  => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const downEquip  = equipment.filter(e => e.status === 'DOWN');
  const activeEquip = equipment.filter(e => e.status === 'ACTIVE');
  const dueForMaint = equipment.filter(e => {
    const d = daysUntil(e.nextMaintenance);
    return d !== null && d <= 14;
  });
  const availability = equipment.length > 0 ? Math.round((activeEquip.length / equipment.length) * 100) : 100;

  return (
    <AnimatedPage>
      <div className="erp-page">

        <PageHeader
          icon="🏭"
          title="Parc machines"
          subtitle="Inventaire et suivi de l'état de tous vos équipements industriels"
          actions={
            <Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>
              Ajouter équipement
            </Btn>
          }
        />

        {/* Machine DOWN alert */}
        {downEquip.length > 0 && (
          <AlertBanner type="danger" title={`${downEquip.length} machine${downEquip.length > 1 ? 's' : ''} EN PANNE`}>
            {downEquip.map(e => (
              <span key={e.id} style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderRadius: 'var(--radius)', padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                {e.name}{e.location ? ` · ${e.location}` : ''}
              </span>
            ))}
          </AlertBanner>
        )}

        {/* Upcoming maintenance alert */}
        {dueForMaint.length > 0 && downEquip.length === 0 && (
          <AlertBanner type="warning" title={`${dueForMaint.length} maintenance${dueForMaint.length > 1 ? 's' : ''} à planifier sous 14 jours`}>
            {dueForMaint.map(e => (
              <span key={e.id} style={{ background: 'rgba(245,158,11,0.15)', color: '#fde68a', borderRadius: 'var(--radius)', padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                {e.name}
              </span>
            ))}
          </AlertBanner>
        )}

        {/* KPIs */}
        <div className="erp-kpi-grid">
          {[
            { icon: <Settings size={18} />,     label: 'Total équipements', value: equipment.length, sub: 'machines enregistrées',     color: '#6366f1' },
            { icon: <CheckCircle size={18} />,  label: 'Disponibilité',     value: `${availability}%`, sub: `${activeEquip.length} opérationnels`, color: availability >= 90 ? '#10b981' : availability >= 75 ? '#f59e0b' : '#ef4444', bar: true, barValue: availability },
            { icon: <AlertTriangle size={18} />, label: 'En panne',         value: downEquip.length,  sub: downEquip.length === 0 ? 'aucune panne' : 'intervention requise', color: downEquip.length === 0 ? '#10b981' : '#ef4444' },
            { icon: <Clock size={18} />,         label: 'Maintenance due',  value: dueForMaint.length, sub: '≤14 jours',               color: dueForMaint.length > 0 ? '#f59e0b' : '#64748b' },
          ].map((k, i) => (
            <div key={i} className="erp-kpi" style={{ '--kpi-color': k.color }}>
              <div className="erp-kpi__icon" style={{ background: k.color + '22', color: k.color }}>{k.icon}</div>
              <div style={{ flex: 1 }}>
                <div className="erp-kpi__value" style={{ color: k.color }}>{k.value}</div>
                <div className="erp-kpi__label">{k.label}</div>
                <div className="erp-kpi__sub">{k.sub}</div>
                {k.bar && (
                  <div style={{ background: 'var(--border)', borderRadius: 99, height: 4, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${k.barValue}%`, background: k.color, borderRadius: 99 }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        {equipment.length > 0 && (
          <StatusFilterBar equipment={equipment} filter={filter} setFilter={setFilter} />
        )}

        {/* Content */}
        {isLoading ? (
          <div className="dashboard-loading"><div className="spinner" /><span>Chargement du parc machines…</span></div>
        ) : equipment.length === 0 ? (
          <EmptyState
            icon="🏭"
            title="Aucun équipement enregistré"
            description="Commencez par enregistrer vos machines pour suivre leur état et planifier la maintenance."
            action={<Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>Ajouter le premier équipement</Btn>}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filtered.map(e => (
              <MachineCard
                key={e.id}
                equip={e}
                onEdit={() => setModal({ type: 'edit', data: e })}
                onDelete={() => {
                  if (confirm(`Supprimer "${e.name}" ? Cette action est irréversible.`)) deleteEquip.mutate(e.id);
                }}
              />
            ))}
          </div>
        )}

        {/* Modal */}
        {(modal?.type === 'create' || modal?.type === 'edit') && (
          <EquipmentModal
            equip={modal.data}
            loading={createEquip.isPending || updateEquip.isPending}
            onClose={() => setModal(null)}
            onSave={(form) => {
              if (modal.data) updateEquip.mutate({ id: modal.data.id, data: form });
              else createEquip.mutate(form);
            }}
          />
        )}
      </div>
    </AnimatedPage>
  );
}
