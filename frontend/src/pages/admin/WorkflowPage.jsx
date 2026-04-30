import { useState } from 'react';
import { Plus, Play, Pause, Trash2, ChevronRight, Zap, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const TRIGGERS = {
  LEAVE_REQUEST:    { label: 'Demande de congé soumise',    icon: '🏖️', module: 'RH' },
  LOW_STOCK:        { label: 'Stock en dessous du seuil',   icon: '📦', module: 'Stock' },
  INVOICE_OVERDUE:  { label: 'Facture en retard',           icon: '🧾', module: 'Finance' },
  NEW_EMPLOYEE:     { label: 'Nouvel employé ajouté',       icon: '👤', module: 'RH' },
  OF_COMPLETED:     { label: 'Ordre de fabrication terminé',icon: '🏭', module: 'Production' },
  MAINTENANCE_DUE:  { label: 'Maintenance planifiée proche',icon: '🔧', module: 'Maintenance' },
  LARGE_ORDER:      { label: 'Commande > seuil défini',     icon: '📋', module: 'Ventes' },
};

const ACTIONS = {
  NOTIFY_EMAIL:     { label: 'Envoyer un email',            icon: '📧' },
  NOTIFY_SYSTEM:    { label: 'Notification système',        icon: '🔔' },
  ASSIGN_MANAGER:   { label: 'Assigner au manager',         icon: '👤' },
  CREATE_TASK:      { label: 'Créer une tâche',             icon: '✅' },
  UPDATE_STATUS:    { label: 'Mettre à jour le statut',     icon: '🔄' },
  SEND_REPORT:      { label: 'Générer un rapport',          icon: '📊' },
  BLOCK_ACTION:     { label: 'Bloquer l\'action',           icon: '🚫' },
};

const CONDITIONS = {
  ALWAYS:           { label: 'Toujours',                    icon: '♾️' },
  ROLE_MANAGER:     { label: 'Si rôle Manager ou +',        icon: '👑' },
  AMOUNT_GT:        { label: 'Si montant > seuil',          icon: '💰' },
  DAYS_GT:          { label: 'Si jours > seuil',            icon: '📅' },
  DEPT_MATCH:       { label: 'Si département correspond',   icon: '🏢' },
};

const initialWorkflows = [
  {
    id: 1, name: 'Validation congé automatique', active: true,
    trigger: 'LEAVE_REQUEST', condition: 'DAYS_GT', conditionValue: '3',
    action: 'NOTIFY_SYSTEM', actionValue: 'Manager direct',
    description: 'Notifie le manager quand un congé > 3 jours est soumis',
    runs: 47, lastRun: '2026-04-11 09:01',
  },
  {
    id: 2, name: 'Alerte rupture de stock', active: true,
    trigger: 'LOW_STOCK', condition: 'ALWAYS', conditionValue: '',
    action: 'NOTIFY_EMAIL', actionValue: 'responsable.stock@monentreprise.dz',
    description: 'Email automatique quand un produit passe sous le seuil minimum',
    runs: 12, lastRun: '2026-04-10 14:22',
  },
  {
    id: 3, name: 'Relance facture impayée', active: true,
    trigger: 'INVOICE_OVERDUE', condition: 'ALWAYS', conditionValue: '',
    action: 'NOTIFY_EMAIL', actionValue: 'comptabilite@monentreprise.dz',
    description: 'Alerte automatique pour les factures en retard de paiement',
    runs: 8, lastRun: '2026-04-09 08:00',
  },
  {
    id: 4, name: 'Onboarding nouvel employé', active: false,
    trigger: 'NEW_EMPLOYEE', condition: 'ALWAYS', conditionValue: '',
    action: 'CREATE_TASK', actionValue: 'Préparer poste de travail',
    description: 'Crée automatiquement une checklist d\'accueil pour chaque nouveau',
    runs: 3, lastRun: '2026-04-01 11:00',
  },
  {
    id: 5, name: 'Rapport production quotidien', active: true,
    trigger: 'OF_COMPLETED', condition: 'ALWAYS', conditionValue: '',
    action: 'SEND_REPORT', actionValue: 'direction@monentreprise.dz',
    description: 'Envoie un rapport à la direction quand un OF est terminé',
    runs: 5, lastRun: '2026-04-05 17:00',
  },
];

const Modal = ({ title, onClose, children }) => (
  <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
    <div style={{ background:'#111827',border:'1px solid #1e293b',borderRadius:14,width:'100%',maxWidth:560,maxHeight:'90vh',overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 24px',borderBottom:'1px solid #1e293b' }}>
        <h3 style={{ margin:0,fontSize:16 }}>{title}</h3>
        <button onClick={onClose} style={{ background:'none',border:'none',color:'#64748b',cursor:'pointer' }}><X size={18}/></button>
      </div>
      <div style={{ padding:24 }}>{children}</div>
    </div>
  </div>
);

const inp = { background:'#0a0f1e',border:'1px solid #1e293b',borderRadius:8,color:'#f1f5f9',padding:'9px 12px',fontSize:13.5,outline:'none',width:'100%' };
const lbl = { fontSize:11,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.3px',display:'block',marginBottom:5 };

export default function WorkflowPage() {
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ trigger:'LEAVE_REQUEST', condition:'ALWAYS', action:'NOTIFY_SYSTEM', active:true });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const toggleWorkflow = (id) => {
    setWorkflows(prev => prev.map(w => w.id===id ? {...w,active:!w.active} : w));
    const wf = workflows.find(w=>w.id===id);
    toast.success(`Workflow "${wf.name}" ${!wf.active?'activé ✅':'désactivé ❌'}`);
  };

  const deleteWorkflow = (id) => {
    setWorkflows(prev => prev.filter(w=>w.id!==id));
    toast.success('Workflow supprimé');
  };

  const createWorkflow = () => {
    if (!form.name || !form.trigger || !form.action) { toast.error('Remplissez tous les champs'); return; }
    setWorkflows(prev => [...prev, { ...form, id: Date.now(), runs: 0, lastRun: '—', description: form.description || '' }]);
    toast.success('✅ Workflow créé !');
    setModal(null);
    setForm({ trigger:'LEAVE_REQUEST', condition:'ALWAYS', action:'NOTIFY_SYSTEM', active:true });
  };

  const runWorkflow = (wf) => {
    setWorkflows(prev => prev.map(w => w.id===wf.id ? {...w, runs:w.runs+1, lastRun: new Date().toLocaleString('fr-FR')} : w));
    toast.success(`⚡ Workflow "${wf.name}" exécuté manuellement`);
  };

  const activeCount = workflows.filter(w=>w.active).length;

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>

      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:700,margin:0 }}>⚡ Workflows Automatisés</h1>
          <p style={{ color:'#475569',fontSize:13,marginTop:4 }}>{activeCount} workflow(s) actif(s) · Automatisation intelligente</p>
        </div>
        <button onClick={()=>setModal('create')}
          style={{ display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:8,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',color:'white',cursor:'pointer',fontWeight:500,fontSize:13 }}>
          <Plus size={16}/> Nouveau workflow
        </button>
      </div>

      {/* STATS */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:14 }}>
        {[
          { label:'Workflows actifs',  value:activeCount,                                                    color:'#10b981', icon:'⚡' },
          { label:'Total exécutions',  value:workflows.reduce((s,w)=>s+w.runs,0),                           color:'#6366f1', icon:'🔄' },
          { label:'Inactifs',          value:workflows.filter(w=>!w.active).length,                         color:'#64748b', icon:'⏸️' },
          { label:'Modules couverts',  value:new Set(Object.values(TRIGGERS).map(t=>t.module)).size,        color:'#f59e0b', icon:'🏢' },
        ].map((k,i)=>(
          <div key={i} style={{ background:'#111827',border:'1px solid #1e293b',borderRadius:12,padding:16,position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:k.color }}/>
            <div style={{ fontSize:24,marginBottom:8 }}>{k.icon}</div>
            <div style={{ fontSize:22,fontWeight:700,color:k.color,marginBottom:4 }}>{k.value}</div>
            <div style={{ fontSize:12,color:'#475569' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* LISTE WORKFLOWS */}
      <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
        {workflows.map(wf => {
          const trigger = TRIGGERS[wf.trigger];
          const action = ACTIONS[wf.action];
          const condition = CONDITIONS[wf.condition];
          return (
            <div key={wf.id} style={{
              background:'#111827', border:`1px solid ${wf.active?'#1e293b':'#0f172a'}`,
              borderRadius:14, padding:20, opacity:wf.active?1:0.6, transition:'all 0.2s',
            }}>
              <div style={{ display:'flex',alignItems:'flex-start',gap:16 }}>

                {/* Toggle active */}
                <button onClick={()=>toggleWorkflow(wf.id)} style={{
                  width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',
                  background:wf.active?'#6366f1':'#334155',position:'relative',
                  transition:'background 0.3s',flexShrink:0,marginTop:2,
                }}>
                  <span style={{
                    position:'absolute',top:3,width:18,height:18,borderRadius:'50%',
                    background:'white',transition:'left 0.3s',
                    left:wf.active?'calc(100% - 21px)':'3px',
                  }}/>
                </button>

                {/* Info */}
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
                    <h3 style={{ margin:0,fontSize:15,fontWeight:600,color:'#f1f5f9' }}>{wf.name}</h3>
                    <span style={{ fontSize:11,color:wf.active?'#10b981':'#475569',background:wf.active?'rgba(16,185,129,0.1)':'rgba(71,85,105,0.2)',padding:'2px 8px',borderRadius:20 }}>
                      {wf.active?'● Actif':'○ Inactif'}
                    </span>
                  </div>

                  {wf.description && (
                    <p style={{ color:'#64748b',fontSize:13,margin:'0 0 12px',lineHeight:1.5 }}>{wf.description}</p>
                  )}

                  {/* Flow visuel : Déclencheur → Condition → Action */}
                  <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:6,background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:8,padding:'6px 10px',fontSize:12 }}>
                      <span>{trigger?.icon}</span>
                      <span style={{ color:'#a5b4fc' }}>{trigger?.label}</span>
                    </div>
                    <ChevronRight size={14} style={{ color:'#334155',flexShrink:0 }}/>
                    <div style={{ display:'flex',alignItems:'center',gap:6,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:8,padding:'6px 10px',fontSize:12 }}>
                      <span>{condition?.icon}</span>
                      <span style={{ color:'#fbbf24' }}>{condition?.label}{wf.conditionValue?` (${wf.conditionValue})`:''}</span>
                    </div>
                    <ChevronRight size={14} style={{ color:'#334155',flexShrink:0 }}/>
                    <div style={{ display:'flex',alignItems:'center',gap:6,background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:8,padding:'6px 10px',fontSize:12 }}>
                      <span>{action?.icon}</span>
                      <span style={{ color:'#34d399' }}>{action?.label}{wf.actionValue?` → ${wf.actionValue}`:''}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display:'flex',gap:16,marginTop:12,fontSize:12,color:'#475569' }}>
                    <span>🔄 {wf.runs} exécution(s)</span>
                    <span>🕐 Dernière : {wf.lastRun}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:'flex',gap:6,flexShrink:0 }}>
                  <button onClick={()=>runWorkflow(wf)} title="Exécuter maintenant"
                    style={{ background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:8,padding:'7px 10px',color:'#6366f1',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12 }}>
                    <Play size={13}/> Exécuter
                  </button>
                  <button onClick={()=>deleteWorkflow(wf.id)}
                    style={{ background:'none',border:'1px solid #1e293b',borderRadius:8,padding:7,color:'#ef4444',cursor:'pointer',display:'flex',alignItems:'center' }}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL CREATE */}
      {modal==='create' && (
        <Modal title="⚡ Nouveau Workflow" onClose={()=>setModal(null)}>
          <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
            <div><label style={lbl}>Nom du workflow *</label><input style={inp} value={form.name||''} onChange={e=>set('name',e.target.value)} placeholder="Ex: Validation congé automatique" /></div>
            <div><label style={lbl}>Description</label><textarea style={{ ...inp,resize:'vertical',minHeight:60 }} value={form.description||''} onChange={e=>set('description',e.target.value)} placeholder="Décrivez ce que fait ce workflow…"/></div>

            <div style={{ background:'#0a0f1e',border:'1px solid #1e293b',borderRadius:10,padding:16 }}>
              <div style={{ fontSize:12,color:'#6366f1',fontWeight:600,marginBottom:12,textTransform:'uppercase',letterSpacing:0.5 }}>🔗 Configuration du flux</div>
              <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
                <div>
                  <label style={lbl}>1️⃣ Déclencheur (QUAND ?)</label>
                  <select style={inp} value={form.trigger} onChange={e=>set('trigger',e.target.value)}>
                    {Object.entries(TRIGGERS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>2️⃣ Condition (SI ?)</label>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                    <select style={inp} value={form.condition} onChange={e=>set('condition',e.target.value)}>
                      {Object.entries(CONDITIONS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </select>
                    <input style={inp} value={form.conditionValue||''} onChange={e=>set('conditionValue',e.target.value)} placeholder="Valeur (optionnel)"/>
                  </div>
                </div>
                <div>
                  <label style={lbl}>3️⃣ Action (ALORS ?)</label>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                    <select style={inp} value={form.action} onChange={e=>set('action',e.target.value)}>
                      {Object.entries(ACTIONS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </select>
                    <input style={inp} value={form.actionValue||''} onChange={e=>set('actionValue',e.target.value)} placeholder="Destinataire / valeur"/>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
              <button onClick={()=>set('active',!form.active)} style={{
                width:42,height:24,borderRadius:12,border:'none',cursor:'pointer',
                background:form.active?'#6366f1':'#334155',position:'relative',flexShrink:0,
              }}>
                <span style={{ position:'absolute',top:3,width:18,height:18,borderRadius:'50%',background:'white',transition:'left 0.3s',left:form.active?'calc(100% - 21px)':'3px' }}/>
              </button>
              <span style={{ fontSize:13,color:'#94a3b8' }}>Activer immédiatement</span>
            </div>
          </div>
          <div style={{ display:'flex',justifyContent:'flex-end',gap:10,marginTop:20,paddingTop:16,borderTop:'1px solid #1e293b' }}>
            <button onClick={()=>setModal(null)} style={{ padding:'9px 16px',borderRadius:8,background:'#111827',border:'1px solid #1e293b',color:'#f1f5f9',cursor:'pointer',fontSize:13 }}>Annuler</button>
            <button onClick={createWorkflow} style={{ padding:'9px 20px',borderRadius:8,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',color:'white',cursor:'pointer',fontWeight:600,fontSize:13 }}>Créer le workflow</button>
          </div>
        </Modal>
      )}
    </div>
  );
}