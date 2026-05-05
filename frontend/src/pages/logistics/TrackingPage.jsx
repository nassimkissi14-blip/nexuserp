import { useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AnimatedPage from '../../components/ui/AnimatedPage.jsx';
import { PageHeader, EmptyState } from '../../components/ui/DesignSystem.jsx';
import apiClient from '../../api/client.js';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ui/ConfirmModal.jsx';

const STEPS = [
  { key: 'PENDING',    label: 'En attente',  icon: '📋', color: '#64748b' },
  { key: 'PREPARING',  label: 'Préparation', icon: '📦', color: '#f59e0b' },
  { key: 'SHIPPED',    label: 'Expédié',     icon: '🚛', color: '#3b82f6' },
  { key: 'IN_TRANSIT', label: 'En transit',  icon: '🔄', color: '#8b5cf6' },
  { key: 'DELIVERED',  label: 'Livré',       icon: '✅', color: '#10b981' },
];

const STEP_KEYS = STEPS.map(s => s.key);

export default function TrackingPage() {
  const qc = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirm();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => apiClient.get('/shipments').then(r => r.data),
  });

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }) => apiClient.patch(`/shipments/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shipments'] }); toast.success('Statut mis à jour'); },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => apiClient.patch(`/shipments/${id}`, { status: 'CANCELLED' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shipments'] }); toast.success('Expédition annulée'); },
    onError: () => toast.error('Erreur'),
  });

  const allItems = data || [];
  const items = allItems.filter(i => {
    const matchStatus = !filter || i.status === filter;
    const matchSearch = !search || [i.reference, i.destination, i.customer?.name].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch && i.status !== 'CANCELLED';
  });

  const getNextStep = (status) => {
    const idx = STEP_KEYS.indexOf(status);
    return idx >= 0 && idx < STEP_KEYS.length - 1 ? STEPS[idx + 1] : null;
  };

  return (
    <AnimatedPage>
      <div className="erp-page">
        <PageHeader icon="📍" title="Suivi des livraisons" subtitle="Suivez et avancez l'état de vos expéditions en temps réel" />

        {/* Counters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {STEPS.map(s => {
            const count = allItems.filter(i => i.status === s.key).length;
            const active = filter === s.key;
            return (
              <div key={s.key} onClick={() => setFilter(active ? '' : s.key)} style={{ background: 'var(--bg-card)', border: `1px solid ${active ? s.color : 'var(--border)'}`, borderTop: `3px solid ${s.color}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all .15s' }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{count}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-input" style={{ maxWidth: 320 }}>
            <Search size={14} className="search-input__icon" />
            <input placeholder="Référence, destination, client…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {filter && (
            <button className="btn btn--ghost" style={{ fontSize: 12 }} onClick={() => setFilter('')}>
              ✕ Effacer filtre
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{items.length} expédition(s)</span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement…</div>
        ) : items.length === 0 ? (
          <EmptyState icon="📍" title="Aucune expédition" description="Créez des expéditions depuis la page Expéditions." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map(item => {
              const curIdx  = STEP_KEYS.indexOf(item.status);
              const curStep = STEPS[curIdx] || STEPS[0];
              const nextStep = getNextStep(item.status);
              const progress = curIdx >= 0 ? (curIdx / (STEPS.length - 1)) * 100 : 0;

              return (
                <div key={item.id} style={{ background: 'var(--bg-card)', border: `1px solid ${curStep.color}30`, borderLeft: `4px solid ${curStep.color}`, borderRadius: 12, padding: '18px 20px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{item.reference}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {item.customer?.name && <span>👤 {item.customer.name} · </span>}
                        📍 {item.destination}
                        {item.carrier?.name && <span> · 🚚 {item.carrier.name}</span>}
                        {item.weight && <span> · ⚖️ {item.weight} kg</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: curStep.color, background: curStep.color + '18', padding: '4px 10px', borderRadius: 6 }}>
                        {curStep.icon} {curStep.label}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: curStep.color, borderRadius: 3, transition: 'width .5s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      {STEPS.map((s, i) => {
                        const done    = curIdx >= i;
                        const current = curIdx === i;
                        return (
                          <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: done ? s.color : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, transition: 'all .3s', boxShadow: current ? `0 0 0 4px ${s.color}30` : 'none' }}>
                              {done ? s.icon : '○'}
                            </div>
                            <span style={{ fontSize: 9, color: done ? s.color : 'var(--text-muted)', fontWeight: done ? 700 : 400, textAlign: 'center', lineHeight: 1.2 }}>{s.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                      <span>📅 {new Date(item.createdAt).toLocaleDateString('fr-FR')}</span>
                      {item.shippedAt   && <span>· 🚛 {new Date(item.shippedAt).toLocaleDateString('fr-FR')}</span>}
                      {item.deliveredAt && <span>· ✅ {new Date(item.deliveredAt).toLocaleDateString('fr-FR')}</span>}
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      {nextStep && (
                        <button className="btn btn--primary" style={{ fontSize: 11, padding: '5px 12px' }}
                          onClick={() => advanceMutation.mutate({ id: item.id, status: nextStep.key })}
                          disabled={advanceMutation.isPending}>
                          <ChevronRight size={12} /> {nextStep.icon} {nextStep.label}
                        </button>
                      )}
                      {item.status !== 'DELIVERED' && (
                        <button className="btn btn--ghost" style={{ fontSize: 11, padding: '5px 10px', color: '#ef4444', borderColor: '#ef444433' }}
                          onClick={async () => { const ok = await confirm({ title: 'Annuler cette expédition ?', confirmLabel: 'Annuler', variant: 'warning' }); if (ok) cancelMutation.mutate(item.id); }}>
                          Annuler
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {confirmModal}
    </AnimatedPage>
  );
}
