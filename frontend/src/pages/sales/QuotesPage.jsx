import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Eye, Send, Check, Trash2, X, Mail } from 'lucide-react';
import { quotesAPI, customersAPI, productsAPI } from '../../api/client.js';
import apiClient from '../../api/client.js';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ui/ConfirmModal.jsx';

const STATUS = {
  DRAFT:    { label: 'Brouillon', color: '#64748b' },
  SENT:     { label: 'Envoyé',    color: '#3b82f6' },
  ACCEPTED: { label: 'Accepté',   color: '#10b981' },
  REJECTED: { label: 'Refusé',    color: '#ef4444' },
  EXPIRED:  { label: 'Expiré',    color: '#f59e0b' },
};
const fmt = (n) => new Intl.NumberFormat('fr-DZ').format(n) + ' DZD';

const Modal = ({ title, onClose, children, size = 'md' }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: size === 'lg' ? 760 : 580 }} onClick={e => e.stopPropagation()}>
      <div className="modal__header"><h3>{title}</h3><button className="modal__close" onClick={onClose}>✕</button></div>
      <div className="modal__body">{children}</div>
    </div>
  </div>
);

function EmailSendModal({ title, defaultTo, onClose, onSend }) {
  const [to, setTo] = useState(defaultTo);
  const [sending, setSending] = useState(false);
  const handleSend = async () => {
    if (!to) return;
    setSending(true);
    try {
      await onSend(to);
      toast.success('Email envoyé avec succès !');
      onClose();
    } catch {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };
  return (
    <Modal title={`📧 ${title}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="form-group">
          <label>Adresse email du destinataire</label>
          <input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="client@example.com" />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn--ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn--primary" onClick={handleSend} disabled={sending || !to}>
            <Mail size={14} /> {sending ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const emptyForm = () => ({
  customerId: '',
  issueDate: new Date().toISOString().split('T')[0],
  validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  notes: '',
  items: [{ description: '', productId: '', quantity: 1, unitPrice: '', discount: 0 }],
});

export default function QuotesPage() {
  const queryClient = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirm();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const { data, isLoading } = useQuery({
    queryKey: ['quotes', filterStatus, search],
    queryFn: () => quotesAPI.getAll({ status: filterStatus !== 'ALL' ? filterStatus : undefined, search: search || undefined }).then(r => r),
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => customersAPI.getAll({ limit: 200 }).then(r => r.data),
  });

  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => productsAPI.getAll({ limit: 200 }).then(r => r.data),
  });

  const quotes = data?.data || [];

  const createMutation = useMutation({
    mutationFn: quotesAPI.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotes'] }); setModal(null); toast.success('✅ Devis créé'); },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => quotesAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotes'] }); toast.success('✅ Statut mis à jour'); },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const convertMutation = useMutation({
    mutationFn: quotesAPI.convert,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('🧾 ' + (res?.message || 'Facture générée automatiquement'));
    },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: quotesAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotes'] }); toast.success('Devis supprimé'); },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const setItem = (i, key, val) => setForm(f => {
    const items = [...f.items];
    items[i] = { ...items[i], [key]: val };
    // Auto-fill price from product
    if (key === 'productId' && val) {
      const prod = (products || []).find(p => p.id === val);
      if (prod) { items[i].description = prod.name; items[i].unitPrice = prod.sellPrice; }
    }
    return { ...f, items };
  });

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { description: '', productId: '', quantity: 1, unitPrice: '', discount: 0 }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const calcSubtotal = () => form.items.reduce((s, it) => s + (Number(it.quantity) * Number(it.unitPrice || 0) * (1 - (Number(it.discount) || 0) / 100)), 0);
  const subtotal = calcSubtotal();
  const tax = subtotal * 0.19;
  const total = subtotal + tax;

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      customerId: form.customerId,
      issueDate: form.issueDate,
      validUntil: form.validUntil,
      notes: form.notes,
      items: form.items.filter(it => it.description && it.unitPrice),
    };
    createMutation.mutate(payload);
  };

  const totalValue = quotes.reduce((s, q) => s + q.totalAmount, 0);
  const acceptedValue = quotes.filter(q => q.status === 'ACCEPTED').reduce((s, q) => s + q.totalAmount, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📄 Devis</h1>
          <p className="page-subtitle">{quotes.length} devis · {quotes.filter(q => q.status === 'ACCEPTED').length} accepté(s)</p>
        </div>
        <button className="btn btn--primary" onClick={() => { setForm(emptyForm()); setModal('create'); }}><Plus size={16} /> Nouveau devis</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Valeur totale', value: fmt(totalValue), color: '#6366f1', icon: '📋' },
          { label: 'Acceptés', value: fmt(acceptedValue), color: '#10b981', icon: '✅' },
          { label: 'En attente', value: quotes.filter(q => ['DRAFT', 'SENT'].includes(q.status)).length, color: '#3b82f6', icon: '⏳' },
          { label: 'Taux d\'acceptation', value: quotes.length ? Math.round(quotes.filter(q => q.status === 'ACCEPTED').length / quotes.length * 100) + '%' : '—', color: '#f59e0b', icon: '📊' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="filters-bar">
        <div className="search-input">
          <Search size={16} className="search-input__icon" />
          <input placeholder="Référence, client…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`btn ${filterStatus === 'ALL' ? 'btn--primary' : 'btn--ghost'}`} style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setFilterStatus('ALL')}>Tous</button>
          {Object.entries(STATUS).map(([k, s]) => (
            <button key={k} className={`btn ${filterStatus === k ? 'btn--primary' : 'btn--ghost'}`} style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setFilterStatus(k)}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement…</div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead><tr><th>Référence</th><th>Client</th><th>Articles</th><th>Montant TTC</th><th>Date</th><th>Validité</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun devis</td></tr>
              ) : quotes.map(q => (
                <tr key={q.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>{q.reference}</td>
                  <td style={{ fontSize: 13 }}>{q.customer?.name}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{q.items?.length || 0} ligne(s)</td>
                  <td style={{ fontWeight: 700, fontSize: 13 }}>{fmt(q.totalAmount)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(q.issueDate).toLocaleDateString('fr-FR')}</td>
                  <td style={{ fontSize: 12, color: q.status === 'EXPIRED' ? '#f59e0b' : 'var(--text-muted)' }}>{new Date(q.validUntil).toLocaleDateString('fr-FR')}</td>
                  <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: STATUS[q.status]?.color + '22', color: STATUS[q.status]?.color }}>{STATUS[q.status]?.label}</span></td>
                  <td>
                    <div className="table-actions">
                      <button className="icon-btn" title="Voir" onClick={() => setModal({ type: 'view', quote: q })}><Eye size={13} /></button>
                      <button className="icon-btn" title="Envoyer par email" style={{ color: '#8b5cf6' }} onClick={() => setModal({ type: 'email', quote: q })}><Mail size={13} /></button>
                      {q.status === 'DRAFT' && (
                        <button className="icon-btn" title="Marquer envoyé" onClick={() => updateMutation.mutate({ id: q.id, data: { status: 'SENT' } })}><Send size={13} /></button>
                      )}
                      {['DRAFT', 'SENT'].includes(q.status) && (
                        <button className="icon-btn" title="Convertir en facture" style={{ color: '#10b981' }}
                          onClick={async () => { const ok = await confirm({ title: `Convertir ${q.reference} ?`, message: 'Une facture sera générée automatiquement.', confirmLabel: 'Convertir', variant: 'info' }); if (ok) convertMutation.mutate(q.id); }}>
                          <Check size={13} />
                        </button>
                      )}
                      {['DRAFT', 'SENT'].includes(q.status) && (
                        <button className="icon-btn icon-btn--danger" title="Supprimer" onClick={async () => { const ok = await confirm({ title: 'Supprimer ce devis ?', confirmLabel: 'Supprimer', variant: 'danger' }); if (ok) deleteMutation.mutate(q.id); }}><Trash2 size={13} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW MODAL */}
      {modal?.type === 'view' && (
        <Modal title={`📄 Devis ${modal.quote.reference}`} onClose={() => setModal(null)} size="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Client', modal.quote.customer?.name],
                ['Statut', STATUS[modal.quote.status]?.label],
                ['Date d\'émission', new Date(modal.quote.issueDate).toLocaleDateString('fr-FR')],
                ['Valide jusqu\'au', new Date(modal.quote.validUntil).toLocaleDateString('fr-FR')],
              ].map(([label, value]) => (
                <div key={label} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
            {modal.quote.items?.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Lignes du devis</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ background: 'var(--bg-primary)' }}>{['Description', 'Qté', 'PU', 'Remise', 'Total'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {modal.quote.items.map((it, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px' }}>{it.description}</td>
                        <td style={{ padding: '8px 12px' }}>{it.quantity}</td>
                        <td style={{ padding: '8px 12px' }}>{fmt(it.unitPrice)}</td>
                        <td style={{ padding: '8px 12px' }}>{it.discount}%</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700 }}>{fmt(it.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 12, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                  <div style={{ color: 'var(--text-muted)' }}>Sous-total HT : {fmt(modal.quote.subtotal)}</div>
                  <div style={{ color: 'var(--text-muted)' }}>TVA ({modal.quote.taxRate}%) : {fmt(modal.quote.taxAmount)}</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-primary)' }}>Total TTC : {fmt(modal.quote.totalAmount)}</div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* EMAIL MODAL */}
      {modal?.type === 'email' && (
        <EmailSendModal
          title={`Envoyer ${modal.quote.reference}`}
          defaultTo={modal.quote.customer?.email || ''}
          onClose={() => setModal(null)}
          onSend={(to) => apiClient.post(`/quotes/${modal.quote.id}/send-email`, { to })}
        />
      )}

      {/* CREATE MODAL */}
      {modal === 'create' && (
        <Modal title="➕ Nouveau devis" onClose={() => setModal(null)} size="lg">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div className="form-group" style={{ gridColumn: '1/-1' }}><label>Client *</label>
                  <select value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} required>
                    <option value="">— Choisir un client —</option>
                    {(customers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Date d'émission</label><input type="date" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} /></div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}><label>Valide jusqu'au</label><input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} /></div>
              </div>

              {/* Items */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Lignes du devis</div>
                {form.items.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 80px 40px', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                    <div>
                      {i === 0 && <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Description *</label>}
                      <input value={item.description} onChange={e => setItem(i, 'description', e.target.value)} placeholder="Description" required />
                    </div>
                    <div>
                      {i === 0 && <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Qté</label>}
                      <input type="number" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} min="0.01" step="0.01" />
                    </div>
                    <div>
                      {i === 0 && <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Prix unitaire</label>}
                      <input type="number" value={item.unitPrice} onChange={e => setItem(i, 'unitPrice', e.target.value)} min="0" placeholder="PU" required />
                    </div>
                    <div>
                      {i === 0 && <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Rem%</label>}
                      <input type="number" value={item.discount} onChange={e => setItem(i, 'discount', e.target.value)} min="0" max="100" />
                    </div>
                    <div style={{ paddingBottom: 1 }}>
                      {form.items.length > 1 && <button type="button" className="icon-btn icon-btn--danger" onClick={() => removeItem(i)}><X size={13} /></button>}
                    </div>
                  </div>
                ))}
                <button type="button" className="btn btn--ghost" style={{ fontSize: 12, padding: '4px 12px' }} onClick={addItem}><Plus size={12} /> Ajouter une ligne</button>
              </div>

              {/* Totals preview */}
              {subtotal > 0 && (
                <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, textAlign: 'right' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Sous-total HT : {fmt(subtotal)}</div>
                  <div style={{ color: 'var(--text-muted)' }}>TVA 19% : {fmt(tax)}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent-primary)' }}>Total TTC : {fmt(total)}</div>
                </div>
              )}

              <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ resize: 'vertical' }} /></div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Annuler</button>
              <button type="submit" className="btn btn--primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Création…' : 'Créer le devis'}</button>
            </div>
          </form>
        </Modal>
      )}
      {confirmModal}
    </div>
  );
}
