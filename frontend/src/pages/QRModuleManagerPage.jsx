import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Download, Printer, RefreshCw,
  ChevronRight, ChevronDown, Layers, Settings, Zap,
} from 'lucide-react';
import JSZip from 'jszip';
import AnimatedPage from '../components/ui/AnimatedPage.jsx';
import { PageHeader, Btn, Modal, FormGrid, FormActions, Field, Input, Select, EmptyState } from '../components/ui/DesignSystem.jsx';
import apiClient from '../api/client.js';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const MODULE_CFG = {
  employee:  { label: 'Employés',     icon: '👤', color: '#6366f1', hint: 'Filtré par champ "département" de l\'employé' },
  product:   { label: 'Produits',     icon: '📦', color: '#f59e0b', hint: 'Filtré par "catégorie" du produit' },
  equipment: { label: 'Équipements',  icon: '⚙️', color: '#ef4444', hint: 'Filtré par "type" de l\'équipement' },
  supplier:  { label: 'Fournisseurs', icon: '🏭', color: '#10b981', hint: 'Filtré par "ville" du fournisseur' },
  customer:  { label: 'Clients',      icon: '🤝', color: '#8b5cf6', hint: 'Filtré par "ville" du client' },
};

const PRESET_COLORS = ['#6366f1','#f59e0b','#ef4444','#10b981','#8b5cf6','#3b82f6','#ec4899','#14b8a6'];
const PRESET_ICONS  = ['🏢','👤','📦','⚙️','🏭','🤝','📊','🗂️','🔧','💼','🏗️','🧪'];

/* ─── Small helpers ───────────────────────────────────────────────────────── */
function Badge({ label, color, icon }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: color + '18',
      padding: '2px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {icon} {label}
    </span>
  );
}

function printBadges(items, deptName, subDeptName) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>QR Badges — ${deptName || ''} ${subDeptName ? '/ ' + subDeptName : ''}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;background:#fff;padding:12px}
    h2{font-size:14px;color:#0f172a;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    .card{border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center;break-inside:avoid}
    .card img{width:110px;height:110px;display:block;margin:0 auto 8px}
    .name{font-size:11px;font-weight:700;color:#0f172a;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .dept{font-size:9px;color:#6366f1;font-weight:600;margin-bottom:1px}
    .sub{font-size:9px;color:#64748b;margin-bottom:2px}
    .code{font-size:8px;color:#94a3b8;font-family:monospace}
    @media print{body{-webkit-print-color-adjust:exact}}
  </style></head><body>
  <h2>QR Codes — ${deptName || 'Tous'} ${subDeptName ? ' › ' + subDeptName : ''} (${items.length})</h2>
  <div class="grid">
    ${items.map(it => `
    <div class="card">
      ${it.qrImageB64 ? `<img src="${it.qrImageB64}" />` : '<div style="width:110px;height:110px;background:#f1f5f9;border-radius:8px;margin:0 auto 8px"></div>'}
      <div class="name">${it.label || ''}</div>
      <div class="dept">${deptName || ''}</div>
      ${subDeptName ? `<div class="sub">${subDeptName}</div>` : ''}
      <div class="code">${it.uniqueCode}</div>
    </div>`).join('')}
  </div>
  <script>window.onload=()=>window.print();</script>
  </body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html); w.document.close();
}

/* ─── Create Department Modal ─────────────────────────────────────────────── */
function DeptModal({ module, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', color: '#6366f1', icon: '🏢', filterField: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name) return toast.error('Nom requis');
    try {
      await apiClient.post('/qr/departments', { module, ...form });
      toast.success('Département créé');
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.message || 'Erreur'); }
  };

  return (
    <Modal title={`Nouveau département — ${MODULE_CFG[module]?.label}`} onClose={onClose} width={480}>
      <FormGrid cols={2}>
        <Field label="Nom *" style={{ gridColumn: 'span 2' }}>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="ex: Ressources Humaines" />
        </Field>
        <Field label="Couleur">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => set('color', c)}
                style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: form.color === c ? '3px solid white' : '2px solid transparent', outline: form.color === c ? `2px solid ${c}` : 'none', cursor: 'pointer' }} />
            ))}
          </div>
        </Field>
        <Field label="Icône">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESET_ICONS.map(ic => (
              <button key={ic} onClick={() => set('icon', ic)}
                style={{ width: 32, height: 32, fontSize: 18, background: form.icon === ic ? form.color + '30' : 'var(--bg-elevated)', border: `1.5px solid ${form.icon === ic ? form.color : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer' }}>
                {ic}
              </button>
            ))}
          </div>
        </Field>
      </FormGrid>
      <FormGrid cols={1}>
        <Field label="Valeur de filtre (optionnel)" style={{ marginTop: 4 }}>
          <Input value={form.filterField} onChange={e => set('filterField', e.target.value)}
            placeholder="ex: RH (filtre sur le champ département de l'entité)" />
        </Field>
      </FormGrid>
      <FormActions>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn variant="primary" onClick={handleSave}>Créer</Btn>
      </FormActions>
    </Modal>
  );
}

/* ─── Create Sub-Department Modal ─────────────────────────────────────────── */
function SubDeptModal({ dept, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', filterValue: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name) return toast.error('Nom requis');
    try {
      await apiClient.post(`/qr/departments/${dept.id}/sub-depts`, form);
      toast.success('Sous-département créé');
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.message || 'Erreur'); }
  };

  return (
    <Modal title={`Sous-département — ${dept.name}`} onClose={onClose} width={440}>
      <FormGrid cols={1}>
        <Field label="Nom *">
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="ex: Recrutement" />
        </Field>
        <Field label="Valeur de filtre (optionnel)">
          <Input value={form.filterValue} onChange={e => set('filterValue', e.target.value)}
            placeholder="ex: Recruiter (filtre sur position/location)" />
        </Field>
      </FormGrid>
      <FormActions>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn variant="primary" onClick={handleSave}>Créer</Btn>
      </FormActions>
    </Modal>
  );
}

/* ─── Generated QR Grid ───────────────────────────────────────────────────── */
function QrGrid({ items, deptName, subDeptName, onClear }) {
  const handleZip = async () => {
    if (!items.length) return;
    toast.loading('ZIP en cours…', { id: 'zip' });
    try {
      const zip = new JSZip();
      for (const it of items) {
        if (!it.qrImageB64) continue;
        const b64  = it.qrImageB64.replace(/^data:image\/png;base64,/, '');
        const name = `${it.type}-${(it.label || it.uniqueCode).replace(/[^a-z0-9]/gi, '_')}.png`;
        zip.file(name, b64, { base64: true });
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href = url;
      a.download = `qr-${deptName || 'batch'}.zip`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`${items.length} QR téléchargés`, { id: 'zip' });
    } catch { toast.error('Erreur ZIP', { id: 'zip' }); }
  };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            ✅ {items.length} QR codes générés
          </div>
          {(deptName || subDeptName) && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {deptName}{subDeptName ? ` › ${subDeptName}` : ''}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="secondary" size="sm" icon={<Printer size={13} />}
            onClick={() => printBadges(items, deptName, subDeptName)}>
            Imprimer
          </Btn>
          <Btn variant="secondary" size="sm" icon={<Download size={13} />} onClick={handleZip}>
            ZIP
          </Btn>
          <Btn variant="secondary" size="sm" onClick={onClear}>Fermer</Btn>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        {items.map(item => (
          <motion.div key={item.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10,
              padding: 12, textAlign: 'center' }}>
            {item.qrImageB64
              ? <img src={item.qrImageB64} alt={item.label} style={{ width: 100, height: 100, borderRadius: 6, display: 'block', margin: '0 auto 8px' }} />
              : <div style={{ width: 100, height: 100, background: 'var(--border)', borderRadius: 6, margin: '0 auto 8px' }} />}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.label}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 3 }}>
              {item.uniqueCode}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Department tree item ─────────────────────────────────────────────────── */
function DeptRow({ dept, onAddSub, onDeleteDept, onDeleteSub, onGenerate, generating }) {
  const [open, setOpen] = useState(false);
  const cfg = MODULE_CFG[dept.module] || { color: '#64748b' };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      {/* Dept header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }}
        onClick={() => setOpen(v => !v)}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: dept.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {dept.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{dept.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {dept.subDepts?.length || 0} sous-dépt · {dept._count?.qrCodes || 0} QR
            <span style={{ marginLeft: 8 }}><Badge label={MODULE_CFG[dept.module]?.label || dept.module} color={cfg.color} icon={MODULE_CFG[dept.module]?.icon} /></span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Btn variant="primary" size="sm" icon={<Zap size={12} />}
            onClick={e => { e.stopPropagation(); onGenerate({ dept, subDept: null }); }}
            disabled={generating}>
            {generating ? '…' : 'Générer'}
          </Btn>
          <Btn variant="secondary" size="sm" icon={<Plus size={12} />}
            onClick={e => { e.stopPropagation(); onAddSub(dept); }}>
            Sous-dépt
          </Btn>
          <Btn variant="danger" size="sm" icon={<Trash2 size={12} />}
            onClick={e => { e.stopPropagation(); onDeleteDept(dept.id); }} />
          {open ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
        </div>
      </div>

      {/* Sub-departments */}
      <AnimatePresence>
        {open && dept.subDepts?.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div style={{ borderTop: '1px solid var(--border)', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {dept.subDepts.map(sub => (
                <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <span style={{ color: dept.color, fontSize: 14 }}>›</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{sub.name}</span>
                    {sub.filterValue && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>filtre: {sub.filterValue}</span>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>{sub._count?.qrCodes || 0} QR</span>
                  </div>
                  <Btn variant="primary" size="sm" icon={<Zap size={11} />}
                    onClick={() => onGenerate({ dept, subDept: sub })}
                    disabled={generating}>
                    {generating ? '…' : 'Générer'}
                  </Btn>
                  <Btn variant="danger" size="sm" icon={<Trash2 size={11} />}
                    onClick={() => onDeleteSub(sub.id)} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function QRModuleManagerPage() {
  const qc = useQueryClient();

  // UI state
  const [activeModule, setActiveModule] = useState('');
  const [modal, setModal]               = useState(null); // {type: 'dept'|'subDept', data?}
  const [generatedItems, setGenerated]  = useState(null); // {items, deptName, subDeptName}
  const [generating, setGenerating]     = useState(false);
  const [regenerate, setRegenerate]     = useState(false);
  const [discoverMod, setDiscoverMod]   = useState('employee');

  // Queries
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['qr-module-stats'],
    queryFn:  () => apiClient.get('/qr/module-stats').then(r => r.data),
    staleTime: 30_000,
  });

  const { data: disData } = useQuery({
    queryKey: ['qr-discover', discoverMod],
    queryFn:  () => apiClient.get(`/qr/discover/${discoverMod}`).then(r => r.data),
    staleTime: 60_000,
  });

  const allDepts    = statsData || [];
  const filtered    = activeModule ? allDepts.filter(d => d.module === activeModule) : allDepts;
  const totalQr     = allDepts.reduce((s, d) => s + (d._count?.qrCodes || 0), 0);
  const totalDepts  = allDepts.length;
  const totalSubs   = allDepts.reduce((s, d) => s + (d.subDepts?.length || 0), 0);
  const refresh     = () => { qc.invalidateQueries({ queryKey: ['qr-module-stats'] }); qc.invalidateQueries({ queryKey: ['qr-types'] }); };

  // Delete dept
  const handleDeleteDept = async (id) => {
    if (!confirm('Supprimer ce département et tous ses QR codes ?')) return;
    try { await apiClient.delete(`/qr/departments/${id}`); toast.success('Supprimé'); refresh(); }
    catch { toast.error('Erreur'); }
  };

  // Delete sub-dept
  const handleDeleteSub = async (id) => {
    if (!confirm('Supprimer ce sous-département ?')) return;
    try { await apiClient.delete(`/qr/sub-depts/${id}`); toast.success('Supprimé'); refresh(); }
    catch { toast.error('Erreur'); }
  };

  // Generate batch
  const handleGenerate = async ({ dept, subDept }) => {
    setGenerating(true);
    setGenerated(null);
    try {
      const r = await apiClient.post('/qr/module-batch', {
        module:           dept.module,
        department_id:    dept.id,
        sub_department_id: subDept?.id || undefined,
        regenerate,
      });
      const count   = r.data?.length ?? r.generated ?? 0;
      const skipped = r.skipped ?? 0;
      if (count === 0) {
        toast(`Tous les QR existent déjà (${skipped} ignorés). Activez "Régénérer" pour forcer.`, { icon: 'ℹ️', duration: 5000 });
      } else {
        toast.success(`✅ ${count} QR générés · ${skipped} ignorés`);
        setGenerated({ items: r.data || [], deptName: dept.name, subDeptName: subDept?.name || null });
        refresh();
      }
    } catch (e) { toast.error(e?.response?.data?.message || 'Erreur'); }
    finally { setGenerating(false); }
  };

  // Import discovered departments
  const handleImport = async (values) => {
    if (!values?.length) return toast.error('Aucune valeur découverte');
    try {
      const r = await apiClient.post(`/qr/discover/${discoverMod}/import`, { values });
      toast.success(`${r.created ?? r.data?.length ?? 0} département(s) importé(s)`);
      refresh();
    } catch { toast.error('Erreur'); }
  };

  const discovered = disData || [];

  return (
    <AnimatedPage>
      <div className="erp-page">
        <PageHeader icon="🗂️" title="QR Module Manager"
          subtitle="Organisez la génération de QR codes par département et sous-département"
          actions={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={regenerate} onChange={e => setRegenerate(e.target.checked)}
                  style={{ accentColor: '#6366f1' }} />
                Régénérer existants
              </label>
              <Btn variant="secondary" icon={<RefreshCw size={13} />} onClick={refresh}>Actualiser</Btn>
              <Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'dept' })}>
                Nouveau département
              </Btn>
            </div>
          }
        />

        {/* KPIs */}
        <div className="erp-kpi-grid">
          {[
            { label: 'Départements',     value: totalDepts, color: '#6366f1', icon: '🏢' },
            { label: 'Sous-départements',value: totalSubs,  color: '#3b82f6', icon: '📂' },
            { label: 'QR générés',       value: totalQr,    color: '#10b981', icon: '📱' },
            { label: 'Modules couverts', value: [...new Set(allDepts.map(d => d.module))].length, color: '#f59e0b', icon: '🧩' },
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

        {/* Generated QR result */}
        <AnimatePresence>
          {generatedItems && (
            <QrGrid items={generatedItems.items} deptName={generatedItems.deptName}
              subDeptName={generatedItems.subDeptName} onClear={() => setGenerated(null)} />
          )}
        </AnimatePresence>

        {/* Auto-discover panel */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>⚡ Import automatique</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Importe les valeurs existantes en base comme départements
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={discoverMod} onChange={e => setDiscoverMod(e.target.value)}
                style={{ padding: '6px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 7, color: 'var(--text-primary)', fontSize: 12 }}>
                {Object.entries(MODULE_CFG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
              <Btn variant="primary" size="sm" icon={<Zap size={13} />}
                onClick={() => handleImport(discovered)}
                disabled={!discovered.length}>
                Importer ({discovered.length})
              </Btn>
            </div>
          </div>
          {discovered.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {discovered.map(v => (
                <span key={v} style={{ fontSize: 11, fontWeight: 600, color: MODULE_CFG[discoverMod]?.color,
                  background: (MODULE_CFG[discoverMod]?.color || '#64748b') + '18',
                  padding: '3px 10px', borderRadius: 6 }}>
                  {MODULE_CFG[discoverMod]?.icon} {v}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucune valeur découverte pour ce module</div>
          )}
        </div>

        {/* Module filter pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setActiveModule('')}
            style={{ padding: '6px 14px', background: !activeModule ? '#6366f120' : 'var(--bg-card)',
              border: `1px solid ${!activeModule ? '#6366f150' : 'var(--border)'}`,
              borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              color: !activeModule ? '#818cf8' : 'var(--text-muted)' }}>
            Tous ({totalDepts})
          </button>
          {Object.entries(MODULE_CFG).map(([k, v]) => {
            const count  = allDepts.filter(d => d.module === k).length;
            const active = activeModule === k;
            if (!count && activeModule !== k) return null;
            return (
              <button key={k} onClick={() => setActiveModule(active ? '' : k)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                  background: active ? v.color + '20' : 'var(--bg-card)',
                  border: `1px solid ${active ? v.color + '50' : 'var(--border)'}`,
                  borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  color: active ? v.color : 'var(--text-muted)' }}>
                {v.icon} {v.label}
                <span style={{ fontSize: 10, background: active ? v.color : '#334155',
                  color: active ? '#fff' : 'var(--text-muted)', borderRadius: 10, padding: '1px 6px' }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Department tree */}
        {statsLoading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🗂️" title="Aucun département"
            description="Créez des départements ou utilisez l'import automatique pour démarrer."
            action={<Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'dept' })}>Créer un département</Btn>} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(dept => (
              <DeptRow key={dept.id} dept={dept}
                onAddSub={d => setModal({ type: 'subDept', data: d })}
                onDeleteDept={handleDeleteDept}
                onDeleteSub={handleDeleteSub}
                onGenerate={handleGenerate}
                generating={generating}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'dept' && (
        <DeptModal
          module={activeModule || 'employee'}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refresh(); }}
        />
      )}
      {modal?.type === 'subDept' && (
        <SubDeptModal
          dept={modal.data}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refresh(); }}
        />
      )}
    </AnimatedPage>
  );
}
