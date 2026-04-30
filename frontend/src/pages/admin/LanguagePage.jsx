import { useState } from 'react';
import { Check, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { code:'fr', name:'Français',   flag:'🇫🇷', native:'Français',     coverage:100, default:true  },
  { code:'ar', name:'Arabe',      flag:'🇩🇿', native:'العربية',      coverage:85,  default:false },
  { code:'en', name:'Anglais',    flag:'🇬🇧', native:'English',      coverage:92,  default:false },
  { code:'es', name:'Espagnol',   flag:'🇪🇸', native:'Español',      coverage:70,  default:false },
  { code:'de', name:'Allemand',   flag:'🇩🇪', native:'Deutsch',      coverage:60,  default:false },
];

const TRANSLATIONS_FR = {
  'dashboard.title':       'Tableau de bord',
  'employees.title':       'Gestion des Employés',
  'stock.title':           'Gestion des Stocks',
  'invoices.title':        'Gestion des Factures',
  'production.title':      'Module Production',
  'maintenance.title':     'Module Maintenance',
  'btn.save':              'Enregistrer',
  'btn.cancel':            'Annuler',
  'btn.add':               'Ajouter',
  'btn.edit':              'Modifier',
  'btn.delete':            'Supprimer',
  'status.active':         'Actif',
  'status.inactive':       'Inactif',
  'status.pending':        'En attente',
};

const TRANSLATIONS_AR = {
  'dashboard.title':       'لوحة التحكم',
  'employees.title':       'إدارة الموظفين',
  'stock.title':           'إدارة المخزون',
  'invoices.title':        'إدارة الفواتير',
  'production.title':      'وحدة الإنتاج',
  'maintenance.title':     'وحدة الصيانة',
  'btn.save':              'حفظ',
  'btn.cancel':            'إلغاء',
  'btn.add':               'إضافة',
  'btn.edit':              'تعديل',
  'btn.delete':            'حذف',
  'status.active':         'نشط',
  'status.inactive':       'غير نشط',
  'status.pending':        'قيد الانتظار',
};

const TRANSLATIONS_EN = {
  'dashboard.title':       'Dashboard',
  'employees.title':       'Employee Management',
  'stock.title':           'Stock Management',
  'invoices.title':        'Invoice Management',
  'production.title':      'Production Module',
  'maintenance.title':     'Maintenance Module',
  'btn.save':              'Save',
  'btn.cancel':            'Cancel',
  'btn.add':               'Add',
  'btn.edit':              'Edit',
  'btn.delete':            'Delete',
  'status.active':         'Active',
  'status.inactive':       'Inactive',
  'status.pending':        'Pending',
};

const ALL_TRANSLATIONS = { fr:TRANSLATIONS_FR, ar:TRANSLATIONS_AR, en:TRANSLATIONS_EN };

export default function LanguagePage() {
  const [activeLang, setActiveLang] = useState('fr');
  const [previewLang, setPreviewLang] = useState('fr');
  const [search, setSearch] = useState('');

  const translations = ALL_TRANSLATIONS[previewLang] || TRANSLATIONS_FR;

  const filtered = Object.entries(translations).filter(([k,v]) =>
    k.toLowerCase().includes(search.toLowerCase()) ||
    v.toLowerCase().includes(search.toLowerCase())
  );

  const handleActivate = (code) => {
    setActiveLang(code);
    toast.success(`🌍 Langue changée : ${LANGUAGES.find(l=>l.code===code)?.name}`);
  };

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>

      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:700,margin:0 }}>🌍 Gestion Multi-Langue</h1>
          <p style={{ color:'#475569',fontSize:13,marginTop:4 }}>
            {LANGUAGES.length} langues supportées · Langue active : <strong style={{ color:'#6366f1' }}>{LANGUAGES.find(l=>l.code===activeLang)?.name}</strong>
          </p>
        </div>
      </div>

      {/* LANGUES DISPONIBLES */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14 }}>
        {LANGUAGES.map(lang => (
          <div key={lang.code}
            style={{
              background:'#111827', border:`2px solid ${activeLang===lang.code?'#6366f1':'#1e293b'}`,
              borderRadius:14, padding:20, cursor:'pointer', transition:'all 0.2s',
              position:'relative', overflow:'hidden',
            }}
            onClick={()=>handleActivate(lang.code)}
            onMouseEnter={e=>{ if(activeLang!==lang.code) e.currentTarget.style.borderColor='#334155'; }}
            onMouseLeave={e=>{ if(activeLang!==lang.code) e.currentTarget.style.borderColor='#1e293b'; }}>

            {activeLang===lang.code && (
              <div style={{ position:'absolute',top:10,right:10,width:20,height:20,borderRadius:'50%',background:'#6366f1',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <Check size={12} color="white"/>
              </div>
            )}

            <div style={{ fontSize:40,marginBottom:12 }}>{lang.flag}</div>
            <div style={{ fontWeight:700,fontSize:16,color:'#f1f5f9',marginBottom:2 }}>{lang.name}</div>
            <div style={{ fontSize:13,color:'#475569',marginBottom:12 }}>{lang.native}</div>

            <div>
              <div style={{ display:'flex',justifyContent:'space-between',fontSize:11,color:'#475569',marginBottom:5 }}>
                <span>Couverture</span><span style={{ color:lang.coverage===100?'#10b981':'#f59e0b',fontWeight:600 }}>{lang.coverage}%</span>
              </div>
              <div style={{ height:4,background:'#1e293b',borderRadius:2,overflow:'hidden' }}>
                <div style={{ height:'100%',width:`${lang.coverage}%`,background:lang.coverage===100?'#10b981':'#f59e0b',borderRadius:2 }}/>
              </div>
            </div>

            {lang.default && (
              <div style={{ marginTop:8,fontSize:11,color:'#6366f1',background:'rgba(99,102,241,0.1)',padding:'3px 8px',borderRadius:4,display:'inline-block' }}>
                Langue par défaut
              </div>
            )}
          </div>
        ))}
      </div>

      {/* APERÇU DES TRADUCTIONS */}
      <div style={{ background:'#111827',border:'1px solid #1e293b',borderRadius:14,overflow:'hidden' }}>
        <div style={{ padding:'16px 20px',borderBottom:'1px solid #1e293b',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12 }}>
          <h3 style={{ margin:0,fontSize:15,fontWeight:600 }}>📝 Aperçu des traductions</h3>
          <div style={{ display:'flex',gap:8,alignItems:'center' }}>
            <div style={{ display:'flex',alignItems:'center',gap:8,background:'#0a0f1e',border:'1px solid #1e293b',borderRadius:8,padding:'0 12px',width:200 }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une clé…"
                style={{ background:'none',border:'none',outline:'none',color:'#f1f5f9',fontSize:13,padding:'8px 0',width:'100%' }}/>
            </div>
            <div style={{ display:'flex',gap:4,background:'#0a0f1e',borderRadius:8,padding:3 }}>
              {LANGUAGES.slice(0,3).map(lang=>(
                <button key={lang.code} onClick={()=>setPreviewLang(lang.code)} style={{
                  padding:'5px 12px',borderRadius:6,border:'none',cursor:'pointer',
                  background:previewLang===lang.code?'#6366f1':'transparent',
                  color:previewLang===lang.code?'white':'#64748b',fontSize:12,transition:'all 0.2s',
                }}>
                  {lang.flag} {lang.code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding:'10px 16px',textAlign:'left',fontSize:11,textTransform:'uppercase',letterSpacing:0.5,color:'#475569',borderBottom:'1px solid #1e293b',background:'#0a0f1e' }}>Clé</th>
                <th style={{ padding:'10px 16px',textAlign:'left',fontSize:11,textTransform:'uppercase',letterSpacing:0.5,color:'#475569',borderBottom:'1px solid #1e293b',background:'#0a0f1e' }}>
                  {LANGUAGES.find(l=>l.code==='fr')?.flag} Français
                </th>
                <th style={{ padding:'10px 16px',textAlign:'left',fontSize:11,textTransform:'uppercase',letterSpacing:0.5,color:'#6366f1',borderBottom:'1px solid #1e293b',background:'#0a0f1e' }}>
                  {LANGUAGES.find(l=>l.code===previewLang)?.flag} {LANGUAGES.find(l=>l.code===previewLang)?.name}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(([key, val]) => (
                <tr key={key}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'10px 16px',borderBottom:'1px solid #1e293b',fontFamily:'monospace',fontSize:12,color:'#64748b' }}>{key}</td>
                  <td style={{ padding:'10px 16px',borderBottom:'1px solid #1e293b',fontSize:13,color:'#94a3b8' }}>{TRANSLATIONS_FR[key]}</td>
                  <td style={{ padding:'10px 16px',borderBottom:'1px solid #1e293b',fontSize:13,color:'#f1f5f9',fontWeight:500,direction:previewLang==='ar'?'rtl':'ltr' }}>
                    {val || <span style={{ color:'#334155',fontStyle:'italic' }}>Non traduit</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}