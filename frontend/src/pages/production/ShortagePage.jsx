import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Package, Search } from 'lucide-react';
import { gpaoAPI } from '../../api/client.js';
import apiClient from '../../api/client.js';

const fmt = n => Number(n || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 2 });
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

function ShortageCard({ of_ }) {
  const [open, setOpen] = useState(false);
  const { data, isFetching } = useQuery({
    queryKey: ['gpao-shortage', of_.id],
    queryFn: () => gpaoAPI.shortage(of_.id).then(r => r.data),
    enabled: open,
  });

  return (
    <div style={{ background: 'var(--bg-card)', border: `1px solid ${open && data ? (data.canLaunch ? '#10b98144' : '#ef444444') : 'var(--border)'}`, borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--bg)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>{of_.number}</span>
            <span style={{ fontWeight: 600 }}>{of_.product?.name}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {fmt(of_.quantity)} unités — Date besoin : {fmtDate(of_.needDate)} — Statut : {of_.status}
          </div>
        </div>
        {open && data && (
          data.canLaunch
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 600, fontSize: 13 }}><CheckCircle size={16} />Lançable</span>
            : <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontWeight: 600, fontSize: 13 }}><AlertTriangle size={16} />{data.shortages?.length} manquant(s)</span>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: 16, background: 'var(--bg)' }}>
          {isFetching ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Analyse en cours…</div>
          ) : !data?.of?.id ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucune nomenclature attachée à cet OF. Impossible d'analyser les manquants.</div>
          ) : (
            <>
              {data.shortages?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} /> Composants manquants ({data.shortages.length})
                  </div>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Article</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Requis</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>En stock</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px', color: '#ef4444' }}>Manque</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.shortages.map((s, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--border)', background: '#ef44440a' }}>
                          <td style={{ padding: '7px 8px', fontWeight: 500 }}>
                            <Package size={12} style={{ display: 'inline', marginRight: 6 }} />
                            {s.product.name}
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{s.product.sku}</div>
                          </td>
                          <td style={{ textAlign: 'right', padding: '7px 8px' }}>{fmt(s.needed)} {s.product.unit}</td>
                          <td style={{ textAlign: 'right', padding: '7px 8px', color: '#ef4444' }}>{fmt(s.stock)} {s.product.unit}</td>
                          <td style={{ textAlign: 'right', padding: '7px 8px', fontWeight: 700, color: '#ef4444' }}>−{fmt(s.shortage)} {s.product.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {data.available?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, color: '#10b981', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={14} /> Composants disponibles ({data.available.length})
                  </div>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Article</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Requis</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>En stock</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px', color: '#10b981' }}>Excédent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.available.map((s, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '7px 8px', fontWeight: 500 }}>
                            <Package size={12} style={{ display: 'inline', marginRight: 6 }} />
                            {s.product.name}
                          </td>
                          <td style={{ textAlign: 'right', padding: '7px 8px' }}>{fmt(s.needed)} {s.product.unit}</td>
                          <td style={{ textAlign: 'right', padding: '7px 8px' }}>{fmt(s.stock)} {s.product.unit}</td>
                          <td style={{ textAlign: 'right', padding: '7px 8px', fontWeight: 600, color: '#10b981' }}>+{fmt(s.stock - s.needed)} {s.product.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ShortagePage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['production-orders-firm'],
    queryFn: () => apiClient.get('/production/orders', { params: { status: 'FIRM' } }).then(r => r.data || []),
  });

  const orders = (data || []).filter(o =>
    !search || o.number?.toLowerCase().includes(search.toLowerCase()) || o.product?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title"><AlertTriangle size={22} style={{ display: 'inline', marginRight: 8 }} />Analyse des manquants</h1>
          <p className="page-subtitle">Vérification des composants disponibles pour chaque OF ferme avant lancement</p>
        </div>
      </div>

      <div style={{ position: 'relative', maxWidth: 400, marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="form__input" placeholder="Rechercher un OF ou article…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement…</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 56 }}>🔍</div>
          <p style={{ marginTop: 12 }}>Aucun OF ferme trouvé.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Affermissez des OFs depuis la page Jalonnement ou CBN pour analyser les manquants.</p>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            {orders.length} OF(s) ferme(s) — cliquez pour analyser les manquants
          </div>
          {orders.map(of_ => <ShortageCard key={of_.id} of_={of_} />)}
        </div>
      )}
    </div>
  );
}
