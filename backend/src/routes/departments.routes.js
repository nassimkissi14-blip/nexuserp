import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

const ROLE_ORDER = { OPERATOR: 0, MANAGER: 1, DIRECTOR: 2, ADMIN: 3, SUPER_ADMIN: 4 };
const isManager = (role) => (ROLE_ORDER[role] || 0) >= ROLE_ORDER.MANAGER;

// GET /departments/config — all department configs for the company
router.get('/config', async (req, res, next) => {
  try {
    const configs = await prisma.departmentConfig.findMany({
      where: { companyId: req.companyId },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: configs });
  } catch (err) { next(err); }
});

// GET /departments/config/:name — single department config
router.get('/config/:name', async (req, res, next) => {
  try {
    const name = decodeURIComponent(req.params.name);
    let config = await prisma.departmentConfig.findUnique({
      where: { companyId_name: { companyId: req.companyId, name } },
    });
    // Return empty shell if not configured yet
    if (!config) config = { companyId: req.companyId, name, description: null, headName: null, email: null, phone: null, location: null, budgetTarget: null, color: null, goals: null };
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
});

// PUT /departments/config/:name — upsert department config
// MANAGER can only update their own department; DIRECTOR+ can update any
router.put('/config/:name', async (req, res, next) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const { role, department } = req.user;

    if (!isManager(role)) {
      return res.status(403).json({ success: false, message: 'Accès réservé aux managers et supérieurs' });
    }
    if (role === 'MANAGER' && department !== name) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez configurer que votre propre département' });
    }

    const { description, headName, email, phone, location, budgetTarget, color, goals } = req.body;
    const config = await prisma.departmentConfig.upsert({
      where: { companyId_name: { companyId: req.companyId, name } },
      create: {
        companyId: req.companyId, name,
        description, headName, email, phone, location,
        budgetTarget: budgetTarget ? parseFloat(budgetTarget) : null,
        color, goals,
        updatedBy: `${req.user.firstName} ${req.user.lastName}`,
      },
      update: {
        description, headName, email, phone, location,
        budgetTarget: budgetTarget ? parseFloat(budgetTarget) : null,
        color, goals,
        updatedBy: `${req.user.firstName} ${req.user.lastName}`,
      },
    });
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
});

export default router;
