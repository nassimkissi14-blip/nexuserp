import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client.js';
import { Plus, CheckCircle, ClipboardList, AlertTriangle, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const inventoryAPI = {
  getAll: () => apiClient.get('/inventory'),
  create: (data) => apiClient.post('/inventory', data),
  updateLine: (sessionId, lineId, data) => apiClient.patch(`/inventory/${sessionId}/line/${lineId}`, data),
  complete: (id) => apiClient.post(`/inventory/${id}/complete`),
  delete: (id) => apiClient.delete(`/inventory/${id}`),
};

const STATUS_CONFIG = {
  DRAFT:       { label: 'Brouillon',    color: '#64748b', bg: '#64748b22' },
  IN_PROGRESS: { label: 'En cours',     color: '#f59e0b', bg: '#f59e0b22' },
  COMPLETED:   { label: 'Complété',     color: '#10b981', bg: '#10b98122' },
  CANCELLED:   { label: 'Annulé',       color: '#ef4444', bg: '#ef444422' },
};

const fmt = (n) => new Intl.NumberFormat('fr-DZ').format(Number(n) || 0);

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [editedQtys, setEditedQtys] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: inventoryAPI.getAll,
  });

  const createMutation = useMutation({
    mutationFn: inventoryAPI.create,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSelected(res.data);
      setEditedQtys({});
      toast.success('✅ Session d\'inventaire créée');
    },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const completeMutation = useMutation({
    mutationFn: async (session) => {
      // Save all pending line edits first
      const updates = Object.entries(editedQtys).map(([lineId, qty]) =>
        inventoryAPI.updateLine(session.id, lineId, { countedQty: qty })
      );
      await Promise.all(updates);
      return inventoryAPI.complete(session.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelected(null);
      setEditedQtys({});
      toast.success('✅ Inventaire validé — stock mis à jour');
    },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const sessions = data?.data || [];
  const active = sessions.find(s => s.status === 'IN_PROGRESS');

  const handleQtyChange = (lineId, value) => {
    setEditedQtys(prev => ({ ...prev, [lineId]: parseFloat(value) }));
  };

  const selectedSession = selected || (active ? sessions.find(s => s.id === active.id) : null);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📦 Inventaire</h1>
          <p className="page-subtitle">{sessions.length} session(s) · {sessions.filter(s => s.status === 'COMPLETED').length} complétée(s)</p>
        </div>
        {!active && (
          <button className="btn btn--primary" onClick={() => createMutation.mutate({})} disabled={createMutation.isPending}>
            <Plus size={16} /> Nouvelle session
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedSession ? '320px 1fr' : '1fr', gap: 20, alignItems: 'start' }}>

        {/* Liste des sessions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isLoading ? (
            [1,2,3].map(i => <div key={i} style={{ height: 80, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite' }} />)
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <Package size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p>Aucune session d'inventaire</p>
              <button className="btn btn--primary" style={{ marginTop: 12 }} onClick={() => createMutation.mutate({})}>
                Créer la première session
              </button>
            </div>
          ) : sessions.map(session => {
            const cfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.DRAFT;
            const counted = session.lines.filter(l => l.countedQty !== null).length;
            const pct = session.lines.length > 0 ? Math.round((counted / session.lines.length) * 100) : 0;
            return (
              <div key={session.id}
                onClick={() => { setSelected(session); setEditedQtys({}); }}
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${selectedSession?.id === session.id ? 'var(--accent-primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 16,
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{session.reference}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(session.startedAt).toLocaleDateString('fr-FR')} · {session.lines.length} produits
                    </div>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>
                {session.status === 'IN_PROGRESS' && (
                  <div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#6366f1', borderRadius: 2, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{counted}/{session.lines.length} comptés</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Détail session */}
        {selectedSession && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontWeight: 700 }}>{selectedSession.reference}</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedSession.lines.length} produits à compter</div>
              </div>
              {selectedSession.status === 'IN_PROGRESS' && (
                <button className="btn btn--primary" style={{ gap: 6 }}
                  onClick={() => completeMutation.mutate(selectedSession)}
                  disabled={completeMutation.isPending}>
                  <CheckCircle size={15} /> {completeMutation.isPending ? 'Validation…' : 'Valider l\'inventaire'}
                </button>
              )}
            </div>

            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th style={{ textAlign: 'right' }}>Qté théorique</th>
                    <th style={{ textAlign: 'right' }}>Qté comptée</th>
                    <th style={{ textAlign: 'right' }}>Écart</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSession.lines.map(line => {
                    const counted = editedQtys[line.id] !== undefined ? editedQtys[line.id] : line.countedQty;
                    const variance = counted !== null && counted !== undefined ? counted - line.theoreticalQty : null;
                    return (
                      <tr key={line.id}>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{line.product?.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{line.product?.sku}</div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {fmt(line.theoreticalQty)} {line.product?.unit}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {selectedSession.status === 'IN_PROGRESS' ? (
                            <input
                              type="number"
                              defaultValue={line.countedQty ?? ''}
                              placeholder="0"
                              min="0"
                              step="0.01"
                              onChange={e => handleQtyChange(line.id, e.target.value)}
                              style={{ width: 90, textAlign: 'right', padding: '4px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}
                            />
                          ) : (
                            <span style={{ fontWeight: 600 }}>{line.countedQty !== null ? fmt(line.countedQty) : '—'} {line.product?.unit}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {variance !== null ? (
                            <span style={{ fontWeight: 700, color: variance === 0 ? '#10b981' : variance > 0 ? '#6366f1' : '#ef4444' }}>
                              {variance > 0 ? '+' : ''}{fmt(variance)}
                            </span>
                          ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
