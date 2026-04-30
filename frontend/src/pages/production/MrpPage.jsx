import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, CheckSquare, RefreshCw, Package, ShoppingCart, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { gpaoAPI } from '../../api/client.js';
import apiClient from '../../api/client.js';

const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmt = n => Number(n || 0).toLocaleString('fr-DZ');

function RunPanel({ onRun, loading }) {
  const [horizon, setHorizon] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().split('T')[0];
  });
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
      <h3 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={18} />Calcul des Besoins Nets (CBN)</h3>
      <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
        Le MRP analyse les commandes clients confirmées, explose les nomenclatures par niveau LLC, calcule les besoins nets
        (besoin brut − stock disponible + stock de sécurité) et génère des propositions d'OF (FABRIQUE) ou OA (ACHETÉ).
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: 12 }}>Horizon de planification</label>
          <input className="form__input" type="date" value={horizon} onChange={e => setHorizon(e.target.value)} style={{ width: 180 }} />
        </div>
        <button className="btn btn--primary" disabled={loading} onClick={() => onRun({ horizonDate: horizon })} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {loading ? <RefreshCw size={15} className="spin" /> : <Play size={15} />}
          {loading ? 'Calcul en cours…' : 'Lancer le CBN'}
        </button>
      </div>
    </div>
  );
}

function SuggestedOFTable({ ofs, onFirmAll, onFirmOne, loading }) {
  const [selected, setSelected] = useState(new Set());
  const toggle = (id) => setSelected(s => { const ns = new Set(s); ns.has(id) ? ns.delete(id) : ns.add(id); return ns; });
  const toggleAll = () => setSelected(s => s.size === ofs.length ? new Set() : new Set(ofs.map(o => o.productId + o.needDate)));

  if (!ofs.length) return (
    <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
      <Info size={20} style={{ marginBottom: 8 }} /><br />Aucun OF suggéré — pas de besoins nets détectés
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600 }}>OFs suggérés ({ofs.length})</span>
        <button className="btn btn--primary" style={{ fontSize: 12, padding: '5px 14px' }} disabled={loading} onClick={onFirmAll}>
          <CheckSquare size={13} /> Affermir tout
        </button>
      </div>
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Article</th>
              <th>Référence</th>
              <th style={{ textAlign: 'center' }}>Niveau LLC</th>
              <th style={{ textAlign: 'right' }}>Quantité</th>
              <th>Date besoin</th>
              <th>Lancement prévu</th>
              <th style={{ textAlign: 'center' }}>Délai (j)</th>
            </tr>
          </thead>
          <tbody>
            {ofs.map((of_, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{of_.productName}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{of_.productSku || '—'}</td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ background: '#6366f122', color: '#6366f1', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>N{of_.level}</span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(of_.quantity)} {of_.unit}</td>
                <td>{fmtDate(of_.needDate)}</td>
                <td style={{ color: 'var(--text-muted)' }}>{fmtDate(of_.orderDate)}</td>
                <td style={{ textAlign: 'center' }}>{of_.leadTime}j</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SuggestedOATable({ oas }) {
  if (!oas.length) return (
    <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
      <Info size={20} style={{ marginBottom: 8 }} /><br />Aucune proposition d'achat
    </div>
  );
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 10 }}>Propositions d'achat ({oas.length})</div>
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Article</th>
              <th style={{ textAlign: 'right' }}>Quantité</th>
              <th>Date besoin</th>
              <th>Date commande</th>
              <th style={{ textAlign: 'center' }}>Délai fourn.</th>
              <th style={{ textAlign: 'right' }}>Prix unitaire</th>
              <th style={{ textAlign: 'right' }}>Montant estimé</th>
            </tr>
          </thead>
          <tbody>
            {oas.map((oa, i) => (
              <tr key={i}>
                <td>
                  <div style={{ fontWeight: 500 }}>{oa.productName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{oa.productSku}</div>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(oa.quantity)} {oa.unit}</td>
                <td>{fmtDate(oa.needDate)}</td>
                <td style={{ color: 'var(--text-muted)' }}>{fmtDate(oa.orderDate)}</td>
                <td style={{ textAlign: 'center' }}>{oa.supplierLeadTime || oa.leadTime}j</td>
                <td style={{ textAlign: 'right' }}>{oa.price ? `${fmt(oa.price)} DZD` : '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: '#6366f1' }}>
                  {oa.price ? `${fmt(oa.quantity * oa.price)} DZD` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MrpPage() {
  const qc = useQueryClient();
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('of');

  const mrpMut = useMutation({
    mutationFn: gpaoAPI.runMrp,
    onSuccess: (res) => {
      setResult(res.data);
      toast.success(`CBN terminé — ${res.data.summary.totalOFs} OF(s), ${res.data.summary.totalOAs} OA(s)`);
    },
    onError: e => toast.error(e?.message || 'Erreur lors du calcul'),
  });

  const firmAllMut = useMutation({
    mutationFn: () => gpaoAPI.firmAllOfs({}),
    onSuccess: (r) => toast.success(`${r.count} OF(s) affermis`),
    onError: e => toast.error(e?.message || 'Erreur'),
  });

  const summary = result?.summary;
  const suggestedOFs = result?.suggestedOFs || [];
  const suggestedOAs = result?.suggestedOAs || [];

  const tabs = [
    { key: 'of', label: `OFs suggérés (${suggestedOFs.length})`, icon: <Package size={14} /> },
    { key: 'oa', label: `Propositions achat (${suggestedOAs.length})`, icon: <ShoppingCart size={14} /> },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title"><TrendingUp size={22} style={{ display: 'inline', marginRight: 8 }} />Calcul MRP — CBN</h1>
          <p className="page-subtitle">Calcul des besoins nets par explosion de nomenclatures</p>
        </div>
      </div>

      <RunPanel onRun={d => mrpMut.mutate(d)} loading={mrpMut.isPending} />

      {summary && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'OFs suggérés', value: summary.totalOFs, color: '#6366f1', icon: '📋' },
              { label: 'Propositions achat', value: summary.totalOAs, color: '#f59e0b', icon: '🛒' },
              { label: 'Horizon', value: new Date(summary.horizon).toLocaleDateString('fr-FR'), color: '#10b981', icon: '📅' },
              { label: 'Calculé à', value: new Date(summary.runAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), color: '#64748b', icon: '⏱️' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {tabs.map(t => (
              <button key={t.key} className={`btn ${activeTab === t.key ? 'btn--primary' : 'btn--ghost'}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setActiveTab(t.key)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'of' && (
            <SuggestedOFTable
              ofs={suggestedOFs}
              onFirmAll={() => firmAllMut.mutate()}
              loading={firmAllMut.isPending}
            />
          )}
          {activeTab === 'oa' && <SuggestedOATable oas={suggestedOAs} />}
        </>
      )}

      {!result && !mrpMut.isPending && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 56 }}>🧮</div>
          <p style={{ marginTop: 12 }}>Cliquez sur « Lancer le CBN » pour calculer les besoins nets.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Assurez-vous d'avoir des commandes clients confirmées avec des articles FABRIQUE/ACHETÉ dans la nomenclature.</p>
        </div>
      )}
    </div>
  );
}
