import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client.js';
import { Plus, TrendingUp, TrendingDown, Wallet, Trash2, Edit2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const treasuryAPI = {
  getAll: (params) => apiClient.get('/treasury', { params }),
  create: (data) => apiClient.post('/treasury', data),
  update: (id, data) => apiClient.patch(`/treasury/${id}`, data),
  delete: (id) => apiClient.delete(`/treasury/${id}`),
};

const fmt = (n) => new Intl.NumberFormat('fr-DZ').format(Number(n) || 0) + ' DZD';

const CATEGORIES = ['Ventes', 'Prestations', 'Achats fournisseurs', 'Salaires', 'Loyer', 'Charges fiscales', 'Investissement', 'Remboursement', 'Autre'];

const Modal = ({ title, onClose, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
      <div className="modal__header"><h3>{title}</h3><button className="modal__close" onClick={onClose}>✕</button></div>
      <div className="modal__body">{children}</div>
    </div>
  </div>
);

export default function TreasuryPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'create' | { type:'edit', entry }
  const [typeFilter, setTypeFilter] = useState('');
  const [form, setForm] = useState({ type: 'CREDIT', amount: '', description: '', reference: '', category: CATEGORIES[0], date: new Date().toISOString().slice(0, 10) });

  const openCreate = () => { setForm({ type: 'CREDIT', amount: '', description: '', reference: '', category: CATEGORIES[0], date: new Date().toISOString().slice(0, 10) }); setModal('create'); };
  const openEdit   = (e) => { setForm({ type: e.type, amount: String(e.amount), description: e.description, reference: e.reference || '', category: e.category || CATEGORIES[0], date: e.date?.slice(0, 10) || '' }); setModal({ type: 'edit', entry: e }); };

  const { data, isLoading } = useQuery({
    queryKey: ['treasury', typeFilter],
    queryFn: () => treasuryAPI.getAll(typeFilter ? { type: typeFilter } : {}),
  });

  const createMutation = useMutation({
    mutationFn: treasuryAPI.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['treasury'] }); setModal(null); toast.success('✅ Opération enregistrée'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => treasuryAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['treasury'] }); setModal(null); toast.success('✅ Opération mise à jour'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: treasuryAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['treasury'] }); toast.success('Supprimé'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const entries = data?.data || [];
  const balance = data?.balance || 0;
  const totalCredit = data?.totalCredit || 0;
  const totalDebit = data?.totalDebit || 0;

  // Build cumulative chart data by day
  const chartData = (() => {
    const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
    let running = 0;
    return sorted.map(e => {
      running += e.type === 'CREDIT' ? e.amount : -e.amount;
      return {
        date: new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        solde: running,
      };
    });
  })();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏦 Trésorerie</h1>
          <p className="page-subtitle">{entries.length} opération(s) · Solde: {fmt(balance)}</p>
        </div>
        <button className="btn btn--primary" onClick={openCreate}><Plus size={16} /> Nouvelle opération</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Solde actuel', value: fmt(balance), color: balance >= 0 ? '#10b981' : '#ef4444', icon: <Wallet size={22} /> },
          { label: 'Total encaissements', value: fmt(totalCredit), color: '#10b981', icon: <TrendingUp size={22} /> },
          { label: 'Total décaissements', value: fmt(totalDebit), color: '#ef4444', icon: <TrendingDown size={22} /> },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: `3px solid ${s.color}`, borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ color: s.color }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Évolution du solde</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => new Intl.NumberFormat('fr-DZ', { notation: 'compact' }).format(v)} />
              <Tooltip formatter={(v) => [fmt(v), 'Solde']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="solde" stroke="#6366f1" fill="url(#balGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[['', 'Toutes'], ['CREDIT', '📥 Encaissements'], ['DEBIT', '📤 Décaissements']].map(([val, label]) => (
          <button key={val} className={`btn ${typeFilter === val ? 'btn--primary' : 'btn--ghost'}`}
            style={{ fontSize: 13, padding: '6px 14px' }}
            onClick={() => setTypeFilter(val)}>{label}</button>
        ))}
      </div>

      {/* Table */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Description</th><th>Catégorie</th><th>Référence</th><th>Type</th><th style={{ textAlign: 'right' }}>Montant</th><th></th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="table-loading">Chargement…</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">Aucune opération de trésorerie</td></tr>
            ) : entries.map(e => (
              <tr key={e.id}>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(e.date).toLocaleDateString('fr-FR')}</td>
                <td style={{ fontWeight: 500, fontSize: 13 }}>{e.description}</td>
                <td><span className="tag">{e.category || '—'}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.reference || '—'}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
                    padding: '2px 8px', borderRadius: 10,
                    background: e.type === 'CREDIT' ? '#10b98122' : '#ef444422',
                    color: e.type === 'CREDIT' ? '#10b981' : '#ef4444' }}>
                    {e.type === 'CREDIT' ? '📥 Encaissement' : '📤 Décaissement'}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 14,
                  color: e.type === 'CREDIT' ? '#10b981' : '#ef4444' }}>
                  {e.type === 'CREDIT' ? '+' : '-'}{fmt(e.amount)}
                </td>
                <td>
                  <div className="table-actions">
                    <button className="icon-btn" title="Modifier" onClick={() => openEdit(e)}><Edit2 size={13} /></button>
                    <button className="icon-btn icon-btn--danger" title="Supprimer" onClick={() => { if (window.confirm('Supprimer ?')) deleteMutation.mutate(e.id); }}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === 'create' || modal?.type === 'edit') && (
        <Modal title={modal?.type === 'edit' ? '✏️ Modifier l\'opération' : '💰 Nouvelle opération'} onClose={() => setModal(null)}>
          <form onSubmit={e => { e.preventDefault(); modal?.type === 'edit' ? updateMutation.mutate({ id: modal.entry.id, data: form }) : createMutation.mutate(form); }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group">
                <label>Type *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="CREDIT">📥 Encaissement</option>
                  <option value="DEBIT">📤 Décaissement</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Description *</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Montant (DZD) *</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required min="0.01" step="0.01" />
              </div>
              <div className="form-group">
                <label>Catégorie</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Référence</label>
                <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="N° chèque, virement…" />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Annuler</button>
              <button type="submit" className="btn btn--primary" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
