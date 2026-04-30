import { create } from 'zustand';

export const useSimulationStore = create((set) => ({
  // ERP simulator (floating panel)
  running: false,
  speed: 'MEDIUM',
  events: [],
  setRunning: (running, speed) => set((s) => ({ running, speed: speed || s.speed })),
  addEvent:   (event) => set((s) => ({ events: [event, ...s.events].slice(0, 50) })),
  clearEvents: () => set({ events: [] }),

  // Industrial simulation (Arena / Plant Sim dashboard)
  // Map of sessionId → { kpis, events[] }
  industrialSessions: {},
  addIndustrialEvent: (sessionId, event) => set((s) => {
    const prev  = s.industrialSessions[sessionId] || { kpis: null, events: [] };
    const kpis  = event.eventType === 'KPI_UPDATE' ? event.data : prev.kpis;
    const events = [{ ...event, receivedAt: new Date().toISOString() }, ...prev.events].slice(0, 60);
    return { industrialSessions: { ...s.industrialSessions, [sessionId]: { kpis, events } } };
  }),
  clearIndustrialSession: (sessionId) => set((s) => {
    const next = { ...s.industrialSessions };
    delete next[sessionId];
    return { industrialSessions: next };
  }),
}));
