import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollAPI } from '../../api/client.js';
import { Download, Check, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/index.js';

/* ─── Payslip PDF generator ──────────────────────────────────── */
function printPayslip(entry, company = {}) {
  const COMPANY = {
    name:    company.name    || 'NexusERP',
    address: company.address || '',
    email:   company.email   || '',
    logo:    'NexusERP',
  };

  const fmt  = (n) => new Intl.NumberFormat('fr-DZ').format(Number(n) || 0) + ' DZD';
  const emp  = entry.employee || {};
  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const monthLabel = `${monthNames[(entry.month || 1) - 1]} ${entry.year}`;
  const paidDate   = entry.paidAt ? new Date(entry.paidAt).toLocaleDateString('fr-FR') : '—';

  const cotisationBase  = Number(entry.baseSalary || 0) * 0.09;   // 9% CNAS salarié
  const irg             = Math.max(0, (Number(entry.netSalary || 0) - 10000) * 0.1); // IRG simplifié
  const brut            = Number(entry.baseSalary || 0) + Number(entry.bonus || 0);
  const net             = Number(entry.netSalary || 0);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Fiche de Paie — ${emp.firstName} ${emp.lastName} — ${monthLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px 48px; }

    /* HEADER */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #4f46e5; padding-bottom: 20px; }
    .logo h1 { font-size: 24px; font-weight: 900; color: #4f46e5; letter-spacing: -1px; }
    .logo p  { font-size: 11px; color: #64748b; margin-top: 2px; line-height: 1.5; }
    .doc-meta { text-align: right; }
    .doc-meta .doc-title { font-size: 20px; font-weight: 800; color: #1e293b; }
    .doc-meta .doc-period { font-size: 14px; color: #6366f1; font-weight: 700; margin-top: 4px; }
    .doc-meta .doc-ref { font-size: 11px; color: #94a3b8; margin-top: 4px; }

    /* PARTIES */
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .party { padding: 16px 20px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; }
    .party-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; color: #94a3b8; margin-bottom: 8px; }
    .party-name  { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .party-detail { font-size: 11.5px; color: #64748b; line-height: 1.65; }
    .party-detail strong { color: #334155; }

    /* SECTION TITLE */
    .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin-bottom: 10px; margin-top: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }

    /* TABLE */
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12.5px; }
    thead tr { background: #1e293b; }
    th { padding: 9px 14px; text-align: left; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.7px; }
    th:last-child { text-align: right; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:last-child { border-bottom: none; }
    td { padding: 11px 14px; color: #334155; }
    td:last-child { text-align: right; font-weight: 600; }
    .row-positive { color: #10b981; }
    .row-negative { color: #ef4444; }

    /* TOTALS */
    .totals-box { width: 300px; margin-left: auto; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; padding: 16px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12.5px; border-bottom: 1px solid #e2e8f0; color: #64748b; }
    .totals-row:last-child { border-bottom: none; }
    .totals-row.total { padding: 12px 14px; background: #4f46e5; border-radius: 8px; margin-top: 8px; }
    .totals-row.total span { font-size: 15px; font-weight: 800; color: white; }

    /* SIGNATURE */
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 32px; }
    .sig-block { text-align: center; }
    .sig-block p { font-size: 11px; color: #94a3b8; margin-bottom: 30px; }
    .sig-line { border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 11px; color: #64748b; }

    /* STATUS BADGE */
    .status-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 20px;
      background: ${entry.paidAt ? '#dcfce7' : '#fef9c3'};
      color: ${entry.paidAt ? '#166534' : '#854d0e'}; }

    /* FOOTER */
    .footer { margin-top: 40px; text-align: center; font-size: 10.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; line-height: 1.6; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 20px 24px; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="logo">
      <h1>${COMPANY.logo}</h1>
      <p>${COMPANY.name}${COMPANY.address ? '<br/>' + COMPANY.address : ''}${COMPANY.email ? '<br/>' + COMPANY.email : ''}</p>
    </div>
    <div class="doc-meta">
      <div class="doc-title">FICHE DE PAIE</div>
      <div class="doc-period">${monthLabel}</div>
      <div class="doc-ref">Réf : PAY-${entry.year}-${String(entry.month).padStart(2,'0')}-${emp.id?.slice(-6).toUpperCase() || '------'}</div>
    </div>
  </div>

  <div class="status-badge">${entry.paidAt ? '✓ Versé le ' + paidDate : '⏳ En attente de versement'}</div>

  <!-- Parties -->
  <div class="parties">
    <div class="party">
      <div class="party-label">Employeur</div>
      <div class="party-name">${COMPANY.name}</div>
      <div class="party-detail">
        ${COMPANY.address}<br/>
        ${COMPANY.city}<br/>
        ${COMPANY.email}
      </div>
    </div>
    <div class="party">
      <div class="party-label">Employé</div>
      <div class="party-name">${emp.firstName || ''} ${emp.lastName || ''}</div>
      <div class="party-detail">
        <strong>Poste :</strong> ${emp.position || '—'}<br/>
        <strong>Département :</strong> ${emp.department || '—'}<br/>
        <strong>Contrat :</strong> ${emp.contractType || 'CDI'}<br/>
        <strong>Matricule :</strong> ${emp.id?.slice(-8).toUpperCase() || '—'}
      </div>
    </div>
  </div>

  <!-- Rémunération brute -->
  <div class="section-title">Rémunération</div>
  <table>
    <thead><tr><th>Désignation</th><th>Base</th><th>Taux</th><th>Montant</th></tr></thead>
    <tbody>
      <tr>
        <td>Salaire de base</td>
        <td>${fmt(entry.baseSalary)}</td>
        <td>—</td>
        <td class="row-positive">${fmt(entry.baseSalary)}</td>
      </tr>
      ${entry.bonus > 0 ? `<tr>
        <td>Primes et indemnités</td>
        <td>—</td>
        <td>—</td>
        <td class="row-positive">${fmt(entry.bonus)}</td>
      </tr>` : ''}
      <tr style="background:#f8fafc;font-weight:700">
        <td><strong>Total brut</strong></td>
        <td>—</td>
        <td>—</td>
        <td>${fmt(brut)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Retenues -->
  <div class="section-title">Retenues et cotisations</div>
  <table>
    <thead><tr><th>Désignation</th><th>Base</th><th>Taux</th><th>Montant</th></tr></thead>
    <tbody>
      <tr>
        <td>Cotisation CNAS (salarié)</td>
        <td>${fmt(entry.baseSalary)}</td>
        <td>9 %</td>
        <td class="row-negative">- ${fmt(cotisationBase)}</td>
      </tr>
      <tr>
        <td>IRG (impôt sur salaire)</td>
        <td>${fmt(net)}</td>
        <td>≈ 10 %</td>
        <td class="row-negative">- ${fmt(irg)}</td>
      </tr>
      ${entry.deductions > 0 ? `<tr>
        <td>Autres déductions</td>
        <td>—</td>
        <td>—</td>
        <td class="row-negative">- ${fmt(entry.deductions)}</td>
      </tr>` : ''}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals-box">
    <div class="totals-row"><span>Salaire brut</span><span>${fmt(brut)}</span></div>
    <div class="totals-row"><span>Total retenues</span><span>- ${fmt(cotisationBase + irg + Number(entry.deductions || 0))}</span></div>
    <div class="totals-row total"><span>Net à payer</span><span>${fmt(net)}</span></div>
  </div>

  <!-- Signatures -->
  <div class="signatures">
    <div class="sig-block">
      <p>Signature de l'employeur</p>
      <div class="sig-line">Pour ${COMPANY.name}</div>
    </div>
    <div class="sig-block">
      <p>Signature de l'employé (lu et approuvé)</p>
      <div class="sig-line">${emp.firstName || ''} ${emp.lastName || ''}</div>
    </div>
  </div>

  <div class="footer">
    Fiche de paie générée par NexusERP — ${COMPANY.name}<br/>
    Document officiel — À conserver pendant 5 ans
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
}

const fmt = (n) => new Intl.NumberFormat('fr-DZ').format(Number(n) || 0) + ' DZD';

const EditableCell = ({ value, onSave, disabled }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  if (disabled) return <span>{fmt(value)}</span>;

  if (!editing) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
      onClick={() => { setVal(value); setEditing(true); }}>
      {fmt(value)} <Edit2 size={11} style={{ color: 'var(--text-muted)' }} />
    </span>
  );

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <input
        type="number" value={val} min="0"
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
        style={{ width: 100, padding: '3px 6px', borderRadius: 4, border: '1px solid var(--accent-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 13 }}
        autoFocus
      />
      <button className="btn btn--primary" style={{ padding: '3px 8px', fontSize: 11 }}
        onClick={() => { onSave(Number(val)); setEditing(false); }}>
        <Check size={11} />
      </button>
    </span>
  );
};

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(now.getFullYear()));

  const monthInput = `${year}-${month}`;

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', month, year],
    queryFn: () => payrollAPI.getAll({ month, year }).then(r => r.data),
  });

  const generateMutation = useMutation({
    mutationFn: () => payrollAPI.generate({ month: Number(month), year: Number(year) }),
    onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ['payroll'] }); toast.success(res.message || 'Paie générée'); },
    onError: (err) => toast.error(err.message || 'Erreur lors de la génération'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => payrollAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll'] }); toast.success('Mis à jour'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const payMutation = useMutation({
    mutationFn: payrollAPI.markPaid,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll'] }); toast.success('✅ Salaire marqué comme versé'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const entries = data || [];
  const totalNet = entries.reduce((s, e) => s + (e.netSalary || 0), 0);
  const totalBonus = entries.reduce((s, e) => s + (e.bonus || 0), 0);
  const paidCount = entries.filter(e => e.paidAt).length;

  const handleMonthChange = (e) => {
    const [y, m] = e.target.value.split('-');
    setYear(y);
    setMonth(m);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">💰 Gestion de la Paie</h1>
          <p className="page-subtitle">
            Masse salariale : <strong style={{ color: 'var(--accent-primary)' }}>{fmt(totalNet)}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="month" value={monthInput} onChange={handleMonthChange}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', padding: '8px 12px' }} />
          <button className="btn btn--ghost" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? 'Génération…' : '⚡ Générer la paie'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Masse salariale nette', value: fmt(totalNet), color: '#6366f1', icon: '💰' },
          { label: 'Total primes', value: fmt(totalBonus), color: '#10b981', icon: '🎁' },
          { label: 'Salaires versés', value: `${paidCount} / ${entries.length}`, color: paidCount === entries.length && entries.length > 0 ? '#10b981' : '#f59e0b', icon: '✅' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="table-card" style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th>Employé</th><th>Département</th><th>Salaire de base</th>
              <th>Primes</th><th>Déductions</th><th>Net à payer</th><th>Statut</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="table-loading">Chargement…</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={8} className="table-empty">
                Aucune fiche de paie pour cette période.{' '}
                <button className="btn btn--ghost" style={{ fontSize: 12, padding: '2px 8px', display: 'inline' }}
                  onClick={() => generateMutation.mutate()}>Générer maintenant</button>
              </td></tr>
            ) : entries.map(entry => (
              <tr key={entry.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{entry.employee?.firstName} {entry.employee?.lastName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{entry.employee?.position}</div>
                </td>
                <td><span className="tag">{entry.employee?.department}</span></td>
                <td>{fmt(entry.baseSalary)}</td>
                <td style={{ color: '#10b981' }}>
                  <EditableCell
                    value={entry.bonus}
                    disabled={!!entry.paidAt}
                    onSave={(bonus) => updateMutation.mutate({ id: entry.id, data: { bonus } })}
                  />
                </td>
                <td style={{ color: '#ef4444' }}>
                  <EditableCell
                    value={entry.deductions}
                    disabled={!!entry.paidAt}
                    onSave={(deductions) => updateMutation.mutate({ id: entry.id, data: { deductions } })}
                  />
                </td>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>{fmt(entry.netSalary)}</td>
                <td>
                  {entry.paidAt ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: '#10b98122', color: '#10b981' }}>
                      <Check size={11} /> Versé
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: '#f59e0b22', color: '#f59e0b' }}>
                      En attente
                    </span>
                  )}
                </td>
                <td>
                  <div className="table-actions">
                    {!entry.paidAt && (
                      <button className="btn btn--primary" style={{ padding: '5px 12px', fontSize: 12 }}
                        onClick={() => { if (window.confirm(`Marquer le salaire de ${entry.employee?.firstName} ${entry.employee?.lastName} comme versé ?`)) payMutation.mutate(entry.id); }}>
                        Verser
                      </button>
                    )}
                    <button className="btn btn--ghost" style={{ padding: '5px 12px', fontSize: 12 }}
                      onClick={() => printPayslip(entry, user?.company)}>
                      <Download size={13} /> Fiche
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
