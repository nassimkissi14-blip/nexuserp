import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Eye, Check, X, Download, Trash2, Mail } from 'lucide-react';
import { invoicesAPI, customersAPI } from '../../api/client.js';
import apiClient from '../../api/client.js';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { QrButton, QrBatchButton } from '../../components/ui/QrCodeWidget.jsx';
import { useAuthStore } from '../../store/index.js';

const kpiStagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const fadeUp  = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.26, ease: [0.4,0,0.2,1] } } };
const rowAnim = { hidden: { opacity: 0, x: -10 }, show: (i) => ({ opacity: 1, x: 0, transition: { delay: i * 0.035, duration: 0.2 } }) };

/* ─── PDF/Print generator ────────────────────────────────────── */
function printInvoice(inv, company = {}) {
  const fmt = (n) => new Intl.NumberFormat('fr-DZ').format(n || 0) + ' DZD';
  const date = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  // Build line items rows
  const hasItems = Array.isArray(inv.items) && inv.items.length > 0;
  const lineItemsHtml = hasItems
    ? inv.items.map((item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${item.description}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">${fmt(item.unitPrice)}</td>
          <td style="text-align:right;font-weight:700">${fmt(item.totalPrice)}</td>
        </tr>`).join('')
    : `<tr>
        <td>1</td>
        <td><strong>Prestations de services</strong></td>
        <td style="text-align:center">1</td>
        <td style="text-align:right">${fmt(inv.subtotal)}</td>
        <td style="text-align:right;font-weight:700">${fmt(inv.subtotal)}</td>
      </tr>`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Facture ${inv.reference}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
    .logo-block h1 { font-size: 28px; font-weight: 900; color: #4f46e5; letter-spacing: -1px; }
    .logo-block p { font-size: 12px; color: #64748b; margin-top: 2px; }
    .invoice-meta { text-align: right; }
    .invoice-meta .ref { font-size: 22px; font-weight: 800; color: #1e293b; }
    .invoice-meta .status { display: inline-block; margin-top: 6px; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
      background: ${inv.status === 'PAID' ? '#dcfce7' : inv.status === 'OVERDUE' ? '#fee2e2' : '#dbeafe'};
      color: ${inv.status === 'PAID' ? '#166534' : inv.status === 'OVERDUE' ? '#991b1b' : '#1d4ed8'}; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; padding: 24px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
    .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; margin-bottom: 8px; }
    .party-name { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .party-detail { font-size: 12px; color: #64748b; line-height: 1.6; }
    .dates { display: flex; gap: 24px; margin-bottom: 32px; }
    .date-item { flex: 1; padding: 14px 18px; background: #f1f5f9; border-radius: 8px; }
    .date-label { font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
    .date-value { font-size: 14px; font-weight: 700; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #1e293b; }
    th { padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:last-child { border-bottom: none; }
    td { padding: 14px 16px; font-size: 13px; color: #334155; }
    .totals { margin-left: auto; width: 300px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9; }
    .totals-row.total { padding: 14px 18px; background: #4f46e5; border-radius: 8px; margin-top: 8px; }
    .totals-row.total span { font-size: 16px; font-weight: 800; color: white; }
    .notes { margin-top: 32px; padding: 16px 20px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; font-size: 12px; color: #78350f; }
    .footer { margin-top: 48px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 24px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 24px; }
    }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-block">
      <h1>NexusERP</h1>
      <p>Système de Gestion d'Entreprise</p>
    </div>
    <div class="invoice-meta">
      <div class="ref">FACTURE</div>
      <div style="font-size:18px;font-weight:700;color:#6366f1;margin-top:4px">${inv.reference}</div>
      <div class="status">${inv.status === 'PAID' ? 'Payée' : inv.status === 'OVERDUE' ? 'En retard' : inv.status === 'SENT' ? 'Envoyée' : 'Brouillon'}</div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="party-label">Émetteur</div>
      <div class="party-name">${company.name || 'NexusERP'}</div>
      <div class="party-detail">${company.address || ''}${company.address && company.email ? '<br/>' : ''}${company.email || ''}</div>
    </div>
    <div>
      <div class="party-label">Facturé à</div>
      <div class="party-name">${inv.customer?.name || '—'}</div>
      <div class="party-detail">${inv.customer?.email || ''}${inv.customer?.phone ? '<br/>' + inv.customer.phone : ''}</div>
    </div>
  </div>

  <div class="dates">
    <div class="date-item"><div class="date-label">Date d'émission</div><div class="date-value">${date(inv.issueDate)}</div></div>
    <div class="date-item"><div class="date-label">Date d'échéance</div><div class="date-value">${date(inv.dueDate)}</div></div>
    ${inv.paidAt ? `<div class="date-item"><div class="date-label">Date de paiement</div><div class="date-value">${date(inv.paidAt)}</div></div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th style="text-align:center">Qté</th>
        <th style="text-align:right">P.U. HT</th>
        <th style="text-align:right">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHtml}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Sous-total HT</span><span>${fmt(inv.subtotal)}</span></div>
    <div class="totals-row"><span>TVA (${inv.taxRate}%)</span><span>${fmt(inv.taxAmount)}</span></div>
    <div class="totals-row total"><span>Total TTC</span><span>${fmt(inv.totalAmount)}</span></div>
  </div>

  ${inv.notes ? `<div class="notes"><strong>Notes :</strong> ${inv.notes}</div>` : ''}

  <div class="footer">
    Facture générée par NexusERP — Tous droits réservés<br/>
    Cette facture fait foi de la prestation décrite ci-dessus.
  </div>
</div>
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
}

/* ─── Helpers ────────────────────────────────────────────────── */
const STATUS = {
  DRAFT:     { label: 'Brouillon', color: '#64748b' },
  SENT:      { label: 'Envoyée',   color: '#3b82f6' },
  PAID:      { label: 'Payée',     color: '#10b981' },
  OVERDUE:   { label: 'En retard', color: '#ef4444' },
  CANCELLED: { label: 'Annulée',   color: '#475569' },
};
const fmt = (n) => new Intl.NumberFormat('fr-DZ').format(n || 0) + ' DZD';

const Modal = ({ title, onClose, children, size = 'md' }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: size === 'lg' ? 760 : size === 'xl' ? 900 : 540 }} onClick={e => e.stopPropagation()}>
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

const emptyItem = () => ({ description: '', quantity: 1, unitPrice: '' });
const emptyForm = () => ({
  customerId: '',
  taxRate: 19,
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  notes: '',
  items: [emptyItem()],
});

/* ─── Line Items Editor ──────────────────────────────────────── */
function LineItemsEditor({ items, onChange }) {
  const updateItem = (idx, field, value) => {
    const updated = items.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  const addItem = () => onChange([...items, emptyItem()]);

  const removeItem = (idx) => {
    if (items.length === 1) return;
    onChange(items.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  }, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 80px', gap: 8, padding: '0 4px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Description</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Qté</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>P.U. HT (DZD)</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Total</div>
      </div>

      {/* Rows */}
      {items.map((item, idx) => {
        const rowTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
        return (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 80px 28px', gap: 8, alignItems: 'center' }}>
            <input
              value={item.description}
              onChange={e => updateItem(idx, 'description', e.target.value)}
              placeholder="Description de la prestation…"
              required
              style={{ padding: '8px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, color: 'var(--text-primary)', outline: 'none', width: '100%' }}
            />
            <input
              type="number"
              value={item.quantity}
              onChange={e => updateItem(idx, 'quantity', e.target.value)}
              min="0.01"
              step="any"
              required
              style={{ padding: '8px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, color: 'var(--text-primary)', outline: 'none', width: '100%' }}
            />
            <input
              type="number"
              value={item.unitPrice}
              onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
              min="0"
              step="any"
              required
              placeholder="0"
              style={{ padding: '8px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, color: 'var(--text-primary)', outline: 'none', width: '100%' }}
            />
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>
              {new Intl.NumberFormat('fr-DZ').format(rowTotal)}
            </div>
            <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1}
              style={{ background: 'none', border: 'none', cursor: items.length === 1 ? 'not-allowed' : 'pointer', color: '#ef4444', opacity: items.length === 1 ? 0.3 : 1, padding: 4, display: 'flex', alignItems: 'center' }}>
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}

      {/* Add row button */}
      <button type="button" onClick={addItem}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'none', border: '1px dashed var(--border)', borderRadius: 7, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'inherit', width: 'fit-content', transition: 'all .15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
        <Plus size={12} /> Ajouter une ligne
      </button>

      {/* Subtotal preview */}
      {subtotal > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          Sous-total HT : <strong style={{ marginLeft: 8, color: 'var(--accent-primary)' }}>{fmt(subtotal)}</strong>
        </div>
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', filterStatus, search],
    queryFn: () => invoicesAPI.getAll({ status: filterStatus !== 'ALL' ? filterStatus : undefined, search: search || undefined }),
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => customersAPI.getAll({ limit: 200 }).then(r => r.data),
  });

  const invoices = data?.data || [];
  const total   = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const paid    = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.totalAmount, 0);
  const overdue = invoices.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + i.totalAmount, 0);
  const pending = invoices.filter(i => ['SENT', 'DRAFT'].includes(i.status)).reduce((s, i) => s + i.totalAmount, 0);

  const createMutation = useMutation({
    mutationFn: invoicesAPI.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); setModal(null); toast.success('✅ Facture créée'); },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const payMutation = useMutation({
    mutationFn: invoicesAPI.pay,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['treasury'] });
      queryClient.invalidateQueries({ queryKey: ['accounting'] });
      toast.success('💰 ' + (res?.message || 'Facture payée — trésorerie mise à jour'));
    },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const cancelMutation = useMutation({
    mutationFn: invoicesAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Facture annulée'); },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const validItems = form.items.filter(item => item.description.trim() && Number(item.unitPrice) > 0);
    if (validItems.length === 0) { toast.error('Ajoutez au moins une ligne de facturation'); return; }
    createMutation.mutate({
      customerId: form.customerId,
      taxRate: Number(form.taxRate),
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      notes: form.notes,
      items: validItems.map(item => ({
        description: item.description,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice),
      })),
    });
  };

  // Computed subtotal/total for form preview
  const formSubtotal = form.items.reduce((sum, item) =>
    sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const formTotal = formSubtotal * (1 + Number(form.taxRate) / 100);

  return (
    <div className="page">
      <motion.div className="page-header" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.4,0,0.2,1] }}>
        <div>
          <h1 className="page-title page-title--gradient">🧾 Factures</h1>
          <p className="page-subtitle">{invoices.length} facture(s) · {invoices.filter(i => i.status === 'PAID').length} payée(s)</p>
        </div>
        <motion.div style={{ display: 'flex', gap: 8 }} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.28, delay: 0.08 }}>
          <QrBatchButton type="invoice" items={invoices} label="Factures — QR Badges" filename="qr-factures" />
          <button className="btn btn--primary" onClick={() => { setForm(emptyForm()); setModal('create'); }}>
            <Plus size={16} /> Nouvelle facture
          </button>
        </motion.div>
      </motion.div>

      {/* KPIs */}
      <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }} variants={kpiStagger} initial="hidden" animate="show">
        {[
          { label: 'Total facturé', value: fmt(total),   color: '#6366f1', icon: '📋' },
          { label: 'Encaissé',      value: fmt(paid),    color: '#10b981', icon: '✅' },
          { label: 'En attente',    value: fmt(pending), color: '#3b82f6', icon: '⏳' },
          { label: 'En retard',     value: fmt(overdue), color: '#ef4444', icon: '⚠️' },
        ].map((k, i) => (
          <motion.div key={i} variants={fadeUp}
            whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18, borderTop: `2px solid ${k.color}` }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Filtres */}
      <div className="filters-bar">
        <div className="search-input">
          <Search size={16} className="search-input__icon" />
          <input placeholder="Référence, client…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`btn ${filterStatus === 'ALL' ? 'btn--primary' : 'btn--ghost'}`} style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setFilterStatus('ALL')}>Toutes</button>
          {Object.entries(STATUS).map(([k, s]) => (
            <button key={k} className={`btn ${filterStatus === k ? 'btn--primary' : 'btn--ghost'}`} style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setFilterStatus(k)}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement…</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 900 }}>
            <thead><tr><th>Référence</th><th>Client</th><th>HT</th><th>TVA</th><th>TTC</th><th>Émission</th><th>Échéance</th><th>Statut</th><th style={{ textAlign: 'center', width: 44 }}>QR</th><th style={{ position: 'sticky', right: 0, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)' }}>Actions</th></tr></thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune facture</td></tr>
              ) : invoices.map((inv, i) => (
                <motion.tr key={inv.id} custom={i} variants={rowAnim} initial="hidden" animate="show" whileHover={{ backgroundColor: 'rgba(99,102,241,0.04)' }}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>{inv.reference}</td>
                  <td style={{ fontSize: 13 }}>{inv.customer?.name}</td>
                  <td style={{ fontSize: 13 }}>{fmt(inv.subtotal)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{inv.taxRate}%</td>
                  <td style={{ fontWeight: 700, fontSize: 13 }}>{fmt(inv.totalAmount)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(inv.issueDate).toLocaleDateString('fr-FR')}</td>
                  <td style={{ fontSize: 12, color: inv.status === 'OVERDUE' ? '#ef4444' : 'var(--text-muted)' }}>{new Date(inv.dueDate).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: STATUS[inv.status]?.color + '22', color: STATUS[inv.status]?.color }}>
                      {STATUS[inv.status]?.label}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <QrButton type="invoice" id={inv.id} name={inv.reference} extraData={{ customer: inv.customer?.name, status: inv.status }} />
                  </td>
                  <td style={{ position: 'sticky', right: 0, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)' }}>
                    <div className="table-actions">
                      <button className="icon-btn" title="Voir" onClick={() => setModal({ type: 'view', invoice: inv })}><Eye size={13} /></button>
                      <button className="icon-btn" title="Imprimer / PDF" style={{ color: '#6366f1' }} onClick={() => printInvoice(inv, user?.company)}>
                        <Download size={13} />
                      </button>
                      <button className="icon-btn" title="Envoyer par email" style={{ color: '#8b5cf6' }}
                        onClick={() => setModal({ type: 'email', invoice: inv })}>
                        <Mail size={13} />
                      </button>
                      {['DRAFT', 'SENT', 'OVERDUE'].includes(inv.status) && (
                        <button className="icon-btn" title="Marquer payée" style={{ color: '#10b981' }}
                          onClick={() => { if (window.confirm(`Marquer ${inv.reference} comme payée ?`)) payMutation.mutate(inv.id); }}>
                          <Check size={13} />
                        </button>
                      )}
                      {['DRAFT'].includes(inv.status) && (
                        <button className="icon-btn icon-btn--danger" title="Annuler"
                          onClick={() => { if (window.confirm('Annuler cette facture ?')) cancelMutation.mutate(inv.id); }}>
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW MODAL */}
      {modal?.type === 'view' && (
        <Modal title={`🧾 Facture ${modal.invoice.reference}`} onClose={() => setModal(null)} size="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn--ghost" style={{ fontSize: 12 }} onClick={() => printInvoice(modal.invoice, user?.company)}>
                <Download size={13} /> Télécharger PDF
              </button>
              {['DRAFT', 'SENT', 'OVERDUE'].includes(modal.invoice.status) && (
                <button className="btn btn--primary" style={{ fontSize: 12 }} onClick={() => { payMutation.mutate(modal.invoice.id); setModal(null); }}>
                  <Check size={13} /> Marquer payée
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Client', modal.invoice.customer?.name],
                ['Statut', STATUS[modal.invoice.status]?.label],
                ['Date d\'émission', new Date(modal.invoice.issueDate).toLocaleDateString('fr-FR')],
                ['Date d\'échéance', new Date(modal.invoice.dueDate).toLocaleDateString('fr-FR')],
                ['Sous-total HT', fmt(modal.invoice.subtotal)],
                [`TVA (${modal.invoice.taxRate}%)`, fmt(modal.invoice.taxAmount)],
                ['Total TTC', fmt(modal.invoice.totalAmount)],
                ['Commande liée', modal.invoice.order?.reference || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Line items table in view modal */}
            {Array.isArray(modal.invoice.items) && modal.invoice.items.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Lignes de facturation</div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ minWidth: 500 }}>
                    <thead><tr><th>#</th><th>Description</th><th>Qté</th><th>P.U. HT</th><th>Total HT</th></tr></thead>
                    <tbody>
                      {modal.invoice.items.map((item, i) => (
                        <tr key={item.id}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                          <td>{item.description}</td>
                          <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                          <td>{fmt(item.unitPrice)}</td>
                          <td style={{ fontWeight: 600 }}>{fmt(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {modal.invoice.notes && (
              <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Notes</div>
                <div style={{ fontSize: 13 }}>{modal.invoice.notes}</div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* EMAIL MODAL */}
      {modal?.type === 'email' && (
        <EmailSendModal
          title={`Envoyer ${modal.invoice.reference}`}
          defaultTo={modal.invoice.customer?.email || ''}
          onClose={() => setModal(null)}
          onSend={(to) => apiClient.post(`/invoices/${modal.invoice.id}/send-email`, { to })}
        />
      )}

      {/* CREATE MODAL */}
      {modal === 'create' && (
        <Modal title="➕ Nouvelle facture" onClose={() => setModal(null)} size="xl">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Client *</label>
                <select value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} required>
                  <option value="">— Choisir un client —</option>
                  {(customers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Date d'émission</label>
                <input type="date" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Date d'échéance</label>
                <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Taux TVA (%)</label>
                <input type="number" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))} min="0" max="100" />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Remarques optionnelles…" />
              </div>
            </div>

            {/* Line items */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Lignes de facturation *</div>
              <LineItemsEditor items={form.items} onChange={(items) => setForm(f => ({ ...f, items }))} />
            </div>

            {/* Total preview */}
            {formSubtotal > 0 && (
              <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8, padding: '12px 16px', marginBottom: 14, display: 'flex', justifyContent: 'flex-end', gap: 24, fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>HT : <strong>{fmt(formSubtotal)}</strong></span>
                <span style={{ color: 'var(--text-muted)' }}>TVA {form.taxRate}% : <strong>{fmt(formSubtotal * Number(form.taxRate) / 100)}</strong></span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>TTC : <strong>{fmt(formTotal)}</strong></span>
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Annuler</button>
              <button type="submit" className="btn btn--primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Création…' : 'Créer la facture'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
