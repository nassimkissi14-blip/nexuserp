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
 * Public endpoint: returns an animated HTML card instead of raw JSON.
 */
export async function scanQr(req, res, next) {
  try {
    const { uniqueCode } = req.params;
    const record = await prisma.qrCode.findUnique({ where: { uniqueCode } });
    if (!record) return res.status(404).send(renderQrPage(null, null, null));

    await prisma.qrCode.update({
      where: { uniqueCode },
      data:  { scans: { increment: 1 }, lastScannedAt: new Date() },
    });

    const qrData = JSON.parse(record.qrData);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderQrPage(record.type, record.label, qrData));
  } catch (err) { next(err); }
}

function renderQrPage(type, label, data) {
  const TYPE_CONFIG = {
    employee:  { icon: '👤', color: '#6366f1', bg: '#eef2ff', label: 'Employé' },
    product:   { icon: '📦', color: '#f59e0b', bg: '#fffbeb', label: 'Produit' },
    equipment: { icon: '🔧', color: '#10b981', bg: '#ecfdf5', label: 'Équipement' },
    supplier:  { icon: '🏭', color: '#3b82f6', bg: '#eff6ff', label: 'Fournisseur' },
    customer:  { icon: '🤝', color: '#ec4899', bg: '#fdf2f8', label: 'Client' },
    order:     { icon: '📋', color: '#8b5cf6', bg: '#f5f3ff', label: 'Commande' },
    invoice:   { icon: '🧾', color: '#ef4444', bg: '#fef2f2', label: 'Facture' },
    department:{ icon: '🏢', color: '#06b6d4', bg: '#ecfeff', label: 'Département' },
  };

  if (!data) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>QR Invalide</title>
    <style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f1f5f9;font-family:system-ui,sans-serif}
    .card{background:#fff;border-radius:24px;padding:48px 40px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.12);max-width:360px;width:90%}
    .icon{font-size:64px;margin-bottom:16px}.title{font-size:22px;font-weight:700;color:#ef4444}.sub{color:#94a3b8;margin-top:8px}</style></head>
    <body><div class="card"><div class="icon">❌</div><div class="title">QR Code invalide</div><div class="sub">Ce code n'existe pas ou a été supprimé.</div></div></body></html>`;
  }

  const cfg   = TYPE_CONFIG[type] || { icon: '🔖', color: '#6366f1', bg: '#eef2ff', label: type || 'Inconnu' };
  const name  = label || data?.name || '—';
  const extra = data?.extraData || {};

  const rows = Object.entries(extra)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => {
      const labels = {
        position: 'Poste', department: 'Département', email: 'Email',
        phone: 'Téléphone', sku: 'Référence', category: 'Catégorie',
        stock: 'Stock', location: 'Emplacement', type: 'Type',
        status: 'Statut', serial: 'N° Série', city: 'Ville',
        customer: 'Client', total: 'Montant',
      };
      return `<tr><td>${labels[k] || k}</td><td><strong>${v}</strong></td></tr>`;
    }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${name} — NexusERP</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;
      background:linear-gradient(135deg,${cfg.color}22 0%,${cfg.bg} 100%);
      font-family:system-ui,-apple-system,sans-serif;padding:20px}
    .card{background:#fff;border-radius:28px;padding:0;max-width:380px;width:100%;
      box-shadow:0 24px 64px rgba(0,0,0,.14);overflow:hidden;
      animation:slideUp .5s cubic-bezier(.22,1,.36,1) both}
    @keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
    .header{background:linear-gradient(135deg,${cfg.color},${cfg.color}cc);
      padding:40px 32px 32px;text-align:center;position:relative}
    .pulse{width:90px;height:90px;border-radius:50%;background:rgba(255,255,255,.2);
      display:flex;align-items:center;justify-content:center;margin:0 auto 16px;
      font-size:44px;animation:pulse 2s ease-in-out infinite}
    @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.4)}
      50%{box-shadow:0 0 0 16px rgba(255,255,255,.0)}}
    .badge{display:inline-block;background:rgba(255,255,255,.25);color:#fff;
      font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
      padding:4px 12px;border-radius:20px;margin-bottom:12px}
    .name{font-size:26px;font-weight:800;color:#fff;letter-spacing:-.5px;line-height:1.2}
    .body{padding:28px 28px 32px}
    table{width:100%;border-collapse:collapse}
    tr{border-bottom:1px solid #f1f5f9}
    tr:last-child{border-bottom:none}
    td{padding:11px 4px;font-size:14px;color:#64748b;vertical-align:top}
    td:first-child{width:44%;color:#94a3b8;font-size:13px}
    td strong{color:#1e293b;font-weight:600}
    .footer{text-align:center;padding:0 28px 24px;color:#cbd5e1;font-size:12px}
    .check{width:28px;height:28px;background:${cfg.color};border-radius:50%;
      display:inline-flex;align-items:center;justify-content:center;
      color:#fff;font-size:14px;margin-right:6px;vertical-align:middle}
    .verified{display:flex;align-items:center;justify-content:center;
      background:${cfg.bg};border-radius:12px;padding:10px 16px;
      color:${cfg.color};font-size:13px;font-weight:600;margin-bottom:16px}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">${cfg.label}</div>
      <div class="pulse">${cfg.icon}</div>
      <div class="name">${name}</div>
    </div>
    <div class="body">
      <div class="verified"><span class="check">✓</span> Identité vérifiée — NexusERP</div>
      ${rows ? `<table>${rows}</table>` : ''}
    </div>
    <div class="footer">Scanné le ${new Date().toLocaleDateString('fr-DZ', { day:'2-digit', month:'long', year:'numeric' })}</div>
  </div>
</body>
</html>`;
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
