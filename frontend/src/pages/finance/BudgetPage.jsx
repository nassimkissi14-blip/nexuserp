import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client.js';
import { Plus, TrendingUp, TrendingDown, Target, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

const budgetAPI = {
  getAll: (year) => apiClient.get('/budget', { params: { year } }),
  create: (data) => apiClient.post('/budget', data),
  update: (id, data) => apiClient.patch(`/budget/${id}`, data),
  delete: (id) => apiClient.delete(`/budget/${id}`),
};

const fmt = (n) => new Intl.NumberFormat('fr-DZ', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n) || 0);
const fmtFull = (n) => new Intl.NumberFormat('fr-DZ').format(Number(n) || 0) + ' DZD';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const CATEGORIES_EXPENSE = ['Achats', 'Personnel', 'Loyer', 'Marketing', 'IT', 'Transport', 'Services', 'Maintenance', 'Autre'];
const CATEGORIES_INCOME = ['Ventes produits', 'Prestations', 'Autres revenus'];

const Modal = ({ title, onClose, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
      <div className="modal__header"><h3>{title}</h3><button className="modal__close" onClick={onClose}>✕</button></div>
      <div className="modal__body">{children}</div>
    </div>
  </div>
);

export default function BudgetPage() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [modal, setModal] = useState(null); // null | 'create' | { type:'edit', line }
  const [form, setForm] = useState({ year: currentYear, month: '', category: CATEGORIES_EXPENSE[0], label: '', budgeted: '', type: 'EXPENSE', notes: '' });

  const openCreate = () => { setForm({ year, month: '', category: CATEGORIES_EXPENSE[0], label: '', budgeted: '', type: 'EXPENSE', notes: '' }); setModal('create'); };
  const openEdit   = (line) => { setForm({ year: line.year, month: line.month || '', category: line.category, label: line.label, budgeted: String(line.budgeted), type: line.type, notes: line.notes || '' }); setModal({ type: 'edit', line }); };

  const { data, isLoading } = useQuery({
    queryKey: ['budget', year],
    queryFn: () => budgetAPI.getAll(year),
  });

  const createMutation = useMutation({
    mutationFn: budgetAPI.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['budget'] }); setModal(null); toast.success('✅ Ligne budgétaire ajoutée'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => budgetAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['budget'] }); setModal(null); toast.success('✅ Ligne mise à jour'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: budgetAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['budget'] }); toast.success('Supprimé'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const lines = data?.data || [];
  const totalBudgeted = data?.totalBudgeted || 0;
  const totalActual = data?.totalActual || 0;
  const income = lines.filter(l => l.type === 'INCOME');
  const expenses = lines.filter(l => l.type === 'EXPENSE');

  const groupBy = (arr, key) => arr.reduce((acc, item) => {
    const k = item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});

  const expenseByCategory = groupBy(expenses, 'category');
  const incomeByCategory = groupBy(income, 'category');

  const BudgetGroup = ({ title, color, groups }) => (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: color + '11', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        <span style={{ fontWeight: 700, fontSize: 14, color }}>{title}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {fmtFull(Object.values(groups).flat().reduce((s, l) => s + l.budgeted, 0))} budgété
        </span>
      </div>
      {Object.entries(groups).length === 0 ? (
        <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Aucune ligne</div>
      ) : Object.entries(groups).map(([cat, items]) => (
        <div key={cat} style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'var(--bg-primary)' }}>
            {cat}
          </div>
          {items.map(line => {
            const pct = line.budgeted > 0 ? Math.min(100, (line.actual / line.budgeted) * 100) : 0;
            const over = line.actual > line.budgeted;
            return (
              <div key={line.id} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{line.label}</span>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Budget: <strong style={{ color: 'var(--text-primary)' }}>{fmt(line.budgeted)}</strong></span>
                      <span style={{ color: over ? '#ef4444' : '#10b981' }}>Réel: <strong>{fmt(line.actual)}</strong></span>
                      {line.month && <span style={{ color: 'var(--text-muted)' }}>{MONTHS[line.month - 1]}</span>}
                    </div>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: over ? '#ef4444' : color, borderRadius: 2, transition: 'width 0.5s' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="icon-btn" title="Modifier" onClick={() => openEdit(line)}><Edit2 size={12} /></button>
                  <button className="icon-btn icon-btn--danger" title="Supprimer" onClick={() => { if (window.confirm('Supprimer cette ligne ?')) deleteMutation.mutate(line.id); }}><Trash2 size={12} /></button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">💵 Budget</h1>
          <p className="page-subtitle">Prévisions & réalisations {year}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            style={{ padding: '8px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 14 }}>
            {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn--primary" onClick={openCreate}><Plus size={16} /> Ajouter</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Budget total', value: fmtFull(totalBudgeted), color: '#6366f1', icon: <Target size={20} /> },
          { label: 'Réel total', value: fmtFull(totalActual), color: totalActual > totalBudgeted ? '#ef4444' : '#10b981', icon: totalActual > totalBudgeted ? <TrendingUp size={20} /> : <TrendingDown size={20} /> },
          { label: 'Écart', value: fmtFull(Math.abs(totalBudgeted - totalActual)), color: totalActual > totalBudgeted ? '#ef4444' : '#10b981', icon: '📊' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: `3px solid ${s.color}`, borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ color: s.color, fontSize: 24 }}>{typeof s.icon === 'string' ? s.icon : s.icon}</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement…</div>
      ) : lines.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <Target size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3>Aucun budget défini pour {year}</h3>
          <button className="btn btn--primary" style={{ marginTop: 12 }} onClick={openCreate}>Définir le budget</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <BudgetGroup title="Charges" color="#ef4444" groups={expenseByCategory} />
          <BudgetGroup title="Produits" color="#10b981" groups={incomeByCategory} />
        </div>
      )}

      {(modal === 'create' || modal?.type === 'edit') && (
        <Modal title={modal?.type === 'edit' ? '✏️ Modifier la ligne budgétaire' : '➕ Ligne budgétaire'} onClose={() => setModal(null)}>
          <form onSubmit={e => { e.preventDefault(); modal?.type === 'edit' ? updateMutation.mutate({ id: modal.line.id, data: form }) : createMutation.mutate(form); }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, category: e.target.value === 'EXPENSE' ? CATEGORIES_EXPENSE[0] : CATEGORIES_INCOME[0] }))}>
                  <option value="EXPENSE">Charge</option>
                  <option value="INCOME">Produit</option>
                </select>
              </div>
              <div className="form-group">
                <label>Catégorie</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {(form.type === 'EXPENSE' ? CATEGORIES_EXPENSE : CATEGORIES_INCOME).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Libellé *</label>
                <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Montant budgété (DZD) *</label>
                <input type="number" value={form.budgeted} onChange={e => setForm(f => ({ ...f, budgeted: e.target.value }))} required min="0" />
              </div>
              <div className="form-group">
                <label>Mois (optionnel)</label>
                <select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}>
                  <option value="">Annuel</option>
                  {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Annuler</button>
              <button type="submit" className="btn btn--primary" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Enregistrement…' : modal?.type === 'edit' ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
