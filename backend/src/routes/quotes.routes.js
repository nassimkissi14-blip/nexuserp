import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { sendQuoteEmail } from '../services/email.service.js';

const router = Router();

async function generateRef(companyId, prefix) {
  const year = new Date().getFullYear();
  const count = await prisma.quote.count({ where: { companyId } });
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
}

async function generateInvRef(companyId) {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({ where: { companyId } });
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
}

// GET /quotes
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Auto-expire quotes past validUntil
    await prisma.quote.updateMany({
      where: { companyId: req.companyId, status: 'SENT', validUntil: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });

    const where = {
      companyId: req.companyId,
      ...(status && status !== 'ALL' && { status }),
      ...(search && { OR: [
        { reference: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ]}),
    };
    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, type: true } },
          items: { include: { product: { select: { name: true } } } },
        },
      }),
      prisma.quote.count({ where }),
    ]);
    res.json({ success: true, data: quotes, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
});

// POST /quotes - create quote
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const { customerId, issueDate, validUntil, notes, items = [] } = req.body;
    if (!customerId || !issueDate || !validUntil) {
      return res.status(400).json({ success: false, message: 'Client, date d\'émission et validité requis' });
    }
    const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId: req.companyId } });
    if (!customer) return res.status(404).json({ success: false, message: 'Client non trouvé' });

    const reference = await generateRef(req.companyId, 'DEV');
    const subtotal = items.reduce((s, it) => s + (Number(it.unitPrice) * Number(it.quantity) * (1 - (Number(it.discount) || 0) / 100)), 0);
    const taxRate = 19;
    const taxAmount = subtotal * (taxRate / 100);

    const quote = await prisma.quote.create({
      data: {
        companyId: req.companyId, customerId, reference, status: 'DRAFT',
        subtotal, taxRate, taxAmount, totalAmount: subtotal + taxAmount,
        issueDate: new Date(issueDate),
        validUntil: new Date(validUntil),
        notes: notes || null,
        items: items.length > 0 ? {
          create: items.map(it => ({
            productId: it.productId || null,
            description: it.description,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            discount: Number(it.discount) || 0,
            totalPrice: Number(it.unitPrice) * Number(it.quantity) * (1 - (Number(it.discount) || 0) / 100),
          })),
        } : undefined,
      },
      include: {
        customer: { select: { id: true, name: true, type: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });
    res.status(201).json({ success: true, data: quote });
  } catch (error) { next(error); }
});

// PATCH /quotes/:id - update status
router.patch('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const existing = await prisma.quote.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Devis non trouvé' });

    const { status, notes } = req.body;
    const data = {};
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes;

    const updated = await prisma.quote.update({
      where: { id: req.params.id }, data,
      include: {
        customer: { select: { id: true, name: true, type: true } },
        items: true,
      },
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// POST /quotes/:id/convert — devis accepté → génère facture automatiquement
router.post('/:id/convert', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { customer: { select: { name: true } } },
    });
    if (!quote) return res.status(404).json({ success: false, message: 'Devis non trouvé' });
    if (quote.status === 'ACCEPTED') {
      // Check if invoice already exists for this quote
      const existing = await prisma.invoice.findFirst({ where: { companyId: req.companyId, notes: { contains: quote.reference } } });
      if (existing) return res.status(400).json({ success: false, message: 'Facture déjà générée pour ce devis' });
    }

    const invoiceRef = await generateInvRef(req.companyId);
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 30);

    const [updatedQuote, invoice] = await prisma.$transaction(async (tx) => {
      const q = await tx.quote.update({
        where: { id: req.params.id },
        data: { status: 'ACCEPTED' },
        include: { customer: { select: { id: true, name: true, type: true } } },
      });
      const inv = await tx.invoice.create({
        data: {
          companyId: req.companyId,
          customerId: quote.customerId,
          reference: invoiceRef,
          status: 'DRAFT',
          subtotal: quote.subtotal,
          taxRate: quote.taxRate,
          taxAmount: quote.taxAmount,
          totalAmount: quote.totalAmount,
          issueDate: now,
          dueDate,
          notes: `Généré depuis devis ${quote.reference}`,
        },
        include: { customer: { select: { id: true, name: true, type: true } } },
      });
      // Update customer status to ACTIVE
      await tx.customer.update({ where: { id: quote.customerId }, data: { status: 'ACTIVE' } });
      return [q, inv];
    });

    res.json({ success: true, data: { quote: updatedQuote, invoice }, message: `Facture ${invoiceRef} générée automatiquement` });
  } catch (error) { next(error); }
});

// DELETE /quotes/:id
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const existing = await prisma.quote.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Devis non trouvé' });
    await prisma.quote.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Devis supprimé' });
  } catch (error) { next(error); }
});

// POST /quotes/:id/send-email
router.post('/:id/send-email', authenticate, authorize('ADMIN','SUPER_ADMIN','MANAGER','DIRECTOR'), async (req, res, next) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ success: false, message: 'Email destinataire requis' });

    const quote = await prisma.quote.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { customer: true, items: true, company: true },
    });
    if (!quote) return res.status(404).json({ success: false, message: 'Devis non trouvé' });

    const result = await sendQuoteEmail({ to, quote, company: quote.company });
    res.json({ success: true, message: 'Email envoyé', data: result });
  } catch (error) { next(error); }
});

export default router;
