import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';

import authRoutes from './routes/auth.routes.js';
import moduleRoutes from './routes/module.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import leaveRoutes from './routes/leave.routes.js';
import payrollRoutes from './routes/payroll.routes.js';
import customerRoutes from './routes/customer.routes.js';
import productRoutes from './routes/product.routes.js';
import orderRoutes from './routes/order.routes.js';
import movementRoutes from './routes/movement.routes.js';
import userRoutes from './routes/user.routes.js';
import messageRoutes from './routes/message.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import budgetRoutes from './routes/budget.routes.js';
import treasuryRoutes from './routes/treasury.routes.js';
import accountingRoutes from './routes/accounting.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import invoicesRoutes from './routes/invoices.routes.js';
import quotesRoutes from './routes/quotes.routes.js';
import suppliersRoutes from './routes/suppliers.routes.js';
import purchasesRoutes from './routes/purchases.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import aiRoutes from './routes/ai.routes.js';
import maintenanceRoutes from './routes/maintenance.routes.js';
import productionRoutes from './routes/production.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import recruitmentRoutes from './routes/recruitment.routes.js';
import expensesRoutes from './routes/expenses.routes.js';
import evaluationsRoutes from './routes/evaluations.routes.js';
import carriersRoutes from './routes/carriers.routes.js';
import shipmentsRoutes from './routes/shipments.routes.js';
import creditsRoutes from './routes/credits.routes.js';
import resourcesRoutes from './routes/resources.routes.js';
import qrRoutes from './routes/qr.routes.js';
import iotRoutes from './routes/iot.routes.js';
import importRoutes from './routes/import.routes.js';
import auditRoutes from './routes/audit.routes.js';
import { initSocketHandlers } from './socket/index.js';
import simulationRoutes from './routes/simulation.routes.js';
import gpaoRoutes from './routes/gpao.routes.js';
import { initErpSimulator } from './services/erpSimulator.js';
import { initArenaSimulator } from './services/arenaSimulator.js';
import { auditLog } from './middleware/audit.middleware.js';
import cron from 'node-cron';

dotenv.config();

const app = express();
const server = http.createServer(app);

const ALLOWED_ORIGINS = [
  'https://nexuserp-mu.vercel.app',
  'https://nexuserp-pupi.onrender.com',
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3001',
].filter(Boolean);

const io = new SocketServer(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
// Serve uploaded files (CVs, documents)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api/', limiter);
app.use(auditLog);

const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/modules`, moduleRoutes);
app.use(`${API}/employees`, employeeRoutes);
app.use(`${API}/leaves`, leaveRoutes);
app.use(`${API}/payroll`, payrollRoutes);
app.use(`${API}/customers`, customerRoutes);
app.use(`${API}/products`, productRoutes);
app.use(`${API}/orders`, orderRoutes);
app.use(`${API}/movements`, movementRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/messages`, messageRoutes);
app.use(`${API}/dashboard`, dashboardRoutes);
app.use(`${API}/announcements`, announcementRoutes);
app.use(`${API}/budget`, budgetRoutes);
app.use(`${API}/treasury`, treasuryRoutes);
app.use(`${API}/accounting`, accountingRoutes);
app.use(`${API}/inventory`, inventoryRoutes);
app.use(`${API}/projects`, projectsRoutes);
app.use(`${API}/invoices`, invoicesRoutes);
app.use(`${API}/quotes`, quotesRoutes);
app.use(`${API}/suppliers`, suppliersRoutes);
app.use(`${API}/purchases`, purchasesRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/ai`, aiRoutes);
app.use(`${API}/maintenance`, maintenanceRoutes);
app.use(`${API}/production`, productionRoutes);
app.use(`${API}/gpao`, gpaoRoutes);
app.use(`${API}/analytics`, analyticsRoutes);
app.use(`${API}/recruitment`, recruitmentRoutes);
app.use(`${API}/expenses`, expensesRoutes);
app.use(`${API}/evaluations`, evaluationsRoutes);
app.use(`${API}/carriers`, carriersRoutes);
app.use(`${API}/shipments`, shipmentsRoutes);
app.use(`${API}/credits`, creditsRoutes);
app.use(`${API}/resources`, resourcesRoutes);
app.use(`${API}/qr`,        qrRoutes);
app.use(`${API}/iot`,       iotRoutes);
app.use(`${API}/import`,    importRoutes);
app.use(`${API}/audit`,      auditRoutes);
app.use(`${API}/simulation`, simulationRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', version: '5.0.0' }));

// ── Serve frontend in production ──────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../public');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Erreur serveur' });
});

initSocketHandlers(io);
initErpSimulator(io);
initArenaSimulator(io);

// ── Cron : relances factures impayées — tous les jours à 08h00 ────
import prisma from './lib/prisma.js';

// Reset any simulation sessions stuck at RUNNING from a previous server run
prisma.simulationSession.updateMany({
  where: { status: 'RUNNING' },
  data:  { status: 'PAUSED', endedAt: new Date() },
}).catch(() => {});
cron.schedule('0 8 * * *', async () => {
  try {
    const today = new Date();
    const overdueInvoices = await prisma.invoice.findMany({
      where: { status: 'SENT', dueDate: { lt: today } },
      include: { company: { include: { users: { take: 1, where: { role: { in: ['ADMIN','SUPER_ADMIN','DIRECTOR'] } } } } }, customer: true },
    });

    for (const inv of overdueInvoices) {
      await prisma.invoice.update({ where: { id: inv.id }, data: { status: 'OVERDUE' } });
      const adminUser = inv.company?.users?.[0];
      if (adminUser) {
        await prisma.notification.create({
          data: {
            userId: adminUser.id,
            title: `Facture en retard : ${inv.reference}`,
            message: `La facture ${inv.reference} (${inv.customer?.name}) est en retard de paiement. Montant : ${inv.totalAmount.toLocaleString('fr-DZ')} DZD`,
            type: 'WARNING',
            link: '/sales/invoices',
          },
        });
      }
    }
    if (overdueInvoices.length > 0) {
      console.log(`⏰ Cron: ${overdueInvoices.length} facture(s) marquées OVERDUE`);
    }
  } catch (e) { console.error('Cron error:', e.message); }
});

// ── Cron : maintenance préventive automatique — tous les jours à 06h00 ──
const FREQ_DAYS_MAP = { DAILY: 1, WEEKLY: 7, BIWEEKLY: 4, MONTHLY: 30, QUARTERLY: 91, BIANNUAL: 182, ANNUAL: 365 };
const FREQ_FR_MAP   = { DAILY: 'Quotidienne', WEEKLY: 'Hebdomadaire', BIWEEKLY: 'Bihebdomadaire', MONTHLY: 'Mensuelle', QUARTERLY: 'Trimestrielle', BIANNUAL: 'Semestrielle', ANNUAL: 'Annuelle', CUSTOM: 'Personnalisée' };
const padN = (n) => String(n).padStart(3, '0');

async function runMaintenanceCron() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueEquipment = await prisma.equipment.findMany({
      where: {
        maintenanceFrequency: { not: null },
        nextMaintenance: { lte: today },
        status: { not: 'RETIRED' },
      },
      include: {
        company: {
          include: {
            users: {
              take: 1,
              where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'DIRECTOR'] }, isActive: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    let created = 0;
    for (const equip of dueEquipment) {
      // Skip if an open preventive request already exists for this equipment
      const existing = await prisma.maintenanceRequest.findFirst({
        where: { equipmentId: equip.id, status: { in: ['OPEN', 'IN_PROGRESS'] }, type: 'PREVENTIVE' },
      });
      if (existing) continue;

      const freqLabel = equip.maintenanceFrequency === 'CUSTOM' && equip.maintenanceIntervalDays
        ? `Tous les ${equip.maintenanceIntervalDays} jours`
        : (FREQ_FR_MAP[equip.maintenanceFrequency] || equip.maintenanceFrequency);

      const count  = await prisma.maintenanceRequest.count({ where: { companyId: equip.companyId } });
      const number = `MR-${new Date().getFullYear()}-${padN(count + 1)}`;
      const tasks  = Array.isArray(equip.maintenanceTasks) && equip.maintenanceTasks.length > 0
        ? equip.maintenanceTasks
        : [];
      const taskBlock = tasks.length > 0
        ? `\n\nTâches à effectuer :\n${tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
        : '';
      const desc = `Maintenance préventive automatique (${freqLabel})${taskBlock}`;

      await prisma.maintenanceRequest.create({
        data: {
          companyId:   equip.companyId,
          equipmentId: equip.id,
          number,
          title:       `Maintenance préventive — ${equip.name}`,
          description: desc,
          type:        'PREVENTIVE',
          priority:    equip.maintenanceFrequency === 'DAILY' ? 'HIGH' : 'MEDIUM',
          status:      'OPEN',
        },
      });

      // Compute and update next maintenance date
      const days = equip.maintenanceFrequency === 'CUSTOM'
        ? (equip.maintenanceIntervalDays || 30)
        : (FREQ_DAYS_MAP[equip.maintenanceFrequency] || 30);
      const nextDate = new Date(today);
      nextDate.setDate(nextDate.getDate() + days);

      await prisma.equipment.update({
        where: { id: equip.id },
        data:  { nextMaintenance: nextDate },
      });

      // Log the auto-creation
      await prisma.maintenanceLog.create({
        data: {
          companyId:   equip.companyId,
          equipmentId: equip.id,
          action:      'MAINTENANCE_SCHEDULED',
          description: `Demande préventive automatique créée (${freqLabel})`,
        },
      });

      // Notify admin/director
      const adminUser = equip.company?.users?.[0];
      if (adminUser) {
        await prisma.notification.create({
          data: {
            userId:  adminUser.id,
            title:   `🔄 Maintenance préventive : ${equip.name}`,
            message: desc,
            type:    'INFO',
            link:    '/maintenance/requests',
          },
        });
      }
      created++;
    }

    if (created > 0) {
      console.log(`⏰ Cron maintenance: ${created} demande(s) préventive(s) créées automatiquement`);
    }
  } catch (e) { console.error('Cron maintenance error:', e.message); }
}

cron.schedule('0 6 * * *', runMaintenanceCron);

// Vérification au démarrage : équipements déjà en retard avant aujourd'hui
runMaintenanceCron();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 NexusERP API running on http://localhost:${PORT}`);
});

export { io };