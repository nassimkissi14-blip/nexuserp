import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token manquant' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    req.user = user;
    req.companyId = user.companyId;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalide', code: 'TOKEN_EXPIRED' });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Accès refusé' });
  }
  next();
};

export const authService = {
  register: async ({ firstName, lastName, email, password, role, department, companyId, isActive = true }) => {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error('Email déjà utilisé');
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { firstName, lastName, email, password: hashed, role, department, companyId, isActive },
    });
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  login: async (email, password) => {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: { select: { id: true, name: true, email: true, phone: true, address: true, subscriptionPlan: true } } },
    });
    if (!user) throw new Error('Email ou mot de passe incorrect');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error('Email ou mot de passe incorrect');
    if (!user.isActive) throw new Error('COMPTE_EN_ATTENTE');

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const accessToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken, refreshToken };
  },

  refreshToken: async (token) => {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const accessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    return { accessToken };
  },
};