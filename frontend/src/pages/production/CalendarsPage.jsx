import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, Zap, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { gpaoAPI } from '../../api/client.js';
import { useAuthStore } from '../../store/index.js';

const MONTHS      = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const FULL_MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const FULL_DAYS   = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const DAYS_FR     = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

const WEEKEND_OPTIONS = [
  { value: 'FS',   label: 'Vendredi + Samedi',       sublabel: 'Algérie, Moyen-Orient' },
  { value: 'SS',   label: 'Samedi + Dimanche',        sublabel: 'Europe, Amérique' },
  { value: 'F',    label: 'Vendredi uniquement',      sublabel: '' },
  { value: 'S',    label: 'Samedi uniquement',        sublabel: '' },
  { value: 'D',    label: 'Dimanche uniquement',      sublabel: '' },
  { value: 'NONE', label: 'Aucun repos hebdomadaire', sublabel: '7j/7' },
];

function isWeekendCol(col, wt) {
  if (wt === 'FS')   return col === 4 || col === 5;
  if (wt === 'SS')   return col === 5 || col === 6;
  if (wt === 'F')    return col === 4;
  if (wt === 'S')    return col === 5;
  if (wt === 'D')    return col === 6;
  if (wt === 'NONE') return false;
  return col === 5 || col === 6;
}

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

// Safe local-time date parse from any ISO string
function parseLocal(dateStr) {
  const s = (dateStr + '').split('T')[0].split('-');
  return new Date(+s[0], +s[1] - 1, +s[2]);
}
function fmtDate(dateStr) {
  const dt = parseLocal(dateStr);
  return `${String(dt.getDate()).padStart(2, '0')} ${FULL_MONTHS[dt.getMonth()]} — ${FULL_DAYS[dt.getDay()]}`;
}

/* ── STATS HELPER ─────────────────────────────── */
function getCalStats(calendar) {
  const days = calendar.days || [];
  const wkd  = calendar.weekDuration || 8;
  const working = days.filter(d => d.isWorking);
  const closed  = days.filter(d => !d.isWorking);
  const totalHours = working.reduce((s, d) => s + (d.duration || wkd), 0);
  const byMonth = Array.from({ length: 12 }, (_, mi) => {
    const mw = working.filter(d => parseLocal(d.date).getMonth() === mi);
    const mh = mw.reduce((s, d) => s + (d.duration || wkd), 0);
    return { label: MONTHS[mi], days: mw.length, hours: mh };
  });
  return {
    working: working.length, closed: closed.length, totalHours,
    avgHours: working.length ? +(totalHours / working.length).toFixed(1) : wkd,
    byMonth,
  };
}

/* ── CALENDAR GRID ────────────────────────────── */
function CalendarGrid({ calendar, onToggleDay }) {
  const [viewMonth, setViewMonth] = useState(0);
  const year = calendar.year;
  const wt   = calendar.weekendType || 'SS';
  const daysMap = {};
  (calendar.days || []).forEach(d => { daysMap[(d.date + '').split('T')[0]] = d; });

  const firstDay    = getFirstDayOfMonth(year, viewMonth);
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, maxWidth: 490 }}>
        {DAYS_FR.map((d, ci) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '4px 0', color: isWeekendCol(ci, wt) ? '#f59e0b' : 'var(--text-muted)' }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const dateStr   = `${year}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const info      = daysMap[dateStr];
          const isWorking = info ? info.isWorking : false;
          const isWeekend = isWeekendCol(i % 7, wt);
          const bg        = isWeekend ? '#1e293b'            : isWorking ? '#10b98122' : '#ef444415';
          const border    = isWeekend ? '1px solid #334155'  : isWorking ? '1px solid #10b98144' : '1px solid #ef444433';
          const color     = isWeekend ? '#64748b'            : isWorking ? '#10b981'  : '#ef4444';
          return (
            <div key={day}
              style={{ textAlign: 'center', padding: '7px 3px', background: bg, border, borderRadius: 6, cursor: isWeekend ? 'default' : 'pointer', fontSize: 12, color, fontWeight: 500 }}
              title={isWeekend ? 'Jour de repos' : info?.label || (isWorking ? `Ouvrable — ${info?.duration || calendar.weekDuration}h` : 'Fermé — cliquer pour ouvrir')}
              onClick={() => { if (isWeekend) return; onToggleDay(dateStr, !isWorking, isWorking ? 0 : calendar.weekDuration); }}>
              {day}
              {info?.label && <div style={{ fontSize: 7, lineHeight: 1.1, marginTop: 1 }}>{info.label.slice(0, 5)}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#10b98122', border: '1px solid #10b98144', borderRadius: 2 }} />Ouvrable</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#ef444415', border: '1px solid #ef444433', borderRadius: 2 }} />Fermé</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#1e293b', border: '1px solid #334155', borderRadius: 2 }} />Repos</span>
      </div>
    </div>
  );
}

/* ── EXPANDED DETAIL (tabs) ───────────────────── */
function CalendarExpandedView({ calendar, st, generated, onDay }) {
  const [tab, setTab]           = useState('calendar');
  const [newHol, setNewHol]     = useState({ date: '', label: '' });
  const [editingDate, setEditingDate] = useState(null);
  const [editLabel, setEditLabel]     = useState('');

  const closedDays  = (calendar.days || []).filter(d => !d.isWorking).sort((a, b) => new Date(a.date) - new Date(b.date));
  const workingDays = (calendar.days || []).filter(d =>  d.isWorking).sort((a, b) => new Date(a.date) - new Date(b.date));

  const tabs = [
    { key: 'calendar', label: '📅 Calendrier' },
    { key: 'holidays', label: `🔴 Jours fériés${generated ? ` (${closedDays.length})` : ''}` },
    { key: 'working',  label: `✅ Jours ouvrables${generated ? ` (${workingDays.length})` : ''}` },
  ];

  return (
    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>

      {/* ── KPIs ── */}
      {generated && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid var(--border)' }}>
          {[
            { icon: '✅', label: 'Jours ouvrables',    value: st.working,    unit: 'jours',  color: '#10b981' },
            { icon: '⏱',  label: 'Heures de travail',  value: st.totalHours, unit: 'heures', color: '#6366f1' },
            { icon: '🔴', label: 'Jours fériés/fermés', value: st.closed,    unit: 'jours',  color: '#f59e0b' },
            { icon: '📊', label: 'Moy. journalière',    value: st.avgHours,  unit: 'h/jour', color: '#0ea5e9' },
          ].map((k, i) => (
            <div key={i} style={{ padding: '12px 16px', borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{k.icon} {k.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{k.unit}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', paddingLeft: 4 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '9px 18px', fontSize: 12, fontWeight: 600, border: 'none',
            borderBottom: `2px solid ${tab === t.key ? 'var(--accent-primary)' : 'transparent'}`,
            background: 'transparent', cursor: 'pointer',
            color: tab === t.key ? 'var(--accent-primary)' : 'var(--text-muted)',
            transition: 'color .15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══ Tab: Calendrier ══ */}
      {tab === 'calendar' && (
        <div style={{ display: 'grid', gridTemplateColumns: generated ? '210px 1fr' : '1fr' }}>
          {generated && (
            <div style={{ borderRight: '1px solid var(--border)', padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Répartition mensuelle</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left',  padding: '3px 6px', color: 'var(--text-muted)', fontWeight: 600 }}>Mois</th>
                    <th style={{ textAlign: 'right', padding: '3px 6px', color: 'var(--text-muted)', fontWeight: 600 }}>J. ouv.</th>
                    <th style={{ textAlign: 'right', padding: '3px 6px', color: 'var(--text-muted)', fontWeight: 600 }}>Heures</th>
                  </tr>
                </thead>
                <tbody>
                  {st.byMonth.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--bg)' : 'transparent' }}>
                      <td style={{ padding: '4px 6px', fontWeight: 500 }}>{m.label}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', color: m.days > 0 ? '#10b981' : 'var(--text-muted)', fontWeight: m.days > 0 ? 700 : 400 }}>{m.days || '—'}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', color: m.hours > 0 ? '#6366f1' : 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>{m.hours > 0 ? `${m.hours}h` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
                    <td style={{ padding: '5px 6px' }}>Total</td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', color: '#10b981' }}>{st.working}</td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', color: '#6366f1', fontFamily: 'monospace', fontSize: 11 }}>{st.totalHours}h</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Grille mensuelle — cliquer sur un jour pour basculer ouvrable/fermé</div>
            <CalendarGrid
              calendar={calendar}
              onToggleDay={(date, isWorking, duration) => onDay(date, isWorking, duration, null)}
            />
          </div>
        </div>
      )}

      {/* ══ Tab: Jours fériés ══ */}
      {tab === 'holidays' && (
        <div style={{ padding: 16 }}>

          {/* Quick-add form */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, padding: '12px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>+ Nouveau jour férié</span>
            <input
              type="date"
              className="form__input"
              style={{ width: 160 }}
              value={newHol.date}
              min={`${calendar.year}-01-01`}
              max={`${calendar.year}-12-31`}
              onChange={e => setNewHol(f => ({ ...f, date: e.target.value }))}
            />
            <input
              className="form__input"
              style={{ flex: 1 }}
              placeholder="Désignation (ex: Fête du Travail, Aïd El Fitr…)"
              value={newHol.label}
              onChange={e => setNewHol(f => ({ ...f, label: e.target.value }))}
              onKeyDown={e => {
                if (e.key === 'Enter' && newHol.date) {
                  onDay(newHol.date, false, 0, newHol.label || null);
                  setNewHol({ date: '', label: '' });
                }
              }}
            />
            <button
              className="btn btn--primary"
              disabled={!newHol.date}
              onClick={() => {
                onDay(newHol.date, false, 0, newHol.label || null);
                setNewHol({ date: '', label: '' });
              }}
            >
              Ajouter
            </button>
          </div>

          {/* List */}
          {closedDays.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              Aucun jour férié ou fermé — utilisez le formulaire ci-dessus ou cliquez sur un jour dans la grille
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                {closedDays.length} jour(s) fermé(s) / férié(s) enregistré(s)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>Désignation</th>
                    <th style={{ padding: '6px 10px', width: 120 }} />
                  </tr>
                </thead>
                <tbody>
                  {closedDays.map((d, i) => {
                    const ds = (d.date + '').split('T')[0];
                    const isEditing = editingDate === ds;
                    return (
                      <tr key={ds} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--bg-card)' : 'transparent' }}>
                        <td style={{ padding: '9px 10px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#ef4444', marginRight: 6 }}>🔴</span>{fmtDate(ds)}
                        </td>
                        <td style={{ padding: '9px 10px' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input
                                autoFocus
                                className="form__input"
                                style={{ fontSize: 12, padding: '4px 8px', flex: 1 }}
                                value={editLabel}
                                onChange={e => setEditLabel(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') { onDay(ds, false, 0, editLabel || null); setEditingDate(null); }
                                  if (e.key === 'Escape') setEditingDate(null);
                                }}
                              />
                              <button className="btn btn--primary" style={{ fontSize: 11, padding: '3px 10px' }}
                                onClick={() => { onDay(ds, false, 0, editLabel || null); setEditingDate(null); }}>✓</button>
                              <button className="btn btn--ghost" style={{ fontSize: 11, padding: '3px 8px' }}
                                onClick={() => setEditingDate(null)}>✕</button>
                            </div>
                          ) : (
                            <span
                              title="Cliquer pour modifier le nom"
                              style={{ cursor: 'pointer', color: d.label ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: d.label ? 'normal' : 'italic' }}
                              onClick={() => { setEditingDate(ds); setEditLabel(d.label || ''); }}
                            >
                              {d.label || 'Cliquer pour nommer ce jour…'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right' }}>
                          <button
                            className="btn btn--ghost"
                            style={{ fontSize: 11, padding: '3px 10px', color: '#10b981' }}
                            title="Marquer comme jour ouvrable"
                            onClick={() => onDay(ds, true, calendar.weekDuration, null)}
                          >
                            ✅ Rétablir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* ══ Tab: Jours ouvrables ══ */}
      {tab === 'working' && (
        <div style={{ padding: 16 }}>
          {workingDays.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              Aucun jour ouvrable — cliquez "Générer" pour créer les jours ouvrables de l'année
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
              {st.byMonth.map((m, mi) => {
                if (m.days === 0) return null;
                const mDays = workingDays.filter(d => parseLocal(d.date).getMonth() === mi);
                return (
                  <div key={mi} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '7px 12px', background: '#10b98115', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#10b981' }}>{FULL_MONTHS[mi]}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.days}j · {m.hours}h</span>
                    </div>
                    <div style={{ padding: '6px 10px', maxHeight: 200, overflowY: 'auto' }}>
                      {mDays.map((d, i) => {
                        const dt = parseLocal(d.date);
                        return (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: i < mDays.length - 1 ? '1px dashed var(--border)' : 'none', fontSize: 12 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {String(dt.getDate()).padStart(2, '0')} {FULL_DAYS[dt.getDay()].slice(0, 3)}.
                            </span>
                            <span style={{ color: '#10b981', fontWeight: 600, fontFamily: 'monospace' }}>
                              {d.duration || calendar.weekDuration}h
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

/* ── NEW CALENDAR MODAL ───────────────────────── */
function NewCalendarModal({ onClose, onSave, loading, companyName }) {
  const year = new Date().getFullYear();
  const [form, setForm] = useState({ name: companyName ? `${companyName} ${year}` : '', year, weekStart: '08:00', weekDuration: 8, weekendType: 'FS' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3>Nouveau calendrier d'activité</h3>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="modal__body">
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="form-group">
              <label>Nom du calendrier *</label>
              <input className="form__input" value={form.name} onChange={e => set('name', e.target.value)} placeholder={`ex: ${companyName || 'Entreprise'} ${year}`} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group"><label>Année</label><input className="form__input" type="number" value={form.year} onChange={e => set('year', +e.target.value)} /></div>
              <div className="form-group"><label>Heure début</label><input className="form__input" type="time" value={form.weekStart} onChange={e => set('weekStart', e.target.value)} /></div>
              <div className="form-group"><label>Durée (h/j)</label><input className="form__input" type="number" value={form.weekDuration} min={1} max={24} onChange={e => set('weekDuration', +e.target.value)} /></div>
            </div>
            <div className="form-group">
              <label>Jours de repos hebdomadaire</label>
              <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
                {WEEKEND_OPTIONS.map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: `2px solid ${form.weekendType === opt.value ? 'var(--accent-primary)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: form.weekendType === opt.value ? 'var(--accent-primary)11' : 'transparent', transition: 'all .15s' }}>
                    <input type="radio" name="weekendType" value={opt.value} checked={form.weekendType === opt.value} onChange={() => set('weekendType', opt.value)} style={{ accentColor: 'var(--accent-primary)' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</div>
                      {opt.sublabel && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{opt.sublabel}</div>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button className="btn btn--ghost" onClick={onClose}>Annuler</button>
            <button className="btn btn--primary" disabled={loading || !form.name} onClick={() => onSave(form)}>
              {loading ? 'Création…' : 'Créer le calendrier'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── EDIT CALENDAR MODAL ─────────────────────── */
function EditCalendarModal({ calendar, onClose, onSave, loading }) {
  const [form, setForm] = useState({ name: calendar.name, weekStart: calendar.weekStart || '08:00', weekDuration: calendar.weekDuration || 8, weekendType: calendar.weekendType || 'FS' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3>Modifier — {calendar.name}</h3>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="modal__body">
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="form-group"><label>Nom *</label><input className="form__input" value={form.name} onChange={e => set('name', e.target.value)} required /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group"><label>Heure début</label><input className="form__input" type="time" value={form.weekStart} onChange={e => set('weekStart', e.target.value)} /></div>
              <div className="form-group"><label>Durée (h/j)</label><input className="form__input" type="number" value={form.weekDuration} min={1} max={24} onChange={e => set('weekDuration', +e.target.value)} /></div>
            </div>
            <div className="form-group">
              <label>Jours de repos hebdomadaire</label>
              <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
                {WEEKEND_OPTIONS.map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: `2px solid ${form.weekendType === opt.value ? 'var(--accent-primary)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: form.weekendType === opt.value ? 'var(--accent-primary)11' : 'transparent', transition: 'all .15s' }}>
                    <input type="radio" name="editWeekendType" value={opt.value} checked={form.weekendType === opt.value} onChange={() => set('weekendType', opt.value)} style={{ accentColor: 'var(--accent-primary)' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</div>
                      {opt.sublabel && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{opt.sublabel}</div>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
              Modifier les jours de repos ne recalcule pas les jours déjà générés. Relancez "Générer" si nécessaire.
            </div>
          </div>
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button className="btn btn--ghost" onClick={onClose}>Annuler</button>
            <button className="btn btn--primary" disabled={loading || !form.name} onClick={() => onSave(form)}>
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── GENERATE MODAL ───────────────────────────── */
function GenerateModal({ calendar, onClose, onGenerate, loading }) {
  const yr  = calendar.year || new Date().getFullYear();
  const [form, setForm] = useState({ fromDate: `${yr}-01-01`, toDate: `${yr}-12-31`, closedDates: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const wt  = WEEKEND_OPTIONS.find(o => o.value === calendar.weekendType) || WEEKEND_OPTIONS[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3><Zap size={15} style={{ display: 'inline', marginRight: 6 }} />Générer les jours ouvrables</h3>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="modal__body">
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
            <span style={{ color: 'var(--text-muted)' }}>Repos hebdo : </span>
            <strong>{wt.label}</strong>
            {wt.sublabel && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>({wt.sublabel})</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group"><label>Du</label><input className="form__input" type="date" value={form.fromDate} onChange={e => set('fromDate', e.target.value)} /></div>
            <div className="form-group"><label>Au</label><input className="form__input" type="date" value={form.toDate} onChange={e => set('toDate', e.target.value)} /></div>
          </div>
          <div className="form-group">
            <label>Jours fériés à exclure (une date par ligne, format AAAA-MM-JJ)</label>
            <textarea className="form__input" rows={4} value={form.closedDates} onChange={e => set('closedDates', e.target.value)}
              placeholder={`${yr}-01-01\n${yr}-05-01\n${yr}-07-05`} />
          </div>
          <div className="form-actions" style={{ marginTop: 12 }}>
            <button className="btn btn--ghost" onClick={onClose}>Annuler</button>
            <button className="btn btn--primary" disabled={loading} onClick={() => {
              const closedDates = form.closedDates.split('\n').map(s => s.trim()).filter(Boolean);
              onGenerate(calendar.id, { fromDate: form.fromDate, toDate: form.toDate, closedDates });
            }}>
              {loading ? 'Génération…' : 'Générer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── MAIN PAGE ────────────────────────────────── */
export default function CalendarsPage() {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const companyName = user?.company?.name || '';

  const [showNew, setShowNew]       = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [genTarget, setGenTarget]   = useState(null);
  const [expanded, setExpanded]     = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['gpao-calendars'],
    queryFn:  () => gpaoAPI.calendars().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: gpaoAPI.createCalendar,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gpao-calendars'] }); setShowNew(false); toast.success('Calendrier créé'); },
    onError: e => toast.error(e?.message || 'Erreur'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => gpaoAPI.updateCalendar(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gpao-calendars'] }); setEditTarget(null); toast.success('Calendrier mis à jour'); },
    onError: e => toast.error(e?.message || 'Erreur'),
  });
  const generateMut = useMutation({
    mutationFn: ({ id, data }) => gpaoAPI.generateDays(id, data),
    onSuccess: r => { qc.invalidateQueries({ queryKey: ['gpao-calendars'] }); setGenTarget(null); toast.success(r?.message || 'Jours générés'); },
    onError: e => toast.error(e?.message || 'Erreur'),
  });
  const dayMut = useMutation({
    mutationFn: ({ id, date, isWorking, duration, label }) =>
      gpaoAPI.updateDay(id, { date, isWorking, duration, label }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gpao-calendars'] }),
    onError: e => toast.error(e?.message || 'Erreur'),
  });

  const calendars    = data || [];
  const wtLabel      = wt => WEEKEND_OPTIONS.find(o => o.value === wt)?.label || wt;
  const genCalendar  = genTarget  ? calendars.find(c => c.id === genTarget)  : null;
  const editCalendar = editTarget ? calendars.find(c => c.id === editTarget) : null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title"><Calendar size={22} style={{ display: 'inline', marginRight: 8 }} />Calendriers d'activité</h1>
          <p className="page-subtitle">{calendars.length} calendrier(s) — jours ouvrables, fériés et heures de travail</p>
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
          {calendars.map(cal => {
            const st        = getCalStats(cal);
            const generated = (cal.days || []).length > 0;
            return (
              <div key={cal.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>

                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{cal.name}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6, fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>📆 {cal.year}</span>
                      <span style={{ color: 'var(--text-muted)' }}>🕗 {cal.weekStart} · {cal.weekDuration}h/j</span>
                      <span style={{ color: 'var(--text-muted)' }}>🗓 {wtLabel(cal.weekendType)}</span>
                      {generated ? (
                        <>
                          <span style={{ color: '#10b981', fontWeight: 600 }}>✅ {st.working} jours ouvrables</span>
                          <span style={{ color: '#6366f1', fontWeight: 600 }}>⏱ {st.totalHours}h</span>
                          {st.closed > 0 && <span style={{ color: '#f59e0b', fontWeight: 600 }}>🔴 {st.closed} j. fériés/fermés</span>}
                        </>
                      ) : (
                        <span style={{ color: '#f59e0b' }}>⚠ Jours non encore générés</span>
                      )}
                    </div>
                  </div>
                  <button className="btn btn--ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setEditTarget(cal.id)}>
                    <Edit2 size={13} /> Modifier
                  </button>
                  <button className="btn btn--ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setGenTarget(cal.id)}>
                    <Zap size={13} /> Générer
                  </button>
                  <button className="btn btn--ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setExpanded(expanded === cal.id ? null : cal.id)}>
                    <Calendar size={13} /> {expanded === cal.id ? 'Fermer' : 'Afficher'}
                  </button>
                </div>

                {/* Expanded tabs */}
                {expanded === cal.id && (
                  <CalendarExpandedView
                    calendar={cal}
                    st={st}
                    generated={generated}
                    onDay={(date, isWorking, duration, label) =>
                      dayMut.mutate({ id: cal.id, date, isWorking, duration, label })
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewCalendarModal companyName={companyName} onClose={() => setShowNew(false)}
          onSave={d => createMut.mutate(d)} loading={createMut.isPending} />
      )}
      {editTarget && editCalendar && (
        <EditCalendarModal calendar={editCalendar} onClose={() => setEditTarget(null)}
          onSave={d => updateMut.mutate({ id: editCalendar.id, data: d })} loading={updateMut.isPending} />
      )}
      {genTarget && genCalendar && (
        <GenerateModal calendar={genCalendar} onClose={() => setGenTarget(null)}
          onGenerate={(id, data) => generateMut.mutate({ id, data })} loading={generateMut.isPending} />
      )}
    </div>
  );
}
