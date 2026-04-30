/**
 * NexusERP — ERP Business Simulator
 * Generates realistic business events (stock movements, orders, invoices, alerts)
 * in real-time and broadcasts them via Socket.IO to all connected company clients.
 * Writes actual data to the DB so all pages reflect the simulation live.
 */

import prisma from '../lib/prisma.js';

const SPEEDS = { SLOW: 8000, MEDIUM: 4000, FAST: 1500 };

// Active timers per company: companyId → { interval, speed }
const activeSimulations = new Map();

let ioRef = null;

export function initErpSimulator(io) {
  ioRef = io;
}

/* ── Event generators ───────────────────────────────────────────── */

async function genStockMovement(companyId) {
  const products = await prisma.product.findMany({
    where: { companyId, isActive: true },
    take: 20,
    orderBy: { updatedAt: 'desc' },
  });
  if (!products.length) return null;

  const product = products[Math.floor(Math.random() * products.length)];
  const type    = Math.random() > 0.4 ? 'IN' : 'OUT';
  const qty     = Math.floor(Math.random() * 50) + 1;

  if (type === 'OUT' && product.stockQty < qty) return null;

  const movement = await prisma.stockMovement.create({
    data: {
      companyId,
      productId: product.id,
      type,
      quantity: qty,
      reference: `SIM-${Date.now()}`,
      notes: 'Généré par simulation ERP',
    },
  });

  // Update stock
  await prisma.product.update({
    where: { id: product.id },
    data: { stockQty: { increment: type === 'IN' ? qty : -qty } },
  });

  // Trigger stock alert if below minStock
  const updated = await prisma.product.findUnique({ where: { id: product.id } });
  if (updated && updated.minStock && updated.stockQty <= updated.minStock) {
    await prisma.notification.createMany({
      data: await getAdminUserIds(companyId).then(ids => ids.map(userId => ({
        userId,
        title: `⚠️ Alerte stock : ${product.name}`,
        message: `Stock critique : ${updated.stockQty} ${product.unit} restant(s) (seuil : ${updated.minStock})`,
        type: 'WARNING',
        link: '/stock/alerts',
      }))),
    });
  }

  return {
    type: type === 'IN' ? 'stock_in' : 'stock_out',
    label: type === 'IN' ? `Entrée stock : ${product.name} (+${qty} ${product.unit})` : `Sortie stock : ${product.name} (-${qty} ${product.unit})`,
    color: type === 'IN' ? '#10b981' : '#ef4444',
    icon: type === 'IN' ? '📥' : '📤',
    data: { productName: product.name, qty, unit: product.unit, movementId: movement.id },
  };
}

async function genOrderUpdate(companyId) {
  const FLOW = ['DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const order = await prisma.order.findFirst({
    where: { companyId, status: { in: ['DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED'] } },
    include: { customer: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!order) return null;

  const currentIdx  = FLOW.indexOf(order.status);
  const nextStatus  = FLOW[currentIdx + 1];
  if (!nextStatus) return null;

  await prisma.order.update({ where: { id: order.id }, data: { status: nextStatus } });

  const LABELS = { CONFIRMED: 'Confirmée', PROCESSING: 'En traitement', SHIPPED: 'Expédiée', DELIVERED: 'Livrée' };

  return {
    type: 'order_update',
    label: `Commande ${order.reference} → ${LABELS[nextStatus] || nextStatus}`,
    color: '#6366f1',
    icon: '🛒',
    data: { ref: order.reference, customer: order.customer?.name, status: nextStatus },
  };
}

async function genInvoicePayment(companyId) {
  const invoice = await prisma.invoice.findFirst({
    where: { companyId, status: 'SENT' },
    include: { customer: true },
    orderBy: { dueDate: 'asc' },
  });
  if (!invoice) return null;

  await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'PAID', paidAt: new Date() } });

  return {
    type: 'invoice_paid',
    label: `Facture ${invoice.reference} payée — ${Number(invoice.totalAmount).toLocaleString('fr-DZ')} DZD`,
    color: '#10b981',
    icon: '💰',
    data: { ref: invoice.reference, customer: invoice.customer?.name, amount: invoice.totalAmount },
  };
}

async function genMaintenanceRequest(companyId) {
  const equipment = await prisma.equipment.findMany({
    where: { companyId, status: { in: ['OPERATIONAL', 'DEGRADED'] } },
    take: 10,
  });
  if (!equipment.length) return null;

  const eq = equipment[Math.floor(Math.random() * equipment.length)];
  const TITLES = [
    'Bruit anormal détecté', 'Vibrations excessives', 'Température élevée',
    'Pression hydraulique basse', 'Fuite détectée', 'Surchauffe moteur',
  ];
  const title = TITLES[Math.floor(Math.random() * TITLES.length)];

  const request = await prisma.maintenanceRequest.create({
    data: {
      companyId,
      equipmentId: eq.id,
      title: `[SIM] ${title} — ${eq.name}`,
      description: 'Demande générée automatiquement par la simulation ERP.',
      priority: Math.random() > 0.5 ? 'HIGH' : 'MEDIUM',
      status: 'OPEN',
    },
  });

  return {
    type: 'maintenance_request',
    label: `Demande maintenance : ${title} (${eq.name})`,
    color: '#f59e0b',
    icon: '🔧',
    data: { equipmentName: eq.name, title, requestId: request.id },
  };
}

async function genProductionUpdate(companyId) {
  const order = await prisma.productionOrder.findFirst({
    where: { companyId, status: { in: ['PLANNED', 'IN_PROGRESS'] } },
    include: { product: true },
    orderBy: { plannedStart: 'asc' },
  });
  if (!order) return null;

  const newStatus   = order.status === 'PLANNED' ? 'IN_PROGRESS' : 'COMPLETED';
  const newProgress = newStatus === 'IN_PROGRESS' ? Math.floor(Math.random() * 40) + 10 : 100;

  await prisma.productionOrder.update({
    where: { id: order.id },
    data: {
      status: newStatus,
      progress: newProgress,
      ...(newStatus === 'IN_PROGRESS'  ? { actualStart: new Date() } : {}),
      ...(newStatus === 'COMPLETED'    ? { actualEnd: new Date() }   : {}),
    },
  });

  const LABELS = { IN_PROGRESS: 'En production', COMPLETED: 'Terminé' };
  return {
    type: 'production_update',
    label: `OF ${order.reference} → ${LABELS[newStatus]} (${newProgress}%)`,
    color: '#8b5cf6',
    icon: '🏭',
    data: { ref: order.reference, product: order.product?.name, status: newStatus, progress: newProgress },
  };
}

/* ── Helpers ────────────────────────────────────────────────────── */

async function getAdminUserIds(companyId) {
  const users = await prisma.user.findMany({
    where: { companyId, role: { in: ['ADMIN', 'SUPER_ADMIN', 'DIRECTOR'] }, isActive: true },
    select: { id: true },
    take: 5,
  });
  return users.map(u => u.id);
}

const GENERATORS = [genStockMovement, genStockMovement, genOrderUpdate, genInvoicePayment, genMaintenanceRequest, genProductionUpdate];

async function runTick(companyId) {
  try {
    const gen  = GENERATORS[Math.floor(Math.random() * GENERATORS.length)];
    const event = await gen(companyId);
    if (!event || !ioRef) return;

    const payload = { ...event, timestamp: new Date().toISOString(), companyId };
    ioRef.to(`company:${companyId}`).emit('simulation:erp_event', payload);
  } catch (err) {
    console.error('[ERP Simulator] tick error:', err.message);
  }
}

/* ── Public API ─────────────────────────────────────────────────── */

export function startErpSimulation(companyId, speed = 'MEDIUM') {
  if (activeSimulations.has(companyId)) stopErpSimulation(companyId);

  const interval = setInterval(() => runTick(companyId), SPEEDS[speed] || SPEEDS.MEDIUM);
  activeSimulations.set(companyId, { interval, speed, startedAt: new Date() });

  console.log(`🎮 ERP Simulator started for company ${companyId} (${speed})`);
  ioRef?.to(`company:${companyId}`).emit('simulation:status', { running: true, speed });
}

export function stopErpSimulation(companyId) {
  const sim = activeSimulations.get(companyId);
  if (!sim) return;
  clearInterval(sim.interval);
  activeSimulations.delete(companyId);

  console.log(`🎮 ERP Simulator stopped for company ${companyId}`);
  ioRef?.to(`company:${companyId}`).emit('simulation:status', { running: false });
}

export function getSimulationStatus(companyId) {
  const sim = activeSimulations.get(companyId);
  return sim ? { running: true, speed: sim.speed, startedAt: sim.startedAt } : { running: false };
}
