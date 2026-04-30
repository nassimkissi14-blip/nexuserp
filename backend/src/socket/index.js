import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const onlineUsers = new Map();

export const initSocketHandlers = (io) => {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, firstName: true, lastName: true, companyId: true, role: true } });
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) { next(new Error('Invalid token')); }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    socket.join(`company:${user.companyId}`);
    socket.join(`user:${user.id}`);
    onlineUsers.set(user.id, socket.id);

    socket.on('message:send', async ({ receiverId, content }) => {
      try {
        if ((!content?.trim()) || !receiverId) return;
        const message = await prisma.message.create({
          data: { senderId: user.id, receiverId, content: content.trim() },
          include: { sender: { select: { id: true, firstName: true, lastName: true } } },
        });
        io.to(`user:${receiverId}`).emit('message:received', message);
        socket.emit('message:sent', message);
      } catch (err) { socket.emit('error', { message: 'Erreur envoi message' }); }
    });

    socket.on('message:typing', ({ receiverId }) => {
      io.to(`user:${receiverId}`).emit('message:typing', { userId: user.id });
    });

    socket.on('message:stop_typing', ({ receiverId }) => {
      io.to(`user:${receiverId}`).emit('message:stop_typing', { userId: user.id });
    });

    socket.on('message:read', async ({ senderId }) => {
      try {
        await prisma.message.updateMany({
          where: { senderId, receiverId: user.id, isRead: false },
          data: { isRead: true, readAt: new Date() },
        });
        io.to(`user:${senderId}`).emit('message:read_ack', { readBy: user.id });
      } catch (err) { /* silently ignore */ }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(user.id);
    });
  });
};