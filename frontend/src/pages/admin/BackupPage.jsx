import { useState } from 'react';
import { Download, RefreshCw, Shield, Clock, CheckCircle, AlertTriangle, Database } from 'lucide-react';
import toast from 'react-hot-toast';

const initialBackups = [
  { id: 1, name: 'backup-2026-04-11-auto', type: 'AUTO', size: '12.4 MB', status: 'SUCCESS', date: '2026-04-11 02:00', duration: '45s', modules: ['RH','Stock','Finance','CRM','Production'] },
  { id: 2, name: 'backup-2026-04-10-manual', type: 'MANUAL', size: '12.1 MB', status: 'SUCCESS', date: '2026-04-10 15:30', duration: '42s', modules: ['RH','Stock','Finance'] },
  { id: 3, name: 'backup-2026-04-09-auto', type: 'AUTO', size: '11.8 MB', status: 'SUCCESS', date: '2026-04-09 02:00', duration: '41s', modules: ['RH','Stock','Finance','CRM','Production'] },
  { id: 4, name: 'backup-2026-04-08-auto', type: 'AUTO', size: '11.5 MB', status: 'FAILED', date: '2026-04-08 02:00', duration: '—', modules: [] },
  { id: 5, name: 'backup-2026-04-07-auto', type: 'AUTO', size: '11.2 MB', status: 'SUCCESS', date: '2026-04-07 02:00', duration: '38s', modules: ['RH','Stock','Finance','CRM'] },
];

const DB_STATS = [
  { label: 'Employés',     count: 12,  table: 'employees',  color: '#6366f1' },
  { label: 'Clients',      count: 6,   table: 'customers',  color: '#10b981' },
  { label: 'Produits',     count: 6,   table: 'products',   color: '#ef4444' },
  { label: 'Commandes',    count: 24,  table: 'orders',     color: '#f59e0b' },
  { label: 'Factures',     count: 5,   table: 'invoices',   color: '#8b5cf6' },
  { label: 'Projets',      count: 3,   table: 'projects',   color: '#06b6d4' },
  { label: 'Utilisateurs', count: 8,   table: 'users',      color: '#f43f5e' },
  { label: 'Logs',         count: 247, table: 'logs',       color: '#64748b' },
];

export default function BackupPage() {
  const [backups, setBackups] = useState(initialBackups);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFreq, setBackupFreq] = useState('daily');
  const [retentionDays, setRetentionDays] = useState(30);

  const totalRecords = DB_STATS.reduce((s,d)=>s+d.count,0);

  const runBackup = () => {
    setIsRunning(true);
    setProgress(0);
    toast('⚙️ Sauvegarde en cours…', { icon: '💾' });

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRunning(false);
          const newBackup = {
            id: Date.now(),
            name: `backup-${new Date().toISOString().split('T')[0]}-manual`,
            type: 'MANUAL',
            size: '12.6 MB',
            status: 'SUCCESS',
            date: new Date().toLocaleString('fr-FR'),
            duration: '48s',
            modules: ['RH','Stock','Finance','CRM','Production','Maintenance'],
          };
          setBackups(prev => [newBackup, ...prev]);
          toast.success('✅ Sauvegarde terminée avec succès !');
          return 100;
        }
        return prev + 4;
      });
    }, 80);
  };

  const downloadBackup = (backup) => {
    toast.success(`📥 Téléchargement de ${backup.name}…`);
    setTimeout(() => toast('✅ Fichier téléchargé !'), 1500);
  };

  const deleteBackup = (id) => {
    setBackups(prev => prev.filter(b => b.id !== id));
    toast.success('Sauvegarde supprimée');
  };

  const inp = { background:'#0a0f1e',border:'1px solid #1e293b',borderRadius:8,color:'#f1f5f9',padding:'9px 12px',fontSize:13.5,outline:'none',width:'100%' };
  const lbl = { fontSize:11,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.3px',display:'block',marginBottom:5 };
  const td = { padding:'12px 16px',borderBottom:'1px solid #1e293b',color:'#94a3b8',fontSize:13 };
  const th = { padding:'10px 16px',textAlign:'left',fontSize:11,textTransform:'uppercase',letterSpacing:'0.5px',color:'#475569',borderBottom:'1px solid #1e293b' };

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>

      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:700,margin:0 }}>💾 Sauvegarde & Restauration</h1>
          <p style={{ color:'#475569',fontSize:13,marginTop:4 }}>{backups.filter(b=>b.status==='SUCCESS').length} sauvegardes disponibles · {totalRecords} enregistrements</p>
        </div>
        <button onClick={runBackup} disabled={isRunning}
          style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 20px',borderRadius:10,background:isRunning?'#334155':'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',color:'white',cursor:isRunning?'not-allowed':'pointer',fontWeight:600,fontSize:13,transition:'all 0.2s' }}>
          {isRunning ? <><RefreshCw size={15} style={{ animation:'spin 1s linear infinite' }}/> Sauvegarde… </> : <><Database size={15}/> Sauvegarder maintenant</>}
        </button>
      </div>

      {/* BARRE DE PROGRESSION */}
      {isRunning && (
        <div style={{ background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:12,padding:20 }}>
          <div style={{ display:'flex',justifyContent:'space-between',marginBottom:10,fontSize:13 }}>
            <span style={{ color:'#a5b4fc',fontWeight:600 }}>⚙️ Sauvegarde en cours…</span>
            <span style={{ color:'#6366f1',fontWeight:700 }}>{progress}%</span>
          </div>
          <div style={{ height:8,background:'#1e293b',borderRadius:4,overflow:'hidden' }}>
            <div style={{ height:'100%',width:`${progress}%`,background:'linear-gradient(90deg,#6366f1,#8b5cf6)',borderRadius:4,transition:'width 0.1s' }}/>
          </div>
          <div style={{ marginTop:8,fontSize:12,color:'#475569' }}>
            {progress < 30 && '📂 Collecte des données…'}
            {progress >= 30 && progress < 60 && '🗜️ Compression des fichiers…'}
            {progress >= 60 && progress < 90 && '🔐 Chiffrement AES-256…'}
            {progress >= 90 && '✅ Finalisation…'}
          </div>
        </div>
      )}

      {/* STATS DB */}
      <div style={{ background:'#111827',border:'1px solid #1e293b',borderRadius:14,padding:20 }}>
        <h3 style={{ margin:'0 0 16px',fontSize:15,fontWeight:600 }}>🗄️ État de la base de données</h3>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10 }}>
          {DB_STATS.map(s => (
            <div key={s.table} style={{ background:'#0a0f1e',border:'1px solid #1e293b',borderRadius:8,padding:'12px 14px',textAlign:'center' }}>
              <div style={{ fontSize:18,fontWeight:700,color:s.color,marginBottom:4 }}>{s.count}</div>
              <div style={{ fontSize:12,color:'#475569' }}>{s.label}</div>
              <div style={{ fontSize:10,color:'#334155',marginTop:2,fontFamily:'monospace' }}>{s.table}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:14,paddingTop:14,borderTop:'1px solid #1e293b',display:'flex',justifyContent:'space-between',fontSize:13,color:'#64748b' }}>
          <span>📊 Total : <strong style={{ color:'#f1f5f9' }}>{totalRecords}</strong> enregistrements</span>
          <span>💾 Taille estimée : <strong style={{ color:'#f1f5f9' }}>~12.6 MB</strong></span>
        </div>
      </div>

      {/* CONFIGURATION AUTO-BACKUP */}
      <div style={{ background:'#111827',border:'1px solid #1e293b',borderRadius:14,padding:20 }}>
        <h3 style={{ margin:'0 0 16px',fontSize:15,fontWeight:600 }}>⚙️ Configuration sauvegarde automatique</h3>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16 }}>

          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'#0a0f1e',borderRadius:10,border:'1px solid #1e293b' }}>
            <div>
              <div style={{ fontSize:14,fontWeight:500,color:'#f1f5f9' }}>Sauvegarde automatique</div>
              <div style={{ fontSize:12,color:'#475569',marginTop:2 }}>Exécution planifiée</div>
            </div>
            <button onClick={()=>setAutoBackup(!autoBackup)} style={{ width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',background:autoBackup?'#6366f1':'#334155',position:'relative',flexShrink:0 }}>
              <span style={{ position:'absolute',top:3,width:18,height:18,borderRadius:'50%',background:'white',transition:'left 0.3s',left:autoBackup?'calc(100% - 21px)':'3px' }}/>
            </button>
          </div>

          <div style={{ background:'#0a0f1e',borderRadius:10,border:'1px solid #1e293b',padding:'12px 16px' }}>
            <label style={lbl}>Fréquence</label>
            <select style={inp} value={backupFreq} onChange={e=>setBackupFreq(e.target.value)}>
              <option value="hourly">Toutes les heures</option>
              <option value="daily">Quotidien (02:00)</option>
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuel</option>
            </select>
          </div>

          <div style={{ background:'#0a0f1e',borderRadius:10,border:'1px solid #1e293b',padding:'12px 16px' }}>
            <label style={lbl}>Rétention (jours)</label>
            <input style={inp} type="number" min="7" max="365" value={retentionDays} onChange={e=>setRetentionDays(Number(e.target.value))}/>
          </div>

          <div style={{ background:'#0a0f1e',borderRadius:10,border:'1px solid #1e293b',padding:'12px 16px' }}>
            <div style={{ fontSize:12,color:'#94a3b8',marginBottom:6,textTransform:'uppercase',letterSpacing:0.3 }}>Sécurité</div>
            <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
              {[['🔐 Chiffrement AES-256','#10b981'],['🗜️ Compression GZIP','#6366f1'],['✅ Vérification intégrité','#f59e0b']].map(([l,c])=>(
                <div key={l} style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#64748b' }}>
                  <div style={{ width:6,height:6,borderRadius:'50%',background:c,flexShrink:0 }}/>
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>

        <button onClick={()=>toast.success('✅ Configuration sauvegardée !')}
          style={{ marginTop:16,padding:'9px 20px',borderRadius:8,background:'#6366f1',border:'none',color:'white',cursor:'pointer',fontWeight:500,fontSize:13 }}>
          Sauvegarder la configuration
        </button>
      </div>

      {/* HISTORIQUE BACKUPS */}
      <div style={{ background:'#111827',border:'1px solid #1e293b',borderRadius:12,overflow:'hidden' }}>
        <div style={{ padding:'16px 20px',borderBottom:'1px solid #1e293b',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <h3 style={{ margin:0,fontSize:15,fontWeight:600 }}>📋 Historique des sauvegardes</h3>
          <span style={{ fontSize:12,color:'#475569' }}>{backups.length} sauvegarde(s)</span>
        </div>
        <table style={{ width:'100%',borderCollapse:'collapse' }}>
          <thead><tr>{['Nom','Type','Taille','Durée','Date','Statut','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {backups.map(b=>(
              <tr key={b.id}>
                <td style={{ ...td,fontFamily:'monospace',fontSize:12,color:'#a5b4fc' }}>{b.name}</td>
                <td style={td}>
                  <span style={{ fontSize:11,color:b.type==='AUTO'?'#6366f1':'#10b981',background:b.type==='AUTO'?'rgba(99,102,241,0.1)':'rgba(16,185,129,0.1)',padding:'2px 8px',borderRadius:4 }}>
                    {b.type==='AUTO'?'⚙️ Auto':'👤 Manuel'}
                  </span>
                </td>
                <td style={td}>{b.size}</td>
                <td style={td}>{b.duration}</td>
                <td style={{ ...td,fontFamily:'monospace',fontSize:11,color:'#64748b' }}>{b.date}</td>
                <td style={td}>
                  {b.status==='SUCCESS'
                    ? <span style={{ display:'flex',alignItems:'center',gap:4,fontSize:12,color:'#10b981' }}><CheckCircle size={13}/> Succès</span>
                    : <span style={{ display:'flex',alignItems:'center',gap:4,fontSize:12,color:'#ef4444' }}><AlertTriangle size={13}/> Échec</span>
                  }
                </td>
                <td style={td}>
                  <div style={{ display:'flex',gap:6 }}>
                    {b.status==='SUCCESS' && (
                      <button onClick={()=>downloadBackup(b)}
                        style={{ background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:6,padding:'5px 10px',color:'#6366f1',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',gap:4 }}>
                        <Download size={12}/> DL
                      </button>
                    )}
                    <button onClick={()=>deleteBackup(b.id)}
                      style={{ background:'none',border:'1px solid #1e293b',borderRadius:6,padding:'5px 8px',color:'#ef4444',cursor:'pointer',fontSize:12 }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}