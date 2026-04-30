import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { status, customerId, page = 1, limit = 50 } = req.query;
    const where = {
      companyId: req.companyId,
      ...(status && { status }),
      ...(customerId && { customerId }),
    };
    const [items, total] = await Promise.all([
      prisma.creditNote.findMany({
        where,
        include: { customer: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.creditNote.count({ where }),
    ]);
    res.json({ success: true, data: items, total });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.creditNote.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { customer: true },
    });
    if (!item) return res.status(404).json({ success: false, message: 'Non trouvé' });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { customerId, invoiceRef, amount, reason, issuedAt } = req.body;
    if (!customerId || !amount || !issuedAt)
      return res.status(400).json({ success: false, message: 'Champs requis manquants' });
    const cust = await prisma.customer.findFirst({ where: { id: customerId, companyId: req.companyId } });
    if (!cust) return res.status(400).json({ success: false, message: 'Client invalide' });
    const count = await prisma.creditNote.count({ where: { companyId: req.companyId } });
    const year  = new Date().getFullYear();
    const reference = `AV-${year}-${String(count + 1).padStart(4, '0')}`;
    const item = await prisma.creditNote.create({
      data: {
        companyId: req.companyId,
        customerId,
        reference,
        invoiceRef: invoiceRef || null,
        amount: parseFloat(amount),
        reason: reason || null,
        status: 'DRAFT',
        issuedAt: new Date(issuedAt),
      },
      include: { customer: { select: { name: true, email: true } } },
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.creditNote.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });
    const { invoiceRef, amount, reason, issuedAt, status } = req.body;
    const item = await prisma.creditNote.update({
      where: { id: req.params.id },
      data: {
        ...(invoiceRef !== undefined && { invoiceRef }),
        ...(amount    !== undefined && { amount: parseFloat(amount) }),
        ...(reason    !== undefined && { reason }),
        ...(issuedAt  !== undefined && { issuedAt: new Date(issuedAt) }),
        ...(status    !== undefined && { status }),
      },
      include: { customer: { select: { name: true, email: true } } },
    });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.creditNote.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });
    await prisma.creditNote.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
