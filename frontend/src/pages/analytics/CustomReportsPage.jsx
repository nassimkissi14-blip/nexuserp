import { useState } from 'react';
import { Plus, Download, Play, Trash2, Save, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import AnimatedPage from '../../components/ui/AnimatedPage.jsx';
import { PageHeader, Btn, EmptyState } from '../../components/ui/DesignSystem.jsx';

const LS = 'nexus_custom_reports';
const load = () => { try { return JSON.parse(localStorage.getItem(LS)) || []; } catch { return []; } };
const persist = (d) => localStorage.setItem(LS, JSON.stringify(d));

const MODULES = {
  orders:    { label: 'Commandes',    fields: ['référence', 'client', 'montant', 'statut', 'date', 'vendeur'] },
  invoices:  { label: 'Factures',     fields: ['numéro', 'client', 'montant HT', 'TVA', 'montant TTC', 'statut', 'date'] },
  products:  { label: 'Produits',     fields: ['référence', 'nom', 'catégorie', 'stock', 'prix unitaire', 'valeur stock'] },
  employees: { label: 'Employés',     fields: ['nom', 'prénom', 'département', 'poste', 'date embauche', 'salaire'] },
  shipments: { label: 'Expéditions',  fields: ['référence', 'client', 'destination', 'transporteur', 'statut', 'date'] },
  expenses:  { label: 'Notes de frais',fields: ['numéro', 'employé', 'catégorie', 'montant', 'statut', 'date'] },
};

const FORMATS = [
  { key: 'table',   label: 'Tableau',     icon: '📋' },
  { key: 'summary', label: 'Synthèse',    icon: '📊' },
  { key: 'export',  label: 'Export CSV',  icon: '📤' },
];

// Mock data generator
const genMockData = (module, fields, filters) => {
  const rows = [];
  const count = 8 + Math.floor(Math.random() * 8);
  const clients = ['Sonatrach', 'Air Algérie', 'SNVI', 'Cevital', 'Naftal', 'Mobilis', 'Ooredoo'];
  const statuses = ['Actif', 'Terminé', 'En cours', 'Annulé'];
  for (let i = 0; i < count; i++) {
    const row = {};
    fields.forEach(f => {
      if (f.includes('montant') || f.includes('salaire') || f.includes('prix') || f.includes('valeur')) row[f] = Math.round(10000 + Math.random() * 990000).toLocaleString('fr-DZ') + ' DA';
      else if (f === 'client' || f === 'employé') row[f] = clients[Math.floor(Math.random() * clients.length)];
      else if (f === 'statut') row[f] = statuses[Math.floor(Math.random() * statuses.length)];
      else if (f === 'date' || f.includes('embauche')) row[f] = new Date(2024, Math.floor(Math.random() * 12), Math.floor(1 + Math.random() * 28)).toLocaleDateString('fr-FR');
      else if (f === 'stock') row[f] = Math.floor(Math.random() * 500);
      else row[f] = `${f.charAt(0).toUpperCase()}${f.slice(1)}-${Math.floor(1000 + Math.random() * 9000)}`;
    });
    rows.push(row);
  }
  return rows;
};

export default function CustomReportsPage() {
  const [saved, setSaved] = useState(load);
  const [step, setStep] = useState('builder'); // 'builder' | 'result'

  const [selModule, setSelModule]   = useState('orders');
  const [selFields, setSelFields]   = useState(['référence', 'client', 'montant', 'statut']);
  const [selFormat, setSelFormat]   = useState('table');
  const [reportName, setReportName] = useState('');
  const [filterText, setFilterText] = useState('');
  const [sortField, setSortField]   = useState('');
  const [results, setResults]       = useState(null);

  const module = MODULES[selModule];

  const toggleField = (f) => {
    setSelFields(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const runReport = () => {
    if (selFields.length === 0) { toast.error('Sélectionnez au moins une colonne'); return; }
    const data = genMockData(selModule, selFields);
    setResults(data);
    setStep('result');
    toast.success(`${data.length} lignes générées`);
  };

  const saveReport = () => {
    if (!reportName.trim()) { toast.error('Donnez un nom au rapport'); return; }
    const rep = {
      id: crypto.randomUUID(),
      name: reportName,
      module: selModule,
      fields: selFields,
      format: selFormat,
      createdAt: new Date().toISOString(),
    };
    const updated = [...saved, rep];
    setSaved(updated);
    persist(updated);
    setReportName('');
    toast.success('Rapport sauvegardé');
  };

  const deleteSaved = (id) => {
    const updated = saved.filter(r => r.id !== id);
    setSaved(updated);
    persist(updated);
  };

  const loadReport = (rep) => {
    setSelModule(rep.module);
    setSelFields(rep.fields);
    setSelFormat(rep.format);
    setStep('builder');
    toast.success(`Rapport "${rep.name}" chargé`);
  };

  return (
    <AnimatedPage>
      <div className="erp-page">
        <PageHeader icon="📋" title="Rapports personnalisés" subtitle="Construisez et exportez vos propres rapports à partir de toutes les données ERP"
          actions={
            step === 'result'
              ? <div style={{ display: 'flex', gap: 8 }}>
                  <Btn variant="secondary" onClick={() => setStep('builder')}>← Modifier</Btn>
                  <Btn variant="primary" icon={<Download size={14} />} onClick={() => toast.success('Export CSV simulé')}>Exporter CSV</Btn>
                </div>
              : null
          }
        />

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

          {/* LEFT: Builder panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Saved reports */}
            {saved.length > 0 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Rapports sauvegardés</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {saved.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{MODULES[r.module]?.label}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => loadReport(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', fontSize: 11, fontWeight: 600 }}>Charger</button>
                        <button onClick={() => deleteSaved(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Module selector */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>1. Source de données</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {Object.entries(MODULES).map(([k, v]) => (
                  <button key={k} onClick={() => { setSelModule(k); setSelFields(v.fields.slice(0, 4)); setResults(null); setStep('builder'); }}
                    style={{ padding: '9px 12px', background: selModule === k ? 'rgba(99,102,241,0.15)' : 'transparent', border: `1px solid ${selModule === k ? 'rgba(99,102,241,0.35)' : 'transparent'}`, borderRadius: 7, cursor: 'pointer', fontSize: 12.5, fontWeight: selModule === k ? 700 : 400, color: selModule === k ? '#818cf8' : 'var(--text-secondary)', textAlign: 'left', transition: 'all .15s' }}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Field selector */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>2. Colonnes ({selFields.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {module?.fields.map(f => {
                  const active = selFields.includes(f);
                  return (
                    <button key={f} onClick={() => toggleField(f)}
                      style={{ padding: '4px 9px', background: active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: active ? 700 : 400, color: active ? '#818cf8' : 'var(--text-muted)', transition: 'all .15s' }}>
                      {active ? '✓ ' : ''}{f}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Format */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>3. Format</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {FORMATS.map(f => (
                  <button key={f.key} onClick={() => setSelFormat(f.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: selFormat === f.key ? 'rgba(99,102,241,0.15)' : 'transparent', border: `1px solid ${selFormat === f.key ? 'rgba(99,102,241,0.35)' : 'transparent'}`, borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: selFormat === f.key ? 700 : 400, color: selFormat === f.key ? '#818cf8' : 'var(--text-secondary)', textAlign: 'left' }}>
                    <span>{f.icon}</span> {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <Btn variant="primary" icon={<Play size={14} />} onClick={runReport} style={{ width: '100%' }}>Générer le rapport</Btn>

            {/* Save */}
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={reportName} onChange={e => setReportName(e.target.value)} placeholder="Nom du rapport…"
                style={{ flex: 1, padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-primary)', fontSize: 12, outline: 'none' }} />
              <Btn variant="secondary" icon={<Save size={13} />} onClick={saveReport} />
            </div>
          </div>

          {/* RIGHT: Results */}
          <div>
            {step === 'builder' && !results && (
              <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 14 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Configurez votre rapport</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Sélectionnez la source, les colonnes et le format, puis cliquez sur "Générer"</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
                  {['Source: ' + module?.label, `${selFields.length} colonnes`, 'Format: ' + FORMATS.find(f => f.key === selFormat)?.label].map((t, i) => (
                    <span key={i} style={{ fontSize: 12, background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '5px 12px', borderRadius: 6 }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {results && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99,102,241,0.04)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{MODULES[selModule]?.label} — {results.length} enregistrements</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Colonnes: {selFields.join(', ')}</div>
                  </div>
                  <span style={{ fontSize: 11, background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 10px', borderRadius: 5, fontWeight: 600 }}>✅ Généré</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                        {selFields.map(f => (
                          <th key={f} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.7, whiteSpace: 'nowrap' }}>{f}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          {selFields.map(f => (
                            <td key={f} style={{ padding: '10px 14px', fontSize: 12.5, color: f === 'statut' ? (row[f] === 'Actif' ? '#10b981' : row[f] === 'Annulé' ? '#ef4444' : 'var(--text-secondary)') : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                              {row[f]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
