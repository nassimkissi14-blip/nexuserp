import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// GET /leaves - list company leave requests
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, employeeId, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      employee: { companyId: req.companyId },
      ...(status && { status }),
      ...(employeeId && { employeeId }),
    };

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, department: true, position: true } },
        },
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    res.json({ success: true, data: requests, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
});

// POST /leaves - create leave request
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { employeeId, type, startDate, endDate, days, reason } = req.body;

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: req.companyId },
    });
    if (!employee) return res.status(404).json({ success: false, message: 'Employé non trouvé' });

    const request = await prisma.leaveRequest.create({
      data: {
        employeeId,
        userId: req.user.id,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        days: Number(days),
        reason: reason || null,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, department: true, position: true } },
      },
    });

    res.status(201).json({ success: true, data: request });
  } catch (error) { next(error); }
});

// PATCH /leaves/:id/approve - approve a pending request
router.patch('/:id/approve', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const request = await prisma.leaveRequest.findFirst({
      where: { id: req.params.id, employee: { companyId: req.companyId } },
    });
    if (!request) return res.status(404).json({ success: false, message: 'Demande non trouvée' });
    if (request.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Seules les demandes en attente peuvent être approuvées' });

    const [updated] = await prisma.$transaction([
      prisma.leaveRequest.update({
        where: { id: req.params.id },
        data: { status: 'APPROVED', approvedBy: req.user.id },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, department: true, position: true } },
        },
      }),
      prisma.employee.update({
        where: { id: request.employeeId },
        data: { status: 'ON_LEAVE' },
      }),
    ]);

    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// PATCH /leaves/:id/reject - reject a pending request
router.patch('/:id/reject', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const request = await prisma.leaveRequest.findFirst({
      where: { id: req.params.id, employee: { companyId: req.companyId } },
    });
    if (!request) return res.status(404).json({ success: false, message: 'Demande non trouvée' });
    if (request.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Seules les demandes en attente peuvent être refusées' });

    const updated = await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', approvedBy: req.user.id },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, department: true, position: true } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// DELETE /leaves/:id - cancel a pending request
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const request = await prisma.leaveRequest.findFirst({
      where: { id: req.params.id, employee: { companyId: req.companyId } },
    });
    if (!request) return res.status(404).json({ success: false, message: 'Demande non trouvée' });
    if (request.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Seules les demandes en attente peuvent être annulées' });

    await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });

    res.json({ success: true, message: 'Demande annulée' });
  } catch (error) { next(error); }
});

// GET /leaves/my — congés de l'employé connecté
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: { companyId: req.companyId, email: req.user.email },
    });
    if (!employee) return res.json({ success: true, data: [] });

    const leaves = await prisma.leaveRequest.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: leaves, employeeId: employee.id });
  } catch (e) { next(e); }
});

export default router;
