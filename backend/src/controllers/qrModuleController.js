/**
 * NexusERP — QR Module Controller
 * Handles department/sub-department based QR batch generation per module.
 * Extends (not replaces) the base qrController.
 */
import prisma from '../lib/prisma.js';
import { generateQr } from '../utils/qrGenerator.js';

/* ─── Module entity fetchers ─────────────────────────────────────────────────
   Each fetcher receives { companyId, deptName, subDeptName, subDeptFilter }
   and returns items ready for QR generation.
─────────────────────────────────────────────────────────────────────────── */
const MODULE_FETCHERS = {
  employee: async ({ companyId, deptName, subDeptName, subDeptFilter }) => {
    const where = { companyId, status: 'ACTIVE' };
    // Filter by department name (matches employee.department string)
    if (deptName) where.department = { contains: deptName, mode: 'insensitive' };
    // Filter by sub-dept filter value (matches employee.position)
    if (subDeptFilter) where.position = { contains: subDeptFilter, mode: 'insensitive' };

    const rows = await prisma.employee.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, position: true, department: true, email: true, phone: true },
      orderBy: [{ department: 'asc' }, { lastName: 'asc' }],
    });

    return rows.map(e => ({
      referenceId: e.id,
      name:        `${e.firstName} ${e.lastName}`,
      extraData:   {
        position:      e.position,
        department:    e.department,
        sub_department: subDeptName || null,
        email:         e.email,
        phone:         e.phone,
      },
    }));
  },

  product: async ({ companyId, deptName, subDeptName, subDeptFilter }) => {
    const where = { companyId, isActive: true };
    // For products: department = category, sub-dept = location group
    if (deptName)      where.category = { contains: deptName,      mode: 'insensitive' };
    if (subDeptFilter) where.location  = { contains: subDeptFilter, mode: 'insensitive' };

    const rows = await prisma.product.findMany({
      where,
      select: { id: true, name: true, sku: true, category: true, stockQty: true, location: true, unit: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return rows.map(p => ({
      referenceId: p.id,
      name:        p.name,
      extraData:   {
        sku:           p.sku,
        category:      p.category,
        sub_department: subDeptName || null,
        stock:         p.stockQty,
        unit:          p.unit,
        location:      p.location,
      },
    }));
  },

  equipment: async ({ companyId, deptName, subDeptName, subDeptFilter }) => {
    const where = { companyId };
    if (deptName)      where.type     = { contains: deptName,      mode: 'insensitive' };
    if (subDeptFilter) where.location = { contains: subDeptFilter, mode: 'insensitive' };

    const rows = await prisma.equipment.findMany({
      where,
      select: { id: true, name: true, type: true, status: true, location: true, serialNumber: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return rows.map(eq => ({
      referenceId: eq.id,
      name:        eq.name,
      extraData:   {
        type:          eq.type,
        status:        eq.status,
        sub_department: subDeptName || null,
        location:      eq.location,
        serial:        eq.serialNumber,
      },
    }));
  },

  supplier: async ({ companyId, deptName, subDeptFilter }) => {
    const where = { companyId };
    if (deptName)      where.city     = { contains: deptName,      mode: 'insensitive' };
    if (subDeptFilter) where.category = { contains: subDeptFilter, mode: 'insensitive' };

    const rows = await prisma.supplier.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true, city: true },
      orderBy: { name: 'asc' },
    });

    return rows.map(s => ({
      referenceId: s.id,
      name:        s.name,
      extraData:   { email: s.email, phone: s.phone, city: s.city },
    }));
  },

  customer: async ({ companyId, deptName, subDeptFilter }) => {
    const where = { companyId };
    if (deptName)      where.city   = { contains: deptName,      mode: 'insensitive' };
    if (subDeptFilter) where.sector = { contains: subDeptFilter, mode: 'insensitive' };

    const rows = await prisma.customer.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true, city: true },
      orderBy: { name: 'asc' },
    });

    return rows.map(c => ({
      referenceId: c.id,
      name:        c.name,
      extraData:   { email: c.email, phone: c.phone, city: c.city },
    }));
  },
};

export const SUPPORTED_MODULES = Object.keys(MODULE_FETCHERS);

/* ═══════════════════════════════════════════════════════════════════════════
   DEPARTMENT CRUD
═══════════════════════════════════════════════════════════════════════════ */

// GET /qr/departments?module=
export async function listDepartments(req, res, next) {
  try {
    const { companyId } = req;
    const { module }    = req.query;
    const where         = { companyId };
    if (module) where.module = module;

    const depts = await prisma.qrDepartment.findMany({
      where,
      include: { subDepts: { orderBy: { name: 'asc' } }, _count: { select: { qrCodes: true } } },
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, data: depts });
  } catch (err) { next(err); }
}

// POST /qr/departments
export async function createDepartment(req, res, next) {
  try {
    const { companyId } = req;
    const { module, name, color, icon, filterField } = req.body;

    if (!module || !name)          return res.status(400).json({ success: false, message: 'module et name requis' });
    if (!SUPPORTED_MODULES.includes(module))
      return res.status(400).json({ success: false, message: `Module invalide. Valeurs: ${SUPPORTED_MODULES.join(', ')}` });

    const dept = await prisma.qrDepartment.create({
      data: { companyId, module, name, color: color || '#6366f1', icon: icon || '🏢', filterField: filterField || null },
    });
    res.status(201).json({ success: true, data: dept });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, message: 'Ce département existe déjà pour ce module' });
    next(err);
  }
}

// PATCH /qr/departments/:id
export async function updateDepartment(req, res, next) {
  try {
    const { companyId } = req;
    const existing = await prisma.qrDepartment.findFirst({ where: { id: req.params.id, companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });

    const { name, color, icon, filterField } = req.body;
    const dept = await prisma.qrDepartment.update({
      where: { id: req.params.id },
      data:  { ...(name && { name }), ...(color && { color }), ...(icon && { icon }), filterField: filterField ?? existing.filterField },
    });
    res.json({ success: true, data: dept });
  } catch (err) { next(err); }
}

// DELETE /qr/departments/:id
export async function deleteDepartment(req, res, next) {
  try {
    const { companyId } = req;
    const existing = await prisma.qrDepartment.findFirst({ where: { id: req.params.id, companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });
    await prisma.qrDepartment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-DEPARTMENT CRUD
═══════════════════════════════════════════════════════════════════════════ */

// GET /qr/departments/:deptId/sub-depts
export async function listSubDepts(req, res, next) {
  try {
    const { companyId } = req;
    const dept = await prisma.qrDepartment.findFirst({ where: { id: req.params.deptId, companyId } });
    if (!dept) return res.status(404).json({ success: false, message: 'Département non trouvé' });

    const subs = await prisma.qrSubDept.findMany({
      where: { departmentId: req.params.deptId, companyId },
      include: { _count: { select: { qrCodes: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: subs });
  } catch (err) { next(err); }
}

// POST /qr/departments/:deptId/sub-depts
export async function createSubDept(req, res, next) {
  try {
    const { companyId } = req;
    const { name, filterValue } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name requis' });

    const dept = await prisma.qrDepartment.findFirst({ where: { id: req.params.deptId, companyId } });
    if (!dept) return res.status(404).json({ success: false, message: 'Département non trouvé' });

    const sub = await prisma.qrSubDept.create({
      data: { companyId, departmentId: req.params.deptId, name, filterValue: filterValue || null },
    });
    res.status(201).json({ success: true, data: sub });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, message: 'Ce sous-département existe déjà' });
    next(err);
  }
}

// DELETE /qr/sub-depts/:id
export async function deleteSubDept(req, res, next) {
  try {
    const { companyId } = req;
    const existing = await prisma.qrSubDept.findFirst({ where: { id: req.params.id, companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });
    await prisma.qrSubDept.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUTO-DISCOVER: derive departments from existing data
═══════════════════════════════════════════════════════════════════════════ */

// GET /qr/discover/:module
// Returns distinct field values that can seed departments (e.g., all employee.department values)
export async function discoverDepartments(req, res, next) {
  try {
    const { companyId } = req;
    const { module }    = req.params;

    let values = [];
    if (module === 'employee') {
      const rows = await prisma.employee.findMany({
        where: { companyId, status: 'ACTIVE', department: { not: null } },
        select: { department: true, position: true },
        distinct: ['department'],
      });
      values = [...new Set(rows.map(r => r.department).filter(Boolean))].sort();
    } else if (module === 'product') {
      const rows = await prisma.product.findMany({
        where: { companyId, isActive: true, category: { not: null } },
        select: { category: true },
        distinct: ['category'],
      });
      values = [...new Set(rows.map(r => r.category).filter(Boolean))].sort();
    } else if (module === 'equipment') {
      const rows = await prisma.equipment.findMany({
        where: { companyId },
        select: { type: true },
        distinct: ['type'],
      });
      values = [...new Set(rows.map(r => r.type).filter(Boolean))].sort();
    }

    res.json({ success: true, data: values });
  } catch (err) { next(err); }
}

// POST /qr/discover/:module/import
// Creates departments from discovered values (idempotent upsert)
export async function importDiscovered(req, res, next) {
  try {
    const { companyId } = req;
    const { module }    = req.params;
    const { values }    = req.body; // array of name strings

    if (!values?.length) return res.status(400).json({ success: false, message: 'values requis' });

    const ICON_MAP = { employee: '👤', product: '📦', equipment: '⚙️', supplier: '🏭', customer: '🤝' };
    const COLOR_MAP = { employee: '#6366f1', product: '#f59e0b', equipment: '#ef4444', supplier: '#10b981', customer: '#8b5cf6' };

    const created = [];
    for (const name of values) {
      const existing = await prisma.qrDepartment.findFirst({ where: { companyId, module, name } });
      if (!existing) {
        const dept = await prisma.qrDepartment.create({
          data: { companyId, module, name, icon: ICON_MAP[module] || '🏢', color: COLOR_MAP[module] || '#6366f1' },
        });
        created.push(dept);
      }
    }
    res.json({ success: true, created: created.length, data: created });
  } catch (err) { next(err); }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODULE BATCH GENERATION
═══════════════════════════════════════════════════════════════════════════ */

// POST /qr/module-batch
export async function generateModuleBatch(req, res, next) {
  try {
    const { companyId } = req;
    const { module, department_id, sub_department_id, regenerate = false } = req.body;

    if (!module) return res.status(400).json({ success: false, message: 'module requis' });
    if (!MODULE_FETCHERS[module]) {
      return res.status(400).json({ success: false, message: `Module invalide. Valeurs: ${SUPPORTED_MODULES.join(', ')}` });
    }

    // Resolve department / sub-department info
    let dept    = null;
    let subDept = null;

    if (department_id) {
      dept = await prisma.qrDepartment.findFirst({ where: { id: department_id, companyId } });
      if (!dept) return res.status(404).json({ success: false, message: 'Département non trouvé' });
    }
    if (sub_department_id) {
      subDept = await prisma.qrSubDept.findFirst({ where: { id: sub_department_id, companyId } });
      if (!subDept) return res.status(404).json({ success: false, message: 'Sous-département non trouvé' });
    }

    // Fetch entities
    const entities = await MODULE_FETCHERS[module]({
      companyId,
      deptName:     dept?.name     || null,
      subDeptName:  subDept?.name  || null,
      subDeptFilter: subDept?.filterValue || dept?.filterField || null,
    });

    if (!entities.length) {
      return res.status(404).json({ success: false, message: 'Aucune entité trouvée pour ce département' });
    }

    // If regenerating, delete old QR codes for this scope
    if (regenerate) {
      const where = { companyId, type: module };
      if (department_id)     where.departmentId    = department_id;
      if (sub_department_id) where.subDepartmentId = sub_department_id;
      await prisma.qrCode.deleteMany({ where });
    } else {
      // Skip already-existing
      const existing = await prisma.qrCode.findMany({
        where: { companyId, type: module, referenceId: { in: entities.map(e => e.referenceId) } },
        select: { referenceId: true },
      });
      const existingSet = new Set(existing.map(e => e.referenceId));
      const skipped = entities.filter(e => existingSet.has(e.referenceId)).length;
      // Only generate missing ones
      const toGenerate = entities.filter(e => !existingSet.has(e.referenceId));

      if (!toGenerate.length) {
        return res.json({ success: true, message: 'Tous les QR existent déjà', generated: 0, skipped, data: [] });
      }

      return await _doGenerate({ companyId, module, entities: toGenerate, dept, subDept, skipped, res, req });
    }

    return await _doGenerate({ companyId, module, entities, dept, subDept, skipped: 0, res, req });
  } catch (err) { next(err); }
}

async function _doGenerate({ companyId, module, entities, dept, subDept, skipped, res, req }) {
  const BATCH   = 20;
  const results = [];
  const baseUrl = req ? `${req.protocol}://${req.get('host')}` : 'http://localhost:3001';

  for (let i = 0; i < entities.length; i += BATCH) {
    const chunk = entities.slice(i, i + BATCH);
    const generated = await Promise.all(
      chunk.map(entity => generateQr({
        type: module,
        referenceId: entity.referenceId,
        name:        entity.name,
        baseUrl,
        extraData:   {
          ...entity.extraData,
          department:     dept?.name    || null,
          sub_department: subDept?.name || null,
        },
      }))
    );
    results.push(...generated.map((g, j) => ({ entity: chunk[j], ...g })));
  }

  const records = await Promise.all(
    results.map(({ entity, payload, imageB64, uniqueCode }) =>
      prisma.qrCode.create({
        data: {
          companyId,
          type:            module,
          referenceId:     entity.referenceId,
          uniqueCode,
          qrData:          JSON.stringify(payload),
          qrImageB64:      imageB64,
          label:           entity.name,
          departmentId:    dept?.id    || null,
          subDepartmentId: subDept?.id || null,
        },
      })
    )
  );

  res.status(201).json({
    success:   true,
    message:   `${records.length} QR code(s) générés`,
    generated: records.length,
    skipped,
    department:     dept?.name    || null,
    sub_department: subDept?.name || null,
    data: records.map(r => ({
      id:             r.id,
      type:           r.type,
      referenceId:    r.referenceId,
      uniqueCode:     r.uniqueCode,
      label:          r.label,
      qrImageB64:     r.qrImageB64,
      departmentId:   r.departmentId,
      subDepartmentId:r.subDepartmentId,
      createdAt:      r.createdAt,
    })),
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATS
═══════════════════════════════════════════════════════════════════════════ */

// GET /qr/module-stats
export async function moduleStats(req, res, next) {
  try {
    const { companyId } = req;

    const depts = await prisma.qrDepartment.findMany({
      where: { companyId },
      include: {
        subDepts: {
          include: { _count: { select: { qrCodes: true } } },
        },
        _count: { select: { qrCodes: true } },
      },
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });

    res.json({ success: true, data: depts });
  } catch (err) { next(err); }
}
