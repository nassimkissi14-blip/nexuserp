import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client.js';
import { Plus, TrendingUp, TrendingDown, Wallet, Trash2, Edit2, RefreshCw, Wifi } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ui/ConfirmModal.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';

const treasuryAPI = {
  getAll: (params) => apiClient.get('/treasury', { params }),
  create: (data)   => apiClient.post('/treasury', data),
  update: (id, data) => apiClient.patch(`/treasury/${id}`, data),
  delete: (id)     => apiClient.delete(`/treasury/${id}`),
};

const fmt  = (n) => new Intl.NumberFormat('fr-DZ').format(Number(n) || 0) + ' DZD';
const fmtC = (n) => new Intl.NumberFormat('fr-DZ', { notation: 'compact' }).format(Number(n) || 0);

const CATEGORIES_INCOME  = ['Ventes', 'Prestations', 'Remboursement', 'Autre recette'];
const CATEGORIES_EXPENSE = ['Achats fournisseurs', 'Salaires', 'Loyer', 'Charges fiscales', 'Investissement', 'Autre charge'];

const Modal = ({ title, onClose, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
      <div className="modal__header"><h3>{title}</h3><button className="modal__close" onClick={onClose}>✕</button></div>
      <div className="modal__body">{children}</div>
    </div>
  </div>
);

/* ── monthly aggregation ── */
function buildMonthly(entries) {
  const map = {};
  entries.forEach(e => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map[key]) map[key] = { month: key, credit: 0, debit: 0 };
    if (e.type === 'CREDIT') map[key].credit += e.amount;
    else map[key].debit += e.amount;
  });
  return Object.values(map)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
    .map(m => ({
      ...m,
      label: new Date(m.month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
    }));
}

/* ── cumulative balance ── */
function buildCumulative(entries) {
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  return sorted.map(e => {
    running += e.type === 'CREDIT' ? e.amount : -e.amount;
    return {
      date: new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      solde: running,
    };
  });
}

/* ── category breakdown ── */
function buildCategories(entries) {
  const map = {};
  entries.forEach(e => {
    const cat = e.category || 'Autre';
    if (!map[cat]) map[cat] = { cat, credit: 0, debit: 0 };
    if (e.type === 'CREDIT') map[cat].credit += e.amount;
    else map[cat].debit += e.amount;
  });
  return Object.values(map).sort((a, b) => (b.credit + b.debit) - (a.credit + a.debit)).slice(0, 6);
}

const TOOLTIP_STYLE = { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 };

export default function TreasuryPage() {
  const queryClient = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirm();

  const [modal, setModal] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [form, setForm] = useState({
    type: 'CREDIT', amount: '', description: '', reference: '',
    category: CATEGORIES_INCOME[0], date: new Date().toISOString().slice(0, 10),
    label: '',
  });

  const openCreate = () => {
    setForm({ type: 'CREDIT', amount: '', description: '', reference: '', category: CATEGORIES_INCOME[0], date: new Date().toISOString().slice(0, 10), label: '' });
    setModal('create');
  };
  const openEdit = (e) => {
    setForm({ type: e.type, amount: String(e.amount), description: e.description, reference: e.reference || '', category: e.category || CATEGORIES_INCOME[0], date: e.date?.slice(0, 10) || '', label: '' });
    setModal({ type: 'edit', entry: e });
  };

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['treasury', typeFilter],
    queryFn: () => treasuryAPI.getAll(typeFilter ? { type: typeFilter } : {}),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  /* update lastRefresh when data is fetched */
  useEffect(() => { if (dataUpdatedAt) setLastRefresh(new Date(dataUpdatedAt)); }, [dataUpdatedAt]);

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

  const entries    = data?.data        || [];
  const balance    = data?.balance     || 0;
  const totalCredit = data?.totalCredit || 0;
  const totalDebit  = data?.totalDebit  || 0;

  const isNegative  = balance < 0;
  const isLow       = !isNegative && balance < totalDebit * 0.1;

  const chartData   = buildCumulative(entries);
  const monthlyData = buildMonthly(entries);
  const catData     = buildCategories(entries);

  const timeSince = Math.round((Date.now() - lastRefresh) / 1000);
  const timeSinceLabel = timeSince < 60 ? `${timeSince}s` : `${Math.round(timeSince / 60)}min`;

  return (
    <div className="page">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🏦 Trésorerie</h1>
          <p className="page-subtitle">{entries.length} opération(s)</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '5px 12px' }}>
            <Wifi size={12} color="#10b981" />
            <span>Mis à jour il y a {timeSinceLabel}</span>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}
              onClick={() => { queryClient.invalidateQueries({ queryKey: ['treasury'] }); setLastRefresh(new Date()); }}>
              <RefreshCw size={11} />
            </button>
          </div>
          <button className="btn btn--primary" onClick={openCreate}><Plus size={16} /> Nouvelle opération</button>
        </div>
      </div>

      {/* LOW BALANCE ALERT */}
      {(isNegative || isLow) && (
        <div style={{ background: isNegative ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${isNegative ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`, borderLeft: `4px solid ${isNegative ? '#ef4444' : '#f59e0b'}`, borderRadius: 10, padding: '12px 16px', fontSize: 13, color: isNegative ? '#ef4444' : '#f59e0b', display: 'flex', alignItems: 'center', gap: 10 }}>
          {isNegative ? '🔴' : '🟡'}
          <strong>{isNegative ? 'Solde négatif détecté' : 'Solde de trésorerie faible'}</strong>
          — {isNegative ? 'Le solde est en dessous de zéro.' : 'Le solde représente moins de 10% des décaissements.'}
          Vérifiez vos encaissements en attente.
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Solde actuel', value: fmt(balance), color: isNegative ? '#ef4444' : '#10b981', icon: <Wallet size={22} />, sub: isNegative ? '⚠️ Négatif' : isLow ? '⚠️ Faible' : '✅ Normal' },
          { label: 'Total encaissements', value: fmt(totalCredit), color: '#10b981', icon: <TrendingUp size={22} />, sub: `${entries.filter(e => e.type === 'CREDIT').length} opération(s)` },
          { label: 'Total décaissements', value: fmt(totalDebit), color: '#ef4444', icon: <TrendingDown size={22} />, sub: `${entries.filter(e => e.type === 'DEBIT').length} opération(s)` },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: `3px solid ${s.color}`, borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color, letterSpacing: -0.5 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CHARTS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: monthlyData.length > 1 ? '1fr 1fr' : '1fr', gap: 14 }}>
        {/* Cumulative balance chart */}
        {chartData.length > 1 && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>📈 Évolution du solde</div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={fmtC} width={55} />
                <Tooltip formatter={(v) => [fmt(v), 'Solde']} contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="solde" stroke="#6366f1" fill="url(#balGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly credit vs debit */}
        {monthlyData.length > 1 && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>📊 Flux mensuels (6 mois)</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={fmtC} width={55} />
                <Tooltip formatter={(v, name) => [fmt(v), name === 'credit' ? 'Encaissements' : 'Décaissements']} contentStyle={TOOLTIP_STYLE} />
                <Legend formatter={(v) => v === 'credit' ? 'Encaissements' : 'Décaissements'} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="credit" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
                <Bar dataKey="debit"  fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* CATEGORY BREAKDOWN */}
      {catData.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text-primary)' }}>🏷️ Répartition par catégorie</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {catData.map(c => {
              const total = c.credit + c.debit;
              const pctCredit = total ? Math.round((c.credit / total) * 100) : 0;
              return (
                <div key={c.cat} style={{ padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>{c.cat}</div>
                  {c.credit > 0 && <div style={{ fontSize: 11, color: '#10b981' }}>+{fmt(c.credit)}</div>}
                  {c.debit  > 0 && <div style={{ fontSize: 11, color: '#ef4444' }}>-{fmt(c.debit)}</div>}
                  <div style={{ marginTop: 6, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pctCredit}%`, background: '#10b981', borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[['', 'Toutes'], ['CREDIT', '📥 Encaissements'], ['DEBIT', '📤 Décaissements']].map(([val, label]) => (
          <div key={val} className={`filter-pill${typeFilter === val ? ' active' : ''}`}
            style={typeFilter === val ? {
              background: val === 'CREDIT' ? 'rgba(16,185,129,0.12)' : val === 'DEBIT' ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)',
              borderColor: val === 'CREDIT' ? 'rgba(16,185,129,0.35)' : val === 'DEBIT' ? 'rgba(239,68,68,0.35)' : 'rgba(99,102,241,0.35)',
              color: val === 'CREDIT' ? '#10b981' : val === 'DEBIT' ? '#ef4444' : '#818cf8',
            } : {}}
            onClick={() => setTypeFilter(val)}>{label}</div>
        ))}
      </div>

      {/* TABLE */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Description</th><th>Catégorie</th><th>Référence</th><th>Type</th><th style={{ textAlign: 'right' }}>Montant</th><th></th></tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={7} className="table-empty">Aucune opération de trésorerie</td></tr>
              ) : entries.map(e => (
                <tr key={e.id}>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(e.date).toLocaleDateString('fr-FR')}</td>
                  <td style={{ fontWeight: 500, fontSize: 13 }}>{e.description}</td>
                  <td><span className="tag">{e.category || '—'}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.reference || '—'}</td>
                  <td>
                    <span className={`badge badge--${e.type === 'CREDIT' ? 'green' : 'red'} badge--dot`}>
                      {e.type === 'CREDIT' ? 'Encaissement' : 'Décaissement'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: e.type === 'CREDIT' ? '#10b981' : '#ef4444' }}>
                    {e.type === 'CREDIT' ? '+' : '-'}{fmt(e.amount)}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="icon-btn" title="Modifier" onClick={() => openEdit(e)}><Edit2 size={13} /></button>
                      <button className="icon-btn icon-btn--danger" title="Supprimer" onClick={async () => { const ok = await confirm({ title: 'Supprimer ce mouvement ?', confirmLabel: 'Supprimer', variant: 'danger' }); if (ok) deleteMutation.mutate(e.id); }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FORM MODAL */}
      {(modal === 'create' || modal?.type === 'edit') && (
        <Modal title={modal?.type === 'edit' ? '✏️ Modifier l\'opération' : '💰 Nouvelle opération'} onClose={() => setModal(null)}>
          <form onSubmit={e => { e.preventDefault(); modal?.type === 'edit' ? updateMutation.mutate({ id: modal.entry.id, data: form }) : createMutation.mutate(form); }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group">
                <label>Type *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, category: e.target.value === 'CREDIT' ? CATEGORIES_INCOME[0] : CATEGORIES_EXPENSE[0] }))}>
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
                  {(form.type === 'CREDIT' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE).map(c => <option key={c}>{c}</option>)}
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
      {confirmModal}
    </div>
  );
}
