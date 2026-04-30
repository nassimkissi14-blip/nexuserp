import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// ─── PROJECTS ────────────────────────────────────────────────────────────────

// GET /projects
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      companyId: req.companyId,
      ...(status && status !== 'ALL' && { status }),
      ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }] }),
    };
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
        include: {
          members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
          tasks: { select: { id: true, status: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);
    res.json({ success: true, data: projects, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
});

// GET /projects/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true, department: true } } } },
        tasks: { include: { project: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!project) return res.status(404).json({ success: false, message: 'Projet non trouvé' });
    res.json({ success: true, data: project });
  } catch (error) { next(error); }
});

// POST /projects
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const { name, description, status = 'PLANNING', priority = 'MEDIUM', startDate, endDate, budget, memberIds = [] } = req.body;
    if (!name || !startDate) return res.status(400).json({ success: false, message: 'Nom et date de début requis' });

    const project = await prisma.project.create({
      data: {
        companyId: req.companyId,
        name, description: description || null,
        status, priority,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        budget: budget ? Number(budget) : null,
        progress: 0,
        members: memberIds.length > 0 ? {
          create: memberIds.map(userId => ({ userId, role: 'member' })),
        } : undefined,
      },
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        tasks: { select: { id: true, status: true } },
      },
    });
    res.status(201).json({ success: true, data: project });
  } catch (error) { next(error); }
});

// PATCH /projects/:id
router.patch('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const existing = await prisma.project.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Projet non trouvé' });

    const { name, description, status, priority, startDate, endDate, budget, progress, memberIds } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
    if (budget !== undefined) data.budget = budget ? Number(budget) : null;
    if (progress !== undefined) data.progress = Number(progress);

    const updated = await prisma.$transaction(async (tx) => {
      if (memberIds !== undefined) {
        await tx.projectMember.deleteMany({ where: { projectId: req.params.id } });
        if (memberIds.length > 0) {
          await tx.projectMember.createMany({ data: memberIds.map(userId => ({ projectId: req.params.id, userId, role: 'member' })) });
        }
      }
      return tx.project.update({
        where: { id: req.params.id }, data,
        include: {
          members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
          tasks: { select: { id: true, status: true } },
        },
      });
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// DELETE /projects/:id
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR'), async (req, res, next) => {
  try {
    const existing = await prisma.project.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Projet non trouvé' });
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Projet supprimé' });
  } catch (error) { next(error); }
});

// ─── TASKS ───────────────────────────────────────────────────────────────────

// GET /projects/:id/tasks
router.get('/:id/tasks', authenticate, async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!project) return res.status(404).json({ success: false, message: 'Projet non trouvé' });

    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: tasks });
  } catch (error) { next(error); }
});

// GET /projects/tasks/all - all tasks for company
router.get('/tasks/all', authenticate, async (req, res, next) => {
  try {
    const { status, priority, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      project: { companyId: req.companyId },
      ...(status && status !== 'ALL' && { status }),
      ...(priority && priority !== 'ALL' && { priority }),
    };
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
        include: { project: { select: { id: true, name: true, status: true } } },
      }),
      prisma.task.count({ where }),
    ]);
    res.json({ success: true, data: tasks, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
});

// POST /projects/:id/tasks
router.post('/:id/tasks', authenticate, async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!project) return res.status(404).json({ success: false, message: 'Projet non trouvé' });

    const { title, description, status = 'TODO', priority = 'MEDIUM', assigneeId, dueDate } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Titre requis' });

    const task = await prisma.task.create({
      data: {
        projectId: req.params.id, title, description: description || null,
        status, priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: { project: { select: { id: true, name: true } } },
    });

    // Auto-update project progress based on tasks
    await _recalcProjectProgress(req.params.id);

    res.status(201).json({ success: true, data: task });
  } catch (error) { next(error); }
});

// PATCH /projects/tasks/:taskId
router.patch('/tasks/:taskId', authenticate, async (req, res, next) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.taskId, project: { companyId: req.companyId } },
    });
    if (!task) return res.status(404).json({ success: false, message: 'Tâche non trouvée' });

    const { title, description, status, priority, assigneeId, dueDate } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (assigneeId !== undefined) data.assigneeId = assigneeId || null;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

    const updated = await prisma.task.update({
      where: { id: req.params.taskId }, data,
      include: { project: { select: { id: true, name: true } } },
    });

    await _recalcProjectProgress(task.projectId);

    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// DELETE /projects/tasks/:taskId
router.delete('/tasks/:taskId', authenticate, async (req, res, next) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.taskId, project: { companyId: req.companyId } },
    });
    if (!task) return res.status(404).json({ success: false, message: 'Tâche non trouvée' });
    await prisma.task.delete({ where: { id: req.params.taskId } });
    await _recalcProjectProgress(task.projectId);
    res.json({ success: true, message: 'Tâche supprimée' });
  } catch (error) { next(error); }
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function _recalcProjectProgress(projectId) {
  const tasks = await prisma.task.findMany({ where: { projectId }, select: { status: true } });
  if (tasks.length === 0) return;
  const done = tasks.filter(t => t.status === 'DONE').length;
  const progress = Math.round((done / tasks.length) * 100);
  await prisma.project.update({ where: { id: projectId }, data: { progress } });
}

export default router;
