import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

/* Send in-app notification + socket event to every DIRECTOR/ADMIN/SUPER_ADMIN in the company */
async function notifyDirectors(io, companyId, { title, message, type = 'WARNING', link, excludeUserId } = {}) {
  const directors = await prisma.user.findMany({
    where: { companyId, role: { in: ['DIRECTOR', 'ADMIN', 'SUPER_ADMIN'] }, isActive: true },
    select: { id: true },
  });
  await Promise.all(
    directors
      .filter(u => u.id !== excludeUserId)
      .map(async u => {
        const notif = await prisma.notification.create({
          data: { userId: u.id, title, message, type, link },
        });
        io?.to(`user:${u.id}`).emit('notification:new', notif);
      })
  );
}

/* Modules autorisés par département */
const DEPT_MODULES = {
  // Direction / Admin → accès total
  'direction':              null,
  'direction generale':     null,
  'admin':                  null,
  'administration':         null,
  'informatique':           null,
  'it':                     null,

  // RH
  'rh':                     ['rh', 'communication'],
  'ressources humaines':    ['rh', 'communication'],
  'human resources':        ['rh', 'communication'],

  // Commercial / CRM / Ventes
  'commercial':             ['crm', 'sales', 'communication'],
  'crm':                    ['crm', 'sales', 'communication'],
  'ventes':                 ['crm', 'sales', 'communication'],
  'crm & ventes':           ['crm', 'sales', 'communication'],
  'commercial / crm':       ['crm', 'sales', 'communication'],
  'crm & commercial':       ['crm', 'sales', 'communication'],

  // Finance
  'finance':                ['finance', 'communication'],
  'finance / comptabilite': ['finance', 'communication'],
  'comptabilite':           ['finance', 'communication'],
  'comptabilité':           ['finance', 'communication'],

  // Production
  'production':             ['production', 'stock', 'communication'],

  // Maintenance
  'maintenance':            ['maintenance', 'communication'],

  // Stock / Logistique / Achats
  'stock':                  ['stock', 'communication'],
  'logistique':             ['stock', 'communication'],
  'stock / logistique':     ['stock', 'communication'],
  'achats':                 ['stock', 'communication'],

  // Projets
  'projets':                ['projects', 'communication'],
  'projects':               ['projects', 'communication'],

  // Communication seule
  'communication':          ['communication'],
};

function getAllowedSlugs(user) {
  if (['ADMIN', 'SUPER_ADMIN', 'DIRECTOR'].includes(user.role)) return null; // tout
  const key = (user.department || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire accents
    .trim();
  return Object.prototype.hasOwnProperty.call(DEPT_MODULES, key)
    ? DEPT_MODULES[key]
    : ['communication']; // département inconnu → accès minimal
}

router.get('/', authenticate, async (req, res, next) => {
  try {
    const companyModules = await prisma.companyModule.findMany({
      where: { companyId: req.companyId },
      include: { module: { include: { subModules: { orderBy: { sortOrder: 'asc' } } } } },
      orderBy: { module: { sortOrder: 'asc' } },
    });

    // Fetch enabled submodules for this company
    const companySubmodules = await prisma.companySubmodule.findMany({
      where: { companyId: req.companyId },
      select: { submoduleId: true, enabled: true },
    });
    const subEnabledMap = Object.fromEntries(companySubmodules.map(cs => [cs.submoduleId, cs.enabled]));

    const allowedSlugs = getAllowedSlugs(req.user);

    const result = companyModules
      .filter(cm => allowedSlugs === null || allowedSlugs.includes(cm.module.slug))
      .map((cm) => ({
        ...cm.module,
        enabled: cm.enabled,
        subModules: (cm.module.subModules || []).map(sm => ({
          ...sm,
          enabled: subEnabledMap[sm.id] !== undefined ? subEnabledMap[sm.id] : true,
        })),
      }));

    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// Must be before /:moduleId/toggle to avoid Express matching 'submodules' as moduleId
router.patch('/submodules/:submoduleId/toggle', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR'), async (req, res, next) => {
  try {
    const { submoduleId } = req.params;
    const existing = await prisma.companySubmodule.findUnique({
      where: { companyId_submoduleId: { companyId: req.companyId, submoduleId } },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Sous-module non trouvé' });

    const updated = await prisma.companySubmodule.update({
      where: { companyId_submoduleId: { companyId: req.companyId, submoduleId } },
      data: { enabled: !existing.enabled },
      include: { submodule: true },
    });

    res.json({ success: true, data: { submoduleId, enabled: updated.enabled } });
  } catch (error) { next(error); }
});

router.patch('/:moduleId/toggle', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR'), async (req, res, next) => {
  try {
    const { moduleId } = req.params;
    const existing = await prisma.companyModule.findUnique({
      where: { companyId_moduleId: { companyId: req.companyId, moduleId } },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Module non trouvé' });

    const updated = await prisma.companyModule.update({
      where: { companyId_moduleId: { companyId: req.companyId, moduleId } },
      data: { enabled: !existing.enabled },
      include: { module: true },
    });

    const io = req.app.get('io');
    io.to(`company:${req.companyId}`).emit('module:toggled', { moduleId, enabled: updated.enabled });

    const moduleName = updated.module?.name || moduleId;
    const action     = updated.enabled ? 'activé' : 'désactivé';
    await notifyDirectors(io, req.companyId, {
      title:          `Module ${action}`,
      message:        `${req.user.firstName} ${req.user.lastName} a ${action} le module "${moduleName}".`,
      type:           updated.enabled ? 'SUCCESS' : 'WARNING',
      link:           '/admin/modules',
      excludeUserId:  req.user.id,
    });

    res.json({ success: true, data: { moduleId, enabled: updated.enabled } });
  } catch (error) { next(error); }
});

export default router;