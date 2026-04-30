import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ── CV upload (multer) ─────────────────────────────────────────────
const uploadDir = path.join(process.cwd(), 'uploads', 'cv');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `cv_${Date.now()}_${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Seuls les fichiers PDF sont acceptés'));
  },
});

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, department, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      companyId: req.companyId,
      ...(search && { OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } },
      ]}),
      ...(department && { department }),
      ...(status && { status }),
    };
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      prisma.employee.count({ where }),
    ]);
    res.json({ success: true, data: employees, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: {
        leaveRequests: { orderBy: { createdAt: 'desc' }, take: 5 },
        payrolls: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 3 },
      },
    });
    if (!employee) return res.status(404).json({ success: false, message: 'Employé non trouvé' });
    res.json({ success: true, data: employee });
  } catch (error) { next(error); }
});

const toISO = (d) => d ? new Date(d).toISOString() : null;
const normalizeDates = (body) => ({
  ...body,
  ...(body.hireDate  !== undefined && { hireDate:  toISO(body.hireDate) }),
  ...(body.birthDate !== undefined && { birthDate: body.birthDate ? toISO(body.birthDate) : null }),
  ...(body.salary    !== undefined && { salary:    body.salary !== '' ? parseFloat(body.salary) : null }),
});

router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const employee = await prisma.employee.create({ data: { ...normalizeDates(req.body), companyId: req.companyId } });
    res.status(201).json({ success: true, data: employee });
  } catch (error) { next(error); }
});

router.patch('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const updated = await prisma.employee.update({ where: { id: req.params.id }, data: normalizeDates(req.body) });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    await prisma.employee.update({ where: { id: req.params.id }, data: { status: 'TERMINATED' } });
    res.json({ success: true, message: 'Employé archivé' });
  } catch (error) { next(error); }
});

// POST /employees/:id/cv — upload CV (PDF)
router.post('/:id/cv', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), upload.single('cv'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier PDF fourni' });
    const cvUrl = `/uploads/cv/${req.file.filename}`;
    const employee = await prisma.employee.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!employee) return res.status(404).json({ success: false, message: 'Employé non trouvé' });
    // Delete old CV file if exists
    if (employee.cvUrl) {
      const oldPath = path.join(process.cwd(), employee.cvUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    const updated = await prisma.employee.update({ where: { id: req.params.id }, data: { cvUrl } });
    res.json({ success: true, data: updated, cvUrl });
  } catch (error) { next(error); }
});

// DELETE /employees/:id/cv — remove CV
router.delete('/:id/cv', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const employee = await prisma.employee.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!employee) return res.status(404).json({ success: false, message: 'Employé non trouvé' });
    if (employee.cvUrl) {
      const oldPath = path.join(process.cwd(), employee.cvUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await prisma.employee.update({ where: { id: req.params.id }, data: { cvUrl: null } });
    res.json({ success: true, message: 'CV supprimé' });
  } catch (error) { next(error); }
});

// GET /employees/my
router.get("/my", authenticate, async (req, res, next) => {
  try {
    const employee = await prisma.employee.findFirst({ where: { companyId: req.companyId, email: req.user.email } });
    res.json({ success: true, data: employee || null });
  } catch (e) { next(e); }
});

export default router;