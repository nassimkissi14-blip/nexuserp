import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

const STATUS_FLOW = ['PENDING', 'PREPARING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'];

router.get('/', async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const where = {
      companyId: req.companyId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { reference: { contains: search, mode: 'insensitive' } },
          { destination: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        include: {
          customer: { select: { name: true } },
          carrier:  { select: { name: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.shipment.count({ where }),
    ]);
    res.json({ success: true, data: items, total });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.shipment.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: {
        customer: true,
        carrier: true,
      },
    });
    if (!item) return res.status(404).json({ success: false, message: 'Non trouvé' });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { customerId, carrierId, destination, weight, volume, notes } = req.body;
    if (!destination) return res.status(400).json({ success: false, message: 'Destination requise' });
    // Generate reference EXP-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.shipment.count({ where: { companyId: req.companyId } });
    const reference = `EXP-${dateStr}-${String(count + 1).padStart(4, '0')}`;
    const item = await prisma.shipment.create({
      data: {
        companyId: req.companyId,
        reference,
        customerId: customerId || null,
        carrierId: carrierId || null,
        destination,
        weight: weight ? parseFloat(weight) : null,
        volume: volume ? parseFloat(volume) : null,
        notes: notes || null,
        status: 'PENDING',
      },
      include: {
        customer: { select: { name: true } },
        carrier:  { select: { name: true, type: true } },
      },
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.shipment.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });
    const { customerId, carrierId, destination, weight, volume, notes, status } = req.body;
    const item = await prisma.shipment.update({
      where: { id: req.params.id },
      data: {
        ...(customerId   !== undefined && { customerId: customerId || null }),
        ...(carrierId    !== undefined && { carrierId:  carrierId  || null }),
        ...(destination  !== undefined && { destination }),
        ...(weight       !== undefined && { weight: weight ? parseFloat(weight) : null }),
        ...(volume       !== undefined && { volume: volume ? parseFloat(volume) : null }),
        ...(notes        !== undefined && { notes }),
        ...(status       !== undefined && { status }),
      },
      include: {
        customer: { select: { name: true } },
        carrier:  { select: { name: true, type: true } },
      },
    });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.shipment.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });
    const { status } = req.body;
    const item = await prisma.shipment.update({
      where: { id: req.params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(status === 'SHIPPED'   && { shippedAt:   new Date() }),
        ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
      },
      include: {
        customer: { select: { name: true } },
        carrier:  { select: { name: true, type: true } },
      },
    });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.patch('/:id/advance', async (req, res, next) => {
  try {
    const existing = await prisma.shipment.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });
    const idx = STATUS_FLOW.indexOf(existing.status);
    if (idx === -1 || idx === STATUS_FLOW.length - 1)
      return res.status(400).json({ success: false, message: 'Statut final atteint' });
    const nextStatus = STATUS_FLOW[idx + 1];
    const item = await prisma.shipment.update({
      where: { id: req.params.id },
      data: {
        status: nextStatus,
        ...(nextStatus === 'SHIPPED'    && { shippedAt:   new Date() }),
        ...(nextStatus === 'DELIVERED'  && { deliveredAt: new Date() }),
      },
      include: {
        customer: { select: { name: true } },
        carrier:  { select: { name: true, type: true } },
      },
    });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.shipment.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });
    await prisma.shipment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
