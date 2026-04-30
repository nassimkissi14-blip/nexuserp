import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

/* ── GET /audit  ─────────────────────────────────────────────────── */
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, entity, userId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      user: { companyId: req.companyId },
      ...(action && { action }),
      ...(entity && { entity }),
      ...(userId && { userId }),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ success: true, data: logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) { next(e); }
});

export default router;
