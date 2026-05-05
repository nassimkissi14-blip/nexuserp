import { Router } from 'express';
import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { sendApprovalEmail, sendRejectionEmail } from '../services/email.service.js';

const router = Router();

// GET /users — list company users (admin/director)
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { companyId: req.companyId },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, department: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (error) { next(error); }
});

// GET /users/pending — inactive users awaiting HR approval
router.get('/pending', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { companyId: req.companyId, isActive: false },
      select: { id: true, firstName: true, lastName: true, email: true, department: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (error) { next(error); }
});

// POST /users/:id/approve — activate + create Employee record
router.post('/:id/approve', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const user = await prisma.user.findFirst({ where: { id: req.params.id, companyId: req.companyId, isActive: false } });
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable ou déjà actif' });

    await prisma.user.update({ where: { id: user.id }, data: { isActive: true } });

    // Create Employee record
    await prisma.employee.create({
      data: {
        companyId: req.companyId,
        firstName: user.firstName,
        lastName:  user.lastName,
        email:     user.email,
        position:  req.body.position || user.department || 'Non défini',
        department: user.department || 'Non défini',
        salary:    req.body.salary || 0,
        hireDate:  new Date(),
        contractType: 'CDI',
        status: 'ACTIVE',
      },
    });

    // Notify the approved user (in-app)
    const notif = await prisma.notification.create({
      data: {
        userId:  user.id,
        title:   '✅ Accès approuvé',
        message: `Votre compte a été validé par ${req.user.firstName} ${req.user.lastName}. Vous pouvez maintenant vous connecter.`,
        type:    'SUCCESS',
        link:    '/dashboard',
      },
    });
    io?.to(`user:${user.id}`).emit('notification:new', notif);

    // Send approval email (non-blocking)
    const company = await prisma.company.findUnique({ where: { id: req.companyId }, select: { name: true } });
    sendApprovalEmail({ to: user.email, firstName: user.firstName, companyName: company?.name })
      .catch(err => console.error('[email] approval email failed:', err.message));

    res.json({ success: true, message: 'Utilisateur approuvé et employé créé' });
  } catch (error) { next(error); }
});

// POST /users/:id/reject — delete pending user + send rejection email
router.post('/:id/reject', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.params.id, companyId: req.companyId, isActive: false } });
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });

    const { reason } = req.body;

    // Capture data before deletion
    const { email, firstName } = user;
    const company = await prisma.company.findUnique({ where: { id: req.companyId }, select: { name: true } });

    await prisma.user.delete({ where: { id: user.id } });

    // Send rejection email (non-blocking)
    sendRejectionEmail({ to: email, firstName, companyName: company?.name, reason })
      .catch(err => console.error('[email] rejection email failed:', err.message));

    res.json({ success: true, message: 'Demande refusée et compte supprimé' });
  } catch (error) { next(error); }
});

// GET /users/colleagues — all active users (accessible to everyone, for messaging)
router.get('/colleagues', authenticate, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { companyId: req.companyId, isActive: true, NOT: { id: req.user.id } },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, department: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    res.json({ success: true, data: users });
  } catch (error) { next(error); }
});

// POST /users — create user
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role, department } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ success: false, message: 'Email déjà utilisé' });
    const hashed = await bcrypt.hash(password || 'nexuserp2025', 12);
    const user = await prisma.user.create({
      data: { firstName, lastName, email, password: hashed, role: role || 'OPERATOR', department: department || null, companyId: req.companyId },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, department: true, isActive: true, createdAt: true },
    });
    res.status(201).json({ success: true, data: user });
  } catch (error) { next(error); }
});

// PATCH /users/me — update own profile (must be before /:id to avoid collision)
router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const { firstName, lastName, department, currentPassword, newPassword } = req.body;
    const data = {};
    if (firstName) data.firstName = firstName;
    if (lastName) data.lastName = lastName;
    if (department) data.department = department;
    if (newPassword) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const valid = await bcrypt.compare(currentPassword || '', user.password);
      if (!valid) return res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect' });
      data.password = await bcrypt.hash(newPassword, 12);
    }
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, firstName: true, lastName: true, email: true, role: true, department: true },
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// PATCH /users/:id — update role, department, active status
router.patch('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ success: false, message: 'Impossible de modifier votre propre compte ici' });
    const existing = await prisma.user.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    const { role, department, isActive } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { ...(role && { role }), ...(department !== undefined && { department }), ...(isActive !== undefined && { isActive }) },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, department: true, isActive: true },
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// DELETE /users/:id
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ success: false, message: 'Impossible de supprimer votre propre compte' });
    const existing = await prisma.user.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) { next(error); }
});

export default router;
