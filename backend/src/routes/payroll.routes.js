import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// GET /payroll?month=4&year=2026
router.get('/', authenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();

    const entries = await prisma.payroll.findMany({
      where: { companyId: req.companyId, month, year },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, department: true, position: true } },
      },
      orderBy: [{ employee: { department: 'asc' } }, { employee: { lastName: 'asc' } }],
    });

    res.json({ success: true, data: entries, meta: { month, year } });
  } catch (error) { next(error); }
});

// POST /payroll/generate - generate payroll entries for a given month from active employees
router.post('/generate', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR'), async (req, res, next) => {
  try {
    const now = new Date();
    const month = Number(req.body.month) || now.getMonth() + 1;
    const year = Number(req.body.year) || now.getFullYear();

    const employees = await prisma.employee.findMany({
      where: { companyId: req.companyId, status: { not: 'TERMINATED' } },
    });

    if (employees.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun employé actif trouvé' });
    }

    // upsert: create if not exists, skip update if already exists
    const results = await Promise.all(
      employees.map(emp =>
        prisma.payroll.upsert({
          where: { employeeId_month_year: { employeeId: emp.id, month, year } },
          create: {
            companyId: req.companyId,
            employeeId: emp.id,
            month,
            year,
            baseSalary: emp.salary,
            bonus: 0,
            deductions: 0,
            netSalary: emp.salary,
          },
          update: {},
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, department: true, position: true } },
          },
        })
      )
    );

    res.json({ success: true, data: results, message: `Paie générée pour ${results.length} employé(s)` });
  } catch (error) { next(error); }
});

// PATCH /payroll/:id - update bonus and/or deductions
router.patch('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const entry = await prisma.payroll.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
    });
    if (!entry) return res.status(404).json({ success: false, message: 'Fiche de paie non trouvée' });
    if (entry.paidAt) return res.status(400).json({ success: false, message: 'Impossible de modifier une paie déjà versée' });

    const bonus = req.body.bonus !== undefined ? Number(req.body.bonus) : entry.bonus;
    const deductions = req.body.deductions !== undefined ? Number(req.body.deductions) : entry.deductions;

    const updated = await prisma.payroll.update({
      where: { id: req.params.id },
      data: { bonus, deductions, netSalary: entry.baseSalary + bonus - deductions },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, department: true, position: true } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// PATCH /payroll/:id/pay - mark salary as paid
router.patch('/:id/pay', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR'), async (req, res, next) => {
  try {
    const entry = await prisma.payroll.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
    });
    if (!entry) return res.status(404).json({ success: false, message: 'Fiche de paie non trouvée' });
    if (entry.paidAt) return res.status(400).json({ success: false, message: 'Salaire déjà marqué comme versé' });

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const payroll = await tx.payroll.update({
        where: { id: req.params.id },
        data: { paidAt: now },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, department: true, position: true } },
        },
      });

      // Entrée trésorerie : débit salaire versé
      await tx.treasuryEntry.create({
        data: {
          companyId: req.companyId,
          type: 'DEBIT',
          amount: payroll.netSalary,
          description: `Salaire ${payroll.employee.firstName} ${payroll.employee.lastName} — ${payroll.month}/${payroll.year}`,
          reference: `PAIE-${payroll.year}-${String(payroll.month).padStart(2, '0')}-${payroll.employee.lastName.toUpperCase()}`,
          category: 'SALAIRES',
          date: now,
        },
      });

      return payroll;
    });

    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// DELETE /payroll/:id
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const entry = await prisma.payroll.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!entry) return res.status(404).json({ success: false, message: 'Non trouvé' });
    if (entry.paidAt) return res.status(400).json({ success: false, message: 'Impossible de supprimer une paie déjà versée' });
    await prisma.payroll.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) { next(error); }
});

// GET /payroll/my — fiches de paie de l'employé connecté
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: { companyId: req.companyId, email: req.user.email },
    });
    if (!employee) return res.json({ success: true, data: [] });

    const payrolls = await prisma.payroll.findMany({
      where: { employeeId: employee.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    res.json({ success: true, data: payrolls });
  } catch (e) { next(e); }
});

export default router;
