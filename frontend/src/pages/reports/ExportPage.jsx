import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Table, Printer, RefreshCw } from 'lucide-react';
import apiClient from '../../api/client.js';
import toast from 'react-hot-toast';

const fmt = (n) => Number(n || 0).toLocaleString('fr-DZ') + ' DZD';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const STATUS_FR = {
  ACTIVE: 'Actif', ON_LEAVE: 'En congé', SUSPENDED: 'Suspendu', TERMINATED: 'Résilié',
  PAID: 'Payée', SENT: 'Envoyée', OVERDUE: 'En retard', DRAFT: 'Brouillon', CANCELLED: 'Annulée',
  DRAFT_P: 'Planifié', IN_PROGRESS: 'En cours', COMPLETED: 'Terminé', ON_HOLD: 'En pause',
  CDI: 'CDI', CDD: 'CDD', INTERIM: 'Intérim', STAGE: 'Stage', FREELANCE: 'Freelance',
};
const tr = (v) => STATUS_FR[v] || v || '—';

function buildReports(employees, payrolls, products, invoices, productionOrders) {
  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear  = now.getFullYear();

  const empRows = (employees || []).map(e => [
    e.lastName, e.firstName, e.department || '—', e.position || '—',
    tr(e.contractType), fmt(e.salary), tr(e.status),
  ]);

  const currentPayrolls = (payrolls || []).filter(p => p.month === thisMonth && p.year === thisYear);
  const payRows = currentPayrolls.map(p => {
    const emp = employees?.find(e => e.id === p.employeeId);
    const name = emp ? `${emp.firstName} ${emp.lastName}` : p.employeeId;
    const cotis = Math.round(Number(p.baseSalary || 0) * 0.09);
    const retenues = cotis + Number(p.deductions || 0);
    return [name, fmt(p.baseSalary), fmt(p.bonus), fmt(retenues), fmt(p.netSalary), p.paidAt ? 'Versé' : 'En attente'];
  });

  const stockRows = (products || []).map(p => [
    p.name, p.sku || '—', String(p.stockQty ?? 0), String(p.minStockQty ?? 0),
    fmt((p.stockQty || 0) * (p.buyPrice || 0)),
    (p.stockQty || 0) <= (p.minStockQty || 0) ? 'CRITIQUE' : 'OK',
  ]);

  const invRows = (invoices || []).map(i => [
    i.reference, i.customer?.name || '—',
    fmt(i.subtotal), fmt(i.taxAmount), fmt(i.totalAmount), tr(i.status),
    fmtDate(i.issueDate), fmtDate(i.dueDate),
  ]);

  const prodRows = (productionOrders || []).map(o => [
    o.number || '—', o.product?.name || '—',
    String(o.quantity), String(o.producedQty || 0),
    o.quantity > 0 ? Math.round((o.producedQty || 0) / o.quantity * 100) + '%' : '0%',
    tr(o.status),
  ]);

  return [
    {
      id: 'employees', title: 'Liste des Employés', desc: 'Tous les employés avec leurs informations complètes',
      icon: '👥', module: 'RH', color: '#6366f1', formats: ['PDF', 'CSV'],
      headers: ['Nom', 'Prénom', 'Département', 'Poste', 'Contrat', 'Salaire', 'Statut'],
      rows: empRows,
    },
    {
      id: 'payroll', title: `Bulletin de Paie — ${thisMonth}/${thisYear}`,
      desc: 'Récapitulatif des salaires et charges du mois en cours',
      icon: '💰', module: 'Finance', color: '#10b981', formats: ['PDF', 'CSV'],
      headers: ['Employé', 'Salaire Base', 'Primes', 'Retenues', 'Net à Payer', 'Statut'],
      rows: payRows,
    },
    {
      id: 'stock', title: 'État du Stock', desc: 'Inventaire complet avec niveaux et alertes',
      icon: '📦', module: 'Stock', color: '#ef4444', formats: ['PDF', 'CSV'],
      headers: ['Produit', 'SKU', 'Stock actuel', 'Stock min', 'Valeur', 'Statut'],
      rows: stockRows,
    },
    {
      id: 'invoices', title: 'Rapport Factures', desc: 'Toutes les factures avec statuts et montants',
      icon: '🧾', module: 'Finance', color: '#f59e0b', formats: ['PDF', 'CSV'],
      headers: ['Référence', 'Client', 'HT', 'TVA', 'TTC', 'Statut', 'Émission', 'Échéance'],
      rows: invRows,
    },
    {
      id: 'production', title: 'Suivi Production', desc: "État d'avancement de tous les ordres de fabrication",
      icon: '🏭', module: 'Production', color: '#8b5cf6', formats: ['PDF', 'CSV'],
      headers: ['N° OF', 'Produit', 'Quantité', 'Produit', 'Avancement', 'Statut'],
      rows: prodRows,
    },
  ];
}

const exportCSV = (report) => {
  const rows = [report.headers, ...report.rows];
  const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${report.id}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  toast.success(`📤 Export CSV : ${report.title}`);
};

const exportPDF = (report) => {
  const allRows = [report.headers, ...report.rows];
  const html = `<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><title>${report.title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 30px; color: #1e293b; }
      h1 { color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px; font-size: 20px; }
      .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
      th { background: #1e293b; color: white; padding: 10px 12px; text-align: left; }
      td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
      tr:nth-child(even) td { background: #f8fafc; }
      .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    </style></head><body>
    <h1>${report.icon} ${report.title}</h1>
    <div class="meta">Généré le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${report.rows.length} enregistrement(s) · NexusERP</div>
    <table>${allRows.map((row, i) => `<tr>${row.map(cell => i === 0 ? `<th>${cell}</th>` : `<td>${cell}</td>`).join('')}</tr>`).join('')}</table>
    <div class="footer">NexusERP — Rapport généré automatiquement · Confidentiel</div>
    </body></html>`;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
  toast.success(`🖨️ Impression PDF : ${report.title}`);
};

export default function ExportPage() {
  const [preview, setPreview] = useState(null);
  const [search, setSearch] = useState('');

  const now = new Date();

  const { data: empData,    isLoading: l1, refetch: r1 } = useQuery({ queryKey: ['export-employees'],   queryFn: () => apiClient.get('/employees', { params: { limit: 200 } }).then(r => r.data) });
  const { data: payData,    isLoading: l2, refetch: r2 } = useQuery({ queryKey: ['export-payroll'],     queryFn: () => apiClient.get('/payroll', { params: { month: now.getMonth() + 1, year: now.getFullYear() } }).then(r => r.data) });
  const { data: prodData,   isLoading: l3, refetch: r3 } = useQuery({ queryKey: ['export-products'],    queryFn: () => apiClient.get('/products', { params: { limit: 200 } }).then(r => r.data) });
  const { data: invData,    isLoading: l4, refetch: r4 } = useQuery({ queryKey: ['export-invoices'],    queryFn: () => apiClient.get('/invoices', { params: { limit: 200 } }).then(r => r.data) });
  const { data: manData,    isLoading: l5, refetch: r5 } = useQuery({ queryKey: ['export-production'],  queryFn: () => apiClient.get('/production/orders', { params: { limit: 200 } }).then(r => r.data) });

  const isLoading = l1 || l2 || l3 || l4 || l5;

  const reports = buildReports(
    empData?.data  || empData  || [],
    payData?.data  || payData  || [],
    prodData?.data || prodData || [],
    invData?.data  || invData  || [],
    manData?.data  || manData  || [],
  );

  const filtered = reports.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.module.toLowerCase().includes(search.toLowerCase())
  );

  const refetchAll = () => { r1(); r2(); r3(); r4(); r5(); toast.success('Données actualisées'); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>📤 Export & Rapports</h1>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>{reports.length} rapports · données temps réel</p>
        </div>
        <button onClick={refetchAll} disabled={isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
          <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          {isLoading ? 'Chargement…' : 'Actualiser'}
        </button>
      </div>

      {/* SEARCH */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#111827', border: '1px solid #1e293b', borderRadius: 8, padding: '0 12px', maxWidth: 400 }}>
        <FileText size={15} style={{ color: '#475569' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un rapport…"
          style={{ background: 'none', border: 'none', outline: 'none', color: '#f1f5f9', fontSize: 13, padding: '9px 0', width: '100%' }} />
      </div>

      {/* GRILLE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
        {filtered.map(report => (
          <div key={report.id}
            style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 14, overflow: 'hidden', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = report.color}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1e293b'}>
            <div style={{ padding: 20, borderBottom: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: report.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {report.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#f1f5f9' }}>{report.title}</div>
                    <div style={{ fontSize: 11, color: report.color, background: report.color + '22', padding: '2px 8px', borderRadius: 4, marginTop: 3, display: 'inline-block' }}>{report.module}</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: '#475569', background: '#1e293b', padding: '2px 8px', borderRadius: 20 }}>
                  {report.rows.length} ligne{report.rows.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{report.desc}</p>
            </div>
            <div style={{ padding: '14px 20px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setPreview(preview?.id === report.id ? null : report)}
                style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid #1e293b', color: '#94a3b8', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                👁️ Aperçu
              </button>
              <button onClick={() => exportCSV(report)}
                style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Table size={13} /> CSV
              </button>
              <button onClick={() => exportPDF(report)}
                style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: report.color + '22', border: `1px solid ${report.color}44`, color: report.color, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontWeight: 600 }}>
                <Printer size={13} /> PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* APERÇU */}
      {preview && (
        <div style={{ background: '#111827', border: `1px solid ${preview.color}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #1e293b' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{preview.icon} Aperçu — {preview.title}</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => exportCSV(preview)} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', cursor: 'pointer', fontSize: 12 }}>
                <Download size={13} /> CSV
              </button>
              <button onClick={() => exportPDF(preview)} style={{ padding: '6px 14px', borderRadius: 8, background: preview.color + '22', border: `1px solid ${preview.color}44`, color: preview.color, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                <Printer size={13} /> PDF
              </button>
              <button onClick={() => setPreview(null)} style={{ padding: '6px 12px', borderRadius: 8, background: '#0a0f1e', border: '1px solid #1e293b', color: '#64748b', cursor: 'pointer', fontSize: 12 }}>✕</button>
            </div>
          </div>
          {preview.rows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 14 }}>
              Aucune donnée disponible pour ce rapport
            </div>
          ) : (
            <div style={{ overflowX: 'auto', padding: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {preview.headers.map((h, i) => (
                      <th key={i} style={{ padding: '10px 14px', textAlign: 'left', background: '#0a0f1e', color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', borderBottom: '1px solid #1e293b' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {row.map((cell, j) => (
                        <td key={j} style={{ padding: '11px 14px', borderBottom: '1px solid #1e293b', color: j === 0 ? '#f1f5f9' : '#94a3b8', whiteSpace: 'nowrap' }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ padding: '12px 20px', borderTop: '1px solid #1e293b', fontSize: 12, color: '#334155', textAlign: 'right' }}>
            {preview.rows.length} enregistrement(s) · {new Date().toLocaleDateString('fr-FR')} · données temps réel
          </div>
        </div>
      )}
    </div>
  );
}
