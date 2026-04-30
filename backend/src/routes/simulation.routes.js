import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { startErpSimulation, stopErpSimulation, getSimulationStatus } from '../services/erpSimulator.js';

const router = Router();
router.use(authenticate);

// GET /simulation/status
router.get('/status', (req, res) => {
  const status = getSimulationStatus(req.companyId);
  res.json({ success: true, data: status });
});

// POST /simulation/start  { speed: 'SLOW'|'MEDIUM'|'FAST' }
router.post('/start', authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), (req, res) => {
  const { speed = 'MEDIUM' } = req.body;
  startErpSimulation(req.companyId, speed);
  res.json({ success: true, data: { running: true, speed } });
});

// POST /simulation/stop
router.post('/stop', authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), (req, res) => {
  stopErpSimulation(req.companyId);
  res.json({ success: true, data: { running: false } });
});

export default router;
