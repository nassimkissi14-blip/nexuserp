import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

const EVENT_TYPES = {
  LEAVE:       { label: 'Congé',         color: '#f59e0b', icon: '🏖️' },
  MEETING:     { label: 'Réunion',       color: '#6366f1', icon: '📅' },
  MAINTENANCE: { label: 'Maintenance',   color: '#ef4444', icon: '🔧' },
  PRODUCTION:  { label: 'Production',    color: '#10b981', icon: '🏭' },
  DEADLINE:    { label: 'Échéance',      color: '#8b5cf6', icon: '⏰' },
  OTHER:       { label: 'Autre',         color: '#64748b', icon: '📌' },
};

const initialEvents = [
  { id: 1, title: 'Congé — Ahmed Benali', date: '2026-04-15', type: 'LEAVE', dept: 'Direction' },
  { id: 2, title: 'Réunion Comité de direction', date: '2026-04-14', type: 'MEETING', dept: 'Tous' },
  { id: 3, title: 'Maintenance Machine D', date: '2026-04-12', type: 'MAINTENANCE', dept: 'Production' },
  { id: 4, title: 'Livraison OF-001', date: '2026-04-15', type: 'PRODUCTION', dept: 'Production' },
  { id: 5, title: 'Échéance facture Sonatrach', date: '2026-04-20', type: 'DEADLINE', dept: 'Finance' },
  { id: 6, title: 'Formation sécurité', date: '2026-04-22', type: 'MEETING', dept: 'RH' },
  { id: 7, title: 'Audit qualité ISO', date: '2026-04-25', type: 'OTHER', dept: 'Qualité' },
  { id: 8, title: 'Réunion RH mensuelle', date: '2026-04-28', type: 'MEETING', dept: 'RH' },
  { id: 9, title: 'Paiement salaires', date: '2026-04-30', type: 'DEADLINE', dept: 'Finance' },
  { id: 10, title: 'Congé — Sara Ouali', date: '2026-04-16', type: 'LEAVE', dept: 'Finance' },
  { id: 11, title: 'Inspection grue portique', date: '2026-04-18', type: 'MAINTENANCE', dept: 'Maintenance' },
  { id: 12, title: 'Fin OF-002', date: '2026-04-05', type: 'PRODUCTION', dept: 'Production' },
];

const Modal = ({ title, onClose, children }) => (
  <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
    <div style={{ background:'#111827',border:'1px solid #1e293b',borderRadius:14,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
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

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState(initialEvents);
  const [selectedDay, setSelectedDay] = useState(null);
  const [modal, setModal] = useState(null);
  const [filterType, setFilterType] = useState('ALL');
  const [form, setForm] = useState({});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const [view, setView] = useState('month'); // month | list

  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y=>y-1); } else setMonth(m=>m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y=>y+1); } else setMonth(m=>m+1); };

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return events.filter(e => e.date === dateStr && (filterType === 'ALL' || e.type === filterType));
  };

  const allMonthEvents = events.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month && (filterType === 'ALL' || e.type === filterType);
  }).sort((a,b) => new Date(a.date) - new Date(b.date));

  const handleAddEvent = () => {
    if (!form.title || !form.date || !form.type) { toast.error('Remplissez tous les champs'); return; }
    setEvents(prev => [...prev, { ...form, id: Date.now() }]);
    toast.success('✅ Événement ajouté !');
    setModal(null);
    setForm({});
  };

  const handleDelete = (id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    toast.success('Événement supprimé');
  };

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push({ day: daysInPrevMonth - startOffset + 1 + i, current: false });
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, current: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - startOffset - daysInMonth + 1, current: false });

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>

      {/* HEADER */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:700,margin:0 }}>📅 Calendrier Global</h1>
          <p style={{ color:'#475569',fontSize:13,marginTop:4 }}>{allMonthEvents.length} événement(s) en {MONTHS[month]} {year}</p>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <div style={{ display:'flex',gap:4,background:'#0a0f1e',borderRadius:8,padding:3 }}>
            {[['month','☰ Mois'],['list','📋 Liste']].map(([v,l]) => (
              <button key={v} onClick={()=>setView(v)} style={{ padding:'7px 14px',borderRadius:6,border:'none',cursor:'pointer',background:view===v?'#6366f1':'transparent',color:view===v?'white':'#64748b',fontSize:12,fontWeight:view===v?600:400,transition:'all 0.2s' }}>{l}</button>
            ))}
          </div>
          <button onClick={()=>{ setForm({ date:`${year}-${String(month+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`, type:'MEETING' }); setModal('create'); }}
            style={{ display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:8,background:'#6366f1',border:'none',color:'white',cursor:'pointer',fontWeight:500,fontSize:13 }}>
            <Plus size={16}/> Ajouter
          </button>
        </div>
      </div>

      {/* FILTRES PAR TYPE */}
      <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
        <button onClick={()=>setFilterType('ALL')} style={{ padding:'5px 14px',borderRadius:20,border:'1px solid',background:filterType==='ALL'?'#6366f1':'transparent',borderColor:filterType==='ALL'?'#6366f1':'#1e293b',color:filterType==='ALL'?'white':'#64748b',cursor:'pointer',fontSize:12,transition:'all 0.2s' }}>
          Tous ({events.filter(e=>{const d=new Date(e.date);return d.getFullYear()===year&&d.getMonth()===month;}).length})
        </button>
        {Object.entries(EVENT_TYPES).map(([key,val]) => {
          const count = events.filter(e=>{const d=new Date(e.date);return d.getFullYear()===year&&d.getMonth()===month&&e.type===key;}).length;
          return (
            <button key={key} onClick={()=>setFilterType(key)} style={{ padding:'5px 14px',borderRadius:20,border:'1px solid',background:filterType===key?val.color:'transparent',borderColor:filterType===key?val.color:`${val.color}44`,color:filterType===key?'white':val.color,cursor:'pointer',fontSize:12,transition:'all 0.2s' }}>
              {val.icon} {val.label} ({count})
            </button>
          );
        })}
      </div>

      {/* NAV MOIS */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:20 }}>
        <button onClick={prevMonth} style={{ background:'#111827',border:'1px solid #1e293b',borderRadius:8,padding:8,color:'#94a3b8',cursor:'pointer',display:'flex',alignItems:'center' }}><ChevronLeft size={18}/></button>
        <h2 style={{ fontSize:18,fontWeight:700,margin:0,minWidth:200,textAlign:'center' }}>{MONTHS[month]} {year}</h2>
        <button onClick={nextMonth} style={{ background:'#111827',border:'1px solid #1e293b',borderRadius:8,padding:8,color:'#94a3b8',cursor:'pointer',display:'flex',alignItems:'center' }}><ChevronRight size={18}/></button>
      </div>

      {/* VUE MOIS */}
      {view === 'month' && (
        <div style={{ background:'#111827',border:'1px solid #1e293b',borderRadius:14,overflow:'hidden' }}>
          {/* En-tête jours */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'1px solid #1e293b' }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding:'10px 0',textAlign:'center',fontSize:12,fontWeight:600,color:'#475569',textTransform:'uppercase',letterSpacing:1 }}>{d}</div>
            ))}
          </div>

          {/* Grille des jours */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)' }}>
            {cells.map((cell, i) => {
              const dayEvents = cell.current ? getEventsForDay(cell.day) : [];
              const isToday = cell.current && cell.day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = selectedDay === cell.day && cell.current;

              return (
                <div key={i} onClick={() => { if(cell.current) { setSelectedDay(isSelected ? null : cell.day); } }}
                  style={{
                    minHeight: 90, padding:8, borderRight:'1px solid #1e293b', borderBottom:'1px solid #1e293b',
                    background: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent',
                    opacity: cell.current ? 1 : 0.3, cursor: cell.current ? 'pointer' : 'default',
                    transition:'background 0.15s',
                  }}
                  onMouseEnter={e => { if(cell.current) e.currentTarget.style.background='rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(99,102,241,0.08)' : 'transparent'; }}>
                  {/* Numéro du jour */}
                  <div style={{
                    width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:13,fontWeight:isToday?700:400,marginBottom:4,
                    background:isToday?'#6366f1':'transparent',
                    color:isToday?'white':cell.current?'#f1f5f9':'#475569',
                  }}>{cell.day}</div>

                  {/* Événements du jour */}
                  <div style={{ display:'flex',flexDirection:'column',gap:2 }}>
                    {dayEvents.slice(0,2).map(ev => (
                      <div key={ev.id} style={{
                        background: EVENT_TYPES[ev.type].color + '22',
                        border: `1px solid ${EVENT_TYPES[ev.type].color}44`,
                        borderRadius:4, padding:'2px 5px', fontSize:10,
                        color: EVENT_TYPES[ev.type].color,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                      }}>
                        {EVENT_TYPES[ev.type].icon} {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div style={{ fontSize:10,color:'#475569',paddingLeft:4 }}>+{dayEvents.length-2} autre(s)</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VUE LISTE */}
      {view === 'list' && (
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {allMonthEvents.length === 0
            ? <div style={{ background:'#111827',border:'1px solid #1e293b',borderRadius:12,padding:40,textAlign:'center',color:'#475569' }}>Aucun événement ce mois-ci</div>
            : allMonthEvents.map(ev => (
              <div key={ev.id} style={{ background:'#111827',border:`1px solid ${EVENT_TYPES[ev.type].color}33`,borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:14 }}>
                <div style={{ width:40,height:40,borderRadius:10,background:EVENT_TYPES[ev.type].color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>
                  {EVENT_TYPES[ev.type].icon}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:500,fontSize:14,color:'#f1f5f9',marginBottom:3 }}>{ev.title}</div>
                  <div style={{ display:'flex',gap:10,fontSize:12,color:'#475569' }}>
                    <span>📅 {new Date(ev.date).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</span>
                    {ev.dept && <span>🏢 {ev.dept}</span>}
                  </div>
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <span style={{ fontSize:12,color:EVENT_TYPES[ev.type].color,background:EVENT_TYPES[ev.type].color+'22',padding:'3px 10px',borderRadius:20 }}>
                    {EVENT_TYPES[ev.type].label}
                  </span>
                  <button onClick={()=>handleDelete(ev.id)} style={{ background:'none',border:'1px solid #1e293b',borderRadius:6,padding:5,color:'#ef4444',cursor:'pointer',display:'flex',alignItems:'center' }}>
                    <X size={13}/>
                  </button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* DÉTAIL JOUR SÉLECTIONNÉ */}
      {selectedDay && view === 'month' && (
        <div style={{ background:'#111827',border:'1px solid #6366f1',borderRadius:12,padding:20 }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
            <h3 style={{ margin:0,fontSize:15,fontWeight:600 }}>
              📅 {selectedDay} {MONTHS[month]} {year}
            </h3>
            <button onClick={()=>{ setForm({ date:`${year}-${String(month+1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`, type:'MEETING' }); setModal('create'); }}
              style={{ padding:'6px 12px',borderRadius:8,background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.3)',color:'#a5b4fc',cursor:'pointer',fontSize:12 }}>
              + Ajouter événement
            </button>
          </div>
          {getEventsForDay(selectedDay).length === 0
            ? <div style={{ color:'#334155',fontSize:13,textAlign:'center',padding:'16px 0' }}>Aucun événement ce jour</div>
            : getEventsForDay(selectedDay).map(ev => (
              <div key={ev.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'#0a0f1e',borderRadius:8,marginBottom:6,border:`1px solid ${EVENT_TYPES[ev.type].color}22` }}>
                <div style={{ fontSize:20 }}>{EVENT_TYPES[ev.type].icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13.5,fontWeight:500,color:'#f1f5f9' }}>{ev.title}</div>
                  {ev.dept && <div style={{ fontSize:12,color:'#475569' }}>{ev.dept}</div>}
                </div>
                <span style={{ fontSize:11,color:EVENT_TYPES[ev.type].color,background:EVENT_TYPES[ev.type].color+'22',padding:'2px 8px',borderRadius:4 }}>
                  {EVENT_TYPES[ev.type].label}
                </span>
                <button onClick={()=>handleDelete(ev.id)} style={{ background:'none',border:'none',color:'#ef4444',cursor:'pointer',padding:3,display:'flex',alignItems:'center' }}><X size={13}/></button>
              </div>
            ))
          }
        </div>
      )}

      {/* MODAL CRÉER ÉVÉNEMENT */}
      {modal === 'create' && (
        <Modal title="📅 Nouvel événement" onClose={()=>setModal(null)}>
          <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
            <div><label style={lbl}>Titre *</label><input style={inp} value={form.title||''} onChange={e=>set('title',e.target.value)} placeholder="Ex: Réunion mensuelle" /></div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <div><label style={lbl}>Date *</label><input style={inp} type="date" value={form.date||''} onChange={e=>set('date',e.target.value)} /></div>
              <div><label style={lbl}>Type *</label>
                <select style={inp} value={form.type||'MEETING'} onChange={e=>set('type',e.target.value)}>
                  {Object.entries(EVENT_TYPES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
            </div>
            <div><label style={lbl}>Département</label>
              <select style={inp} value={form.dept||''} onChange={e=>set('dept',e.target.value)}>
                <option value="">Tous</option>
                {['Direction','RH','Finance','Production','Ventes','IT','Maintenance','Qualité'].map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'flex',justifyContent:'flex-end',gap:10,marginTop:20,paddingTop:16,borderTop:'1px solid #1e293b' }}>
            <button onClick={()=>setModal(null)} style={{ padding:'9px 16px',borderRadius:8,background:'#111827',border:'1px solid #1e293b',color:'#f1f5f9',cursor:'pointer',fontSize:13 }}>Annuler</button>
            <button onClick={handleAddEvent} style={{ padding:'9px 20px',borderRadius:8,background:'#6366f1',border:'none',color:'white',cursor:'pointer',fontWeight:500,fontSize:13 }}>Créer</button>
          </div>
        </Modal>
      )}
    </div>
  );
}