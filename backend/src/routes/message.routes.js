import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// ─── File upload setup ────────────────────────────────────────────────────────
const uploadDir = path.join(process.cwd(), 'uploads', 'messages');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|mp4|mp3)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('Type de fichier non autorisé'));
  },
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────

router.get('/conversations', authenticate, async (req, res, next) => {
  try {
    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: req.user.id }, { receiverId: req.user.id }] },
      orderBy: { createdAt: 'desc' },
      include: {
        sender:   { select: { id: true, firstName: true, lastName: true } },
        receiver: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    const conversationsMap = new Map();
    for (const msg of messages) {
      const otherId   = msg.senderId === req.user.id ? msg.receiverId : msg.senderId;
      const otherUser = msg.senderId === req.user.id ? msg.receiver   : msg.sender;
      if (!conversationsMap.has(otherId)) {
        conversationsMap.set(otherId, { user: otherUser, lastMessage: msg, unreadCount: 0 });
      }
    }
    res.json({ success: true, data: Array.from(conversationsMap.values()) });
  } catch (error) { next(error); }
});

router.get('/thread/:userId', authenticate, async (req, res, next) => {
  try {
    const messages = await prisma.message.findMany({
      where: { OR: [
        { senderId: req.user.id,       receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.user.id       },
      ]},
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });
    res.json({ success: true, data: messages });
  } catch (error) { next(error); }
});

router.patch('/read/:userId', authenticate, async (req, res, next) => {
  try {
    await prisma.message.updateMany({
      where: { senderId: req.params.userId, receiverId: req.user.id, isRead: false },
      data:  { isRead: true, readAt: new Date() },
    });
    res.json({ success: true });
  } catch (error) { next(error); }
});

// ─── FILE UPLOAD ──────────────────────────────────────────────────────────────
router.post('/upload', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier' });

    const { receiverId } = req.body;
    if (!receiverId) return res.status(400).json({ success: false, message: 'Destinataire requis' });

    const fileUrl  = `/uploads/messages/${req.file.filename}`;
    const fileName = req.file.originalname;
    const fileType = req.file.mimetype;
    const fileSize = req.file.size;

    const message = await prisma.message.create({
      data: {
        senderId:   req.user.id,
        receiverId,
        content:    '',
        fileUrl,
        fileName,
        fileType,
        fileSize,
      },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });

    // Emit via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${receiverId}`).emit('message:received', message);
    }

    res.status(201).json({ success: true, data: message });
  } catch (error) { next(error); }
});

export default router;
