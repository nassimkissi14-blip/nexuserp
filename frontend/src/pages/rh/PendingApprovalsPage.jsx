import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../api/client.js';

const api = {
  pending: () => apiClient.get('/users/pending'),
  approve: (id, data) => apiClient.post(`/users/${id}/approve`, data),
  reject:  (id) => apiClient.post(`/users/${id}/reject`),
};

const DEPT_LABELS = {
  direction: '🏢 Direction',  rh: '👥 RH',
  commercial: '📈 Commercial', finance: '💰 Finance',
  production: '🏭 Production', maintenance: '🔧 Maintenance',
  stock: '📦 Stock',          achats: '🛒 Achats',
  projets: '🗂️ Projets',     it: '⚙️ IT / Admin',
};

export default function PendingApprovalsPage() {
  const queryClient = useQueryClient();
  const [approveModal, setApproveModal] = useState(null); // user object
  const [position, setPosition]   = useState('');
  const [salary, setSalary]       = useState('');

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['users-pending'],
    queryFn: () => api.pending().then(r => r.data || []),
    refetchInterval: 15000,
  });

  const approveMut = useMutation({
    mutationFn: ({ id, data }) => api.approve(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-pending'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setApproveModal(null);
      toast.success('✅ Utilisateur approuvé et fiche employé créée');
    },
    onError: (e) => toast.error(e.message || 'Erreur'),
  });

  const rejectMut = useMutation({
    mutationFn: (id) => api.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-pending'] });
      toast.success('🗑️ Demande refusée');
    },
    onError: (e) => toast.error(e.message || 'Erreur'),
  });

  const handleReject = (u) => {
    if (!window.confirm(`Refuser la demande de ${u.firstName} ${u.lastName} ?\nLe compte sera supprimé définitivement.`)) return;
    rejectMut.mutate(u.id);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">👤 Demandes d'accès en attente</h1>
          <p className="page-subtitle">{pending.length} demande(s) en attente de validation RH</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement…</div>
      ) : pending.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <CheckCircle size={48} strokeWidth={1} style={{ marginBottom: 16, color: '#10b981' }} />
          <p style={{ fontSize: 16, fontWeight: 600 }}>Aucune demande en attente</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Toutes les demandes d'accès ont été traitées.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pending.map(u => (
            <div key={u.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Avatar */}
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 16, flexShrink: 0 }}>
                {u.firstName[0]}{u.lastName[0]}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{u.firstName} {u.lastName}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{u.email}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 20, background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    {DEPT_LABELS[u.department?.toLowerCase()] || u.department || 'Département non spécifié'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} />
                    {new Date(u.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  className="btn btn--primary"
                  style={{ fontSize: 13, gap: 6 }}
                  onClick={() => { setApproveModal(u); setPosition(u.department || ''); setSalary(''); }}
                >
                  <CheckCircle size={14} /> Approuver
                </button>
                <button
                  className="btn btn--ghost"
                  style={{ fontSize: 13, color: '#ef4444', gap: 6 }}
                  onClick={() => handleReject(u)}
                  disabled={rejectMut.isPending}
                >
                  <XCircle size={14} /> Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve modal */}
      {approveModal && (
        <div className="modal-overlay" onClick={() => setApproveModal(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>✅ Approuver {approveModal.firstName} {approveModal.lastName}</h3>
              <button className="modal__close" onClick={() => setApproveModal(null)}>✕</button>
            </div>
            <div className="modal__body">
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                Un employé sera créé automatiquement dans le module RH pour ce compte.
              </div>
              <form onSubmit={e => { e.preventDefault(); approveMut.mutate({ id: approveModal.id, data: { position, salary: parseFloat(salary) || 0 } }); }}>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label>Poste / Fonction</label>
                  <input value={position} onChange={e => setPosition(e.target.value)} placeholder="Ex: Technicien de maintenance" />
                </div>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label>Salaire mensuel (DZD)</label>
                  <input type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="Ex: 80000" min="0" />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn--ghost" onClick={() => setApproveModal(null)}>Annuler</button>
                  <button type="submit" className="btn btn--primary" disabled={approveMut.isPending}>
                    {approveMut.isPending ? 'Validation…' : '✅ Confirmer l\'approbation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
