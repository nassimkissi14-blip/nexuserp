import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsAPI } from '../../api/client.js';
import { Search, Plus, MoreVertical, Edit2, Trash2, AlertTriangle, Printer, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ImportModal from '../../components/ImportModal.jsx';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] } } };
import { QrButton, QrBatchButton } from '../../components/ui/QrCodeWidget.jsx';

const DEFAULT_CATEGORIES = ['Équipements', 'Matériaux', 'Consommables', 'Pièces détachées'];
const fmt = (n) => new Intl.NumberFormat('fr-DZ').format(Number(n) || 0) + ' DZD';

/* ─── Print product list ─────────────────────────────────────── */
function printProducts(products) {
  const rows = products.map((p, i) => {
    const status = p.stockQty === 0 ? 'Rupture' : p.stockQty <= p.minStockQty ? 'Stock faible' : 'En stock';
    const statusColor = p.stockQty === 0 ? '#ef4444' : p.stockQty <= p.minStockQty ? '#f59e0b' : '#10b981';
    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${p.name}</strong>${p.location ? `<br/><span style="font-size:11px;color:#94a3b8">${p.location}</span>` : ''}</td>
        <td><code>${p.sku}</code></td>
        <td>${p.category || '—'}</td>
        <td style="text-align:right">${new Intl.NumberFormat('fr-DZ').format(p.buyPrice)} DZD</td>
        <td style="text-align:right;color:#10b981;font-weight:600">${new Intl.NumberFormat('fr-DZ').format(p.sellPrice)} DZD</td>
        <td style="text-align:center;font-weight:700">${p.stockQty} ${p.unit}</td>
        <td style="text-align:center;color:#94a3b8">${p.minStockQty} ${p.unit}</td>
        <td style="text-align:center"><span style="padding:2px 8px;border-radius:12px;font-size:11px;background:${statusColor}22;color:${statusColor};font-weight:600">${status}</span></td>
      </tr>`;
  }).join('');

  const totalValue = products.reduce((s, p) => s + p.stockQty * p.buyPrice, 0);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Catalogue Produits</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
    .logo h1 { font-size: 24px; font-weight: 900; color: #4f46e5; }
    .logo p { font-size: 12px; color: #64748b; margin-top: 2px; }
    .meta { text-align: right; font-size: 12px; color: #64748b; }
    .meta .title { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    .kpis { display: flex; gap: 16px; margin-bottom: 24px; }
    .kpi { flex: 1; padding: 14px 18px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; }
    .kpi-value { font-size: 18px; font-weight: 800; color: #4f46e5; }
    .kpi-label { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #1e293b; }
    th { padding: 10px 12px; text-align: left; color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 700; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    td { padding: 10px 12px; vertical-align: middle; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
    .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 16px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo"><h1>NexusERP</h1><p>Gestion des stocks</p></div>
    <div class="meta">
      <div class="title">Catalogue Produits</div>
      <div>Édité le ${new Date().toLocaleDateString('fr-FR')}</div>
      <div>${products.length} produit(s)</div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="kpi-value">${products.length}</div><div class="kpi-label">Total produits</div></div>
    <div class="kpi"><div class="kpi-value">${products.filter(p => p.stockQty > p.minStockQty).length}</div><div class="kpi-label">En stock</div></div>
    <div class="kpi"><div class="kpi-value">${products.filter(p => p.stockQty <= p.minStockQty).length}</div><div class="kpi-label">Stock faible / rupture</div></div>
    <div class="kpi"><div class="kpi-value">${new Intl.NumberFormat('fr-DZ').format(totalValue)} DZD</div><div class="kpi-label">Valeur totale stock</div></div>
  </div>

  <table>
    <thead>
      <tr><th>#</th><th>Produit</th><th>SKU</th><th>Catégorie</th><th style="text-align:right">Prix achat</th><th style="text-align:right">Prix vente</th><th style="text-align:center">Stock</th><th style="text-align:center">Seuil min</th><th style="text-align:center">Statut</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">Imprimé depuis NexusERP — Catalogue généré automatiquement</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1100,height=800');
  win.document.write(html);
  win.document.close();
}

/* ─── Action dropdown ────────────────────────────────────────── */
function ActionMenu({ product, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="icon-btn"
        onClick={() => setOpen(o => !o)}
        title="Actions"
        style={{ color: open ? 'var(--accent-primary)' : undefined }}
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 100,
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)', minWidth: 140, overflow: 'hidden',
        }}>
          <button
            onClick={() => { setOpen(false); onEdit(product); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', textAlign: 'left', transition: 'background .1s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Edit2 size={13} /> Modifier
          </button>
          <div style={{ height: 1, background: 'var(--border)' }} />
          <button
            onClick={() => { setOpen(false); onDelete(product); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ef4444', textAlign: 'left', transition: 'background .1s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Trash2 size={13} /> Archiver
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Modal ──────────────────────────────────────────────────── */
const Modal = ({ title, onClose, children }) => (
  <AnimatePresence>
    <motion.div className="modal-overlay" onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="modal" onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 26 } }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}>
        <div className="modal__header">
          <h3>{title}</h3>
          <motion.button className="modal__close" onClick={onClose} whileHover={{ rotate: 90 }} whileTap={{ scale: 0.85 }}>✕</motion.button>
        </div>
        <div className="modal__body">{children}</div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

/* ─── Product form ───────────────────────────────────────────── */
const ProductForm = ({ initial, onSubmit, onCancel, isLoading }) => {
  const [form, setForm] = useState(initial || {
    name: '', sku: '', category: DEFAULT_CATEGORIES[0], unit: 'pcs',
    buyPrice: '', sellPrice: '', stockQty: '', minStockQty: '', location: '', description: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Nom du produit *</label>
          <input value={form.name || ''} onChange={e => set('name', e.target.value)} required placeholder="Ex: Câble HDMI 2m" />
        </div>
        <div className="form-group">
          <label>SKU *</label>
          <input value={form.sku || ''} onChange={e => set('sku', e.target.value)} required placeholder="Ex: HDMI-2M-001" />
        </div>
        <div className="form-group">
          <label>Catégorie</label>
          <select value={form.category || ''} onChange={e => set('category', e.target.value)}>
            {DEFAULT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Prix achat (DZD)</label>
          <input type="number" value={form.buyPrice || ''} onChange={e => set('buyPrice', e.target.value)} min="0" placeholder="0" />
        </div>
        <div className="form-group">
          <label>Prix vente (DZD)</label>
          <input type="number" value={form.sellPrice || ''} onChange={e => set('sellPrice', e.target.value)} min="0" placeholder="0" />
        </div>
        <div className="form-group">
          <label>Stock actuel</label>
          <input type="number" value={form.stockQty || ''} onChange={e => set('stockQty', e.target.value)} min="0" placeholder="0" />
        </div>
        <div className="form-group">
          <label>Stock minimum</label>
          <input type="number" value={form.minStockQty || ''} onChange={e => set('minStockQty', e.target.value)} min="0" placeholder="0" />
        </div>
        <div className="form-group">
          <label>Unité</label>
          <input value={form.unit || ''} onChange={e => set('unit', e.target.value)} placeholder="pcs, ml, kg…" />
        </div>
        <div className="form-group">
          <label>Emplacement</label>
          <input value={form.location || ''} onChange={e => set('location', e.target.value)} placeholder="Ex: Étagère A-3" />
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
        <button type="submit" className="btn btn--primary" disabled={isLoading}>{isLoading ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  );
};

const getStockStatus = (p) => {
  if (p.stockQty === 0) return { label: 'Rupture', color: '#ef4444' };
  if (p.stockQty <= p.minStockQty) return { label: 'Stock faible', color: '#f59e0b' };
  return { label: 'En stock', color: '#10b981' };
};

/* ─── Main page ──────────────────────────────────────────────── */
export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [modal, setModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, category],
    queryFn: () => productsAPI.getAll({ search, category: category || undefined, limit: 100 }),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: productsAPI.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setModal(null); toast.success('✅ Produit ajouté !'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => productsAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setModal(null); toast.success('✅ Produit mis à jour !'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });
  const deleteMutation = useMutation({
    mutationFn: productsAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Produit archivé'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const handleDelete = (product) => {
    if (window.confirm(`Archiver "${product.name}" ?`)) deleteMutation.mutate(product.id);
  };

  const products = data?.data || [];
  const lowStock = products.filter(p => p.stockQty <= p.minStockQty);
  const totalValue = products.reduce((s, p) => s + p.stockQty * p.buyPrice, 0);
  const categories = ['', ...Array.from(new Set([...DEFAULT_CATEGORIES, ...products.map(p => p.category).filter(Boolean)]))];

  return (
    <motion.div className="page" variants={container} initial="hidden" animate="show">
      {/* HEADER */}
      <motion.div className="page-header" variants={fadeUp}>
        <div>
          <h1 className="page-title">Gestion des Produits</h1>
          <p className="page-subtitle">
            {data?.pagination?.total || 0} produits · Valeur : <strong style={{ color: 'var(--accent-primary)' }}>{fmt(totalValue)}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button className="btn btn--ghost" onClick={() => printProducts(products)} title="Imprimer le catalogue"
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Printer size={15} /> Imprimer
          </motion.button>
          <QrBatchButton type="product" items={products} label="Produits — QR Badges" filename="qr-produits" />
          <motion.button className="btn btn--ghost" onClick={() => setModal('import')} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Upload size={15} /> Importer
          </motion.button>
          <motion.button className="btn btn--primary" onClick={() => setModal('create')}
            whileHover={{ scale: 1.04, boxShadow: '0 0 20px rgba(99,102,241,0.4)' }} whileTap={{ scale: 0.96 }}>
            <Plus size={16} /> Ajouter
          </motion.button>
        </div>
      </motion.div>

      {/* ALERTE STOCK */}
      {lowStock.length > 0 && (
        <motion.div variants={fadeUp} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} color="#ef4444" />
          <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 500 }}>
            ⚠️ {lowStock.length} produit(s) en stock faible ou rupture : {lowStock.slice(0, 3).map(p => p.name).join(', ')}{lowStock.length > 3 ? '…' : ''}
          </span>
        </motion.div>
      )}

      {/* STATS */}
      <motion.div variants={container} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total produits',       value: products.length,                                          color: '#6366f1', icon: '📦' },
          { label: 'En stock',             value: products.filter(p => p.stockQty > p.minStockQty).length,  color: '#10b981', icon: '✅' },
          { label: 'Stock faible/rupture', value: lowStock.length,                                          color: '#f59e0b', icon: '⚠️' },
          { label: 'Valeur totale',        value: fmt(totalValue),                                          color: '#8b5cf6', icon: '💰' },
        ].map((s) => (
          <motion.div key={s.label} variants={fadeUp} whileHover={{ y: -3, boxShadow: `0 8px 32px ${s.color}22` }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: `3px solid ${s.color}`, borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* FILTRES */}
      <motion.div variants={fadeUp} className="filters-bar">
        <div className="search-input">
          <Search size={16} className="search-input__icon" />
          <input placeholder="Rechercher produit ou SKU…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map(c => (
            <motion.button key={c} className={`btn ${category === c ? 'btn--primary' : 'btn--ghost'}`}
              style={{ padding: '6px 12px', fontSize: 12 }}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
              onClick={() => setCategory(c)}>{c || 'Tous'}</motion.button>
          ))}
        </div>
      </motion.div>

      {/* TABLE */}
      <motion.div variants={fadeUp} style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th>Produit</th><th>SKU</th><th>Catégorie</th>
              <th>Prix achat</th><th>Prix vente</th><th>Stock</th><th>Seuil min</th><th>Statut</th>
              <th>QR</th>
              <th style={{ position: 'sticky', right: 0, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} className="table-loading">Chargement…</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={10} className="table-empty">
                Aucun produit trouvé.{' '}
                <button className="btn btn--ghost" style={{ display: 'inline', fontSize: 12, padding: '2px 8px' }} onClick={() => setModal('create')}>Ajouter le premier</button>
              </td></tr>
            ) : products.map((p, i) => {
              const status = getStockStatus(p);
              return (
                <motion.tr key={p.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: i * 0.03, duration: 0.28 } }}
                  whileHover={{ backgroundColor: 'rgba(99,102,241,0.04)' }}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    {p.location && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.location}</div>}
                  </td>
                  <td><span className="tag">{p.sku}</span></td>
                  <td><span className="tag">{p.category || '—'}</span></td>
                  <td>{fmt(p.buyPrice)}</td>
                  <td style={{ color: '#10b981', fontWeight: 500 }}>{fmt(p.sellPrice)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, minWidth: 50 }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(100, p.minStockQty > 0 ? (p.stockQty / (p.minStockQty * 2)) * 100 : 100)}%`, background: status.color, transition: 'width 0.5s' }} />
                      </div>
                      <span style={{ fontWeight: 600, minWidth: 36 }}>{p.stockQty} {p.unit}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{p.minStockQty} {p.unit}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: status.color + '22', color: status.color }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: status.color }} />{status.label}
                    </span>
                  </td>
                  <td><QrButton type="product" id={p.id} name={p.name} extraData={{ sku: p.sku, category: p.category }} /></td>
                  <td style={{ position: 'sticky', right: 0, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)' }}>
                    <ActionMenu
                      product={p}
                      onEdit={(prod) => setModal({ type: 'edit', product: prod })}
                      onDelete={handleDelete}
                    />
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </motion.div>

      {/* MODALS */}
      {modal === 'import' && (
        <ImportModal type="products" label="produits" onClose={() => setModal(null)} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['products'] })} />
      )}
      {modal === 'create' && (
        <Modal title="Nouveau produit" onClose={() => setModal(null)}>
          <ProductForm onSubmit={(data) => createMutation.mutate(data)} onCancel={() => setModal(null)} isLoading={createMutation.isPending} />
        </Modal>
      )}
      {modal?.type === 'edit' && (
        <Modal title="Modifier produit" onClose={() => setModal(null)}>
          <ProductForm initial={modal.product} onSubmit={(data) => updateMutation.mutate({ id: modal.product.id, data })} onCancel={() => setModal(null)} isLoading={updateMutation.isPending} />
        </Modal>
      )}
    </motion.div>
  );
}
