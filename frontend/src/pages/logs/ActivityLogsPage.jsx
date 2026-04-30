import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client.js';
import { Search, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const ACTION_CFG = {
  CREATE: { label: 'Création',      color: '#10b981', icon: '➕' },
  UPDATE: { label: 'Modification',  color: '#6366f1', icon: '✏️' },
  DELETE: { label: 'Suppression',   color: '#ef4444', icon: '🗑️' },
};
const ENTITY_CFG = {
  EMPLOYEE:    { label: 'Employé',    icon: '👤', color: '#6366f1' },
  LEAVE:       { label: 'Congé',      icon: '🏖️', color: '#8b5cf6' },
  PAYROLL:     { label: 'Paie',       icon: '💰', color: '#10b981' },
  CUSTOMER:    { label: 'Client',     icon: '🤝', color: '#3b82f6' },
  PRODUCT:     { label: 'Produit',    icon: '📦', color: '#f59e0b' },
  ORDER:       { label: 'Commande',   icon: '📋', color: '#ef4444' },
  INVOICE:     { label: 'Facture',    icon: '🧾', color: '#06b6d4' },
  QUOTE:       { label: 'Devis',      icon: '📄', color: '#a855f7' },
  USER:        { label: 'Utilisateur',icon: '🔐', color: '#64748b' },
  PROJECT:     { label: 'Projet',     icon: '🗂️', color: '#f97316' },
  EVALUATION:  { label: 'Évaluation',icon: '⭐', color: '#eab308' },
  EXPENSE:     { label: 'Dépense',   icon: '🧾', color: '#10b981' },
};

export default function ActivityLogsPage() {
  const [search, setSearch]           = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterEntity, setFilterEntity] = useState('ALL');
  const [page, setPage]               = useState(1);
  const PER_PAGE = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, filterAction, filterEntity],
    queryFn: () => apiClient.get('/audit', {
      params: {
        page,
        limit: PER_PAGE,
        ...(filterAction !== 'ALL' && { action: filterAction }),
        ...(filterEntity !== 'ALL' && { entity: filterEntity }),
      }
    }),
    staleTime: 15000,
  });

  const logs       = data?.data || [];
  const totalPages = data?.pages || 1;
  const total      = data?.total || 0;

  const filtered = search
    ? logs.filter(l =>
        `${l.user?.firstName} ${l.user?.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        (l.entity || '').toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const handleExport = () => {
    const csv = ['ID,Utilisateur,Action,Entité,Date,IP',
      ...filtered.map(l => `"${l.id}","${l.user?.firstName} ${l.user?.lastName}","${ACTION_CFG[l.action]?.label||l.action}","${ENTITY_CFG[l.entity]?.label||l.entity}","${new Date(l.createdAt).toLocaleString('fr-FR')}","${l.ipAddress||''}"`)
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('📤 Export CSV téléchargé !');
  };

  const inp = { background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text-primary)',padding:'9px 12px',fontSize:13,outline:'none',fontFamily:'inherit' };
  const th  = { padding:'10px 16px',textAlign:'left',fontSize:11,textTransform:'uppercase',letterSpacing:'.5px',color:'var(--text-muted)',borderBottom:'1px solid var(--border)',fontWeight:700 };
  const td  = { padding:'12px 16px',borderBottom:'1px solid var(--border)',color:'var(--text-secondary)',fontSize:13 };

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:700,margin:0 }}>📋 Logs d'Activité</h1>
          <p style={{ color:'var(--text-muted)',fontSize:13,marginTop:4 }}>{total} action(s) enregistrée(s) · Traçabilité en temps réel</p>
        </div>
        <button onClick={handleExport} style={{ display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:8,background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text-muted)',cursor:'pointer',fontSize:13 }}>
          <Download size={15}/> Export CSV
        </button>
      </div>

      {/* STATS par action */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12 }}>
        {Object.entries(ACTION_CFG).map(([key,val]) => (
          <div key={key} onClick={() => setFilterAction(filterAction===key?'ALL':key)}
            style={{ background:'var(--bg-card)',border:`1px solid ${filterAction===key?val.color:'var(--border)'}`,borderRadius:10,padding:'12px 14px',cursor:'pointer',transition:'all .2s' }}>
            <div style={{ fontSize:20,marginBottom:6 }}>{val.icon}</div>
            <div style={{ fontSize:18,fontWeight:700,color:val.color,marginBottom:2 }}>
              {logs.filter(l=>l.action===key).length}
            </div>
            <div style={{ fontSize:11,color:'var(--text-muted)' }}>{val.label}</div>
          </div>
        ))}
      </div>

      {/* FILTRES */}
      <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,padding:'0 12px',flex:1,minWidth:200 }}>
          <Search size={15} style={{ color:'var(--text-muted)',flexShrink:0 }}/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Rechercher utilisateur…"
            style={{ background:'none',border:'none',outline:'none',color:'var(--text-primary)',fontSize:13,padding:'9px 0',width:'100%',fontFamily:'inherit' }}/>
        </div>
        <select value={filterAction} onChange={e=>{setFilterAction(e.target.value);setPage(1);}} style={inp}>
          <option value="ALL">Toutes les actions</option>
          {Object.entries(ACTION_CFG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <select value={filterEntity} onChange={e=>{setFilterEntity(e.target.value);setPage(1);}} style={inp}>
          <option value="ALL">Toutes les entités</option>
          {Object.entries(ENTITY_CFG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
      </div>

      {/* TABLE */}
      <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,overflow:'auto' }}>
        <table style={{ width:'100%',borderCollapse:'collapse' }}>
          <thead>
            <tr>{['Utilisateur','Action','Entité','Date & Heure','IP'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ ...td,textAlign:'center',padding:40,color:'var(--text-muted)' }}>Chargement…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ ...td,textAlign:'center',padding:40,color:'var(--text-muted)' }}>Aucun log trouvé</td></tr>
            ) : filtered.map(log => {
              const a = ACTION_CFG[log.action] || { label:log.action, color:'#64748b', icon:'•' };
              const e = ENTITY_CFG[log.entity] || { label:log.entity, color:'#64748b', icon:'📌' };
              return (
                <tr key={log.id} onMouseEnter={ev=>ev.currentTarget.style.background='rgba(255,255,255,0.025)'} onMouseLeave={ev=>ev.currentTarget.style.background='transparent'}>
                  <td style={td}>
                    <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                      <div style={{ width:28,height:28,borderRadius:'50%',background:'rgba(99,102,241,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#a5b4fc',flexShrink:0 }}>
                        {log.user?.firstName?.[0]}{log.user?.lastName?.[0]}
                      </div>
                      <span style={{ fontWeight:500,color:'var(--text-primary)' }}>{log.user?.firstName} {log.user?.lastName}</span>
                    </div>
                  </td>
                  <td style={td}>
                    <span style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:12,color:a.color,background:a.color+'22',padding:'3px 8px',borderRadius:20,fontWeight:500 }}>
                      {a.icon} {a.label}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:12,color:e.color,background:e.color+'15',padding:'2px 8px',borderRadius:4 }}>
                      {e.icon} {e.label}
                    </span>
                  </td>
                  <td style={{ ...td,fontFamily:'monospace',fontSize:11,color:'var(--text-muted)',whiteSpace:'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString('fr-FR')}
                  </td>
                  <td style={{ ...td,fontFamily:'monospace',fontSize:11,color:'var(--text-muted)' }}>{log.ipAddress || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
          <button disabled={page===1} onClick={()=>setPage(p=>p-1)} style={{ padding:'7px 14px',borderRadius:8,background:'var(--bg-card)',border:'1px solid var(--border)',color:page===1?'var(--text-muted)':'var(--text-secondary)',cursor:page===1?'not-allowed':'pointer',fontSize:13 }}>← Précédent</button>
          <span style={{ fontSize:13,color:'var(--text-muted)' }}>Page {page} / {totalPages}</span>
          <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} style={{ padding:'7px 14px',borderRadius:8,background:'var(--bg-card)',border:'1px solid var(--border)',color:page===totalPages?'var(--text-muted)':'var(--text-secondary)',cursor:page===totalPages?'not-allowed':'pointer',fontSize:13 }}>Suivant →</button>
        </div>
      )}
    </div>
  );
}
