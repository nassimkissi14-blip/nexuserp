import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client.js';
import { Plus, Megaphone, Trash2, Edit2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ui/ConfirmModal.jsx';

const announcementsAPI = {
  getAll: () => apiClient.get('/announcements'),
  create: (data) => apiClient.post('/announcements', data),
  update: (id, data) => apiClient.patch(`/announcements/${id}`, data),
  delete: (id) => apiClient.delete(`/announcements/${id}`),
};

const PRIORITY_CONFIG = {
  LOW:    { label: 'Faible',  color: '#64748b', bg: '#64748b22', icon: '💬' },
  NORMAL: { label: 'Normal',  color: '#6366f1', bg: '#6366f122', icon: '📢' },
  HIGH:   { label: 'Élevé',   color: '#f59e0b', bg: '#f59e0b22', icon: '⚠️' },
  URGENT: { label: 'Urgent',  color: '#ef4444', bg: '#ef444422', icon: '🚨' },
};

const Modal = ({ title, onClose, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
      <div className="modal__header"><h3>{title}</h3><button className="modal__close" onClick={onClose}>✕</button></div>
      <div className="modal__body">{children}</div>
    </div>
  </div>
);

const emptyForm = () => ({ title: '', content: '', priority: 'NORMAL', expiresAt: '' });

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirm();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: announcementsAPI.getAll,
  });

  const createMutation = useMutation({
    mutationFn: announcementsAPI.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcements'] }); setModal(null); toast.success('✅ Annonce publiée'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => announcementsAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcements'] }); setModal(null); toast.success('✅ Annonce mise à jour'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: announcementsAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcements'] }); toast.success('Annonce supprimée'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const announcements = data?.data || [];
  const active = announcements.filter(a => a.isActive).length;

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, expiresAt: form.expiresAt || null };
    if (modal?.type === 'edit') {
      updateMutation.mutate({ id: modal.ann.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📢 Annonces</h1>
          <p className="page-subtitle">{announcements.length} annonce(s) · {active} active(s)</p>
        </div>
        <button className="btn btn--primary" onClick={() => { setForm(emptyForm()); setModal('create'); }}>
          <Plus size={16} /> Nouvelle annonce
        </button>
      </div>

      {/* Priority filter badges */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Object.entries(PRIORITY_CONFIG).filter(([p]) => announcements.some(a => a.priority === p)).map(([p, cfg]) => (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: cfg.bg, border: `1px solid ${cfg.color}44`, borderRadius: 20, fontSize: 12, color: cfg.color, fontWeight: 600 }}>
            {cfg.icon} {cfg.label} ({announcements.filter(a => a.priority === p).length})
          </div>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement…</div>
      ) : announcements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <Megaphone size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3>Aucune annonce</h3>
          <p style={{ fontSize: 13 }}>Publiez votre première annonce pour toute l'équipe</p>
          <button className="btn btn--primary" style={{ marginTop: 16 }} onClick={() => { setForm(emptyForm()); setModal('create'); }}>
            Créer une annonce
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {announcements.map(ann => {
            const cfg = PRIORITY_CONFIG[ann.priority] || PRIORITY_CONFIG.NORMAL;
            const isExpired = ann.expiresAt && new Date(ann.expiresAt) < new Date();
            return (
              <div key={ann.id} style={{
                background: 'var(--bg-card)',
                border: `1px solid var(--border)`,
                borderLeft: `4px solid ${ann.isActive && !isExpired ? cfg.color : '#334155'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '18px 20px',
                opacity: !ann.isActive || isExpired ? 0.6 : 1,
                transition: 'var(--transition)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{ann.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Par {ann.author?.firstName} {ann.author?.lastName} · {new Date(ann.createdAt).toLocaleDateString('fr-FR')}
                        {ann.expiresAt && ` · Expire: ${new Date(ann.expiresAt).toLocaleDateString('fr-FR')}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 500, background: ann.isActive ? '#10b98122' : '#64748b22', color: ann.isActive ? '#10b981' : '#64748b' }}>
                      {ann.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <div className="table-actions">
                      <button className="icon-btn" title="Modifier" onClick={() => { setForm({ title: ann.title, content: ann.content, priority: ann.priority, expiresAt: ann.expiresAt?.slice(0, 10) || '' }); setModal({ type: 'edit', ann }); }}>
                        <Edit2 size={13} />
                      </button>
                      <button className="icon-btn" title={ann.isActive ? 'Désactiver' : 'Activer'}
                        onClick={() => updateMutation.mutate({ id: ann.id, data: { isActive: !ann.isActive } })}>
                        {ann.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button className="icon-btn icon-btn--danger" title="Supprimer"
                        onClick={async () => { const ok = await confirm({ title: 'Supprimer cette annonce ?', confirmLabel: 'Supprimer', variant: 'danger' }); if (ok) deleteMutation.mutate(ann.id); }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {ann.content}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {(modal === 'create' || modal?.type === 'edit') && (
        <Modal title={modal?.type === 'edit' ? '✏️ Modifier l\'annonce' : '📢 Nouvelle annonce'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
              <div className="form-group"><label>Titre *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
              <div className="form-group">
                <label>Contenu *</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required rows={5}
                  style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label>Priorité</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {Object.entries(PRIORITY_CONFIG).map(([p, cfg]) => <option key={p} value={p}>{cfg.icon} {cfg.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Expire le (optionnel)</label>
                  <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Annuler</button>
              <button type="submit" className="btn btn--primary" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Publication…' : modal?.type === 'edit' ? 'Mettre à jour' : 'Publier'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {confirmModal}
    </div>
  );
}
