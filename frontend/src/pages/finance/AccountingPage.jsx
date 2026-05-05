import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client.js';
import { Plus, BookOpen, CheckCircle, XCircle, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ui/ConfirmModal.jsx';

const accountingAPI = {
  getAll: (params) => apiClient.get('/accounting', { params }),
  create: (data) => apiClient.post('/accounting', data),
  update: (id, data) => apiClient.patch(`/accounting/${id}`, data),
  delete: (id) => apiClient.delete(`/accounting/${id}`),
};

const fmt = (n) => new Intl.NumberFormat('fr-DZ').format(Number(n) || 0) + ' DZD';

const ACCOUNT_PLANS = [
  { code: '101', label: 'Capital social' },
  { code: '106', label: 'Réserves' },
  { code: '401', label: 'Fournisseurs' },
  { code: '411', label: 'Clients' },
  { code: '512', label: 'Banque' },
  { code: '530', label: 'Caisse' },
  { code: '601', label: 'Achats marchandises' },
  { code: '607', label: 'Achats matières' },
  { code: '611', label: 'Sous-traitance' },
  { code: '641', label: 'Rémunérations personnel' },
  { code: '681', label: 'Dotations amortissements' },
  { code: '701', label: 'Ventes marchandises' },
  { code: '706', label: 'Prestations services' },
  { code: '740', label: 'Subventions' },
];

const Modal = ({ title, onClose, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
      <div className="modal__header"><h3>{title}</h3><button className="modal__close" onClick={onClose}>✕</button></div>
      <div className="modal__body">{children}</div>
    </div>
  </div>
);

const emptyLine = () => ({ accountCode: '', accountLabel: '', debit: '', credit: '' });

function JournalForm({ onSubmit, onCancel, isLoading }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), description: '' });
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);

  const setLine = (i, k, v) => {
    setLines(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [k]: v };
      if (k === 'accountCode') {
        const found = ACCOUNT_PLANS.find(a => a.code === v);
        if (found) next[i].accountLabel = found.label;
      }
      return next;
    });
  };

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, lines }); }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 16 }}>
        <div className="form-group"><label>Date *</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required /></div>
        <div className="form-group"><label>Description *</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required /></div>
      </div>

      <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Lignes d'écriture</div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-primary)', fontSize: 12 }}>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>N° compte</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Libellé</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Débit</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Crédit</th>
              <th style={{ padding: '8px 8px' }}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 8px' }}>
                  <input list={`accounts-${i}`} value={line.accountCode} onChange={e => setLine(i, 'accountCode', e.target.value)}
                    style={{ width: 80, padding: '4px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12 }} />
                  <datalist id={`accounts-${i}`}>{ACCOUNT_PLANS.map(a => <option key={a.code} value={a.code}>{a.label}</option>)}</datalist>
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <input value={line.accountLabel} onChange={e => setLine(i, 'accountLabel', e.target.value)}
                    style={{ width: '100%', padding: '4px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12 }} />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <input type="number" value={line.debit} onChange={e => setLine(i, 'debit', e.target.value)} min="0" step="0.01"
                    style={{ width: 100, textAlign: 'right', padding: '4px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, color: '#10b981', fontSize: 12 }} />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <input type="number" value={line.credit} onChange={e => setLine(i, 'credit', e.target.value)} min="0" step="0.01"
                    style={{ width: 100, textAlign: 'right', padding: '4px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, color: '#ef4444', fontSize: 12 }} />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  {lines.length > 2 && (
                    <button type="button" onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}>
                      <XCircle size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-primary)' }}>
              <td colSpan={2} style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600 }}>
                <button type="button" className="btn btn--ghost" style={{ fontSize: 11, padding: '3px 10px' }}
                  onClick={() => setLines(prev => [...prev, emptyLine()])}>+ Ligne</button>
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#10b981', fontSize: 13 }}>{new Intl.NumberFormat('fr-DZ').format(totalDebit)}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#ef4444', fontSize: 13 }}>{new Intl.NumberFormat('fr-DZ').format(totalCredit)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!isBalanced && totalDebit > 0 && (
        <div style={{ padding: '8px 12px', background: '#ef444422', border: '1px solid #ef444444', borderRadius: 6, fontSize: 12, color: '#ef4444', marginBottom: 12 }}>
          ⚠️ L'écriture n'est pas équilibrée — écart: {new Intl.NumberFormat('fr-DZ').format(Math.abs(totalDebit - totalCredit))} DZD
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
        <button type="submit" className="btn btn--primary" disabled={isLoading || !isBalanced || totalDebit === 0}>
          {isLoading ? 'Enregistrement…' : 'Enregistrer l\'écriture'}
        </button>
      </div>
    </form>
  );
}

export default function AccountingPage() {
  const queryClient = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirm();
  const [modal, setModal] = useState(null); // null | 'create' | { type:'edit', entry }
  const [editForm, setEditForm] = useState({ date: '', description: '' });
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['journal', page],
    queryFn: () => accountingAPI.getAll({ page, limit: 20 }),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: accountingAPI.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['journal'] }); setModal(null); toast.success('✅ Écriture enregistrée'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => accountingAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['journal'] }); setModal(null); toast.success('✅ Écriture modifiée'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: accountingAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['journal'] }); toast.success('Écriture supprimée'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const entries = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📒 Comptabilité</h1>
          <p className="page-subtitle">Journal général · {pagination.total || 0} écriture(s)</p>
        </div>
        <button className="btn btn--primary" onClick={() => setModal('create')}>
          <Plus size={16} /> Nouvelle écriture
        </button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr><th>Référence</th><th>Date</th><th>Description</th><th style={{ textAlign: 'right' }}>Débit</th><th style={{ textAlign: 'right' }}>Crédit</th><th>Statut</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="table-loading">Chargement…</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">
                <BookOpen size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p>Aucune écriture comptable</p>
                <button className="btn btn--ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => setModal('create')}>Créer la première écriture</button>
              </td></tr>
            ) : entries.map(entry => (
              <>
                <tr key={entry.id} style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>{entry.reference}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(entry.date).toLocaleDateString('fr-FR')}</td>
                  <td style={{ fontSize: 13 }}>{entry.description}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#10b981', fontSize: 13 }}>{fmt(entry.totalDebit)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#ef4444', fontSize: 13 }}>{fmt(entry.totalCredit)}</td>
                  <td>
                    {entry.isBalanced
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#10b981' }}><CheckCircle size={12} /> Équilibré</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#ef4444' }}><XCircle size={12} /> Déséquilibré</span>}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="icon-btn" title="Modifier" onClick={e => { e.stopPropagation(); setEditForm({ date: entry.date?.slice(0,10) || '', description: entry.description }); setModal({ type: 'edit', entry }); }}><Edit2 size={13} /></button>
                      <button className="icon-btn icon-btn--danger" title="Supprimer" onClick={async e => { e.stopPropagation(); const ok = await confirm({ title: 'Supprimer cette écriture ?', confirmLabel: 'Supprimer', variant: 'danger' }); if (ok) deleteMutation.mutate(entry.id); }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
                {expanded === entry.id && (
                  <tr key={`${entry.id}-detail`}>
                    <td colSpan={7} style={{ padding: 0 }}>
                      <div style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--border)', padding: '8px 16px' }}>
                        <table style={{ width: '100%', fontSize: 12 }}>
                          <thead>
                            <tr style={{ color: 'var(--text-muted)' }}>
                              <th style={{ textAlign: 'left', fontWeight: 500, padding: '4px 8px' }}>Compte</th>
                              <th style={{ textAlign: 'left', fontWeight: 500, padding: '4px 8px' }}>Libellé</th>
                              <th style={{ textAlign: 'right', fontWeight: 500, padding: '4px 8px' }}>Débit</th>
                              <th style={{ textAlign: 'right', fontWeight: 500, padding: '4px 8px' }}>Crédit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.lines.map(line => (
                              <tr key={line.id}>
                                <td style={{ padding: '3px 8px', fontFamily: 'monospace', color: '#6366f1' }}>{line.accountCode}</td>
                                <td style={{ padding: '3px 8px' }}>{line.accountLabel}</td>
                                <td style={{ padding: '3px 8px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{line.debit > 0 ? new Intl.NumberFormat('fr-DZ').format(line.debit) : '—'}</td>
                                <td style={{ padding: '3px 8px', textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>{line.credit > 0 ? new Intl.NumberFormat('fr-DZ').format(line.credit) : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="pagination">
          <button className="pagination__btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          <span className="pagination__info">Page {page} / {pagination.pages}</span>
          <button className="pagination__btn" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      )}

      {modal === 'create' && (
        <Modal title="📝 Nouvelle écriture comptable" onClose={() => setModal(null)}>
          <JournalForm onSubmit={(data) => createMutation.mutate(data)} onCancel={() => setModal(null)} isLoading={createMutation.isPending} />
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal title={`✏️ Modifier — ${modal.entry.reference}`} onClose={() => setModal(null)}>
          <form onSubmit={e => { e.preventDefault(); updateMutation.mutate({ id: modal.entry.id, data: editForm }); }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 16 }}>
              <div className="form-group"><label>Date *</label><input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} required /></div>
              <div className="form-group"><label>Description *</label><input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} required /></div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Annuler</button>
              <button type="submit" className="btn btn--primary" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          </form>
        </Modal>
      )}
      {confirmModal}
    </div>
  );
}
