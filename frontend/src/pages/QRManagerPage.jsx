import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus, Download, Trash2, Search, RefreshCw,
  Printer, CheckSquare, Square, ChevronDown,
} from 'lucide-react';
import JSZip from 'jszip';
import AnimatedPage from '../components/ui/AnimatedPage.jsx';
import { PageHeader, Btn, EmptyState } from '../components/ui/DesignSystem.jsx';
import apiClient from '../api/client.js';

/* ─── Config ─────────────────────────────────────────────────────────────── */
const TYPE_CFG = {
  employee:   { label: 'Employés',      icon: '👤', color: '#6366f1' },
  product:    { label: 'Produits',      icon: '📦', color: '#f59e0b' },
  department: { label: 'Départements',  icon: '🏢', color: '#3b82f6' },
  supplier:   { label: 'Fournisseurs',  icon: '🏭', color: '#10b981' },
  customer:   { label: 'Clients',       icon: '🤝', color: '#8b5cf6' },
  equipment:  { label: 'Équipements',   icon: '⚙️', color: '#ef4444' },
};

function printBadges(items) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>QR Badges</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;padding:12px}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    .card{border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center;break-inside:avoid}
    img{width:100px;height:100px;display:block;margin:0 auto 8px}
    .name{font-size:11px;font-weight:700;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .type{font-size:9px;color:#6366f1;font-weight:600;margin:3px 0}
    .code{font-size:8px;color:#94a3b8;font-family:monospace}
    @media print{body{-webkit-print-color-adjust:exact}}
  </style></head><body>
  <div class="grid">
    ${items.map(it=>`<div class="card">
      ${it.qrImageB64?`<img src="${it.qrImageB64}"/>`:''}
      <div class="name">${it.label||''}</div>
      <div class="type">${it.type}</div>
      <div class="code">${it.uniqueCode}</div>
    </div>`).join('')}
  </div>
  <script>window.onload=()=>window.print();</script>
  </body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html); w.document.close();
}

/* ─── Generate Panel ─────────────────────────────────────────────────────── */
function GeneratePanel({ onGenerated }) {
  const [type, setType]         = useState('employee');
  const [entities, setEntities] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [selectAll, setSelectAll] = useState(true);
  const [regenerate, setRegenerate] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [loadingEnt, setLoadingEnt] = useState(false);
  const cfg = TYPE_CFG[type] || TYPE_CFG.employee;

  // Load entities automatically on mount AND when type changes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingEnt(true);
      setEntities([]);
      setSelected(new Set());
      setSelectAll(true);
      try {
        const r = await apiClient.get(`/qr/entities/${type}`);
        if (!cancelled) setEntities(r.data || []);
      } catch {
        if (!cancelled) toast.error('Erreur chargement entités');
      } finally {
        if (!cancelled) setLoadingEnt(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [type]);

  const toggleOne = (refId) => {
    setSelectAll(false);
    setSelected(prev => {
      const s = new Set(prev);
      s.has(refId) ? s.delete(refId) : s.add(refId);
      return s;
    });
  };

  const handleSelectAll = () => { setSelectAll(true); setSelected(new Set()); };
  const handleDeselectAll = () => { setSelectAll(false); setSelected(new Set()); };

  const handleGenerate = async () => {
    if (entities.length === 0) return toast.error('Aucune entité disponible');
    setLoading(true);
    try {
      const body = { type, regenerate };
      if (!selectAll && selected.size > 0) body.ids = [...selected];
      const r = await apiClient.post('/qr/generate-batch', body);
      const count   = r.data?.length ?? 0;
      const skipped = r.skipped ?? 0;
      if (count === 0 && skipped > 0) {
        toast(`Tous les QR existent déjà (${skipped}). Cochez "Régénérer" pour forcer.`, { icon: 'ℹ️', duration: 5000 });
      } else {
        toast.success(`✅ ${count} QR générés · ${skipped} ignorés`);
        onGenerated(r.data || []);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  };

  const displayCount = selectAll ? entities.length : selected.size;

  return (
    <div style={{ background: 'var(--bg-card)', border: `1px solid ${cfg.color}30`,
      borderRadius: 'var(--radius-lg)', padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>

      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>⚡ Générer des QR codes en lot</div>

      {/* Type selector */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
          letterSpacing: 0.7, marginBottom: 10 }}>Type d'entité</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(TYPE_CFG).map(([k, v]) => (
            <button key={k} onClick={() => setType(k)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                background: type === k ? v.color + '18' : 'var(--bg-elevated)',
                border: `1.5px solid ${type === k ? v.color : 'var(--border)'}`,
                borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: type === k ? v.color : 'var(--text-muted)', transition: 'all .15s' }}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Entity list */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.7 }}>
            {loadingEnt ? 'Chargement…' : `${displayCount} / ${entities.length} sélectionnés`}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSelectAll}
              style={{ fontSize: 11, color: cfg.color, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
              Tout sélect.
            </button>
            <button onClick={handleDeselectAll}
              style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Désélect.
            </button>
          </div>
        </div>
        <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)',
          borderRadius: 8, background: 'var(--bg-elevated)' }}>
          {loadingEnt ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Chargement des entités…
            </div>
          ) : entities.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Aucune entité trouvée pour ce type
            </div>
          ) : (
            entities.map(e => {
              const isSel = selectAll || selected.has(e.referenceId);
              return (
                <div key={e.referenceId} onClick={() => toggleOne(e.referenceId)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    cursor: 'pointer', borderBottom: '1px solid var(--border)',
                    background: isSel ? cfg.color + '08' : 'transparent',
                    transition: 'background .1s' }}>
                  {isSel
                    ? <CheckSquare size={14} color={cfg.color} />
                    : <Square size={14} color="var(--text-muted)" />}
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                    {e.name}
                  </span>
                  {e.hasQr && (
                    <span style={{ fontSize: 10, color: '#10b981', background: '#10b98115',
                      padding: '1px 7px', borderRadius: 4, fontWeight: 700 }}>QR ✓</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Options row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          fontSize: 13, color: 'var(--text-secondary)', userSelect: 'none' }}>
          <input type="checkbox" checked={regenerate} onChange={e => setRegenerate(e.target.checked)}
            style={{ accentColor: cfg.color, width: 15, height: 15 }} />
          Régénérer les QR existants
        </label>
        <Btn variant="primary" onClick={handleGenerate}
          disabled={loading || loadingEnt || entities.length === 0}
          icon={<Plus size={14} />}
          style={{ background: cfg.color, borderColor: cfg.color, minWidth: 180 }}>
          {loading
            ? 'Génération en cours…'
            : `Générer ${displayCount > 0 ? displayCount : 'tous'} QR codes`}
        </Btn>
      </div>
    </div>
  );
}

/* ─── QR Card ────────────────────────────────────────────────────────────── */
function QrCard({ item, selected, onToggle }) {
  const cfg = TYPE_CFG[item.type] || { color: '#64748b', icon: '❓' };
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.18 }}
      onClick={() => onToggle(item.id)}
      style={{ background: 'var(--bg-card)', border: `2px solid ${selected ? cfg.color : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)', padding: 14, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        position: 'relative', transition: 'border-color .15s' }}>
      {selected && (
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <CheckSquare size={15} color={cfg.color} />
        </div>
      )}
      {item.qrImageB64 ? (
        <img src={item.qrImageB64} alt={item.label}
          style={{ width: 120, height: 120, borderRadius: 6, imageRendering: 'pixelated', display: 'block' }} />
      ) : (
        <div style={{ width: 120, height: 120, background: 'var(--bg-elevated)', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
          {cfg.icon}
        </div>
      )}
      <div style={{ width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.label}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.color + '18',
          padding: '2px 8px', borderRadius: 5 }}>
          {cfg.icon} {cfg.label || item.type}
        </span>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'monospace' }}>
          {item.uniqueCode}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function QRManagerPage() {
  const qc = useQueryClient();
  const [activeType, setActiveType]     = useState('');
  const [search, setSearch]             = useState('');
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [showGenerate, setShowGenerate] = useState(false);
  const [page, setPage]                 = useState(1);
  const [justGenerated, setJustGenerated] = useState([]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['qr-codes', activeType, search, page],
    queryFn: () => apiClient.get('/qr', {
      params: { type: activeType || undefined, search: search || undefined, page, limit: 60 },
    }),
    staleTime: 0,
  });

  const { data: typesData, refetch: refetchTypes } = useQuery({
    queryKey: ['qr-types'],
    queryFn: () => apiClient.get('/qr/types').then(r => r.data),
    staleTime: 0,
  });

  const items    = data?.data   || [];
  const total    = data?.total  || 0;
  const pages    = data?.pages  || 1;
  const types    = typesData    || [];
  const totalGen = types.reduce((s, t) => s + t.count, 0);

  const refresh = () => {
    refetch();
    refetchTypes();
  };

  const toggleSelect  = (id) => setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const selectAllVis  = () => setSelectedIds(new Set(items.map(i => i.id)));
  const clearSel      = () => setSelectedIds(new Set());
  const selItems      = items.filter(i => selectedIds.has(i.id));
  const targetItems   = selectedIds.size > 0 ? selItems : items;

  const handleGenerated = (newItems) => {
    setJustGenerated(newItems);
    setShowGenerate(false);
    refresh();
  };

  const handleDelete = async () => {
    if (!selectedIds.size) return;
    if (!confirm(`Supprimer ${selectedIds.size} QR code(s) ?`)) return;
    try {
      await apiClient.delete('/qr/batch', { data: { ids: [...selectedIds] } });
      toast.success('Supprimés');
      clearSel();
      refresh();
    } catch { toast.error('Erreur'); }
  };

  const handleDownloadZip = async () => {
    if (!targetItems.length) return toast.error('Aucun QR à télécharger');
    toast.loading('Préparation ZIP…', { id: 'zip' });
    try {
      const zip = new JSZip();
      for (const it of targetItems) {
        if (!it.qrImageB64) continue;
        const b64  = it.qrImageB64.replace(/^data:image\/png;base64,/, '');
        const name = `${it.type}-${(it.label || it.uniqueCode).replace(/[^a-z0-9]/gi, '_')}.png`;
        zip.file(name, b64, { base64: true });
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `qrcodes-${activeType || 'all'}.zip`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`${targetItems.length} QR téléchargés`, { id: 'zip' });
    } catch { toast.error('Erreur ZIP', { id: 'zip' }); }
  };

  return (
    <AnimatedPage>
      <div className="erp-page">
        <PageHeader icon="📱" title="QR Manager"
          subtitle="Générez et gérez les QR codes pour tous vos modules"
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="secondary" icon={<RefreshCw size={13} />} onClick={refresh}>Actualiser</Btn>
              <Btn variant="primary" icon={showGenerate ? <ChevronDown size={14} /> : <Plus size={14} />}
                onClick={() => setShowGenerate(v => !v)}>
                {showGenerate ? 'Masquer' : '+ Générer'}
              </Btn>
            </div>
          }
        />

        {/* KPIs */}
        <div className="erp-kpi-grid">
          {[
            { label: 'Total QR générés', value: totalGen,        color: '#6366f1', icon: '📱' },
            { label: 'Types couverts',   value: types.filter(t => t.count > 0).length, color: '#10b981', icon: '🏷️' },
            { label: 'Sélectionnés',     value: selectedIds.size, color: '#f59e0b', icon: '✅' },
            { label: 'Affichés',         value: items.length,     color: '#3b82f6', icon: '👁️' },
          ].map((k, i) => (
            <div key={i} className="erp-kpi" style={{ '--kpi-color': k.color }}>
              <div className="erp-kpi__icon" style={{ background: k.color + '22', color: k.color, fontSize: 20 }}>{k.icon}</div>
              <div>
                <div className="erp-kpi__value" style={{ color: k.color }}>{k.value}</div>
                <div className="erp-kpi__label">{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Generate panel */}
        <AnimatePresence>
          {showGenerate && (
            <motion.div key="panel"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <GeneratePanel onGenerated={handleGenerated} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Just-generated preview banner */}
        <AnimatePresence>
          {justGenerated.length > 0 && (
            <motion.div key="banner"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ background: '#10b98115', border: '1px solid #10b98130', borderRadius: 'var(--radius-lg)',
                padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>
                ✅ {justGenerated.length} QR codes viennent d'être générés
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="secondary" size="sm" icon={<Printer size={13} />}
                  onClick={() => printBadges(justGenerated)}>Imprimer</Btn>
                <Btn variant="secondary" size="sm" onClick={() => setJustGenerated([])}>✕</Btn>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Type filter pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => { setActiveType(''); setPage(1); }}
            style={{ padding: '6px 14px', background: !activeType ? '#6366f120' : 'var(--bg-card)',
              border: `1px solid ${!activeType ? '#6366f150' : 'var(--border)'}`,
              borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              color: !activeType ? '#818cf8' : 'var(--text-muted)' }}>
            Tous ({totalGen})
          </button>
          {types.filter(t => t.count > 0).map(t => {
            const cfg    = TYPE_CFG[t.type] || { label: t.type, icon: '❓', color: '#64748b' };
            const active = activeType === t.type;
            return (
              <button key={t.type} onClick={() => { setActiveType(active ? '' : t.type); setPage(1); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                  background: active ? cfg.color + '20' : 'var(--bg-card)',
                  border: `1px solid ${active ? cfg.color + '50' : 'var(--border)'}`,
                  borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  color: active ? cfg.color : 'var(--text-muted)' }}>
                {cfg.icon} {cfg.label}
                <span style={{ fontSize: 10, background: active ? cfg.color : '#334155',
                  color: active ? '#fff' : 'var(--text-muted)', borderRadius: 10, padding: '1px 6px' }}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-input" style={{ maxWidth: 260 }}>
            <Search size={14} className="search-input__icon" />
            <input placeholder="Rechercher par label…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Btn variant="secondary" size="sm" onClick={selectAllVis}>Tout sélect.</Btn>
          {selectedIds.size > 0 && <Btn variant="secondary" size="sm" onClick={clearSel}>Désélect. ({selectedIds.size})</Btn>}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            {items.length > 0 && (
              <>
                <Btn variant="secondary" size="sm" icon={<Printer size={13} />}
                  onClick={() => printBadges(targetItems)}>
                  Imprimer {selectedIds.size > 0 ? `(${selectedIds.size})` : 'tout'}
                </Btn>
                <Btn variant="secondary" size="sm" icon={<Download size={13} />}
                  onClick={handleDownloadZip}>
                  ZIP {selectedIds.size > 0 ? `(${selectedIds.size})` : 'tout'}
                </Btn>
              </>
            )}
            {selectedIds.size > 0 && (
              <Btn variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={handleDelete}>
                Supprimer ({selectedIds.size})
              </Btn>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{total} QR</span>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            Chargement des QR codes…
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon="📱" title="Aucun QR code"
            description="Cliquez sur « + Générer » pour créer des QR codes en lot."
            action={
              <Btn variant="primary" icon={<Plus size={14} />} onClick={() => setShowGenerate(true)}>
                Générer mes premiers QR
              </Btn>
            } />
        ) : (
          <motion.div layout
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12 }}>
            <AnimatePresence>
              {items.map(item => (
                <QrCard key={item.id} item={item}
                  selected={selectedIds.has(item.id)} onToggle={toggleSelect} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
            <Btn variant="secondary" size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Préc.</Btn>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {page} / {pages}</span>
            <Btn variant="secondary" size="sm"
              onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>Suiv. ›</Btn>
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
