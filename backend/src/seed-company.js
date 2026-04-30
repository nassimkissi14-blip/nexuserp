/**
 * Seed demo data for a specific company.
 * Run: node src/seed-company.js <companyId>
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const COMPANY_ID = process.argv[2];

if (!COMPANY_ID) {
  console.error('Usage: node src/seed-company.js <companyId>');
  process.exit(1);
}

async function main() {
  console.log(`\n🌱 Seeding demo data for company: ${COMPANY_ID}\n`);

  const now = new Date();

  /* ── Nettoyage (hors employés) ── */
  await prisma.task.deleteMany({ where: { project: { companyId: COMPANY_ID } } });
  await prisma.project.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.productionOrder.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.maintenanceOrder.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.maintenanceRequest.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.equipment.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.stockMovement.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.budgetLine.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.payroll.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.quoteItem.deleteMany({ where: { quote: { companyId: COMPANY_ID } } });
  await prisma.quote.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.invoice.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.orderItem.deleteMany({ where: { order: { companyId: COMPANY_ID } } });
  await prisma.order.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.product.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.customer.deleteMany({ where: { companyId: COMPANY_ID } });
  console.log('🧹 Anciennes données supprimées\n');

  /* ── Employees (inchangés) ── */
  const employees = await prisma.employee.findMany({ where: { companyId: COMPANY_ID } });
  console.log(`✅ ${employees.length} employés conservés`);

  /* ── Leave requests ── */
  const userId = (await prisma.user.findFirst({ where: { companyId: COMPANY_ID } }))?.id;
  if (userId && employees.length >= 4) {
    await prisma.leaveRequest.deleteMany({ where: { employee: { companyId: COMPANY_ID } } });
    const leaveData = [
      { emp: employees[0], type: 'ANNUAL',  start: new Date(now.getFullYear(), now.getMonth(), 5),  end: new Date(now.getFullYear(), now.getMonth(), 12), days: 7,  status: 'PENDING',  reason: 'voyage famille' },
      { emp: employees[1], type: 'SICK',    start: new Date(now.getFullYear(), now.getMonth(), 2),  end: new Date(now.getFullYear(), now.getMonth(), 4),  days: 3,  status: 'PENDING',  reason: 'ordonnance médecin joint' },
      { emp: employees[2], type: 'ANNUAL',  start: new Date(now.getFullYear(), now.getMonth(), 20), end: new Date(now.getFullYear(), now.getMonth(), 27), days: 6,  status: 'PENDING',  reason: 'mariage' },
      { emp: employees[3], type: 'ANNUAL',  start: new Date(now.getFullYear(), now.getMonth() - 1, 10), end: new Date(now.getFullYear(), now.getMonth() - 1, 20), days: 10, status: 'APPROVED', reason: '' },
      { emp: employees[0], type: 'SICK',    start: new Date(now.getFullYear(), now.getMonth() - 1, 3),  end: new Date(now.getFullYear(), now.getMonth() - 1, 5),  days: 2,  status: 'APPROVED', reason: 'grippe' },
      { emp: employees[2], type: 'UNPAID',  start: new Date(now.getFullYear(), now.getMonth(), 8),  end: new Date(now.getFullYear(), now.getMonth(), 10), days: 2,  status: 'PENDING',  reason: 'affaire personnelle' },
      { emp: employees[1], type: 'OTHER',   start: new Date(now.getFullYear(), now.getMonth() - 1, 20), end: new Date(now.getFullYear(), now.getMonth() - 1, 21), days: 1,  status: 'REJECTED', reason: 'convocation' },
    ];
    for (const l of leaveData) {
      await prisma.leaveRequest.create({ data: { employeeId: l.emp.id, userId, type: l.type, startDate: l.start, endDate: l.end, days: l.days, status: l.status, reason: l.reason } });
    }
    console.log(`✅ ${leaveData.length} demandes de congé créées`);
  }

  /* ── Customers ── */
  const customers = await Promise.all([
    prisma.customer.create({ data: { companyId: COMPANY_ID, name: 'SARL Amouri et freres', email: 'amouri.sarl@gmail.com', phone: '0550 12 34 56', address: 'Alger centre', country: 'DZ', type: 'COMPANY', status: 'ACTIVE' } }),
    prisma.customer.create({ data: { companyId: COMPANY_ID, name: 'Benaissa construction', email: '', phone: '0771 98 45 12', address: 'Zone industrielle Rouiba', country: 'DZ', type: 'COMPANY', status: 'ACTIVE' } }),
    prisma.customer.create({ data: { companyId: COMPANY_ID, name: 'SPA Plastipro', email: 'contact@plastipro.dz', phone: '043 22 11 09', address: 'Oran', country: 'DZ', type: 'COMPANY', status: 'ACTIVE' } }),
    prisma.customer.create({ data: { companyId: COMPANY_ID, name: 'M. Djamel Hadj Aissa', email: 'djamel_hadj@yahoo.fr', phone: '0661 55 77 88', address: 'Constantine', country: 'DZ', type: 'INDIVIDUAL', status: 'ACTIVE' } }),
    prisma.customer.create({ data: { companyId: COMPANY_ID, name: 'EURL Techni-Serv', email: 'techniservdz@gmail.com', phone: '0550 88 00 11', address: 'Blida', country: 'DZ', type: 'COMPANY', status: 'ACTIVE' } }),
    prisma.customer.create({ data: { companyId: COMPANY_ID, name: 'Boudia Ahmed', email: '', phone: '0799 34 56 12', address: 'Sétif', country: 'DZ', type: 'INDIVIDUAL', status: 'ACTIVE' } }),
  ]);
  console.log(`✅ ${customers.length} clients créés`);

  /* ── Products ── */
  const products = await Promise.all([
    prisma.product.create({ data: { companyId: COMPANY_ID, name: 'Pompe 5kw (centrifuge)', sku: 'POMPE-5KW-01', category: 'Pompes', unit: 'pièce', buyPrice: 85000, sellPrice: 118000, stockQty: 12, minStockQty: 3, isActive: true } }),
    prisma.product.create({ data: { companyId: COMPANY_ID, name: 'Moteur elect 7,5kw', sku: 'MOT-7K5', category: 'Moteurs', unit: 'pièce', buyPrice: 145000, sellPrice: 198000, stockQty: 8, minStockQty: 2, isActive: true } }),
    prisma.product.create({ data: { companyId: COMPANY_ID, name: 'Variateur 15kw (schneider)', sku: 'VAR-SCH-15', category: 'Electronique', unit: 'pièce', buyPrice: 97000, sellPrice: 132000, stockQty: 2, minStockQty: 2, isActive: true } }),
    prisma.product.create({ data: { companyId: COMPANY_ID, name: 'Cable 35mm² - prix au metre', sku: 'CAB-35MM', category: 'Consommables', unit: 'mètre', buyPrice: 820, sellPrice: 1150, stockQty: 430, minStockQty: 100, isActive: true } }),
    prisma.product.create({ data: { companyId: COMPANY_ID, name: 'Armoire electrique IP65 (vide)', sku: 'ARM-IP65-V', category: 'Armoires', unit: 'pièce', buyPrice: 54000, sellPrice: 76000, stockQty: 2, minStockQty: 3, isActive: true } }),
    prisma.product.create({ data: { companyId: COMPANY_ID, name: 'Disjoncteur diff 40A / 30mA', sku: 'DIS-40A-30', category: 'Protection', unit: 'pièce', buyPrice: 4200, sellPrice: 6200, stockQty: 38, minStockQty: 10, isActive: true } }),
    prisma.product.create({ data: { companyId: COMPANY_ID, name: 'Transfo HTA/BT 100kva', sku: 'TRF-100K', category: 'Transformateurs', unit: 'pièce', buyPrice: 315000, sellPrice: 448000, stockQty: 1, minStockQty: 1, isActive: true } }),
    prisma.product.create({ data: { companyId: COMPANY_ID, name: 'Onduleur 3kva online', sku: 'UPS-3K-ON', category: 'Electronique', unit: 'pièce', buyPrice: 37500, sellPrice: 54000, stockQty: 6, minStockQty: 2, isActive: true } }),
  ]);
  console.log(`✅ ${products.length} produits créés`);

  /* ── Orders ── */
  const orderData = [
    { customer: customers[0], date: new Date(now.getFullYear(), now.getMonth() - 5, 10), status: 'DELIVERED', notes: '', items: [[products[0], 2], [products[3], 100]] },
    { customer: customers[1], date: new Date(now.getFullYear(), now.getMonth() - 4, 22), status: 'DELIVERED', notes: 'livraison urgente demandée par le client', items: [[products[1], 1], [products[5], 20]] },
    { customer: customers[2], date: new Date(now.getFullYear(), now.getMonth() - 4, 5),  status: 'DELIVERED', notes: '', items: [[products[2], 2]] },
    { customer: customers[0], date: new Date(now.getFullYear(), now.getMonth() - 3, 18), status: 'DELIVERED', notes: 'commande passée par tel avec M. Amouri', items: [[products[6], 1]] },
    { customer: customers[3], date: new Date(now.getFullYear(), now.getMonth() - 3, 7),  status: 'DELIVERED', notes: '', items: [[products[0], 1], [products[4], 1]] },
    { customer: customers[4], date: new Date(now.getFullYear(), now.getMonth() - 2, 25), status: 'DELIVERED', notes: '', items: [[products[7], 2], [products[5], 30]] },
    { customer: customers[1], date: new Date(now.getFullYear(), now.getMonth() - 2, 12), status: 'SHIPPED',   notes: 'en attente confirmation adresse livraison', items: [[products[1], 2]] },
    { customer: customers[2], date: new Date(now.getFullYear(), now.getMonth() - 1, 28), status: 'DELIVERED', notes: '', items: [[products[3], 200], [products[5], 15]] },
    { customer: customers[5], date: new Date(now.getFullYear(), now.getMonth() - 1, 8),  status: 'DELIVERED', notes: 'client particulier - paiement especes', items: [[products[0], 1], [products[7], 1]] },
    { customer: customers[0], date: new Date(now.getFullYear(), now.getMonth() - 1, 20), status: 'PROCESSING', notes: '', items: [[products[2], 3]] },
    { customer: customers[3], date: new Date(now.getFullYear(), now.getMonth(), 3),       status: 'CONFIRMED', notes: 'devis signé scanné et envoyé par whatsapp', items: [[products[1], 1], [products[6], 1]] },
    { customer: customers[4], date: new Date(now.getFullYear(), now.getMonth(), 15),      status: 'DRAFT',     notes: 'a verifier les prix avant envoi', items: [[products[4], 2]] },
  ];
  const orders = [];
  let orderIdx = 1;
  for (const o of orderData) {
    const totalAmount = o.items.reduce((s, [p, qty]) => s + p.sellPrice * qty, 0);
    const ref = `CMD-${now.getFullYear()}-${String(orderIdx).padStart(3, '0')}`;
    const created = await prisma.order.create({
      data: {
        companyId: COMPANY_ID, customerId: o.customer.id, reference: ref,
        status: o.status, orderDate: o.date, totalAmount, currency: 'DZD',
        notes: o.notes,
        items: { create: o.items.map(([p, qty]) => ({ productId: p.id, quantity: qty, unitPrice: p.sellPrice, totalPrice: p.sellPrice * qty })) },
      },
    });
    orders.push({ ...created, customer: o.customer });
    orderIdx++;
  }
  console.log(`✅ ${orderData.length} commandes créées`);

  /* ── Invoices ── */
  const invoiceData = [
    { order: orders[0], status: 'PAID',    dueOffset: -120 },
    { order: orders[1], status: 'PAID',    dueOffset: -90  },
    { order: orders[2], status: 'PAID',    dueOffset: -75  },
    { order: orders[3], status: 'PAID',    dueOffset: -50  },
    { order: orders[4], status: 'OVERDUE', dueOffset: -8   },
    { order: orders[5], status: 'OVERDUE', dueOffset: -3   },
    { order: orders[6], status: 'SENT',    dueOffset: 12   },
    { order: orders[8], status: 'DRAFT',   dueOffset: 30   },
  ];
  let invIdx = 1;
  for (const inv of invoiceData) {
    const issueDate = new Date(now.getTime() + inv.dueOffset * 86400000 - 15 * 86400000);
    const dueDate   = new Date(now.getTime() + inv.dueOffset * 86400000);
    const sub = inv.order.totalAmount / 1.19;
    const tax = inv.order.totalAmount - sub;
    await prisma.invoice.create({
      data: {
        companyId: COMPANY_ID, customerId: inv.order.customerId, orderId: inv.order.id,
        reference: `FAC-${now.getFullYear()}-${String(invIdx).padStart(3, '0')}`,
        status: inv.status, subtotal: sub, taxRate: 19, taxAmount: tax,
        totalAmount: inv.order.totalAmount, issueDate, dueDate,
        paidAt: inv.status === 'PAID' ? dueDate : null,
      },
    });
    invIdx++;
  }
  console.log(`✅ ${invoiceData.length} factures créées`);

  /* ── Quotes ── */
  const quoteStatuses = ['SENT', 'SENT', 'ACCEPTED', 'DRAFT'];
  const quoteNotes = [
    'remise accordée suite discussion avec directeur',
    '',
    'client a demandé délai de paiement 60 jours',
    'a finaliser - verifier stock dispo avant',
  ];
  let qIdx = 1;
  for (let i = 0; i < 4; i++) {
    const p = products[i + 1];
    const qty = [2, 3, 1, 4][i];
    const total = p.sellPrice * qty;
    const sub = total / 1.19;
    await prisma.quote.create({
      data: {
        companyId: COMPANY_ID, customerId: customers[i].id,
        reference: `DEV-${now.getFullYear()}-${String(qIdx).padStart(3, '0')}`,
        status: quoteStatuses[i],
        subtotal: sub, taxRate: 19, taxAmount: total - sub, totalAmount: total,
        notes: quoteNotes[i],
        issueDate: new Date(now.getFullYear(), now.getMonth(), qIdx * 4),
        validUntil: new Date(now.getFullYear(), now.getMonth() + 1, qIdx * 4),
        items: { create: [{ productId: p.id, description: p.name, quantity: qty, unitPrice: p.sellPrice, totalPrice: total }] },
      },
    });
    qIdx++;
  }
  console.log(`✅ Devis créés`);

  /* ── Stock movements ── */
  for (const p of products) {
    await prisma.stockMovement.create({ data: { companyId: COMPANY_ID, productId: p.id, type: 'IN', quantity: p.stockQty, notes: 'stock initial ouverture', unitPrice: p.buyPrice } });
  }
  await prisma.stockMovement.create({ data: { companyId: COMPANY_ID, productId: products[3].id, type: 'OUT', quantity: 70, notes: 'sortie commande CMD-2026-001 et 008', reference: 'CMD-2026-001' } });
  await prisma.stockMovement.create({ data: { companyId: COMPANY_ID, productId: products[0].id, type: 'OUT', quantity: 4,  notes: 'sortie livraison', reference: 'CMD-2026-005' } });
  await prisma.stockMovement.create({ data: { companyId: COMPANY_ID, productId: products[4].id, type: 'IN',  quantity: 2, notes: 'reçu fournisseur - bon réception 47' } });
  await prisma.stockMovement.create({ data: { companyId: COMPANY_ID, productId: products[2].id, type: 'OUT', quantity: 1, notes: 'sortie pour chantier Rouiba - authorization M. Kaci' } });
  console.log(`✅ Mouvements de stock créés`);

  /* ── Equipment ── */
  const equipment = await Promise.all([
    prisma.equipment.create({ data: { companyId: COMPANY_ID, code: 'EQ-001', name: 'Tour CNC TL-200', type: 'MACHINE', location: 'Atelier A', manufacturer: 'Mazak', status: 'ACTIVE', lastMaintenance: new Date(now.getFullYear(), now.getMonth() - 2, 1), nextMaintenance: new Date(now.getFullYear(), now.getMonth() + 1, 1) } }),
    prisma.equipment.create({ data: { companyId: COMPANY_ID, code: 'EQ-002', name: 'Fraiseuse FU-400', type: 'MACHINE', location: 'Atelier A', manufacturer: 'DMG', status: 'ACTIVE', lastMaintenance: new Date(now.getFullYear(), now.getMonth() - 1, 15) } }),
    prisma.equipment.create({ data: { companyId: COMPANY_ID, code: 'EQ-003', name: 'Compresseur 200L', type: 'PNEUMATIC', location: 'Atelier B', status: 'BREAKDOWN', lastMaintenance: new Date(now.getFullYear(), now.getMonth() - 3, 10) } }),
    prisma.equipment.create({ data: { companyId: COMPANY_ID, code: 'EQ-004', name: 'Pont roulant 5T', type: 'HANDLING', location: 'Entrepot', status: 'ACTIVE', lastMaintenance: new Date(now.getFullYear(), now.getMonth() - 1, 5), nextMaintenance: new Date(now.getFullYear(), now.getMonth() + 2, 5) } }),
    prisma.equipment.create({ data: { companyId: COMPANY_ID, code: 'EQ-005', name: 'Groupe elec 50kva', type: 'ELECTRICAL', location: 'local technique', status: 'ACTIVE' } }),
  ]);
  console.log(`✅ ${equipment.length} équipements créés`);

  /* ── Maintenance requests ── */
  const maintReqs = await Promise.all([
    prisma.maintenanceRequest.create({ data: { companyId: COMPANY_ID, number: 'DM-001', equipmentId: equipment[2].id, title: 'compresseur en panne depuis ce matin - moteur ne demarre pas', type: 'BREAKDOWN', priority: 'HIGH', status: 'OPEN', reportedAt: new Date(now.getFullYear(), now.getMonth(), 3) } }),
    prisma.maintenanceRequest.create({ data: { companyId: COMPANY_ID, number: 'DM-002', equipmentId: equipment[0].id, title: 'bruit bizarre lors de lusinage - vibration inhabituelles', type: 'BREAKDOWN', priority: 'MEDIUM', status: 'IN_PROGRESS', reportedAt: new Date(now.getFullYear(), now.getMonth(), 8) } }),
    prisma.maintenanceRequest.create({ data: { companyId: COMPANY_ID, number: 'DM-003', equipmentId: equipment[1].id, title: 'broche qui vibre trop fort - operateur a signalé', type: 'MAINTENANCE', priority: 'LOW', status: 'OPEN', reportedAt: new Date(now.getFullYear(), now.getMonth(), 12) } }),
    prisma.maintenanceRequest.create({ data: { companyId: COMPANY_ID, number: 'DM-004', equipmentId: equipment[3].id, title: 'controle annuel pont roulant - obligatoire avant fin mois', type: 'PREVENTIVE', priority: 'MEDIUM', status: 'OPEN', reportedAt: new Date(now.getFullYear(), now.getMonth(), 15) } }),
    prisma.maintenanceRequest.create({ data: { companyId: COMPANY_ID, number: 'DM-005', equipmentId: equipment[4].id, title: 'fuite huile groupe electrogene - tache sol local technique', type: 'BREAKDOWN', priority: 'HIGH', status: 'OPEN', reportedAt: new Date(now.getFullYear(), now.getMonth(), 18) } }),
  ]);

  /* ── Maintenance orders ── */
  await Promise.all([
    prisma.maintenanceOrder.create({ data: { companyId: COMPANY_ID, number: 'OT-001', equipmentId: equipment[2].id, requestId: maintReqs[0].id, title: 'remplacement moteur compresseur 200L', type: 'CORRECTIVE', status: 'IN_PROGRESS', priority: 'HIGH', plannedDate: new Date(now.getFullYear(), now.getMonth(), 10), estimatedHours: 8, laborCost: 15000, partsCost: 43000 } }),
    prisma.maintenanceOrder.create({ data: { companyId: COMPANY_ID, number: 'OT-002', equipmentId: equipment[0].id, title: 'revision generale tour CNC - prevu prochain mois', type: 'PREVENTIVE', status: 'PLANNED', priority: 'MEDIUM', plannedDate: new Date(now.getFullYear(), now.getMonth() + 1, 5), estimatedHours: 12 } }),
    prisma.maintenanceOrder.create({ data: { companyId: COMPANY_ID, number: 'OT-003', equipmentId: equipment[1].id, requestId: maintReqs[1].id, title: 'equilibrage broche fraiseuse', type: 'CORRECTIVE', status: 'PLANNED', priority: 'MEDIUM', plannedDate: new Date(now.getFullYear(), now.getMonth(), 22), estimatedHours: 4 } }),
    prisma.maintenanceOrder.create({ data: { companyId: COMPANY_ID, number: 'OT-004', equipmentId: equipment[3].id, title: 'graissage et controle pont roulant', type: 'PREVENTIVE', status: 'COMPLETED', priority: 'LOW', plannedDate: new Date(now.getFullYear(), now.getMonth() - 1, 10), estimatedHours: 3, actualHours: 3.5, completedAt: new Date(now.getFullYear(), now.getMonth() - 1, 11) } }),
  ]);
  console.log(`✅ ${maintReqs.length} demandes + 4 ordres de maintenance créés`);

  /* ── Production orders ── */
  await Promise.all([
    prisma.productionOrder.create({ data: { companyId: COMPANY_ID, number: 'OF-001', productId: products[0].id, quantity: 10, unit: 'pièce', status: 'COMPLETED', priority: 'HIGH', plannedStart: new Date(now.getFullYear(), now.getMonth() - 2, 1), plannedEnd: new Date(now.getFullYear(), now.getMonth() - 2, 20), actualStart: new Date(now.getFullYear(), now.getMonth() - 2, 1), actualEnd: new Date(now.getFullYear(), now.getMonth() - 2, 22), producedQty: 10, materialCost: 748000, laborCost: 118000 } }),
    prisma.productionOrder.create({ data: { companyId: COMPANY_ID, number: 'OF-002', productId: products[1].id, quantity: 5,  unit: 'pièce', status: 'COMPLETED', priority: 'MEDIUM', plannedStart: new Date(now.getFullYear(), now.getMonth() - 1, 5), plannedEnd: new Date(now.getFullYear(), now.getMonth() - 1, 25), producedQty: 5, materialCost: 638000, laborCost: 92000 } }),
    prisma.productionOrder.create({ data: { companyId: COMPANY_ID, number: 'OF-003', productId: products[2].id, quantity: 8,  unit: 'pièce', status: 'IN_PROGRESS', priority: 'HIGH', plannedStart: new Date(now.getFullYear(), now.getMonth(), 1), plannedEnd: new Date(now.getFullYear(), now.getMonth(), 28), actualStart: new Date(now.getFullYear(), now.getMonth(), 3), producedQty: 3, materialCost: 310000, laborCost: 58000 } }),
    prisma.productionOrder.create({ data: { companyId: COMPANY_ID, number: 'OF-004', productId: products[0].id, quantity: 6,  unit: 'pièce', status: 'PLANNED', priority: 'MEDIUM', plannedStart: new Date(now.getFullYear(), now.getMonth() + 1, 5), plannedEnd: new Date(now.getFullYear(), now.getMonth() + 1, 25), producedQty: 0 } }),
    prisma.productionOrder.create({ data: { companyId: COMPANY_ID, number: 'OF-005', productId: products[7].id, quantity: 12, unit: 'pièce', status: 'IN_PROGRESS', priority: 'LOW', plannedStart: new Date(now.getFullYear(), now.getMonth(), 10), plannedEnd: new Date(now.getFullYear(), now.getMonth() + 1, 10), actualStart: new Date(now.getFullYear(), now.getMonth(), 12), producedQty: 6 } }),
  ]);
  console.log(`✅ 5 ordres de production créés`);

  /* ── Projects & Tasks ── */
  const projects = await Promise.all([
    prisma.project.create({ data: { companyId: COMPANY_ID, name: 'Renovation reseau electrique atelier', status: 'IN_PROGRESS', priority: 'HIGH', startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1), endDate: new Date(now.getFullYear(), now.getMonth() + 2, 30), budget: 1800000, progress: 40 } }),
    prisma.project.create({ data: { companyId: COMPANY_ID, name: 'Certification ISO 9001', status: 'IN_PROGRESS', priority: 'CRITICAL', startDate: new Date(now.getFullYear(), now.getMonth() - 4, 1), endDate: new Date(now.getFullYear(), now.getMonth() + 1, 30), budget: 750000, progress: 65 } }),
    prisma.project.create({ data: { companyId: COMPANY_ID, name: 'Agrandissement entrepot logistique', status: 'PLANNING', priority: 'MEDIUM', startDate: new Date(now.getFullYear(), now.getMonth() + 1, 1), endDate: new Date(now.getFullYear(), now.getMonth() + 9, 30), budget: 9500000, progress: 5 } }),
    prisma.project.create({ data: { companyId: COMPANY_ID, name: 'Mise en place ERP NexusERP', status: 'COMPLETED', priority: 'HIGH', startDate: new Date(now.getFullYear() - 1, 8, 1), endDate: new Date(now.getFullYear(), now.getMonth() - 1, 28), budget: 550000, progress: 100 } }),
  ]);

  const taskSets = [
    [
      { title: 'etat des lieux installation existante', status: 'DONE', priority: 'HIGH', due: new Date(now.getFullYear(), now.getMonth() - 1, 15) },
      { title: 'commande cables et materiel', status: 'IN_PROGRESS', priority: 'HIGH', due: new Date(now.getFullYear(), now.getMonth(), 20) },
      { title: 'travaux tableau principal', status: 'TODO', priority: 'HIGH', due: new Date(now.getFullYear(), now.getMonth() + 1, 10) },
      { title: 'mise en service et tests', status: 'TODO', priority: 'MEDIUM', due: new Date(now.getFullYear(), now.getMonth() + 2, 5) },
    ],
    [
      { title: 'audit interne processus', status: 'DONE', priority: 'HIGH', due: new Date(now.getFullYear(), now.getMonth() - 2, 10) },
      { title: 'correction ecarts identifies', status: 'IN_PROGRESS', priority: 'HIGH', due: new Date(now.getFullYear(), now.getMonth(), 25) },
      { title: 'audit blanc', status: 'TODO', priority: 'HIGH', due: new Date(now.getFullYear(), now.getMonth() + 1, 5) },
      { title: 'audit de certification', status: 'TODO', priority: 'CRITICAL', due: new Date(now.getFullYear(), now.getMonth() + 1, 28) },
    ],
    [
      { title: 'demande permis de construire', status: 'IN_PROGRESS', priority: 'HIGH', due: new Date(now.getFullYear(), now.getMonth() + 1, 15) },
      { title: 'selection entreprise travaux', status: 'TODO', priority: 'MEDIUM', due: new Date(now.getFullYear(), now.getMonth() + 2, 1) },
      { title: 'suivi chantier', status: 'TODO', priority: 'MEDIUM', due: new Date(now.getFullYear(), now.getMonth() + 8, 1) },
    ],
  ];

  for (let i = 0; i < 3; i++) {
    for (const t of taskSets[i]) {
      await prisma.task.create({ data: { projectId: projects[i].id, title: t.title, status: t.status, priority: t.priority, dueDate: t.due } });
    }
  }
  console.log(`✅ ${projects.length} projets + tâches créés`);

  /* ── Payrolls (3 derniers mois) ── */
  const allEmps = await prisma.employee.findMany({ where: { companyId: COMPANY_ID } });
  for (let m = 3; m >= 1; m--) {
    const rawMonth = now.getMonth() - m + 1;
    const monthNum = ((rawMonth % 12) + 12) % 12 || 12;
    const yearNum  = rawMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
    for (const emp of allEmps) {
      try {
        await prisma.payroll.create({ data: { companyId: COMPANY_ID, employeeId: emp.id, month: monthNum, year: yearNum, baseSalary: emp.salary || 80000, netSalary: Math.round((emp.salary || 80000) * 0.87), paidAt: new Date(yearNum, monthNum - 1, 28) } });
      } catch { /* skip duplicate */ }
    }
  }
  console.log(`✅ Bulletins de paie créés`);

  /* ── Budget lines ── */
  const budgetData = [
    { cat: 'Salaires et charges', budgeted: 1850000, actual: 1820000 },
    { cat: 'Achats matieres et fournitures', budgeted: 980000,  actual: 1120000 },
    { cat: 'Maintenance et reparations', budgeted: 350000,  actual: 287000  },
    { cat: 'Transport et logistique', budgeted: 220000,  actual: 198000  },
    { cat: 'Frais generaux et divers', budgeted: 180000,  actual: 234000  },
  ];
  for (const b of budgetData) {
    await prisma.budgetLine.create({ data: { companyId: COMPANY_ID, year: now.getFullYear(), category: b.cat, label: b.cat, budgeted: b.budgeted, actual: b.actual, type: 'EXPENSE' } });
  }
  console.log(`✅ Lignes budgétaires créées`);

  console.log('\n✅ Seed complet terminé !\n');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
