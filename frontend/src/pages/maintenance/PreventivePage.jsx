import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, CheckCircle, AlertTriangle, Clock, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../api/client.js';
import AnimatedPage from '../../components/ui/AnimatedPage.jsx';
import {
  PageHeader, Btn, Modal, FormGrid, FormActions,
  Field, Input, Select, EmptyState, Badge, AlertBanner, Card
} from '../../components/ui/DesignSystem.jsx';

/* ── API ─────────────────────────────────────── */
const api = {
  equipment:   ()      => apiClient.get('/maintenance/equipment'),
  updateEquip: (id, d) => apiClient.patch(`/maintenance/equipment/${id}`, d),
  createOrder: (d)     => apiClient.post('/maintenance/orders', d),
  orders:      (p)     => apiClient.get('/maintenance/orders', { params: p }),
};

const fmtDate   = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const daysUntil = d => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;

const URGENCY = (days) => {
  if (days === null) return { label: 'Non planifié', color: '#64748b', bg: 'rgba(100,116,139,0.1)' };
  if (days < 0)      return { label: `${-days}j dépassé`,  color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
  if (days === 0)    return { label: "Aujourd'hui",         color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
  if (days <= 3)     return { label: `J-${days}`,           color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
  if (days <= 7)     return { label: `J-${days}`,           color: '#f59e0b', bg: 'rgba(245,158,11,0.07)' };
  if (days <= 30)    return { label: `J-${days}`,           color: '#6366f1', bg: 'rgba(99,102,241,0.07)' };
  return               { label: `J-${days}`,                color: '#10b981', bg: 'rgba(16,185,129,0.07)' };
};

/* ── SCHEDULE MODAL ─────────────────────────── */
function ScheduleModal({ equip, onClose, onSave, loading }) {
  const [form, setForm] = useState({
    nextMaintenance: equip?.nextMaintenance?.slice(0, 10) || '',
    createOrder: false,
    orderTitle: `Maintenance préventive — ${equip?.name}`,
    estimatedHours: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal title={`Planifier — ${equip?.name}`} onClose={onClose} width={500}>
      <FormGrid cols={1}>
        <Field label="Date de prochaine maintenance *">
          <Input type="date" value={form.nextMaintenance} onChange={e => set('nextMaintenance', e.target.value)} />
        </Field>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <input
            type="checkbox"
            id="createOrder"
            checked={form.createOrder}
            onChange={e => set('createOrder', e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
          />
          <label htmlFor="createOrder" style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            Créer automatiquement un ordre de maintenance
          </label>
        </div>
        {form.createOrder && (
          <>
            <Field label="Intitulé de l'ordre">
              <Input value={form.orderTitle} onChange={e => set('orderTitle', e.target.value)} />
            </Field>
            <Field label="Durée estimée (h)">
              <Input type="number" value={form.estimatedHours} onChange={e => set('estimatedHours', e.target.value)} placeholder="ex: 4" min="0.5" step="0.5" />
            </Field>
          </>
        )}
      </FormGrid>
      <FormActions>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn variant="primary" loading={loading} onClick={() => onSave(form)}>
          Planifier
        </Btn>
      </FormActions>
    </Modal>
  );
}

/* ── CALENDAR GRID (30-day view) ────────────── */
function CalendarView({ equipment }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build 35-cell calendar (5 weeks)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstDayOffset = (startOfMonth.getDay() + 6) % 7; // Mon=0

  const cells = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(startOfMonth);
    d.setDate(startOfMonth.getDate() - firstDayOffset + i);
    const dateStr = d.toLocaleDateString('fr-FR');
    const equips = equipment.filter(e => {
      if (!e.nextMaintenance) return false;
      return new Date(e.nextMaintenance).toLocaleDateString('fr-FR') === dateStr;
    });
    cells.push({ date: d, equips, isToday: d.getTime() === today.getTime(), isThisMonth: d.getMonth() === today.getMonth() });
  }

  const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <Card>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          {startOfMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
        </span>
        <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> Dépassé / aujourd'hui
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} /> Cette semaine
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} /> Ce mois
          </span>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((cell, i) => {
          const hasEvents = cell.equips.length > 0;
          const days = cell.equips.length > 0 ? daysUntil(cell.equips[0].nextMaintenance) : null;
          const eventColor = days !== null && days <= 0 ? '#ef4444' : days !== null && days <= 7 ? '#f59e0b' : '#6366f1';

          return (
            <div key={i} style={{
              minHeight: 70,
              background: cell.isToday ? 'rgba(99,102,241,0.1)' : hasEvents ? eventColor + '08' : 'var(--bg-primary)',
              border: `1px solid ${cell.isToday ? 'var(--accent-primary)' : hasEvents ? eventColor + '44' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              padding: '6px',
              opacity: cell.isThisMonth ? 1 : 0.35,
            }}>
              <div style={{ fontSize: 12, fontWeight: cell.isToday ? 800 : 500, color: cell.isToday ? 'var(--accent-primary)' : 'var(--text-secondary)', marginBottom: 4 }}>
                {cell.date.getDate()}
              </div>
              {cell.equips.map(e => (
                <div key={e.id} style={{ background: eventColor + '22', color: eventColor, borderRadius: 4, padding: '2px 5px', fontSize: 10, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.name}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ── EQUIPMENT MAINTENANCE CARD ─────────────── */
function MaintenanceCard({ equip, onSchedule, onMarkDone }) {
  const days = daysUntil(equip.nextMaintenance);
  const u    = URGENCY(days);

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
      padding: '14px 16px', borderLeft: `4px solid ${u.color}`, transition: 'var(--transition)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      {/* Urgency badge */}
      <div style={{ width: 54, height: 54, background: u.bg, borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${u.color}33` }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>{days !== null && days <= 0 ? '⚠️' : days !== null && days <= 7 ? '🔔' : '📅'}</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: u.color, marginTop: 2 }}>{u.label}</span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{equip.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
          {equip.code && <span style={{ fontFamily: 'monospace', marginRight: 6 }}>{equip.code}</span>}
          {equip.location && <span>{equip.location}</span>}
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
          <span>Dernier: <strong style={{ color: 'var(--text-secondary)' }}>{fmtDate(equip.lastMaintenance)}</strong></span>
          <span>Prochain: <strong style={{ color: u.color }}>{fmtDate(equip.nextMaintenance)}</strong></span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {days !== null && days <= 0 && (
          <Btn variant="success" size="sm" icon={<CheckCircle size={12} />} onClick={onMarkDone}>
            Effectuée
          </Btn>
        )}
        <Btn variant="secondary" size="sm" icon={<Calendar size={12} />} onClick={onSchedule}>
          Planifier
        </Btn>
      </div>
    </div>
  );
}

/* ── MAIN PAGE ──────────────────────────────── */
export default function PreventivePage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [view, setView] = useState('list'); // 'list' | 'calendar'

  const inv = () => {
    qc.invalidateQueries({ queryKey: ['equipment'] });
    qc.invalidateQueries({ queryKey: ['maint-orders'] });
    qc.invalidateQueries({ queryKey: ['maint-dashboard'] });
  };

  const { data: equipData, isLoading } = useQuery({ queryKey: ['equipment'], queryFn: () => api.equipment() });
  const equipment = (equipData?.data || []).filter(e => e.status !== 'RETIRED');

  const updateEquip  = useMutation({
    mutationFn: ({ id, data }) => api.updateEquip(id, data),
    onSuccess: () => { inv(); setModal(null); toast.success('Maintenance planifiée'); },
    onError:   e  => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const createOrder = useMutation({
    mutationFn: api.createOrder,
    onSuccess: () => { inv(); toast.success('Ordre de maintenance créé'); },
    onError:   e  => toast.error(e.response?.data?.message || 'Erreur'),
  });

  // Sort by urgency
  const sorted = [...equipment].sort((a, b) => {
    const da = daysUntil(a.nextMaintenance) ?? 9999;
    const db = daysUntil(b.nextMaintenance) ?? 9999;
    return da - db;
  });

  const overdue  = equipment.filter(e => { const d = daysUntil(e.nextMaintenance); return d !== null && d < 0; });
  const thisWeek = equipment.filter(e => { const d = daysUntil(e.nextMaintenance); return d !== null && d >= 0 && d <= 7; });
  const planned  = equipment.filter(e => { const d = daysUntil(e.nextMaintenance); return d !== null && d > 7; });
  const unplanned= equipment.filter(e => !e.nextMaintenance);

  return (
    <AnimatedPage>
      <div className="erp-page">

        <PageHeader
          icon="🗓️"
          title="Maintenance préventive"
          subtitle="Planifiez et suivez les opérations de maintenance programmées"
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                {[['list', 'Liste'], ['calendar', 'Calendrier']].map(([k, l]) => (
                  <button key={k} onClick={() => setView(k)} style={{
                    padding: '7px 14px', background: view === k ? 'rgba(99,102,241,0.2)' : 'transparent',
                    border: 'none', color: view === k ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'var(--transition)',
                  }}>{l}</button>
                ))}
              </div>
            </div>
          }
        />

        {/* Alerts */}
        {overdue.length > 0 && (
          <AlertBanner type="danger" title={`${overdue.length} maintenance${overdue.length > 1 ? 's' : ''} dépassée${overdue.length > 1 ? 's' : ''}`}>
            {overdue.map(e => (
              <span key={e.id} style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderRadius: 'var(--radius)', padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                {e.name}
              </span>
            ))}
          </AlertBanner>
        )}

        {/* KPIs */}
        <div className="erp-kpi-grid">
          {[
            { icon: '⚠️', label: 'En retard',      value: overdue.length,   sub: 'intervention requise maintenant', color: overdue.length > 0 ? '#ef4444' : '#64748b' },
            { icon: '🔔', label: 'Cette semaine',  value: thisWeek.length,  sub: 'à planifier sous 7 jours',        color: thisWeek.length > 0 ? '#f59e0b' : '#64748b' },
            { icon: '📅', label: 'Planifiées',     value: planned.length,   sub: 'interventions futures',           color: '#6366f1' },
            { icon: '❓', label: 'Non planifiées', value: unplanned.length, sub: 'sans date de maintenance',         color: unplanned.length > 0 ? '#f59e0b' : '#10b981' },
          ].map((k, i) => (
            <div key={i} className="erp-kpi" style={{ '--kpi-color': k.color }}>
              <div className="erp-kpi__icon" style={{ background: k.color + '22', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 'var(--radius)' }}>{k.icon}</div>
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
        ) : view === 'calendar' ? (
          <CalendarView equipment={equipment} />
        ) : equipment.length === 0 ? (
          <EmptyState
            icon="🗓️"
            title="Aucun équipement à planifier"
            description="Ajoutez des équipements avec des dates de maintenance pour les voir ici."
          />
        ) : (
          <div>
            {/* Sections by urgency */}
            {[
              { title: '⚠️ En retard — Intervention immédiate', items: overdue,   color: '#ef4444' },
              { title: '🔔 Cette semaine (7 jours)',             items: thisWeek,  color: '#f59e0b' },
              { title: '📅 Ce mois (8–30 jours)',                items: planned.filter(e => { const d = daysUntil(e.nextMaintenance); return d !== null && d <= 30; }), color: '#6366f1' },
              { title: '✅ Planifiées (>30 jours)',               items: planned.filter(e => { const d = daysUntil(e.nextMaintenance); return d !== null && d > 30; }),  color: '#10b981' },
              { title: '❓ Non planifiées',                       items: unplanned, color: '#64748b' },
            ].filter(s => s.items.length > 0).map(section => (
              <div key={section.title} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: section.color, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {section.title}
                  <span style={{ background: section.color + '22', color: section.color, borderRadius: 20, padding: '1px 10px', fontSize: 11 }}>{section.items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {section.items.map(e => (
                    <MaintenanceCard
                      key={e.id}
                      equip={e}
                      onSchedule={() => setModal({ type: 'schedule', data: e })}
                      onMarkDone={() => {
                        const today = new Date().toISOString().slice(0, 10);
                        updateEquip.mutate({ id: e.id, data: { lastMaintenance: today } });
                        toast.success(`Maintenance de "${e.name}" marquée effectuée`);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Schedule modal */}
        {modal?.type === 'schedule' && (
          <ScheduleModal
            equip={modal.data}
            loading={updateEquip.isPending || createOrder.isPending}
            onClose={() => setModal(null)}
            onSave={async (form) => {
              await updateEquip.mutateAsync({ id: modal.data.id, data: { nextMaintenance: form.nextMaintenance } });
              if (form.createOrder) {
                await createOrder.mutateAsync({
                  equipmentId: modal.data.id,
                  title: form.orderTitle,
                  type: 'PREVENTIVE',
                  plannedDate: form.nextMaintenance,
                  estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : undefined,
                  status: 'PLANNED',
                });
              }
            }}
          />
        )}
      </div>
    </AnimatedPage>
  );
}
