import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { sendInvoiceEmail } from '../services/email.service.js';

const router = Router();

async function generateReference(companyId) {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({ where: { companyId } });
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
}

// GET /invoices
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Auto-mark overdue invoices (DRAFT and SENT with past due date)
    await prisma.invoice.updateMany({
      where: { companyId: req.companyId, status: { in: ['DRAFT', 'SENT'] }, dueDate: { lt: new Date() } },
      data: { status: 'OVERDUE' },
    });

    const where = {
      companyId: req.companyId,
      ...(status && status !== 'ALL' && { status }),
      ...(req.query.customerId && { customerId: req.query.customerId }),
      ...(search && { OR: [
        { reference: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ]}),
    };
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, type: true } },
          order: { select: { id: true, reference: true } },
          items: true,
        },
      }),
      prisma.invoice.count({ where }),
    ]);
    res.json({ success: true, data: invoices, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
});

// GET /invoices/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: {
        customer: true,
        order: { include: { items: { include: { product: { select: { name: true, sku: true } } } } } },
      },
    });
    if (!invoice) return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    res.json({ success: true, data: invoice });
  } catch (error) { next(error); }
});

// POST /invoices - create invoice with optional line items
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const { customerId, orderId, subtotal, taxRate = 19, issueDate, dueDate, notes, items } = req.body;

    if (!customerId || !issueDate || !dueDate) {
      return res.status(400).json({ success: false, message: 'Client, date d\'émission et date d\'échéance requis' });
    }

    const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId: req.companyId } });
    if (!customer) return res.status(404).json({ success: false, message: 'Client non trouvé' });

    const reference = await generateReference(req.companyId);

    // If line items provided, compute subtotal from them; otherwise use provided subtotal
    let sub;
    let lineItems = [];
    if (Array.isArray(items) && items.length > 0) {
      lineItems = items.map(item => ({
        description: item.description,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        totalPrice: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
      }));
      sub = lineItems.reduce((acc, item) => acc + item.totalPrice, 0);
    } else {
      if (!subtotal) return res.status(400).json({ success: false, message: 'Montant HT ou lignes de facturation requis' });
      sub = Number(subtotal);
    }

    const tax = sub * (Number(taxRate) / 100);
    const initialStatus = new Date(dueDate) < new Date() ? 'OVERDUE' : 'DRAFT';

    const invoice = await prisma.invoice.create({
      data: {
        companyId: req.companyId,
        customerId,
        orderId: orderId || null,
        reference,
        status: initialStatus,
        subtotal: sub,
        taxRate: Number(taxRate),
        taxAmount: tax,
        totalAmount: sub + tax,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        notes: notes || null,
        ...(lineItems.length > 0 && {
          items: { create: lineItems },
        }),
      },
      include: {
        customer: { select: { id: true, name: true, type: true } },
        items: true,
      },
    });
    res.status(201).json({ success: true, data: invoice });
  } catch (error) { next(error); }
});

// PATCH /invoices/:id - update status or fields
router.patch('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Facture non trouvée' });

    const { status, notes, dueDate } = req.body;
    const data = {};
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes;
    if (dueDate !== undefined) data.dueDate = new Date(dueDate);

    const updated = await prisma.invoice.update({
      where: { id: req.params.id }, data,
      include: { customer: { select: { id: true, name: true, type: true } } },
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// POST /invoices/:id/pay — marquer payé + créer entrées trésorerie + journal comptable
router.post('/:id/pay', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { customer: { select: { name: true } } },
    });
    if (!invoice) return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    if (invoice.status === 'PAID') return res.status(400).json({ success: false, message: 'Facture déjà payée' });

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // 1. Marquer facture payée
      await tx.invoice.update({
        where: { id: req.params.id },
        data: { status: 'PAID', paidAt: now },
      });

      // 2. Créer entrée trésorerie (crédit = encaissement)
      await tx.treasuryEntry.create({
        data: {
          companyId: req.companyId,
          type: 'CREDIT',
          amount: invoice.totalAmount,
          description: `Paiement facture ${invoice.reference} — ${invoice.customer.name}`,
          reference: invoice.reference,
          category: 'VENTES',
          date: now,
        },
      });

      // 3. Créer écriture journal comptable (vente → débit client, crédit produit)
      const jRef = `JV-${invoice.reference}`;
      await tx.journalEntry.create({
        data: {
          companyId: req.companyId,
          reference: jRef,
          date: now,
          description: `Règlement facture ${invoice.reference} — ${invoice.customer.name}`,
          totalDebit: invoice.totalAmount,
          totalCredit: invoice.totalAmount,
          isBalanced: true,
          lines: {
            create: [
              { accountCode: '512', accountLabel: 'Banque', debit: invoice.totalAmount, credit: 0 },
              { accountCode: '411', accountLabel: 'Clients', debit: 0, credit: invoice.totalAmount },
            ],
          },
        },
      });

      // 4. Mettre à jour statut client → ACTIVE
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: { status: 'ACTIVE' },
      });
    });

    const updated = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { customer: { select: { id: true, name: true, type: true } } },
    });
    res.json({ success: true, data: updated, message: 'Facture marquée payée — trésorerie et journal mis à jour' });
  } catch (error) { next(error); }
});

// DELETE /invoices/:id - cancel (soft delete)
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    if (existing.status === 'PAID') return res.status(400).json({ success: false, message: 'Impossible d\'annuler une facture déjà payée' });
    if (existing.status === 'CANCELLED') return res.status(400).json({ success: false, message: 'Facture déjà annulée' });
    await prisma.invoice.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
    res.json({ success: true, message: 'Facture annulée' });
  } catch (error) { next(error); }
});

// POST /invoices/:id/send-email
router.post('/:id/send-email', authenticate, authorize('ADMIN','SUPER_ADMIN','MANAGER','DIRECTOR'), async (req, res, next) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ success: false, message: 'Email destinataire requis' });

    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { customer: true, items: true, company: true },
    });
    if (!invoice) return res.status(404).json({ success: false, message: 'Facture non trouvée' });

    const result = await sendInvoiceEmail({ to, invoice, company: invoice.company });
    res.json({ success: true, message: 'Email envoyé', data: result });
  } catch (error) { next(error); }
});

export default router;
