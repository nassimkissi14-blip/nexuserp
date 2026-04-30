/**
 * NexusERP — Universal QR Code Controller
 * Handles batch generation, listing, scan tracking, and ZIP export.
 */
import prisma from '../lib/prisma.js';
import { generateQr } from '../utils/qrGenerator.js';
import archiver from 'archiver';

/* ─── Entity resolvers ──────────────────────────────────────────────────────
   Each resolver receives { companyId, ids?, filters? } and returns an array
   of { referenceId, name, extraData } ready for QR generation.
─────────────────────────────────────────────────────────────────────────── */
const RESOLVERS = {
  employee: async ({ companyId, ids, department }) => {
    const where = { companyId, status: 'ACTIVE' };
    if (ids?.length)       where.id         = { in: ids };
    if (department)        where.department  = department;
    const rows = await prisma.employee.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, position: true, department: true, email: true },
    });
    return rows.map(e => ({
      referenceId: e.id,
      name:        `${e.firstName} ${e.lastName}`,
      extraData:   { position: e.position, department: e.department, email: e.email },
    }));
  },

  product: async ({ companyId, ids, category }) => {
    const where = { companyId, isActive: true };
    if (ids?.length) where.id       = { in: ids };
    if (category)    where.category = category;
    const rows = await prisma.product.findMany({
      where,
      select: { id: true, name: true, sku: true, category: true, stockQty: true, location: true },
    });
    return rows.map(p => ({
      referenceId: p.id,
      name:        p.name,
      extraData:   { sku: p.sku, category: p.category, stock: p.stockQty, location: p.location },
    }));
  },

  department: async ({ companyId, ids }) => {
    // Departments are not a separate table — derive unique ones from employees
    const rows = await prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: { department: true },
      distinct: ['department'],
    });
    const depts = rows.map(r => r.department).filter(Boolean);
    const filtered = ids?.length ? depts.filter(d => ids.includes(d)) : depts;
    return filtered.map(dept => ({
      referenceId: dept.toLowerCase().replace(/\s+/g, '-'),
      name:        dept,
      extraData:   { department: dept },
    }));
  },

  supplier: async ({ companyId, ids }) => {
    const where = { companyId };
    if (ids?.length) where.id = { in: ids };
    const rows = await prisma.supplier.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true, city: true },
    });
    return rows.map(s => ({
      referenceId: s.id,
      name:        s.name,
      extraData:   { email: s.email, phone: s.phone, city: s.city },
    }));
  },

  customer: async ({ companyId, ids }) => {
    const where = { companyId };
    if (ids?.length) where.id = { in: ids };
    const rows = await prisma.customer.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true, city: true },
    });
    return rows.map(c => ({
      referenceId: c.id,
      name:        c.name,
      extraData:   { email: c.email, phone: c.phone, city: c.city },
    }));
  },

  equipment: async ({ companyId, ids }) => {
    const where = { companyId };
    if (ids?.length) where.id = { in: ids };
    const rows = await prisma.equipment.findMany({
      where,
      select: { id: true, name: true, type: true, status: true, location: true, serialNumber: true },
    });
    return rows.map(eq => ({
      referenceId: eq.id,
      name:        eq.name,
      extraData:   { type: eq.type, status: eq.status, location: eq.location, serial: eq.serialNumber },
    }));
  },

  order: async ({ companyId, ids }) => {
    const where = { companyId };
    if (ids?.length) where.id = { in: ids };
    const rows = await prisma.order.findMany({
      where,
      select: { id: true, reference: true, status: true, totalAmount: true, customer: { select: { name: true } } },
    });
    return rows.map(o => ({
      referenceId: o.id,
      name:        o.reference,
      extraData:   { customer: o.customer?.name, status: o.status, total: o.totalAmount },
    }));
  },

  invoice: async ({ companyId, ids }) => {
    const where = { companyId };
    if (ids?.length) where.id = { in: ids };
    const rows = await prisma.invoice.findMany({
      where,
      select: { id: true, reference: true, status: true, totalAmount: true, customer: { select: { name: true } } },
    });
    return rows.map(inv => ({
      referenceId: inv.id,
      name:        inv.reference,
      extraData:   { customer: inv.customer?.name, status: inv.status, total: inv.totalAmount },
    }));
  },

  shipment: async ({ companyId, ids }) => {
    const where = { companyId };
    if (ids?.length) where.id = { in: ids };
    const rows = await prisma.shipment.findMany({
      where,
      select: { id: true, reference: true, status: true, destination: true, carrier: { select: { name: true } } },
    });
    return rows.map(s => ({
      referenceId: s.id,
      name:        s.reference,
      extraData:   { destination: s.destination, status: s.status, carrier: s.carrier?.name },
    }));
  },
};

/* ─── Controller methods ──────────────────────────────────────────────────── */

/**
 * POST /qr/generate-batch
 * Body: { type, ids?, department?, category?, regenerate? }
 */
export async function generateBatch(req, res, next) {
  try {
    const { companyId } = req;
    const { type, ids, department, category, regenerate = false } = req.body;

    if (!type || !RESOLVERS[type]) {
      return res.status(400).json({ success: false, message: `Type invalide. Valeurs acceptées: ${Object.keys(RESOLVERS).join(', ')}` });
    }

    // 1. Resolve entities
    const entities = await RESOLVERS[type]({ companyId, ids, department, category });
    if (!entities.length) {
      return res.status(404).json({ success: false, message: 'Aucune entité trouvée pour les critères donnés' });
    }

    // 2. If not regenerating, skip already-existing codes
    let toGenerate = entities;
    if (!regenerate) {
      const existing = await prisma.qrCode.findMany({
        where: { companyId, type, referenceId: { in: entities.map(e => e.referenceId) } },
        select: { referenceId: true },
      });
      const existingIds = new Set(existing.map(e => e.referenceId));
      toGenerate = entities.filter(e => !existingIds.has(e.referenceId));
    }

    // 3. Generate QR codes in parallel (batches of 20)
    const results = [];
    const BATCH   = 20;
    for (let i = 0; i < toGenerate.length; i += BATCH) {
      const chunk = toGenerate.slice(i, i + BATCH);
      const generated = await Promise.all(
        chunk.map(entity => generateQr({ type, ...entity }))
      );
      results.push(...generated.map((g, j) => ({ entity: chunk[j], ...g })));
    }

    // 4. Upsert into DB (if regenerate, delete old first)
    if (regenerate && ids?.length) {
      await prisma.qrCode.deleteMany({ where: { companyId, type, referenceId: { in: ids } } });
    }

    const records = await Promise.all(
      results.map(({ entity, payload, imageB64, uniqueCode }) =>
        prisma.qrCode.create({
          data: {
            companyId,
            type,
            referenceId: entity.referenceId,
            uniqueCode,
            qrData:     JSON.stringify(payload),
            qrImageB64: imageB64,
            label:      entity.name,
          },
        })
      )
    );

    res.status(201).json({
      success: true,
      message: `${records.length} QR code(s) générés`,
      data: records.map(r => ({
        id:          r.id,
        type:        r.type,
        referenceId: r.referenceId,
        uniqueCode:  r.uniqueCode,
        label:       r.label,
        qrImageB64:  r.qrImageB64,
        createdAt:   r.createdAt,
      })),
      skipped: entities.length - toGenerate.length,
    });
  } catch (err) { next(err); }
}

/**
 * GET /qr
 * Query: type?, page?, limit?, search?
 */
export async function listQrCodes(req, res, next) {
  try {
    const { companyId } = req;
    const { type, page = 1, limit = 50, search, referenceId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { companyId };
    if (type)        where.type        = type;
    if (referenceId) where.referenceId = referenceId;
    if (search)      where.label       = { contains: search, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      prisma.qrCode.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.qrCode.count({ where }),
    ]);

    res.json({ success: true, data: items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { next(err); }
}

/**
 * GET /qr/types
 * Returns available types with counts for the company.
 */
export async function getTypes(req, res, next) {
  try {
    const { companyId } = req;
    const groups = await prisma.qrCode.groupBy({
      by: ['type'],
      where: { companyId },
      _count: { id: true },
    });
    const counts = Object.fromEntries(groups.map(g => [g.type, g._count.id]));
    const types  = Object.keys(RESOLVERS).map(t => ({ type: t, count: counts[t] || 0 }));
    res.json({ success: true, data: types });
  } catch (err) { next(err); }
}

/**
 * GET /qr/entities/:type
 * Returns available entities (for selection UI).
 */
export async function getEntities(req, res, next) {
  try {
    const { companyId } = req;
    const { type } = req.params;
    const { department, category } = req.query;

    if (!RESOLVERS[type]) return res.status(400).json({ success: false, message: 'Type invalide' });

    const entities = await RESOLVERS[type]({ companyId, department, category });

    // Also mark which already have QR codes
    const existing = await prisma.qrCode.findMany({
      where: { companyId, type, referenceId: { in: entities.map(e => e.referenceId) } },
      select: { referenceId: true, uniqueCode: true },
    });
    const existingMap = Object.fromEntries(existing.map(e => [e.referenceId, e.uniqueCode]));

    res.json({
      success: true,
      data: entities.map(e => ({
        ...e,
        hasQr:      !!existingMap[e.referenceId],
        existingQr: existingMap[e.referenceId] || null,
      })),
    });
  } catch (err) { next(err); }
}

/**
 * GET /qr/scan/:uniqueCode
 * Public endpoint: returns QR data and increments scan counter.
 */
export async function scanQr(req, res, next) {
  try {
    const { uniqueCode } = req.params;
    const record = await prisma.qrCode.findUnique({ where: { uniqueCode } });
    if (!record) return res.status(404).json({ success: false, message: 'QR code non trouvé' });

    await prisma.qrCode.update({
      where: { uniqueCode },
      data:  { scans: { increment: 1 }, lastScannedAt: new Date() },
    });

    res.json({ success: true, data: { ...record, qrData: JSON.parse(record.qrData) } });
  } catch (err) { next(err); }
}

/**
 * DELETE /qr/:id
 */
export async function deleteQr(req, res, next) {
  try {
    const { companyId } = req;
    const existing = await prisma.qrCode.findFirst({ where: { id: req.params.id, companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });
    await prisma.qrCode.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}

/**
 * DELETE /qr/batch
 * Body: { ids: [] }
 */
export async function deleteBatch(req, res, next) {
  try {
    const { companyId } = req;
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ success: false, message: 'ids requis' });
    const { count } = await prisma.qrCode.deleteMany({ where: { companyId, id: { in: ids } } });
    res.json({ success: true, deleted: count });
  } catch (err) { next(err); }
}

/**
 * GET /qr/export/zip?type=&ids=
 * Streams a ZIP of PNG files to the client.
 */
export async function exportZip(req, res, next) {
  try {
    const { companyId } = req;
    const { type, ids } = req.query;

    const where = { companyId };
    if (type) where.type = type;
    if (ids)  where.id   = { in: ids.split(',') };

    const records = await prisma.qrCode.findMany({ where, take: 500 });
    if (!records.length) return res.status(404).json({ success: false, message: 'Aucun QR code trouvé' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="qrcodes-${type || 'all'}.zip"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    for (const record of records) {
      if (!record.qrImageB64) continue;
      // Strip data URL prefix: data:image/png;base64,<data>
      const base64 = record.qrImageB64.replace(/^data:image\/png;base64,/, '');
      const buf    = Buffer.from(base64, 'base64');
      const fname  = `${record.type}-${record.label?.replace(/[^a-z0-9]/gi, '_') || record.uniqueCode}.png`;
      archive.append(buf, { name: fname });
    }

    await archive.finalize();
  } catch (err) { next(err); }
}
