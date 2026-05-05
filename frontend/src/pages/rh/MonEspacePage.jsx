import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client.js';
import { useAuthStore } from '../../store/index.js';
import toast from 'react-hot-toast';
import { Plus, FileText, Calendar, User, Clock, CheckCircle, XCircle, Hourglass } from 'lucide-react';

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmtDZD  = n => Number(n||0).toLocaleString('fr-DZ') + ' DA';

const LEAVE_STATUS = {
  PENDING:  { label: 'En attente', color: '#f59e0b', bg: '#fef3c7', icon: <Hourglass size={12}/> },
  APPROVED: { label: 'Approuvé',  color: '#10b981', bg: '#d1fae5', icon: <CheckCircle size={12}/> },
  REJECTED: { label: 'Refusé',    color: '#ef4444', bg: '#fee2e2', icon: <XCircle size={12}/> },
};
const LEAVE_TYPE_LABEL = { ANNUAL:'Congé annuel', SICK:'Maladie', MATERNITY:'Maternité', PATERNITY:'Paternité', UNPAID:'Sans solde', OTHER:'Autre' };

const Modal = ({ title, onClose, children }) => (
  <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
    <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 24px',borderBottom:'1px solid var(--border)' }}>
        <h3 style={{ margin:0,fontSize:16,fontWeight:700 }}>{title}</h3>
        <button onClick={onClose} style={{ background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:20,lineHeight:1 }}>×</button>
      </div>
      <div style={{ padding:24 }}>{children}</div>
    </div>
  </div>
);

export default function MonEspacePage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });

  const { data: empData }     = useQuery({ queryKey: ['my-employee'], queryFn: () => apiClient.get('/employees/my') });
  const { data: leavesData }  = useQuery({ queryKey: ['my-leaves'],   queryFn: () => apiClient.get('/leaves/my') });
  const { data: payrollData } = useQuery({ queryKey: ['my-payroll'],  queryFn: () => apiClient.get('/payroll/my') });

  const employee = empData?.data;
  const leaves   = leavesData?.data || [];
  const payrolls = payrollData?.data || [];

  const leaveMutation = useMutation({
    mutationFn: (data) => apiClient.post('/leaves', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-leaves'] });
      setLeaveModal(false);
      setLeaveForm({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });
      toast.success('✅ Demande envoyée !');
    },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const submitLeave = (e) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate) return toast.error('Dates requises');
    if (!employee) return toast.error('Fiche employé introuvable — contactez RH');
    const days = Math.ceil((new Date(leaveForm.endDate) - new Date(leaveForm.startDate)) / 86400000) + 1;
    leaveMutation.mutate({ ...leaveForm, employeeId: employee.id, days });
  };

  const approvedLeaves = leaves.filter(l => l.status === 'APPROVED').reduce((s, l) => s + (l.days || 0), 0);
  const pendingLeaves  = leaves.filter(l => l.status === 'PENDING').length;
  const lastPayroll    = payrolls[0];

  const calcAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const calcSeniority = (hireDate) => {
    if (!hireDate) return null;
    const today = new Date();
    const hire = new Date(hireDate);
    let years = today.getFullYear() - hire.getFullYear();
    let months = today.getMonth() - hire.getMonth();
    if (months < 0) { years--; months += 12; }
    return years > 0 ? `${years} an${years > 1 ? 's' : ''} ${months > 0 ? months + ' mois' : ''}` : `${months} mois`;
  };

  const age = calcAge(employee?.birthDate);
  const seniority = calcSeniority(employee?.hireDate);


  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">👤 Mon Espace</h1>
          <p className="page-subtitle">{user?.firstName} {user?.lastName} · {user?.department || 'Département non défini'}</p>
        </div>
        <button className="btn btn--primary" onClick={() => setLeaveModal(true)}>
          <Plus size={15}/> Demande de congé
        </button>
      </div>

      {/* KPI CARDS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16 }}>
        {[
          { icon:'💼', label:'Poste', value: employee?.position || '—', color:'#6366f1' },
          { icon:'📅', label:'Ancienneté', value: seniority || (employee?.hireDate ? fmtDate(employee.hireDate) : '—'), color:'#8b5cf6' },
          { icon:'🏖️', label:'Congés pris', value: `${approvedLeaves} jour(s)`, color:'#10b981' },
          { icon:'⏳', label:'En attente', value: `${pendingLeaves} demande(s)`, color:'#f59e0b' },
          { icon:'💰', label:'Dernier salaire', value: lastPayroll ? fmtDZD(lastPayroll.netSalary) : '—', color:'#06b6d4' },
          { icon:'📄', label:'Contrat', value: employee?.contractType || '—', color:'#a855f7' },
        ].map((k, i) => (
          <div key={i} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderTop:`3px solid ${k.color}`, borderRadius:'var(--radius-lg)', padding:'16px 18px' }}>
            <div style={{ fontSize:22, marginBottom:10 }}>{k.icon}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:.7, marginBottom:4, fontWeight:600 }}>{k.label}</div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="tabs-bar">
        {[['overview','Vue d\'ensemble'],['leaves','Mes congés'],['payroll','Mes fiches de paie']].map(([key,label]) => (
          <button key={key} className={`tab-btn${tab===key?' active':''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* TAB: OVERVIEW */}
      {tab === 'overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {/* Infos personnelles */}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:20 }}>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}><User size={15} color="#6366f1"/> Mes informations</div>
            {[
              ['Email',       employee?.email || user?.email || '—'],
              ['Téléphone',   employee?.phone || '—'],
              ['Département', employee?.department || user?.department || '—'],
              ['Adresse',     employee?.address || '—'],
              ['Date naiss.', employee?.birthDate ? fmtDate(employee.birthDate) : '—'],
              ['Âge',         age ? `${age} ans` : '—'],
              ['Date embauche', employee?.hireDate ? fmtDate(employee.hireDate) : '—'],
              ['Ancienneté',  seniority || '—'],
              ['Type contrat',employee?.contractType || '—'],
              ['Statut',      employee?.status || '—'],
            ].map(([label, val]) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                <span style={{ color:'var(--text-muted)' }}>{label}</span>
                <span style={{ fontWeight:500, color:'var(--text-primary)' }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Dernières demandes */}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:20 }}>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}><Calendar size={15} color="#10b981"/> Derniers congés</div>
            {leaves.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--text-muted)', padding:'24px 0', fontSize:13 }}>Aucune demande</div>
            ) : leaves.slice(0, 5).map(l => {
              const s = LEAVE_STATUS[l.status] || LEAVE_STATUS.PENDING;
              return (
                <div key={l.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                  <div>
                    <div style={{ fontWeight:600 }}>{LEAVE_TYPE_LABEL[l.type] || l.type}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{fmtDate(l.startDate)} → {fmtDate(l.endDate)}</div>
                  </div>
                  <span className={`badge badge--${l.status === 'APPROVED' ? 'green' : l.status === 'REJECTED' ? 'red' : 'orange'} badge--dot`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: CONGÉS */}
      {tab === 'leaves' && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Type','Du','Au','Durée','Motif','Statut'].map(h => (
                  <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:.7 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--text-muted)', fontSize:13 }}>Aucune demande de congé</td></tr>
              ) : leaves.map(l => {
                const s = LEAVE_STATUS[l.status] || LEAVE_STATUS.PENDING;
                return (
                  <tr key={l.id} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'11px 16px', fontWeight:600, fontSize:13 }}>{LEAVE_TYPE_LABEL[l.type] || l.type}</td>
                    <td style={{ padding:'11px 16px', fontSize:13, color:'var(--text-secondary)' }}>{fmtDate(l.startDate)}</td>
                    <td style={{ padding:'11px 16px', fontSize:13, color:'var(--text-secondary)' }}>{fmtDate(l.endDate)}</td>
                    <td style={{ padding:'11px 16px', fontSize:13 }}>{l.days || '—'} j</td>
                    <td style={{ padding:'11px 16px', fontSize:12, color:'var(--text-muted)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.reason || '—'}</td>
                    <td style={{ padding:'11px 16px' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:600, color:s.color, background:s.bg }}>
                        {s.icon} {s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: FICHES DE PAIE */}
      {tab === 'payroll' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {payrolls.length === 0 ? (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
              Aucune fiche de paie disponible
            </div>
          ) : payrolls.map(p => (
            <div key={p.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'18px 22px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:44, height:44, borderRadius:10, background:'rgba(99,102,241,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>💰</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15 }}>{MONTHS[p.month-1]} {p.year}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                      Brut : {fmtDZD((p.baseSalary || 0) + (p.bonus || 0))} · CNAS 9% : {fmtDZD((p.baseSalary || 0) * 0.09)}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:22, fontWeight:800, color:'#10b981' }}>{fmtDZD(p.netSalary)}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>Salaire net</div>
                </div>
              </div>
              {/* Détail */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10, marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
                {[
                  ['Salaire base', fmtDZD(p.baseSalary)],
                  ['Primes', fmtDZD(p.bonuses)],
                  ['Retenues', fmtDZD(p.deductions)],
                  ['Impôts', fmtDZD(p.taxAmount)],
                ].map(([label, val]) => (
                  <div key={label} style={{ background:'var(--bg-primary)', borderRadius:'var(--radius)', padding:'8px 12px' }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:3 }}>{label}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CONGÉ */}
      {leaveModal && (
        <Modal title="🏖️ Nouvelle demande de congé" onClose={() => setLeaveModal(false)}>
          <form onSubmit={submitLeave}>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="form-group">
                <label>Type de congé</label>
                <select value={leaveForm.type} onChange={e => setLeaveForm(f => ({...f, type: e.target.value}))}>
                  {Object.entries(LEAVE_TYPE_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="form-group">
                  <label>Date début *</label>
                  <input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm(f => ({...f, startDate: e.target.value}))} required/>
                </div>
                <div className="form-group">
                  <label>Date fin *</label>
                  <input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm(f => ({...f, endDate: e.target.value}))} required/>
                </div>
              </div>
              <div className="form-group">
                <label>Motif</label>
                <textarea value={leaveForm.reason} onChange={e => setLeaveForm(f => ({...f, reason: e.target.value}))} rows={3} placeholder="Motif optionnel…"/>
              </div>
            </div>
            <div className="form-actions" style={{ marginTop:20 }}>
              <button type="button" className="btn btn--ghost" onClick={() => setLeaveModal(false)}>Annuler</button>
              <button type="submit" className="btn btn--primary" disabled={leaveMutation.isPending}>
                {leaveMutation.isPending ? 'Envoi…' : 'Soumettre la demande'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
