import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client.js';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const fetchCalendarData = async () => {
  const [leavesRes, tasksRes, projectsRes] = await Promise.allSettled([
    apiClient.get('/leaves').then(r => r.data || []),
    apiClient.get('/projects').then(r => r.data || []),
    apiClient.get('/projects').then(r => r.data || []),
  ]);
  return {
    leaves: leavesRes.status === 'fulfilled' ? leavesRes.value : [],
    projects: projectsRes.status === 'fulfilled' ? projectsRes.value : [],
  };
};

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const LEAVE_COLORS = { APPROVED: '#10b981', PENDING: '#f59e0b', REJECTED: '#ef4444', CANCELLED: '#64748b' };
const PROJECT_COLORS = { PLANNING: '#6366f1', IN_PROGRESS: '#f59e0b', COMPLETED: '#10b981', ON_HOLD: '#64748b', CANCELLED: '#ef4444' };

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['calendar-data'],
    queryFn: fetchCalendarData,
  });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  const getEventsForDay = (day) => {
    if (!data || !day) return [];
    const date = new Date(year, month, day);
    const events = [];

    // Leaves
    (data.leaves || []).forEach(leave => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      if (date >= start && date <= end) {
        events.push({
          type: 'leave',
          label: `${leave.employee?.firstName || 'Employé'} — ${leave.type}`,
          color: LEAVE_COLORS[leave.status] || '#64748b',
          icon: '🏖️',
        });
      }
    });

    // Project milestones (start/end)
    (data.projects || []).forEach(project => {
      const start = new Date(project.startDate);
      const end = project.endDate ? new Date(project.endDate) : null;
      if (start.toDateString() === date.toDateString()) {
        events.push({ type: 'project', label: `▶ ${project.name}`, color: PROJECT_COLORS[project.status] || '#6366f1', icon: '🚀' });
      }
      if (end && end.toDateString() === date.toDateString()) {
        events.push({ type: 'project', label: `⏹ ${project.name}`, color: '#10b981', icon: '🏁' });
      }
    });

    return events;
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📅 Agenda partagé</h1>
          <p className="page-subtitle">Congés · Projets · Jalons</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn--ghost" style={{ padding: '8px 10px' }} onClick={prevMonth}><ChevronLeft size={16} /></button>
          <span style={{ fontWeight: 700, fontSize: 15, minWidth: 180, textAlign: 'center' }}>{MONTHS_FR[month]} {year}</span>
          <button className="btn btn--ghost" style={{ padding: '8px 10px' }} onClick={nextMonth}><ChevronRight size={16} /></button>
          <button className="btn btn--ghost" style={{ fontSize: 12 }} onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}>
            <Calendar size={14} /> Aujourd'hui
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { color: '#10b981', label: 'Congé approuvé' },
          { color: '#f59e0b', label: 'Congé en attente' },
          { color: '#6366f1', label: 'Début de projet' },
          { color: '#10b981', label: 'Fin de projet' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color }} />
            {item.label}
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
          {DAYS_FR.map(d => (
            <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 12, fontWeight: 700, color: d === 'Sam' || d === 'Dim' ? '#f59e0b' : 'var(--text-secondary)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {Array.from({ length: totalCells }, (_, i) => {
            const dayNum = i - firstDow + 1;
            const isValid = dayNum >= 1 && dayNum <= daysInMonth;
            const isToday = isValid && year === today.getFullYear() && month === today.getMonth() && dayNum === today.getDate();
            const events = isValid ? getEventsForDay(dayNum) : [];
            const colIdx = i % 7;
            const isWeekend = colIdx === 5 || colIdx === 6;

            return (
              <div key={i}
                onClick={() => isValid && events.length > 0 && setSelected({ day: dayNum, events })}
                style={{
                  minHeight: 90,
                  padding: '8px',
                  borderRight: colIdx < 6 ? '1px solid var(--border)' : 'none',
                  borderBottom: i < totalCells - 7 ? '1px solid var(--border)' : 'none',
                  background: isWeekend ? '#f59e0b06' : 'transparent',
                  cursor: isValid && events.length > 0 ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}>
                {isValid && (
                  <>
                    <div style={{
                      display: 'inline-flex',
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: isToday ? 800 : 500,
                      background: isToday ? '#6366f1' : 'transparent',
                      color: isToday ? 'white' : isWeekend ? '#f59e0b' : 'var(--text-primary)',
                      marginBottom: 4,
                    }}>{dayNum}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {events.slice(0, 3).map((ev, j) => (
                        <div key={j} style={{
                          fontSize: 10,
                          padding: '1px 5px',
                          borderRadius: 3,
                          background: ev.color + '33',
                          color: ev.color,
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>{ev.label}</div>
                      ))}
                      {events.length > 3 && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '1px 4px' }}>+{events.length - 3} autre(s)</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>📅 {selected.day} {MONTHS_FR[month]} {year}</h3>
              <button className="modal__close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal__body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selected.events.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: ev.color + '22', borderRadius: 8, borderLeft: `3px solid ${ev.color}` }}>
                    <span style={{ fontSize: 18 }}>{ev.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{ev.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
