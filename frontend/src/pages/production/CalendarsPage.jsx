import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, Zap, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { gpaoAPI } from '../../api/client.js';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const DAYS_FR = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // 0=Mon
}

function NewCalendarModal({ onClose, onSave, loading }) {
  const [form, setForm] = useState({ name: '', year: new Date().getFullYear(), weekStart: '08:00', weekDuration: 8 });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3>Nouveau calendrier</h3>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="modal__body">
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="form-group"><label>Nom *</label><input className="form__input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Calendrier 2025" required /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group"><label>Année</label><input className="form__input" type="number" value={form.year} onChange={e => set('year', +e.target.value)} /></div>
              <div className="form-group"><label>Heure début</label><input className="form__input" type="time" value={form.weekStart} onChange={e => set('weekStart', e.target.value)} /></div>
              <div className="form-group"><label>Durée (h)</label><input className="form__input" type="number" value={form.weekDuration} min={1} max={24} onChange={e => set('weekDuration', +e.target.value)} /></div>
            </div>
          </div>
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button className="btn btn--ghost" onClick={onClose}>Annuler</button>
            <button className="btn btn--primary" disabled={loading || !form.name} onClick={() => onSave(form)}>
              {loading ? 'Création…' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GenerateModal({ calendarId, onClose, onGenerate, loading }) {
  const [form, setForm] = useState({ fromDate: `${new Date().getFullYear()}-01-01`, toDate: `${new Date().getFullYear()}-12-31`, closedDates: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3><Zap size={15} style={{ display: 'inline', marginRight: 6 }} />Générer les jours ouvrables</h3>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="modal__body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group"><label>Du</label><input className="form__input" type="date" value={form.fromDate} onChange={e => set('fromDate', e.target.value)} /></div>
            <div className="form-group"><label>Au</label><input className="form__input" type="date" value={form.toDate} onChange={e => set('toDate', e.target.value)} /></div>
          </div>
          <div className="form-group">
            <label>Jours fériés (une date par ligne, ex: 2025-07-05)</label>
            <textarea className="form__input" rows={4} value={form.closedDates} onChange={e => set('closedDates', e.target.value)} placeholder="2025-01-01&#10;2025-05-01&#10;2025-07-05" />
          </div>
          <div className="form-actions" style={{ marginTop: 12 }}>
            <button className="btn btn--ghost" onClick={onClose}>Annuler</button>
            <button className="btn btn--primary" disabled={loading} onClick={() => {
              const closedDates = form.closedDates.split('\n').map(s => s.trim()).filter(Boolean);
              onGenerate(calendarId, { fromDate: form.fromDate, toDate: form.toDate, closedDates });
            }}>
              {loading ? 'Génération…' : 'Générer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarGrid({ calendar, onToggleDay }) {
  const [viewMonth, setViewMonth] = useState(0);
  const year = calendar.year;
  const daysMap = {};
  (calendar.days || []).forEach(d => {
    const key = new Date(d.date).toISOString().split('T')[0];
    daysMap[key] = d;
  });

  const firstDay = getFirstDayOfMonth(year, viewMonth);
  const daysInMonth = getDaysInMonth(year, viewMonth);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
        {MONTHS.map((m, i) => (
          <button key={i} className={`btn ${viewMonth === i ? 'btn--primary' : 'btn--ghost'}`}
            style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setViewMonth(i)}>
            {m}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, maxWidth: 520 }}>
        {DAYS_FR.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const dateStr = `${year}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const info = daysMap[dateStr];
          const isWorking = info ? info.isWorking : false;
          const isWeekend = (i % 7) >= 5;
          const bg = isWeekend ? '#1e293b' : isWorking ? '#10b98122' : '#ef444415';
          const border = isWeekend ? '1px solid #334155' : isWorking ? '1px solid #10b98144' : '1px solid #ef444433';
          const textColor = isWeekend ? '#64748b' : isWorking ? '#10b981' : '#ef4444';
          return (
            <div key={day}
              style={{ textAlign: 'center', padding: '8px 4px', background: bg, border, borderRadius: 6, cursor: isWeekend ? 'default' : 'pointer', fontSize: 13, color: textColor, fontWeight: 500 }}
              title={info?.label || (isWorking ? `Ouvrable — ${info?.duration || 8}h` : 'Fermé')}
              onClick={() => {
                if (isWeekend) return;
                onToggleDay(calendar.id, dateStr, !isWorking, isWorking ? 0 : calendar.weekDuration);
              }}>
              {day}
              {info?.label && <div style={{ fontSize: 8, lineHeight: 1.2 }}>{info.label.slice(0, 4)}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, background: '#10b98122', border: '1px solid #10b98144', borderRadius: 2 }} />Ouvrable</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, background: '#ef444415', border: '1px solid #ef444433', borderRadius: 2 }} />Fermé</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, background: '#1e293b', border: '1px solid #334155', borderRadius: 2 }} />Week-end</span>
      </div>
    </div>
  );
}

export default function CalendarsPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [genTarget, setGenTarget] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['gpao-calendars'], queryFn: () => gpaoAPI.calendars().then(r => r.data) });

  const createMut = useMutation({
    mutationFn: gpaoAPI.createCalendar,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gpao-calendars'] }); setShowNew(false); toast.success('Calendrier créé'); },
    onError: e => toast.error(e?.message || 'Erreur'),
  });
  const generateMut = useMutation({
    mutationFn: ({ id, data }) => gpaoAPI.generateDays(id, data),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['gpao-calendars'] }); setGenTarget(null); toast.success(r.message || 'Jours générés'); },
    onError: e => toast.error(e?.message || 'Erreur'),
  });
  const dayMut = useMutation({
    mutationFn: ({ id, date, isWorking, duration }) => gpaoAPI.updateDay(id, { date, isWorking, duration }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gpao-calendars'] }),
    onError: e => toast.error(e?.message || 'Erreur'),
  });

  const calendars = data || [];
  const workingDays = (cal) => (cal.days || []).filter(d => d.isWorking).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title"><Calendar size={22} style={{ display: 'inline', marginRight: 8 }} />Calendriers d'activité</h1>
          <p className="page-subtitle">{calendars.length} calendrier(s) — définit les jours et heures ouvrables</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowNew(true)}><Plus size={16} /> Nouveau calendrier</button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement…</div>
      ) : calendars.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48 }}>📅</div>
          <p>Aucun calendrier. Créez un calendrier et générez les jours ouvrables.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {calendars.map(cal => (
            <div key={cal.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{cal.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {cal.year} — {cal.weekStart} — {cal.weekDuration}h/jour — {workingDays(cal)} jours ouvrables
                  </div>
                </div>
                <button className="btn btn--ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setGenTarget(cal.id)}>
                  <Zap size={13} /> Générer
                </button>
                <button className="btn btn--ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setExpanded(expanded === cal.id ? null : cal.id)}>
                  <Calendar size={13} /> {expanded === cal.id ? 'Fermer' : 'Afficher'}
                </button>
              </div>
              {expanded === cal.id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: 16, background: 'var(--bg)' }}>
                  <CalendarGrid calendar={cal} onToggleDay={(id, date, isWorking, duration) => dayMut.mutate({ id, date, isWorking, duration })} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showNew && <NewCalendarModal onClose={() => setShowNew(false)} onSave={d => createMut.mutate(d)} loading={createMut.isPending} />}
      {genTarget && (
        <GenerateModal
          calendarId={genTarget}
          onClose={() => setGenTarget(null)}
          onGenerate={(id, data) => generateMut.mutate({ id, data })}
          loading={generateMut.isPending}
        />
      )}
    </div>
  );
}
