import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import prisma from '../lib/prisma.js';

const router = Router();
router.use(authenticate);

// GET /announcements
router.get('/', async (req, res) => {
  try {
    const { active } = req.query;
    const where = {
      companyId: req.user.companyId,
      ...(active === 'true' ? {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      } : {}),
    };
    const announcements = await prisma.announcement.findMany({
      where,
      include: { author: { select: { firstName: true, lastName: true } } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, data: announcements });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /announcements
router.post('/', authorize('MANAGER', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { title, content, priority, expiresAt } = req.body;
    const a = await prisma.announcement.create({
      data: {
        companyId: req.user.companyId,
        authorId: req.user.id,
        title,
        content,
        priority: priority || 'NORMAL',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: { author: { select: { firstName: true, lastName: true } } },
    });

    // Emit real-time notification for HIGH or URGENT announcements
    if (['HIGH', 'URGENT'].includes(a.priority)) {
      const io = req.app.get('io');
      if (io) {
        io.to(`company:${req.user.companyId}`).emit('notification:new', {
          id:      `ann_${a.id}`,
          type:    'ANNOUNCEMENT',
          title:   `📢 ${a.priority === 'URGENT' ? 'Annonce urgente' : 'Annonce importante'}`,
          message: a.title,
          isRead:  false,
          createdAt: a.createdAt,
        });
      }
    }

    res.status(201).json(a);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /announcements/:id
router.patch('/:id', authorize('MANAGER', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { title, content, priority, expiresAt, isActive } = req.body;
    const a = await prisma.announcement.update({
      where: { id: req.params.id, companyId: req.user.companyId },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(priority !== undefined && { priority }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { author: { select: { firstName: true, lastName: true } } },
    });
    res.json(a);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /announcements/:id
router.delete('/:id', authorize('MANAGER', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    await prisma.announcement.delete({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
