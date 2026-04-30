/**
 * QrCodeWidget — composant universel QR + Badge Employé
 *
 * Exports:
 *   QrButton          — bouton icône QR sur une ligne de tableau
 *   QrBatchButton     — bouton batch (print/zip) sur la page
 *   EmployeeBadgeButton — bouton badge ID employé pré-formaté
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { QrCode, Printer, Download, X, Loader } from 'lucide-react';
import JSZip from 'jszip';
import apiClient from '../../api/client.js';

/* ────────────────────────────────────────────────────────────────
   Helpers — impression & téléchargement
──────────────────────────────────────────────────────────────── */
function printQrBadges(items, title = 'QR Codes') {
  if (!items.length) return;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>${title}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;padding:16px;background:#fff}
    h1{font-size:15px;color:#0f172a;font-weight:800;margin-bottom:14px;
       padding-bottom:8px;border-bottom:2px solid #e2e8f0}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
    .card{border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center;
          break-inside:avoid;page-break-inside:avoid}
    .card img{width:120px;height:120px;display:block;margin:0 auto 10px;border-radius:6px}
    .name{font-size:12px;font-weight:700;color:#0f172a;margin-bottom:3px;
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .sub{font-size:10px;color:#6366f1;font-weight:600;margin-bottom:2px}
    .code{font-size:8px;color:#94a3b8;font-family:monospace;word-break:break-all}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
  <h1>${title} — ${items.length} code${items.length>1?'s':''} — ${new Date().toLocaleDateString('fr-FR')}</h1>
  <div class="grid">
    ${items.map(it=>`<div class="card">
      ${it.qrImageB64?`<img src="${it.qrImageB64}"/>`:'<div style="width:120px;height:120px;background:#f1f5f9;border-radius:6px;margin:0 auto 10px"></div>'}
      <div class="name">${it.label||''}</div>
      <div class="sub">${it.type||''}</div>
      <div class="code">${it.uniqueCode||''}</div>
    </div>`).join('')}
  </div>
  <script>window.onload=()=>window.print();</script>
  </body></html>`;
  const w = window.open('', '_blank');
  if (!w) return toast.error('Popups bloqués — autorise les popups pour ce site');
  w.document.write(html);
  w.document.close();
}

function printEmployeeBadges(employees) {
  if (!employees.length) return;
  const cards = employees.map(emp => {
    const initials = ((emp.firstName||'')[0]||'') + ((emp.lastName||'')[0]||'');
    const hue = (((emp.firstName||'A').charCodeAt(0)) * 13) % 360;
    const avatarBg = `hsl(${hue},60%,42%)`;
    return `
    <div class="badge">
      <div class="badge-header">
        <div class="company">NexusERP</div>
        <div class="badge-label">BADGE EMPLOYÉ</div>
      </div>
      <div class="badge-body">
        <div class="avatar" style="background:${avatarBg}">${initials.toUpperCase()}</div>
        <div class="info">
          <div class="name">${emp.firstName||''} ${emp.lastName||''}</div>
          <div class="position">${emp.position||''}</div>
          <div class="dept">${emp.department||''}</div>
        </div>
      </div>
      ${emp.qrImageB64 ? `<img class="qr" src="${emp.qrImageB64}" alt="QR"/>` : '<div class="qr-placeholder"></div>'}
      <div class="badge-footer">
        <span class="emp-id">${emp.uniqueCode||emp.id||''}</span>
        <span class="status ${(emp.status||'ACTIVE').toLowerCase()}">${emp.status==='ACTIVE'?'Actif':emp.status||'Actif'}</span>
      </div>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Badges Employés</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;padding:20px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
    .badge{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.12);
           break-inside:avoid;page-break-inside:avoid;width:220px}
    .badge-header{background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:12px 14px;
                  display:flex;justify-content:space-between;align-items:center}
    .company{color:#fff;font-size:13px;font-weight:800;letter-spacing:0.5px}
    .badge-label{color:rgba(255,255,255,0.75);font-size:9px;font-weight:600;
                 text-transform:uppercase;letter-spacing:1px}
    .badge-body{padding:14px;display:flex;align-items:center;gap:12px}
    .avatar{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;
            justify-content:center;font-size:18px;font-weight:800;color:#fff;flex-shrink:0;
            border:2px solid #e2e8f0}
    .info{flex:1;overflow:hidden}
    .name{font-size:13px;font-weight:700;color:#0f172a;white-space:nowrap;
          overflow:hidden;text-overflow:ellipsis}
    .position{font-size:11px;color:#6366f1;font-weight:600;margin-top:2px}
    .dept{font-size:10px;color:#64748b;margin-top:2px}
    .qr{display:block;width:100px;height:100px;margin:0 auto 10px;
        image-rendering:pixelated;border:1px solid #e2e8f0;border-radius:6px}
    .qr-placeholder{width:100px;height:100px;background:#f1f5f9;border-radius:6px;margin:0 auto 10px}
    .badge-footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:8px 14px;
                  display:flex;justify-content:space-between;align-items:center}
    .emp-id{font-size:9px;font-family:monospace;color:#94a3b8}
    .status{font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px}
    .status.active{background:#dcfce7;color:#16a34a}
    .status.on_leave{background:#fef3c7;color:#d97706}
    .status.suspended{background:#fee2e2;color:#dc2626}
    @media print{
      body{background:#fff;padding:8px}
      .badge{box-shadow:none;border:1px solid #e2e8f0}
      *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    }
  </style></head><body>
  <div class="grid">${cards}</div>
  <script>window.onload=()=>window.print();</script>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) return toast.error('Popups bloqués — autorise les popups pour ce site');
  w.document.write(html);
  w.document.close();
}

async function downloadZip(items, filename = 'qrcodes') {
  const zip = new JSZip();
  for (const it of items) {
    if (!it.qrImageB64) continue;
    const b64  = it.qrImageB64.replace(/^data:image\/png;base64,/, '');
    const name = `${it.type||'qr'}-${(it.label||it.uniqueCode||'item').replace(/[^a-z0-9]/gi,'_')}.png`;
    zip.file(name, b64, { base64: true });
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${filename}.zip`; a.click();
  URL.revokeObjectURL(url);
}

/* ────────────────────────────────────────────────────────────────
   Core — génération QR (corrigé pour intercepteur axios)
   L'intercepteur apiClient retourne déjà response.data directement.
   Donc r = { success, data: [...], skipped: N }  (pas r.data.data)
──────────────────────────────────────────────────────────────── */
async function ensureQr(type, referenceId) {
  // 1. Tente de générer (le backend skip si déjà existant)
  const r = await apiClient.post('/qr/generate-batch', { type, ids: [referenceId] });
  // r est déjà le body : { success, data: [...QrCodes...], skipped: N }
  const generated = Array.isArray(r.data) ? r.data : [];
  if (generated.length > 0) return generated[0];

  // 2. Déjà existant (skipped) → on le récupère
  const existing = await apiClient.get('/qr', { params: { type, referenceId, limit: 1 } });
  // existing = { success, data: [...], total, ... }
  const list = Array.isArray(existing.data) ? existing.data : [];
  if (list.length > 0) return list[0];

  return null;
}

/* ────────────────────────────────────────────────────────────────
   QR Modal
──────────────────────────────────────────────────────────────── */
function QrModal({ qr, name, onClose }) {
  if (!qr) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 28, maxWidth: 320, width: '100%', textAlign: 'center',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>QR Code</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', display: 'flex', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {qr.qrImageB64 ? (
          <img src={qr.qrImageB64} alt={name}
            style={{ width: 200, height: 200, borderRadius: 10, display: 'block', margin: '0 auto 16px',
              imageRendering: 'pixelated', border: '1px solid var(--border)' }} />
        ) : (
          <div style={{ width: 200, height: 200, background: 'var(--bg-elevated)', borderRadius: 10,
            margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
            📱
          </div>
        )}

        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{name}</div>
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)',
          background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: 6,
          display: 'inline-block', marginBottom: 16 }}>
          {qr.uniqueCode}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => printQrBadges([qr], name)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8,
              cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            <Printer size={13} /> Imprimer
          </button>
          {qr.qrImageB64 && (
            <a href={qr.qrImageB64} download={`${(name||'qr').replace(/\s+/g,'_')}.png`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                border: '1px solid var(--border)', borderRadius: 8,
                textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
              <Download size={13} /> PNG
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   QrButton — bouton QR sur une ligne de tableau
──────────────────────────────────────────────────────────────── */
export function QrButton({ type, id, name, size = 'sm' }) {
  const [loading, setLoading] = useState(false);
  const [qr, setQr]           = useState(null);

  const handleClick = async (e) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const record = await ensureQr(type, id);
      if (record) setQr(record);
      else toast.error('Impossible de générer le QR code');
    } catch(err) {
      console.error('QR error:', err);
      toast.error(err?.message || 'Erreur QR');
    } finally {
      setLoading(false);
    }
  };

  const btnSize  = size === 'xs' ? 24 : 28;
  const iconSize = size === 'xs' ? 11 : 13;

  return (
    <>
      <button onClick={handleClick} title="Afficher / Générer QR code"
        style={{
          width: btnSize, height: btnSize, display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6,
          cursor: loading ? 'wait' : 'pointer', color: '#818cf8',
          transition: 'all .15s', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}>
        {loading
          ? <Loader size={iconSize} style={{ animation: 'spin 1s linear infinite' }} />
          : <QrCode size={iconSize} />}
      </button>
      {qr && <QrModal qr={qr} name={name} onClose={() => setQr(null)} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   EmployeeBadgeButton — badge ID pré-formaté pour les employés
──────────────────────────────────────────────────────────────── */
export function EmployeeBadgeButton({ emp, size = 'sm' }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const qr = await ensureQr('employee', emp.id);
      printEmployeeBadges([{ ...emp, qrImageB64: qr?.qrImageB64, uniqueCode: qr?.uniqueCode }]);
    } catch(err) {
      console.error('Badge error:', err);
      toast.error('Erreur lors de la génération du badge');
    } finally {
      setLoading(false);
    }
  };

  const btnSize  = size === 'xs' ? 24 : 28;
  const iconSize = size === 'xs' ? 11 : 13;

  return (
    <>
      <button onClick={handleClick} title="Imprimer badge employé"
        style={{
          width: btnSize, height: btnSize, display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6,
          cursor: loading ? 'wait' : 'pointer', color: '#10b981',
          transition: 'all .15s', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; }}>
        {loading
          ? <Loader size={iconSize} style={{ animation: 'spin 1s linear infinite' }} />
          : <Printer size={iconSize} />}
      </button>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   QrBatchButton — bouton batch avec dropdown Print / ZIP
──────────────────────────────────────────────────────────────── */
export function QrBatchButton({ type, items = [], label, filename }) {
  const [loading, setLoading]   = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const run = async (action) => {
    if (!items.length) { toast.error('Aucun élément à traiter'); return; }
    setLoading(true);
    setShowMenu(false);
    toast.loading(`Génération de ${items.length} QR codes…`, { id: 'qrbatch' });
    try {
      const ids = items.map(i => i.id || i.referenceId).filter(Boolean);
      // body déjà dépaquetté : { success, data: [...], skipped: N }
      const r         = await apiClient.post('/qr/generate-batch', { type, ids });
      const generated = Array.isArray(r.data) ? r.data : [];

      let allQrs = [...generated];

      // Récupérer les QR déjà existants (skipped)
      if (r.skipped > 0) {
        const existing    = await apiClient.get('/qr', { params: { type, limit: 1000 } });
        const existingQrs = Array.isArray(existing.data) ? existing.data : [];
        const genIds      = new Set(generated.map(q => q.referenceId));
        const missing     = existingQrs.filter(q => ids.includes(q.referenceId) && !genIds.has(q.referenceId));
        allQrs = [...generated, ...missing];
      }

      toast.success(`${allQrs.length} QR prêts`, { id: 'qrbatch' });

      if (type === 'employee' && action === 'print') {
        // Pour les employés : badge pré-formaté
        const empMap = Object.fromEntries(items.map(i => [i.id, i]));
        const enriched = allQrs.map(q => ({ ...(empMap[q.referenceId] || {}), ...q }));
        printEmployeeBadges(enriched);
      } else if (action === 'print') {
        printQrBadges(allQrs, label || `QR ${type}`);
      } else {
        await downloadZip(allQrs, filename || `qr-${type}`);
      }
    } catch (err) {
      console.error('Batch QR error:', err);
      toast.error(err?.message || 'Erreur lors de la génération', { id: 'qrbatch' });
    } finally {
      setLoading(false);
    }
  };

  const count = items.length;

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden',
        border: `1px solid rgba(99,102,241,${count ? '0.4' : '0.2'})` }}>
        {/* Main — print */}
        <button onClick={() => run('print')} disabled={loading || !count}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            background: 'rgba(99,102,241,0.12)', color: count ? '#818cf8' : '#4b5563',
            border: 'none', cursor: loading || !count ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 700, opacity: count ? 1 : 0.45 }}>
          {loading
            ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
            : <QrCode size={13} />}
          {type === 'employee' ? `Badges (${count})` : `QR Batch (${count})`}
        </button>
        {/* Dropdown */}
        <button onClick={() => count && setShowMenu(v => !v)} disabled={loading || !count}
          style={{ padding: '7px 8px', background: 'rgba(99,102,241,0.12)', color: '#818cf8',
            border: 'none', borderLeft: '1px solid rgba(99,102,241,0.3)',
            cursor: count ? 'pointer' : 'not-allowed', fontSize: 10, opacity: count ? 1 : 0.45 }}>
          ▾
        </button>
      </div>

      {showMenu && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 200,
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: 190, overflow: 'hidden' }}>
          {[
            { icon: <Printer size={13} />, label: type === 'employee' ? 'Imprimer badges ID' : 'Imprimer badges QR', action: 'print' },
            { icon: <Download size={13} />, label: 'Télécharger ZIP (images)', action: 'zip' },
          ].map(opt => (
            <button key={opt.action} onClick={() => run(opt.action)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: 'var(--text-secondary)', textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
