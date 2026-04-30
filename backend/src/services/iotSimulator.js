/**
 * NexusERP IoT Simulator
 * Generates realistic industrial sensor data with noise, drift, and anomaly injection.
 * Broadcasts live readings via Socket.IO to all connected company clients.
 */

import prisma from '../lib/prisma.js';

/* ── Physics-based noise model ───────────────────────────────────── */
function gaussianNoise(mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ── Sensor profile definitions ──────────────────────────────────── */
const SENSOR_PROFILES = {
  TEMPERATURE: {
    unit: '°C', min: 0, max: 120,
    normal: { mean: 65, std: 2.5 },
    warning: { low: 50, high: 85 },
    critical: { low: 35, high: 100 },
    drift: 0.02,
  },
  PRESSURE: {
    unit: 'bar', min: 0, max: 16,
    normal: { mean: 6.5, std: 0.3 },
    warning: { low: 4.0, high: 9.5 },
    critical: { low: 2.0, high: 12.0 },
    drift: 0.005,
  },
  VIBRATION: {
    unit: 'mm/s', min: 0, max: 25,
    normal: { mean: 2.8, std: 0.6 },
    warning: { low: null, high: 7.1 },
    critical: { low: null, high: 14.0 },
    drift: 0.01,
  },
  FLOW: {
    unit: 'L/min', min: 0, max: 200,
    normal: { mean: 95, std: 5 },
    warning: { low: 60, high: 150 },
    critical: { low: 30, high: 180 },
    drift: 0.03,
  },
  POWER: {
    unit: 'kW', min: 0, max: 600,
    normal: { mean: 285, std: 18 },
    warning: { low: 180, high: 420 },
    critical: { low: 80, high: 520 },
    drift: 0.04,
  },
  HUMIDITY: {
    unit: '%', min: 0, max: 100,
    normal: { mean: 55, std: 4 },
    warning: { low: 30, high: 75 },
    critical: { low: 15, high: 90 },
    drift: 0.01,
  },
  SPEED: {
    unit: 'RPM', min: 0, max: 3600,
    normal: { mean: 1480, std: 35 },
    warning: { low: 800, high: 1700 },
    critical: { low: 400, high: 1900 },
    drift: 0.02,
  },
};

/* ── Per-sensor state (persists between ticks) ────────────────────── */
const sensorState = new Map();

function getState(sensorId, profile) {
  if (!sensorState.has(sensorId)) {
    sensorState.set(sensorId, {
      value: gaussianNoise(profile.normal.mean, profile.normal.std),
      driftDir: Math.random() > 0.5 ? 1 : -1,
      anomalyCountdown: Math.floor(Math.random() * 120) + 60,
      inAnomaly: false,
      anomalyTarget: null,
      anomalySteps: 0,
    });
  }
  return sensorState.get(sensorId);
}

function nextValue(sensorId, type) {
  const profile = SENSOR_PROFILES[type] || SENSOR_PROFILES.TEMPERATURE;
  const state = getState(sensorId, profile);

  state.anomalyCountdown--;

  if (state.inAnomaly) {
    // Move toward anomaly target
    const delta = (state.anomalyTarget - state.value) / Math.max(state.anomalySteps, 1);
    state.value += delta + gaussianNoise(0, profile.normal.std * 0.3);
    state.anomalySteps--;
    if (state.anomalySteps <= 0) {
      state.inAnomaly = false;
      state.anomalyCountdown = Math.floor(Math.random() * 120) + 60;
    }
  } else if (state.anomalyCountdown <= 0) {
    // Trigger anomaly (warning ~70%, critical ~30%)
    state.inAnomaly = true;
    state.anomalySteps = Math.floor(Math.random() * 8) + 4;
    const isCritical = Math.random() < 0.3;
    if (isCritical && profile.critical.high !== null) {
      state.anomalyTarget = profile.critical.high * (0.85 + Math.random() * 0.2);
    } else if (profile.warning.high !== null) {
      state.anomalyTarget = profile.warning.high * (0.95 + Math.random() * 0.15);
    } else {
      state.anomalyTarget = profile.normal.mean;
    }
  } else {
    // Normal: gaussian walk with drift
    state.value += gaussianNoise(0, profile.normal.std * 0.15);
    state.value += state.driftDir * profile.drift;
    // Mean-reversion
    const pull = (profile.normal.mean - state.value) * 0.05;
    state.value += pull;
    // Occasional drift direction flip
    if (Math.random() < 0.02) state.driftDir *= -1;
  }

  // Clamp to physical limits
  state.value = Math.max(profile.min, Math.min(profile.max, state.value));
  const rounded = Math.round(state.value * 100) / 100;

  // Status
  let status = 'NORMAL';
  const w = profile.warning;
  const c = profile.critical;
  if ((c.low !== null && rounded < c.low) || (c.high !== null && rounded > c.high)) status = 'CRITICAL';
  else if ((w.low !== null && rounded < w.low) || (w.high !== null && rounded > w.high)) status = 'WARNING';

  return { value: rounded, status };
}

/* ── Main simulator loop ──────────────────────────────────────────── */
let simulatorInterval = null;
let ioRef = null;

export function startIoTSimulator(io) {
  ioRef = io;
  if (simulatorInterval) return;

  simulatorInterval = setInterval(async () => {
    try {
      const sensors = await prisma.ioTSensor.findMany({
        where: { isActive: true, protocol: 'SIMULATED' },
        select: { id: true, companyId: true, type: true, name: true, unit: true, location: true },
      });

      if (!sensors.length) return;

      // Group by company for efficient broadcasting
      const byCompany = {};
      for (const s of sensors) {
        if (!byCompany[s.companyId]) byCompany[s.companyId] = [];
        const { value, status } = nextValue(s.id, s.type);
        byCompany[s.companyId].push({ sensorId: s.id, name: s.name, type: s.type, unit: s.unit, location: s.location, value, status, timestamp: new Date().toISOString() });
      }

      // Persist readings & broadcast
      const allReadings = Object.values(byCompany).flat();
      if (allReadings.length > 0) {
        await prisma.sensorReading.createMany({
          data: allReadings.map(r => ({ sensorId: r.sensorId, value: r.value, status: r.status })),
        });
      }

      for (const [companyId, readings] of Object.entries(byCompany)) {
        io.to(`company:${companyId}`).emit('iot:readings', readings);

        // Emit alerts for WARNING/CRITICAL
        const alerts = readings.filter(r => r.status !== 'NORMAL');
        if (alerts.length) {
          io.to(`company:${companyId}`).emit('iot:alerts', alerts);
        }
      }
    } catch (err) {
      console.error('[IoT Simulator]', err.message);
    }
  }, 3000); // tick every 3 seconds

  console.log('🔌 IoT Simulator started (3s tick)');
}

export function stopIoTSimulator() {
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
    simulatorInterval = null;
    console.log('🔌 IoT Simulator stopped');
  }
}

/* ── Seed default sensors for a company ──────────────────────────── */
export async function seedDefaultSensors(companyId) {
  const existing = await prisma.ioTSensor.count({ where: { companyId } });
  if (existing > 0) return;

  const defaults = [
    { name: 'Température Ligne A', type: 'TEMPERATURE', unit: '°C',    location: 'Production - Ligne A',    warnHigh: 85,  critHigh: 100, warnLow: 50,  critLow: 35  },
    { name: 'Température Ligne B', type: 'TEMPERATURE', unit: '°C',    location: 'Production - Ligne B',    warnHigh: 85,  critHigh: 100, warnLow: 50,  critLow: 35  },
    { name: 'Pression Hydraulique', type: 'PRESSURE',   unit: 'bar',   location: 'Atelier Hydraulique',     warnHigh: 9.5, critHigh: 12,  warnLow: 4.0, critLow: 2.0 },
    { name: 'Vibration Moteur 1',  type: 'VIBRATION',  unit: 'mm/s',  location: 'Machine CNC - Broche 1',  warnHigh: 7.1, critHigh: 14                               },
    { name: 'Vibration Moteur 2',  type: 'VIBRATION',  unit: 'mm/s',  location: 'Machine CNC - Broche 2',  warnHigh: 7.1, critHigh: 14                               },
    { name: 'Débit Circuit Eau',   type: 'FLOW',       unit: 'L/min', location: 'Circuit Refroidissement', warnHigh: 150, critHigh: 180, warnLow: 60,  critLow: 30  },
    { name: 'Consommation Électrique', type: 'POWER',  unit: 'kW',   location: 'Tableau Général',         warnHigh: 420, critHigh: 520, warnLow: 180, critLow: 80  },
    { name: 'Humidité Entrepôt',   type: 'HUMIDITY',  unit: '%',     location: 'Entrepôt Stock',           warnHigh: 75,  critHigh: 90,  warnLow: 30,  critLow: 15  },
    { name: 'Vitesse Convoyeur',   type: 'SPEED',     unit: 'RPM',   location: 'Convoyeur Principal',     warnHigh: 1700,critHigh: 1900, warnLow: 800, critLow: 400 },
  ];

  await prisma.ioTSensor.createMany({
    data: defaults.map(s => ({
      companyId,
      protocol: 'SIMULATED',
      isActive: true,
      minValue: 0,
      maxValue: SENSOR_PROFILES[s.type]?.max || 100,
      ...s,
    })),
  });
}
