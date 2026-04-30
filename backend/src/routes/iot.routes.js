/**
 * NexusERP — IoT & Simulation API
 * Manages sensors, live readings, and simulation sessions.
 * Webhook endpoint accepts data from Arena, FlexSim, Plant Simulation via OPC-UA/REST.
 */
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { startArenaDemo, stopArenaDemo, isArenaRunning, getArenaState } from '../services/arenaSimulator.js';

const router = Router();
router.use(authenticate);


/* ════════════════════════════════════════════════════════════
   SENSORS
════════════════════════════════════════════════════════════ */

// GET /iot/sensors — list all sensors
router.get('/sensors', async (req, res, next) => {
  try {
    const { companyId } = req;
    const sensors = await prisma.ioTSensor.findMany({
      where: { companyId },
      orderBy: { type: 'asc' },
    });
    res.json({ success: true, data: sensors });
  } catch (err) { next(err); }
});

// POST /iot/sensors — create custom sensor
router.post('/sensors', async (req, res, next) => {
  try {
    const { companyId } = req;
    const { name, type, unit, location, protocol, mqttTopic, opcuaNodeId,
            minValue, maxValue, warnLow, warnHigh, critLow, critHigh } = req.body;
    const sensor = await prisma.ioTSensor.create({
      data: { companyId, name, type, unit, location, protocol: protocol || 'SIMULATED',
              mqttTopic, opcuaNodeId, minValue: minValue ?? 0, maxValue: maxValue ?? 100,
              warnLow, warnHigh, critLow, critHigh },
    });
    res.json({ success: true, data: sensor });
  } catch (err) { next(err); }
});

// PATCH /iot/sensors/:id
router.patch('/sensors/:id', async (req, res, next) => {
  try {
    const { companyId } = req;
    const sensor = await prisma.ioTSensor.update({
      where: { id: req.params.id, companyId },
      data: req.body,
    });
    res.json({ success: true, data: sensor });
  } catch (err) { next(err); }
});

// DELETE /iot/sensors/:id
router.delete('/sensors/:id', async (req, res, next) => {
  try {
    const { companyId } = req;
    await prisma.ioTSensor.delete({ where: { id: req.params.id, companyId } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════════════════════════
   READINGS — history & stats
════════════════════════════════════════════════════════════ */

// GET /iot/readings/:sensorId?minutes=10
router.get('/readings/:sensorId', async (req, res, next) => {
  try {
    const { companyId } = req;
    const { sensorId } = req.params;
    const minutes = parseInt(req.query.minutes) || 10;
    const since = new Date(Date.now() - minutes * 60 * 1000);

    const sensor = await prisma.ioTSensor.findFirst({ where: { id: sensorId, companyId } });
    if (!sensor) return res.status(404).json({ success: false, message: 'Capteur introuvable' });

    const readings = await prisma.sensorReading.findMany({
      where: { sensorId, timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
      take: 600,
    });

    // Stats
    const vals = readings.map(r => r.value);
    const avg  = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const min  = vals.length ? Math.min(...vals) : 0;
    const max  = vals.length ? Math.max(...vals) : 0;
    const last = readings[readings.length - 1];

    res.json({ success: true, data: { sensor, readings, stats: { avg: +avg.toFixed(2), min: +min.toFixed(2), max: +max.toFixed(2), last: last?.value, lastStatus: last?.status, count: readings.length } } });
  } catch (err) { next(err); }
});

// GET /iot/dashboard — all sensors with latest reading
router.get('/dashboard', async (req, res, next) => {
  try {
    const { companyId } = req;
    const sensors = await prisma.ioTSensor.findMany({
      where: { companyId, isActive: true },
      orderBy: { type: 'asc' },
    });

    // Latest reading per sensor (last 5 min)
    const since5m = new Date(Date.now() - 5 * 60 * 1000);
    const latest = await Promise.all(
      sensors.map(s =>
        prisma.sensorReading.findFirst({
          where: { sensorId: s.id, timestamp: { gte: since5m } },
          orderBy: { timestamp: 'desc' },
        })
      )
    );

    const result = sensors.map((s, i) => ({
      ...s,
      latestValue:  latest[i]?.value  ?? null,
      latestStatus: latest[i]?.status ?? 'OFFLINE',
      latestAt:     latest[i]?.timestamp ?? null,
    }));

    const critCount = result.filter(s => s.latestStatus === 'CRITICAL').length;
    const warnCount = result.filter(s => s.latestStatus === 'WARNING').length;
    const offCount  = result.filter(s => s.latestStatus === 'OFFLINE').length;

    res.json({ success: true, data: { sensors: result, summary: { total: sensors.length, critical: critCount, warning: warnCount, offline: offCount, normal: sensors.length - critCount - warnCount - offCount } } });
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════════════════════════
   WEBHOOK — receives data from Arena / FlexSim / Plant Sim / OPC-UA gateway
   POST /iot/ingest   (Bearer token auth)
════════════════════════════════════════════════════════════ */
router.post('/ingest', async (req, res, next) => {
  try {
    const { companyId } = req;
    const io = req.app.get('io');

    // Payload: { readings: [{ sensorId, value, timestamp? }] }
    //       OR: { sensor: "name_or_id", value, unit, source }
    const { readings, sensor: singleName, value: singleVal, source } = req.body;

    const toProcess = readings
      ? readings
      : [{ sensorId: singleName, value: singleVal }];

    const persisted = [];

    for (const r of toProcess) {
      const s = await prisma.ioTSensor.findFirst({
        where: { companyId, OR: [{ id: r.sensorId }, { name: r.sensorId }, { mqttTopic: r.sensorId }, { opcuaNodeId: r.sensorId }] },
      });
      if (!s) continue;

      const profile = { warnHigh: s.warnHigh, warnLow: s.warnLow, critHigh: s.critHigh, critLow: s.critLow };
      let status = 'NORMAL';
      if ((profile.critLow !== null && r.value < profile.critLow) || (profile.critHigh !== null && r.value > profile.critHigh)) status = 'CRITICAL';
      else if ((profile.warnLow !== null && r.value < profile.warnLow) || (profile.warnHigh !== null && r.value > profile.warnHigh)) status = 'WARNING';

      await prisma.sensorReading.create({ data: { sensorId: s.id, value: r.value, status } });
      persisted.push({ sensorId: s.id, name: s.name, type: s.type, unit: s.unit, location: s.location, value: r.value, status, timestamp: new Date().toISOString(), source: source || 'EXTERNAL' });
    }

    if (persisted.length && io) {
      io.to(`company:${companyId}`).emit('iot:readings', persisted);
    }

    res.json({ success: true, processed: persisted.length });
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════════════════════════
   SIMULATION SESSIONS
════════════════════════════════════════════════════════════ */

router.get('/simulations', async (req, res, next) => {
  try {
    const { companyId } = req;
    const sessions = await prisma.simulationSession.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, data: sessions });
  } catch (err) { next(err); }
});

router.post('/simulations', async (req, res, next) => {
  try {
    const { companyId } = req;
    const { name, software, config } = req.body;
    const session = await prisma.simulationSession.create({
      data: { companyId, name, software, config, status: 'IDLE' },
    });
    res.json({ success: true, data: session });
  } catch (err) { next(err); }
});

// PATCH /iot/simulations/:id/status — start / pause / stop
router.patch('/simulations/:id/status', async (req, res, next) => {
  try {
    const { companyId } = req;
    const { status } = req.body;
    const io = req.app.get('io');

    const data = { status };
    if (status === 'RUNNING') data.startedAt = new Date();
    if (['COMPLETED', 'ERROR'].includes(status)) data.endedAt = new Date();

    const session = await prisma.simulationSession.update({
      where: { id: req.params.id, companyId },
      data,
    });

    io?.to(`company:${companyId}`).emit('simulation:status', { sessionId: session.id, status, software: session.software });
    res.json({ success: true, data: session });
  } catch (err) { next(err); }
});

// POST /iot/simulations/:id/events — webhook endpoint for simulation software
router.post('/simulations/:id/events', async (req, res, next) => {
  try {
    const { companyId } = req;
    const io = req.app.get('io');
    const { eventType, data, simTime } = req.body;

    const session = await prisma.simulationSession.findFirst({ where: { id: req.params.id, companyId } });
    if (!session) return res.status(404).json({ success: false, message: 'Session introuvable' });

    const event = await prisma.simulationEvent.create({
      data: { sessionId: session.id, eventType: eventType || 'KPI_UPDATE', data: data || {}, simTime },
    });

    io?.to(`company:${companyId}`).emit('simulation:event', { sessionId: session.id, software: session.software, event });
    res.json({ success: true, data: event });
  } catch (err) { next(err); }
});

router.get('/simulations/:id/events', async (req, res, next) => {
  try {
    const { companyId } = req;
    const session = await prisma.simulationSession.findFirst({ where: { id: req.params.id, companyId } });
    if (!session) return res.status(404).json({ success: false, message: 'Session introuvable' });

    const events = await prisma.simulationEvent.findMany({
      where: { sessionId: session.id },
      orderBy: { receivedAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: events });
  } catch (err) { next(err); }
});

// DELETE /iot/simulations/:id
router.delete('/simulations/:id', async (req, res, next) => {
  try {
    const { companyId } = req;
    stopArenaDemo(req.params.id);
    await prisma.simulationSession.delete({ where: { id: req.params.id, companyId } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════════════════════════
   KPI AGGREGATION — last KPI_UPDATE snapshot for a session
════════════════════════════════════════════════════════════ */
router.get('/simulations/:id/kpis', async (req, res, next) => {
  try {
    const { companyId } = req;
    const session = await prisma.simulationSession.findFirst({ where: { id: req.params.id, companyId } });
    if (!session) return res.status(404).json({ success: false, message: 'Session introuvable' });

    // Live state from in-memory demo if running, else last DB snapshot
    const live = getArenaState(req.params.id);
    if (live) return res.json({ success: true, data: live, source: 'LIVE' });

    const last = await prisma.simulationEvent.findFirst({
      where: { sessionId: session.id, eventType: 'KPI_UPDATE' },
      orderBy: { receivedAt: 'desc' },
    });
    res.json({ success: true, data: last?.data || null, source: 'SNAPSHOT' });
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════════════════════════
   DEMO MODE — start / stop Arena-like data generator
════════════════════════════════════════════════════════════ */
router.post('/simulations/:id/demo/start', async (req, res, next) => {
  try {
    const { companyId } = req;
    const session = await prisma.simulationSession.findFirst({ where: { id: req.params.id, companyId } });
    if (!session) return res.status(404).json({ success: false, message: 'Session introuvable' });

    const speedMs = { SLOW: 8000, MEDIUM: 4000, FAST: 2000 };
    const interval = speedMs[req.body.speed] || 4000;

    await prisma.simulationSession.update({
      where: { id: session.id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    startArenaDemo(session.id, companyId, interval);

    const io = req.app.get('io');
    io?.to(`company:${companyId}`).emit('simulation:session_update', { sessionId: session.id, status: 'RUNNING', software: session.software });

    res.json({ success: true, data: { running: true, speed: req.body.speed || 'MEDIUM' } });
  } catch (err) { next(err); }
});

router.post('/simulations/:id/demo/stop', async (req, res, next) => {
  try {
    const { companyId } = req;
    const session = await prisma.simulationSession.findFirst({ where: { id: req.params.id, companyId } });
    if (!session) return res.status(404).json({ success: false, message: 'Session introuvable' });

    stopArenaDemo(session.id);

    await prisma.simulationSession.update({
      where: { id: session.id },
      data: { status: 'PAUSED' },
    });

    const io = req.app.get('io');
    io?.to(`company:${companyId}`).emit('simulation:session_update', { sessionId: session.id, status: 'PAUSED', software: session.software });

    res.json({ success: true, data: { running: false } });
  } catch (err) { next(err); }
});

// GET /iot/simulations/:id/demo/status
router.get('/simulations/:id/demo/status', (req, res) => {
  res.json({ success: true, data: { running: isArenaRunning(req.params.id) } });
});

export default router;
