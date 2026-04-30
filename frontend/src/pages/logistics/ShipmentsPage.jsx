import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { QrButton, QrBatchButton } from '../../components/ui/QrCodeWidget.jsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AnimatedPage from '../../components/ui/AnimatedPage.jsx';
import { PageHeader, Btn, Modal, FormGrid, FormActions, Field, Input, Select, Textarea, EmptyState } from '../../components/ui/DesignSystem.jsx';
import apiClient from '../../api/client.js';

const kpiStagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const fadeUp     = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.4,0,0.2,1] } } };
const rowAnim    = { hidden: { opacity: 0, x: -10 }, show: (i) => ({ opacity: 1, x: 0, transition: { delay: i * 0.04, duration: 0.2 } }) };

const STATUS_CFG = {
  PENDING:    { label: 'En attente',  color: '#64748b', step: 0 },
  PREPARING:  { label: 'Préparation', color: '#f59e0b', step: 1 },
  SHIPPED:    { label: 'Expédié',     color: '#3b82f6', step: 2 },
  IN_TRANSIT: { label: 'En transit',  color: '#8b5cf6', step: 3 },
  DELIVERED:  { label: 'Livré',       color: '#10b981', step: 4 },
  CANCELLED:  { label: 'Annulé',      color: '#ef4444', step: -1 },
};

function ShipmentModal({ item, customers, carriers, onClose, onSaved }) {
  const [form, setForm] = useState({
    customerId:  item?.customerId  || '',
    carrierId:   item?.carrierId   || '',
    destination: item?.destination || '',
    weight:      item?.weight      || '',
    volume:      item?.volume      || '',
    notes:       item?.notes       || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.destination) return toast.error('Destination requise');
    setSaving(true);
    try {
      if (item) {
        await apiClient.put(`/shipments/${item.id}`, form);
        toast.success('Expédition mise à jour');
      } else {
        await apiClient.post('/shipments', form);
        toast.success('Expédition créée');
      }
      onSaved();
    } catch (e) { toast.error(e?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={item ? `Modifier — ${item.reference}` : 'Nouvelle expédition'} onClose={onClose} width={540}>
      <FormGrid cols={2}>
        <Field label="Client">
          <Select value={form.customerId} onChange={e => set('customerId', e.target.value)}>
            <option value="">Aucun client</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Transporteur">
          <Select value={form.carrierId} onChange={e => set('carrierId', e.target.value)}>
            <option value="">Aucun transporteur</option>
            {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Destination *" style={{ gridColumn: 'span 2' }}>
          <Input value={form.destination} onChange={e => set('destination', e.target.value)} placeholder="Ville, Wilaya…" />
        </Field>
        <Field label="Poids (kg)">
          <Input type="number" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="0" />
        </Field>
        <Field label="Volume (m³)">
          <Input type="number" value={form.volume} onChange={e => set('volume', e.target.value)} placeholder="0" />
        </Field>
      </FormGrid>
      <FormGrid cols={1}>
        <Field label="Notes"><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Instructions spéciales…" /></Field>
      </FormGrid>
      <FormActions>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : item ? 'Modifier' : 'Créer'}</Btn>
      </FormActions>
    </Modal>
  );
}

export default function ShipmentsPage() {
  const qc = useQueryClient();
  const [modal, setModal]   = useState(null);
  const [search, setSearch] = useState('');
  const [stFilter, setStFilter] = useState('');

  const { data: shipData, isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => apiClient.get('/shipments').then(r => r.data),
  });

  const { data: custData } = useQuery({
    queryKey: ['customers-simple'],
    queryFn: () => apiClient.get('/customers?limit=200').then(r => r.data),
  });

  const { data: carrierData } = useQuery({
    queryKey: ['carriers'],
    queryFn: () => apiClient.get('/carriers').then(r => r.data),
  });

  const items     = shipData    || [];
  const customers = custData    || [];
  const carriers  = carrierData || [];
  const refresh   = () => qc.invalidateQueries({ queryKey: ['shipments'] });

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette expédition ?')) return;
    try {
      await apiClient.delete(`/shipments/${id}`);
      toast.success('Supprimée');
      refresh();
    } catch { toast.error('Erreur'); }
  };

  const handleAdvance = async (id) => {
    try {
      await apiClient.patch(`/shipments/${id}/advance`);
      toast.success('Statut avancé');
      refresh();
    } catch (e) { toast.error(e?.message || 'Statut final atteint'); }
  };

  const filtered = items.filter(i => {
    const ms = !stFilter || i.status === stFilter;
    const mq = !search   || [i.reference, i.destination, i.customer?.name].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    return ms && mq;
  });

  const delivered  = items.filter(i => i.status === 'DELIVERED').length;
  const inTransit  = items.filter(i => i.status === 'IN_TRANSIT' || i.status === 'SHIPPED').length;
  const pending    = items.filter(i => i.status === 'PENDING' || i.status === 'PREPARING').length;

  return (
    <AnimatedPage>
      <div className="erp-page">
        <PageHeader icon="🚛" title="Expéditions" subtitle="Gérez vos expéditions et livraisons clients"
          actions={<div style={{ display: 'flex', gap: 8 }}><QrBatchButton type="shipment" items={items} label="Expéditions — QR Badges" filename="qr-expeditions" /><Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>Nouvelle expédition</Btn></div>}
        />

        <motion.div className="erp-kpi-grid" variants={kpiStagger} initial="hidden" animate="show">
          {[
            { label: 'Total expéditions', value: items.length, color: '#6366f1', icon: '🚛' },
            { label: 'En attente',        value: pending,       color: '#f59e0b', icon: '⏳' },
            { label: 'En transit',        value: inTransit,     color: '#3b82f6', icon: '🛣️' },
            { label: 'Livrées',           value: delivered,     color: '#10b981', icon: '✅' },
          ].map((k, i) => (
            <motion.div key={i} className="erp-kpi" style={{ '--kpi-color': k.color }} variants={fadeUp}
              whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 20 } }}>
              <div className="erp-kpi__icon" style={{ background: k.color + '22', color: k.color, fontSize: 20 }}>{k.icon}</div>
              <div><div className="erp-kpi__value" style={{ color: k.color }}>{k.value}</div><div className="erp-kpi__label">{k.label}</div></div>
            </motion.div>
          ))}
        </motion.div>

        {/* Status filter pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['', 'Tous', '#6366f1', items.length], ...Object.entries(STATUS_CFG).filter(([k]) => k !== 'CANCELLED').map(([k, v]) => [k, v.label, v.color, items.filter(i => i.status === k).length])].map(([k, label, color, count]) => {
            const active = stFilter === k;
            return (
              <button key={k || 'all'} onClick={() => setStFilter(k)}
                style={{ padding: '5px 12px', background: active ? color + '20' : 'var(--bg-card)', border: `1px solid ${active ? color + '50' : 'var(--border)'}`, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 400, color: active ? color : 'var(--text-muted)' }}>
                {label} ({count})
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-input" style={{ maxWidth: 300 }}>
            <Search size={14} className="search-input__icon" />
            <input placeholder="Référence, destination, client…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} expédition{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🚛" title="Aucune expédition" description="Créez votre première expédition."
            action={<Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>Créer</Btn>} />
        ) : (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                  {['Référence','Client','Destination','Transporteur','Statut','QR','Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: h === 'QR' ? 'center' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.7, width: h === 'QR' ? 44 : undefined }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => {
                  const st = STATUS_CFG[item.status] || STATUS_CFG.PENDING;
                  const canAdvance = item.status !== 'DELIVERED' && item.status !== 'CANCELLED';
                  return (
                    <motion.tr key={item.id} custom={i} variants={rowAnim} initial="hidden" animate="show"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      whileHover={{ backgroundColor: 'rgba(99,102,241,0.04)' }}>
                      <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 700, color: '#818cf8' }}>{item.reference}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--text-secondary)' }}>{item.customer?.name || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--text-secondary)' }}>📍 {item.destination}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>{item.carrier?.name || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: st.color, background: st.color + '18', padding: '3px 8px', borderRadius: 5 }}>{st.label}</span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <QrButton type="shipment" id={item.id} name={item.reference} extraData={{ destination: item.destination, status: item.status }} />
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {canAdvance && (
                            <button title="Avancer le statut" onClick={() => handleAdvance(item.id)}
                              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 5, cursor: 'pointer', padding: '4px 8px', color: '#818cf8' }}>
                              <ChevronRight size={13} />
                            </button>
                          )}
                          <Btn variant="secondary" size="sm" icon={<Edit2  size={11} />} onClick={() => setModal({ type: 'edit', data: item })} />
                          <Btn variant="danger"    size="sm" icon={<Trash2 size={11} />} onClick={() => handleDelete(item.id)} />
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {(modal?.type === 'create' || modal?.type === 'edit') && (
          <ShipmentModal
            item={modal.data}
            customers={customers}
            carriers={carriers}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); refresh(); }}
          />
        )}
      </div>
    </AnimatedPage>
  );
}
