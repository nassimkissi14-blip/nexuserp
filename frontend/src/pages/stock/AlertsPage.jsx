import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsAPI } from '../../api/client.js';
import apiClient from '../../api/client.js';
import { AlertTriangle, XCircle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

const movementsAPI = { create: (data) => apiClient.post('/movements', data) };
const fmt = (n) => new Intl.NumberFormat('fr-DZ').format(Number(n) || 0) + ' DZD';

export default function AlertsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products-alerts'],
    queryFn: () => productsAPI.getAll({ limit: 200 }).then(r => r.data || []),
    refetchInterval: 30000,
  });

  const reorderMutation = useMutation({
    mutationFn: ({ productId, quantity }) => movementsAPI.create({ productId, type: 'IN', quantity, notes: 'Réapprovisionnement automatique' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products-alerts'] }); queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('✅ Entrée de stock enregistrée'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const products = data || [];
  const outOfStock = products.filter(p => p.stockQty === 0);
  const lowStock = products.filter(p => p.stockQty > 0 && p.stockQty <= p.minStockQty);
  const ok = products.filter(p => p.stockQty > p.minStockQty);

  const AlertCard = ({ product, severity }) => {
    const isOut = product.stockQty === 0;
    const color = isOut ? '#ef4444' : '#f59e0b';
    const pct = product.minStockQty > 0 ? Math.min(100, (product.stockQty / (product.minStockQty * 2)) * 100) : 0;
    const suggested = Math.max(product.minStockQty * 2, 10);

    return (
      <div style={{ background: 'var(--bg-card)', border: `1px solid ${color}44`, borderLeft: `4px solid ${color}`, borderRadius: 'var(--radius-lg)', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{product.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{product.sku} · {product.category || '—'} · {product.location || '—'}</div>
          </div>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: color + '22', color }}>
            {isOut ? '🔴 Rupture' : '🟡 Stock faible'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 20, marginBottom: 12, fontSize: 13 }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Stock actuel</span><br /><strong style={{ color, fontSize: 16 }}>{product.stockQty} {product.unit}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Seuil min.</span><br /><strong>{product.minStockQty} {product.unit}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Valeur stock</span><br /><strong>{fmt(product.stockQty * product.buyPrice)}</strong></div>
        </div>

        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, marginBottom: 12 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s' }} />
        </div>

        <button className="btn btn--primary" style={{ fontSize: 12, padding: '6px 14px' }}
          onClick={() => { if (window.confirm(`Enregistrer une entrée de ${suggested} ${product.unit} pour "${product.name}" ?`)) reorderMutation.mutate({ productId: product.id, quantity: suggested }); }}>
          <TrendingUp size={13} /> Réapprovisionner ({suggested} {product.unit})
        </button>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">⚠️ Alertes Stock</h1>
          <p className="page-subtitle">{outOfStock.length} rupture(s) · {lowStock.length} stock(s) faible(s)</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Ruptures de stock', value: outOfStock.length, color: '#ef4444', icon: <XCircle size={20} /> },
          { label: 'Stocks faibles', value: lowStock.length, color: '#f59e0b', icon: <AlertTriangle size={20} /> },
          { label: 'Stocks OK', value: ok.length, color: '#10b981', icon: '✅' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: `3px solid ${s.color}`, borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ color: s.color, fontSize: 24 }}>{typeof s.icon === 'string' ? s.icon : s.icon}</div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement…</div>
      ) : outOfStock.length === 0 && lowStock.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h3>Tous les stocks sont au niveau correct</h3>
          <p style={{ fontSize: 13 }}>Aucune alerte active</p>
        </div>
      ) : (
        <>
          {outOfStock.length > 0 && (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
                <XCircle size={16} /> Ruptures de stock ({outOfStock.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
                {outOfStock.map(p => <AlertCard key={p.id} product={p} severity="critical" />)}
              </div>
            </>
          )}
          {lowStock.length > 0 && (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8, marginTop: outOfStock.length > 0 ? 8 : 0 }}>
                <AlertTriangle size={16} /> Stocks faibles ({lowStock.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
                {lowStock.map(p => <AlertCard key={p.id} product={p} severity="warning" />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
