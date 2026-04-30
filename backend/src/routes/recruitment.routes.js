import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// ── CV upload setup ──────────────────────────────────────────────
const uploadDir = '/app/uploads/cv';
if (!fs.existsSync(uploadDir)) {
  try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (_) {}
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-z0-9.]/gi, '_');
    cb(null, `candidate_${Date.now()}_${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Seuls les fichiers PDF sont acceptés'));
  },
});

// GET /recruitment
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { stage, search } = req.query;
    const where = {
      companyId: req.companyId,
      ...(stage && { stage }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { position: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const candidates = await prisma.candidate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: candidates });
  } catch (error) { next(error); }
});

// POST /recruitment
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, position, email, phone, note, stage } = req.body;
    if (!name || !position) {
      return res.status(400).json({ success: false, message: 'Nom et poste requis' });
    }
    const candidate = await prisma.candidate.create({
      data: {
        companyId: req.companyId,
        name,
        position,
        email: email || null,
        phone: phone || null,
        note: note || null,
        stage: stage || 'APPLIED',
      },
    });
    res.status(201).json({ success: true, data: candidate });
  } catch (error) { next(error); }
});

// PATCH /recruitment/:id
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const existing = await prisma.candidate.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Candidat non trouvé' });

    const { name, position, email, phone, note, stage } = req.body;
    const updated = await prisma.candidate.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(position !== undefined && { position }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(note !== undefined && { note }),
        ...(stage !== undefined && { stage }),
      },
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// DELETE /recruitment/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const existing = await prisma.candidate.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Candidat non trouvé' });

    // Remove CV file if exists
    if (existing.cvUrl) {
      const filePath = path.join('/app', existing.cvUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await prisma.candidate.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Candidat supprimé' });
  } catch (error) { next(error); }
});

// POST /recruitment/:id/cv — upload CV PDF
router.post('/:id/cv', authenticate, upload.single('cv'), async (req, res, next) => {
  try {
    const existing = await prisma.candidate.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Candidat non trouvé' });

    if (!req.file) return res.status(400).json({ success: false, message: 'Fichier PDF requis' });

    // Delete old CV file
    if (existing.cvUrl) {
      const oldPath = path.join('/app', existing.cvUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const cvUrl = `/uploads/cv/${req.file.filename}`;
    await prisma.candidate.update({
      where: { id: req.params.id },
      data: { cvUrl },
    });

    res.json({ success: true, cvUrl });
  } catch (error) { next(error); }
});

// DELETE /recruitment/:id/cv — remove CV
router.delete('/:id/cv', authenticate, async (req, res, next) => {
  try {
    const existing = await prisma.candidate.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Candidat non trouvé' });

    if (existing.cvUrl) {
      const filePath = path.join('/app', existing.cvUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await prisma.candidate.update({ where: { id: req.params.id }, data: { cvUrl: null } });
    res.json({ success: true, message: 'CV supprimé' });
  } catch (error) { next(error); }
});

export default router;
