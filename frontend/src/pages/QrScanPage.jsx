import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const TYPE_CONFIG = {
  employee:  { icon: '👤', color: '#6366f1', bg: '#eef2ff', label: 'Employé' },
  product:   { icon: '📦', color: '#f59e0b', bg: '#fffbeb', label: 'Produit' },
  equipment: { icon: '🔧', color: '#10b981', bg: '#ecfdf5', label: 'Équipement' },
  supplier:  { icon: '🏭', color: '#3b82f6', bg: '#eff6ff', label: 'Fournisseur' },
  customer:  { icon: '🤝', color: '#ec4899', bg: '#fdf2f8', label: 'Client' },
  order:     { icon: '📋', color: '#8b5cf6', bg: '#f5f3ff', label: 'Commande' },
  invoice:   { icon: '🧾', color: '#ef4444', bg: '#fef2f2', label: 'Facture' },
  department:{ icon: '🏢', color: '#06b6d4', bg: '#ecfeff', label: 'Département' },
};

const FIELD_LABELS = {
  position: 'Poste', department: 'Département', email: 'Email',
  phone: 'Téléphone', sku: 'Référence', category: 'Catégorie',
  stock: 'Stock', location: 'Emplacement', type: 'Type',
  status: 'Statut', serial: 'N° Série', city: 'Ville',
  customer: 'Client', total: 'Montant', sub_department: 'Sous-département',
};

export default function QrScanPage() {
  const { code } = useParams();
  const [state, setState] = useState('loading');
  const [record, setRecord] = useState(null);

  useEffect(() => {
    const BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
    let attempts = 0;
    const tryFetch = () => {
      attempts++;
      axios.get(`${BASE}/api/v1/qr/scan-json/${code}`, { timeout: 60000 })
        .then(r => { setRecord(r.data.data); setState('ok'); })
        .catch(err => {
          if (attempts < 3 && (err.code === 'ECONNABORTED' || !err.response)) {
            setState('waking');
            setTimeout(tryFetch, 5000);
          } else {
            setState('error');
          }
        });
    };
    tryFetch();
  }, [code]);

  if (state === 'loading' || state === 'waking') return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <p style={{ color: '#1e293b', fontWeight: 700, marginBottom: 8 }}>
            {state === 'waking' ? 'Réveil du serveur...' : 'Chargement...'}
          </p>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>
            {state === 'waking' ? 'Le serveur était en veille, patiente 10-15 secondes.' : 'Récupération des données...'}
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (state === 'error' || !record) return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>❌</div>
        <h2 style={{ color: '#ef4444', margin: '0 0 8px' }}>QR Code invalide</h2>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Ce code n'existe pas ou a été supprimé.</p>
      </div>
    </div>
  );

  const qrData = record.qrData || {};
  const extra  = qrData.extraData || qrData.extra_data || {};
  const type   = record.type;
  const name   = record.label || qrData.name || '—';
  const cfg    = TYPE_CONFIG[type] || { icon: '🔖', color: '#6366f1', bg: '#eef2ff', label: type };

  const phone = extra.phone || null;
  const email = extra.email || null;
  const otherEntries = Object.entries(extra).filter(([k, v]) => k !== 'phone' && k !== 'email' && v);
  const scanDate = new Date().toLocaleDateString('fr-DZ', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div style={{ ...styles.page, background: `linear-gradient(160deg, ${cfg.color}18 0%, #f8fafc 60%)` }}>
      <div style={styles.card}>
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`, padding: '32px 24px 28px', textAlign: 'center', borderRadius: '24px 24px 0 0' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,.22)', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', padding: '3px 12px', borderRadius: 20, marginBottom: 10 }}>
            {cfg.label}
          </div>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 40, animation: 'ring 2.4s ease-in-out infinite' }}>
            {cfg.icon}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1.25 }}>{name}</div>
        </div>

        {/* Verified */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: cfg.bg, padding: '10px 20px', fontSize: 13, fontWeight: 600, color: cfg.color }}>
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: cfg.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✓</span>
          Identité vérifiée via NexusERP
        </div>

        {/* Info */}
        <div style={{ padding: '4px 20px 8px' }}>
          {phone && (
            <div style={styles.row}>
              <span style={styles.label}>Téléphone</span>
              <a href={`tel:${phone}`} style={{ ...styles.val, color: cfg.color }}>{phone}</a>
            </div>
          )}
          {email && (
            <div style={styles.row}>
              <span style={styles.label}>Email</span>
              <a href={`mailto:${email}`} style={{ ...styles.val, color: cfg.color, wordBreak: 'break-all' }}>{email}</a>
            </div>
          )}
          {otherEntries.map(([k, v]) => (
            <div key={k} style={styles.row}>
              <span style={styles.label}>{FIELD_LABELS[k] || k}</span>
              <span style={styles.val}>{v}</span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        {(phone || email) && (
          <div style={{ display: 'flex', gap: 10, padding: '8px 20px 16px' }}>
            {phone && <a href={`tel:${phone}`} style={{ flex: 1, background: cfg.color, color: '#fff', padding: '13px 8px', borderRadius: 14, textAlign: 'center', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>📞 Appeler</a>}
            {email && <a href={`mailto:${email}`} style={{ flex: 1, background: cfg.bg, color: cfg.color, padding: '13px 8px', borderRadius: 14, textAlign: 'center', fontWeight: 700, fontSize: 14, textDecoration: 'none', border: `1.5px solid ${cfg.color}33` }}>✉️ Email</a>}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '0 20px 20px', fontSize: 11, color: '#cbd5e1' }}>
          <div style={{ fontWeight: 800, color: cfg.color, fontSize: 13, marginBottom: 2 }}>NexusERP</div>
          Scanné le {scanDate}
        </div>
      </div>
      <style>{`
        @keyframes ring { 0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.5)} 60%{box-shadow:0 0 0 14px rgba(255,255,255,0)} }
        @keyframes up { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:none} }
      `}</style>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
  card: { background: '#fff', borderRadius: 24, width: '100%', maxWidth: 400, boxShadow: '0 8px 40px rgba(0,0,0,.12)', overflow: 'hidden', animation: 'up .45s cubic-bezier(.22,1,.36,1) both' },
  row:  { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #f1f5f9', gap: 12 },
  label:{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 },
  val:  { fontSize: 14, fontWeight: 600, color: '#1e293b', textAlign: 'right', textDecoration: 'none' },
};
