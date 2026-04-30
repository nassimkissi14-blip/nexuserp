import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client.js';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const projectsAPI = {
  getAll: () => apiClient.get('/projects').then(r => r.data || []),
};

const STATUS_COLOR = {
  PLANNING:    '#6366f1',
  IN_PROGRESS: '#f59e0b',
  ON_HOLD:     '#64748b',
  COMPLETED:   '#10b981',
  CANCELLED:   '#ef4444',
};

const PRIORITY_COLOR = { LOW: '#64748b', MEDIUM: '#3b82f6', HIGH: '#f59e0b', CRITICAL: '#ef4444' };

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export default function GanttPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects-gantt'],
    queryFn: projectsAPI.getAll,
  });

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const getBar = (project) => {
    if (!project.startDate) return null;
    const start = new Date(project.startDate);
    const end = project.endDate ? new Date(project.endDate) : new Date(start.getTime() + 30 * 86400000);
    const monthStart = new Date(viewYear, viewMonth, 1);
    const monthEnd = new Date(viewYear, viewMonth, daysInMonth);

    if (end < monthStart || start > monthEnd) return null;

    const clampedStart = start < monthStart ? monthStart : start;
    const clampedEnd = end > monthEnd ? monthEnd : end;

    const left = ((clampedStart.getDate() - 1) / daysInMonth) * 100;
    const width = ((clampedEnd.getDate() - clampedStart.getDate() + 1) / daysInMonth) * 100;
    return { left: clamp(left, 0, 100), width: clamp(width, 1, 100) };
  };

  const todayCol = today.getFullYear() === viewYear && today.getMonth() === viewMonth ? today.getDate() : null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📅 Diagramme Gantt</h1>
          <p className="page-subtitle">{projects.length} projet(s) · Vue mensuelle</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn--ghost" style={{ padding: '8px 10px' }} onClick={prevMonth}><ChevronLeft size={16} /></button>
          <span style={{ fontWeight: 700, fontSize: 15, minWidth: 160, textAlign: 'center' }}>{MONTHS_FR[viewMonth]} {viewYear}</span>
          <button className="btn btn--ghost" style={{ padding: '8px 10px' }} onClick={nextMonth}><ChevronRight size={16} /></button>
          <button className="btn btn--ghost" style={{ fontSize: 12 }} onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }}>
            <Calendar size={14} /> Aujourd'hui
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement…</div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
          <h3>Aucun projet à afficher</h3>
          <p style={{ fontSize: 13 }}>Créez des projets dans le module Projets</p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {/* Header days */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 240, flexShrink: 0, padding: '10px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', borderRight: '1px solid var(--border)' }}>
              Projet
            </div>
            <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
              {days.map(d => {
                const isToday = d === todayCol;
                const isWeekend = new Date(viewYear, viewMonth, d).getDay() % 6 === 0;
                return (
                  <div key={d} style={{
                    flex: 1,
                    padding: '8px 0',
                    textAlign: 'center',
                    fontSize: 10,
                    fontWeight: isToday ? 800 : 500,
                    color: isToday ? '#6366f1' : isWeekend ? '#f59e0b' : 'var(--text-muted)',
                    borderRight: '1px solid var(--border)22',
                    background: isToday ? '#6366f111' : isWeekend ? '#f59e0b08' : 'transparent',
                  }}>{d}</div>
                );
              })}
            </div>
          </div>

          {/* Project rows */}
          {projects.map((project, idx) => {
            const bar = getBar(project);
            const color = STATUS_COLOR[project.status] || '#6366f1';
            return (
              <div key={project.id} style={{
                display: 'flex',
                borderBottom: idx < projects.length - 1 ? '1px solid var(--border)' : 'none',
                minHeight: 44,
              }}>
                {/* Project name */}
                <div style={{ width: 240, flexShrink: 0, padding: '10px 16px', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      <span style={{ color: PRIORITY_COLOR[project.priority], fontWeight: 600 }}>{project.priority}</span>
                      {project.progress > 0 && ` · ${project.progress}%`}
                    </div>
                  </div>
                </div>

                {/* Gantt bar area */}
                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', padding: '4px 0' }}>
                  {/* Day grid lines */}
                  {days.map(d => (
                    <div key={d} style={{
                      position: 'absolute',
                      left: `${((d - 1) / daysInMonth) * 100}%`,
                      width: `${(1 / daysInMonth) * 100}%`,
                      height: '100%',
                      background: d === todayCol ? '#6366f111' : new Date(viewYear, viewMonth, d).getDay() % 6 === 0 ? '#f59e0b06' : 'transparent',
                      borderRight: '1px solid var(--border)22',
                    }} />
                  ))}

                  {/* Today line */}
                  {todayCol && (
                    <div style={{
                      position: 'absolute',
                      left: `${((todayCol - 0.5) / daysInMonth) * 100}%`,
                      width: 2,
                      height: '100%',
                      background: '#6366f1',
                      zIndex: 3,
                    }} />
                  )}

                  {bar && (
                    <div style={{
                      position: 'absolute',
                      left: `${bar.left}%`,
                      width: `${bar.width}%`,
                      height: 24,
                      background: color + 'cc',
                      borderRadius: 4,
                      border: `1px solid ${color}`,
                      zIndex: 2,
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 6,
                      overflow: 'hidden',
                    }}>
                      {project.progress > 0 && (
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          height: '100%',
                          width: `${project.progress}%`,
                          background: color,
                          borderRadius: 4,
                          opacity: 0.4,
                        }} />
                      )}
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'white', position: 'relative', whiteSpace: 'nowrap' }}>
                        {bar.width > 8 ? project.name : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_COLOR).map(([s, c]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: c }} />
            {s.replace('_', ' ')}
          </div>
        ))}
      </div>
    </div>
  );
}
