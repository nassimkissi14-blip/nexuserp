import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authService, authenticate } from '../middleware/auth.middleware.js';

const router = Router();

async function notifyLoginToDirectors(io, user) {
  if (!user?.companyId) return;
  const directors = await prisma.user.findMany({
    where: { companyId: user.companyId, role: { in: ['DIRECTOR', 'ADMIN', 'SUPER_ADMIN'] }, isActive: true },
    select: { id: true },
  });
  const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  await Promise.all(
    directors
      .filter(u => u.id !== user.id)
      .map(async u => {
        const notif = await prisma.notification.create({
          data: {
            userId:  u.id,
            title:   'Nouvelle connexion',
            message: `${user.firstName} ${user.lastName} (${user.role}) s'est connecté à ${now}.`,
            type:    'INFO',
            link:    '/admin/logs',
          },
        });
        io?.to(`user:${u.id}`).emit('notification:new', notif);
      })
  );
}

/* Modules accessibles par département — communication toujours incluse */
const DEPT_MODULES = {
  direction:    ['rh','crm','sales','stock','finance','projects','communication','admin','production','maintenance'],
  admin:        ['rh','crm','sales','stock','finance','projects','communication','admin','production','maintenance'],
  rh:           ['rh','communication'],
  commercial:   ['crm','sales','communication'],
  crm:          ['crm','sales','communication'],
  ventes:       ['crm','sales','communication'],
  finance:      ['finance','communication'],
  comptabilite: ['finance','communication'],
  production:   ['production','stock','communication'],
  maintenance:  ['maintenance','communication'],
  stock:        ['stock','communication'],
  logistique:   ['stock','communication'],
  achats:       ['stock','communication'],
  projets:      ['projects','communication'],
  it:           ['admin','communication'],
  informatique: ['admin','communication'],
};

function getModulesForDept(department) {
  if (!department) return ['communication'];
  const key = department.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  return DEPT_MODULES[key] || ['communication'];
}

router.post('/register', async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, companyName, role, department } = req.body;
    const io = req.app.get('io');

    // Look up company by name — if it exists the user is joining an existing org
    let company = companyName?.trim()
      ? await prisma.company.findFirst({ where: { name: { equals: companyName.trim(), mode: 'insensitive' } } })
      : null;
    const isFirstUser = !company;

    if (isFirstUser) {
      company = await prisma.company.create({
        data: { name: companyName?.trim() || `${firstName} ${lastName} — Entreprise`, email, subscriptionPlan: 'FREE' },
      });
      const allowedSlugs = getModulesForDept(department);
      const allModules = await prisma.module.findMany({ include: { subModules: true } });
      for (const mod of allModules) {
        const enabled = allowedSlugs.includes(mod.slug);
        await prisma.companyModule.create({ data: { companyId: company.id, moduleId: mod.id, enabled } });
        for (const sub of mod.subModules) {
          await prisma.companySubmodule.create({ data: { companyId: company.id, submoduleId: sub.id, enabled } });
        }
      }
    }

    // First user of a company → ADMIN + immediately active
    // Subsequent users → OPERATOR + pending approval (isActive: false)
    const userRole   = isFirstUser ? (role || 'ADMIN') : 'OPERATOR';
    const userActive = isFirstUser;

    const user = await authService.register({
      firstName, lastName, email, password,
      role: userRole, department, companyId: company.id,
      isActive: userActive,
    });

    // Notify HR & admins of pending new user
    if (!isFirstUser) {
      const hrManagers = await prisma.user.findMany({
        where: {
          companyId: company.id,
          isActive: true,
          OR: [
            { role: { in: ['ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'] } },
            { department: { contains: 'RH', mode: 'insensitive' } },
            { department: { contains: 'Ressources', mode: 'insensitive' } },
            { department: { contains: 'Human', mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      await Promise.all(hrManagers.map(async (u) => {
        const notif = await prisma.notification.create({
          data: {
            userId: u.id,
            title: '👤 Nouvelle demande d\'accès',
            message: `${firstName} ${lastName} (${department || 'sans département'}) a créé un compte et attend votre approbation.`,
            type: 'INFO',
            link: '/rh/pending',
          },
        });
        io?.to(`user:${u.id}`).emit('notification:new', notif);
      }));
    }

    res.status(201).json({
      success: true,
      data: user,
      pending: !isFirstUser,
      message: isFirstUser
        ? 'Compte créé avec succès.'
        : 'Votre demande a été envoyée. Un responsable RH doit valider votre accès avant que vous puissiez vous connecter.',
    });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
    const result = await authService.login(email, password);

    // Notify directors of this login (fire-and-forget)
    const { user } = result;
    notifyLoginToDirectors(req.app.get('io'), user).catch(() => {});

    res.json({ success: true, data: result });
  } catch (error) { res.status(401).json({ success: false, message: error.message }); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'refreshToken requis' });
    const result = await authService.refreshToken(refreshToken);
    res.json({ success: true, data: result });
  } catch (error) { res.status(401).json({ success: false, message: 'Token invalide' }); }
});

router.get('/me', authenticate, async (req, res) => {
  const full = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { company: { select: { id: true, name: true, email: true, phone: true, address: true, subscriptionPlan: true } } },
  });
  const { password: _, ...user } = full;
  res.json({ success: true, data: user });
});

router.post('/logout', authenticate, (req, res) => {
  res.json({ success: true, message: 'Déconnexion réussie' });
});

export default router;