/**
 * NexusERP — Arena / Plant Simulation (Siemens) Live Demo Simulator
 *
 * Models a discrete-event manufacturing line identical to what Arena or
 * Plant Simulation would produce.  When no real software is connected this
 * demo generates authentic KPI streams so the dashboard always has data.
 *
 * Line model:
 *   Raw Material → [Fraiseuse CNC] → Queue_A → [Tour CNC] → Queue_B
 *                → [Perceuse] → [Contrôle Qualité] → Finished Goods
 *
 * Each tick emits a KPI_UPDATE event into the DB and broadcasts via Socket.IO
 * exactly as Arena/Plant Simulation would via their REST webhook.
 */

import prisma from '../lib/prisma.js';

/* ── Manufacturing line definition ─────────────────────────────── */
const LINE = {
  machines: [
    { id: 'M1', name: 'Fraiseuse CNC',     nominalUtil: 0.82, cycleTime: 4.2,  breakdownRate: 0.008 },
    { id: 'M2', name: 'Tour CNC',          nominalUtil: 0.74, cycleTime: 6.8,  breakdownRate: 0.005 },
    { id: 'M3', name: 'Perceuse Radiale',  nominalUtil: 0.68, cycleTime: 2.9,  breakdownRate: 0.004 },
    { id: 'M4', name: 'Contrôle Qualité',  nominalUtil: 0.55, cycleTime: 1.5,  breakdownRate: 0.001 },
  ],
  queues: [
    { id: 'Q1', name: 'File Fraiseuse→Tour',     capacity: 20 },
    { id: 'Q2', name: 'File Tour→Perceuse',      capacity: 15 },
    { id: 'Q3', name: 'File Perceuse→Contrôle',  capacity: 10 },
  ],
};

/* ── Per-session simulation state ───────────────────────────────── */
const sessions = new Map();   // sessionId → state
const timers   = new Map();   // sessionId → intervalId

function initState() {
  return {
    simTime:    0,
    entities:   { created: 0, completed: 0, scrapped: 0 },
    machines: LINE.machines.map(m => ({
      ...m,
      util:    m.nominalUtil + (Math.random() - 0.5) * 0.06,
      status:  'BUSY',    // BUSY | IDLE | DOWN
      downFor: 0,
      parts:   0,
    })),
    queues: LINE.queues.map(q => ({
      ...q,
      length:  Math.floor(Math.random() * 4),
      avgWait: +(Math.random() * 2 + 0.5).toFixed(2),
    })),
    throughput:   0,
    avgCycleTime: 0,
    oee:          0,
  };
}

/* ── Tick logic ─────────────────────────────────────────────────── */
function tick(state, dtMin) {
  state.simTime = +(state.simTime + dtMin).toFixed(2);

  // Arrival rate: ~8 parts/hour
  const arrived = Math.random() < (8 / 60) * dtMin ? 1 : 0;
  state.entities.created += arrived;

  for (const m of state.machines) {
    if (m.status === 'DOWN') {
      m.downFor = Math.max(0, m.downFor - dtMin);
      if (m.downFor <= 0) {
        m.status = 'BUSY';
        m.downFor = 0;
      }
    } else {
      // Random breakdown
      if (Math.random() < m.breakdownRate) {
        m.status = 'DOWN';
        m.downFor = +(Math.random() * 15 + 5).toFixed(1); // 5-20 min
      } else {
        // Parts produced this tick
        const produced = Math.floor((dtMin / m.cycleTime) * m.util + Math.random() * 0.3);
        m.parts += produced;
        // Utilization walks slowly toward nominal
        m.util += (m.nominalUtil - m.util) * 0.05 + (Math.random() - 0.5) * 0.015;
        m.util  = Math.max(0.3, Math.min(0.99, m.util));
        m.status = m.util < 0.2 ? 'IDLE' : 'BUSY';
      }
    }
  }

  // Queue lengths drift
  for (const q of state.queues) {
    q.length = Math.max(0, Math.min(q.capacity, q.length + Math.round((Math.random() - 0.5) * 2)));
    q.avgWait = +(Math.random() * 3 + 0.3).toFixed(2);
  }

  // Completions: last machine output → finished goods
  const lastM = state.machines[state.machines.length - 1];
  const finished = Math.floor(lastM.parts * 0.95);  // 5% scrap rate
  const scrapped  = lastM.parts - finished;
  state.entities.completed += Math.max(0, finished - state.entities.completed);
  state.entities.scrapped  += Math.max(0, scrapped);

  // Global KPIs
  const activeMs = state.machines.filter(m => m.status !== 'DOWN');
  const avgUtil  = activeMs.length ? activeMs.reduce((s, m) => s + m.util, 0) / activeMs.length : 0;
  state.throughput   = +(state.entities.completed / Math.max(state.simTime / 60, 0.01)).toFixed(1);
  state.avgCycleTime = +(LINE.machines.reduce((s, m) => s + m.cycleTime, 0) / (avgUtil + 0.01)).toFixed(2);
  state.oee          = +(avgUtil * 0.92 * 100).toFixed(1); // availability × perf × quality

  return state;
}

function buildPayload(state) {
  return {
    throughput:    state.throughput,
    avgCycleTime:  state.avgCycleTime,
    wip:           state.queues.reduce((s, q) => s + q.length, 0),
    oee:           state.oee,
    simTime:       state.simTime,
    entities:      { ...state.entities },
    resources: state.machines.map(m => ({
      id:          m.id,
      name:        m.name,
      utilization: +m.util.toFixed(3),
      status:      m.status,
      parts:       m.parts,
      downFor:     m.downFor,
    })),
    queues: state.queues.map(q => ({
      id:      q.id,
      name:    q.name,
      length:  q.length,
      avgWait: q.avgWait,
    })),
  };
}

function detectBottleneck(state) {
  const bottleneck = [...state.machines].sort((a, b) => b.util - a.util)[0];
  if (bottleneck && bottleneck.util > 0.93) return bottleneck;
  return null;
}

/* ── Public API ─────────────────────────────────────────────────── */
let ioRef = null;

export function initArenaSimulator(io) { ioRef = io; }

export async function startArenaDemo(sessionId, companyId, intervalMs = 4000) {
  if (timers.has(sessionId)) stopArenaDemo(sessionId);

  sessions.set(sessionId, initState());

  const id = setInterval(async () => {
    try {
      const state   = sessions.get(sessionId);
      if (!state) return;

      const dtMin   = intervalMs / 60_000;
      tick(state, dtMin);
      const payload = buildPayload(state);

      // Persist as a SimulationEvent
      await prisma.simulationEvent.create({
        data: { sessionId, eventType: 'KPI_UPDATE', data: payload, simTime: state.simTime },
      });

      // Broadcast exactly as Arena/Plant Sim webhook would
      ioRef?.to(`company:${companyId}`).emit('simulation:event', {
        sessionId, software: 'ARENA_DEMO', event: { eventType: 'KPI_UPDATE', data: payload, simTime: state.simTime },
      });

      // Occasional special events
      const bn = detectBottleneck(state);
      if (bn && Math.random() < 0.15) {
        const alert = { type: 'BOTTLENECK_DETECTED', machine: bn.name, utilization: +(bn.util * 100).toFixed(1) };
        await prisma.simulationEvent.create({
          data: { sessionId, eventType: 'ALERT', data: alert, simTime: state.simTime },
        });
        ioRef?.to(`company:${companyId}`).emit('simulation:event', {
          sessionId, software: 'ARENA_DEMO', event: { eventType: 'ALERT', data: alert, simTime: state.simTime },
        });
      }

      // Random breakdown alert
      const downM = state.machines.find(m => m.status === 'DOWN');
      if (downM && Math.random() < 0.3) {
        const alarm = { type: 'RESOURCE_ALARM', machine: downM.name, downFor: downM.downFor };
        ioRef?.to(`company:${companyId}`).emit('simulation:event', {
          sessionId, software: 'ARENA_DEMO', event: { eventType: 'RESOURCE_ALARM', data: alarm, simTime: state.simTime },
        });
      }
    } catch (err) {
      console.error('[Arena Simulator] error:', err.message);
    }
  }, intervalMs);

  timers.set(sessionId, id);
  console.log(`🏭 Arena demo started for session ${sessionId}`);
}

export function stopArenaDemo(sessionId) {
  const id = timers.get(sessionId);
  if (id) { clearInterval(id); timers.delete(sessionId); sessions.delete(sessionId); }
  console.log(`🏭 Arena demo stopped for session ${sessionId}`);
}

export function isArenaRunning(sessionId) { return timers.has(sessionId); }

export function getArenaState(sessionId) {
  const state = sessions.get(sessionId);
  return state ? buildPayload(state) : null;
}
