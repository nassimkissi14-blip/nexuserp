import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Initialisation de la base de données NexusERP...\n');

  // COMPANY
  const company = await prisma.company.upsert({
    where: { email: 'admin@nexuserp.demo' },
    create: { name: 'NexusERP Demo', email: 'admin@nexuserp.demo', subscriptionPlan: 'ENTERPRISE' },
    update: {},
  });
  console.log(`✅ Entreprise: ${company.name}`);

  // MODULES
  const modulesData = [
    { name: 'Ressources Humaines', slug: 'rh', icon: '👥', color: '#6366f1', sortOrder: 1 },
    { name: 'CRM', slug: 'crm', icon: '🤝', color: '#10b981', sortOrder: 2 },
    { name: 'Ventes', slug: 'sales', icon: '📈', color: '#f59e0b', sortOrder: 3 },
    { name: 'Stock', slug: 'stock', icon: '📦', color: '#ef4444', sortOrder: 4 },
    { name: 'Finance', slug: 'finance', icon: '💰', color: '#06b6d4', sortOrder: 5 },
    { name: 'Projets', slug: 'projects', icon: '🗂️', color: '#84cc16', sortOrder: 6 },
    { name: 'Communication', slug: 'communication', icon: '💬', color: '#ec4899', sortOrder: 7 },
    { name: 'Administration', slug: 'admin', icon: '⚙️', color: '#78716c', sortOrder: 8, isCore: true },
  ];
  for (const modData of modulesData) {
    const module = await prisma.module.upsert({ where: { slug: modData.slug }, create: modData, update: modData });
    await prisma.companyModule.upsert({
      where: { companyId_moduleId: { companyId: company.id, moduleId: module.id } },
      create: { companyId: company.id, moduleId: module.id, enabled: true },
      update: {},
    });
  }
  console.log('✅ Modules créés');

  // USERS
  const usersData = [
    { email: 'admin@nexuserp.demo', firstName: 'Admin', lastName: 'NexusERP', role: 'SUPER_ADMIN', department: 'Administration' },
    { email: 'directeur@nexuserp.demo', firstName: 'Ahmed', lastName: 'Benali', role: 'DIRECTOR', department: 'Direction' },
    { email: 'manager.rh@nexuserp.demo', firstName: 'Fatima', lastName: 'Kaci', role: 'MANAGER', department: 'Ressources Humaines' },
    { email: 'manager.ventes@nexuserp.demo', firstName: 'Karim', lastName: 'Meziani', role: 'MANAGER', department: 'CRM & Ventes' },
    { email: 'operateur@nexuserp.demo', firstName: 'Youcef', lastName: 'Hamdi', role: 'OPERATOR', department: 'Production' },
  ];
  const createdUsers = {};
  for (const userData of usersData) {
    const hashed = await bcrypt.hash('nexuserp2025', 12);
    const u = await prisma.user.upsert({ where: { email: userData.email }, create: { ...userData, password: hashed, companyId: company.id }, update: {} });
    createdUsers[userData.email] = u;
    console.log(`  👤 ${userData.firstName} ${userData.lastName} (${userData.role})`);
  }

  // EMPLOYEES
  const employeesData = [
    { firstName: 'Ahmed', lastName: 'Benali', email: 'a.benali@demo.com', position: 'Directeur Général', department: 'Direction', salary: 250000, hireDate: new Date('2020-01-15'), contractType: 'CDI', status: 'ACTIVE', phone: '+213 21 54 60 01' },
    { firstName: 'Fatima', lastName: 'Kaci', email: 'f.kaci@demo.com', position: 'Responsable RH', department: 'Ressources Humaines', salary: 120000, hireDate: new Date('2021-03-01'), contractType: 'CDI', status: 'ACTIVE', phone: '+213 55 12 34 56' },
    { firstName: 'Karim', lastName: 'Meziani', email: 'k.meziani@demo.com', position: 'Responsable Ventes', department: 'CRM & Ventes', salary: 110000, hireDate: new Date('2021-06-15'), contractType: 'CDI', status: 'ACTIVE', phone: '+213 66 98 76 54' },
    { firstName: 'Sara', lastName: 'Ouali', email: 's.ouali@demo.com', position: 'Comptable', department: 'Finance', salary: 90000, hireDate: new Date('2022-01-10'), contractType: 'CDI', status: 'ACTIVE' },
    { firstName: 'Youcef', lastName: 'Hamdi', email: 'y.hamdi@demo.com', position: 'Technicien', department: 'Production', salary: 75000, hireDate: new Date('2022-09-01'), contractType: 'CDI', status: 'ACTIVE' },
    { firstName: 'Amira', lastName: 'Bouchenak', email: 'a.bouchenak@demo.com', position: 'Ingénieure IT', department: 'IT', salary: 95000, hireDate: new Date('2023-02-15'), contractType: 'CDI', status: 'ACTIVE' },
    { firstName: 'Tarek', lastName: 'Ferhat', email: 't.ferhat@demo.com', position: 'Commercial', department: 'CRM & Ventes', salary: 70000, hireDate: new Date('2023-05-01'), contractType: 'CDD', status: 'ACTIVE' },
    { firstName: 'Nadia', lastName: 'Cherif', email: 'n.cherif@demo.com', position: 'Assistante', department: 'Direction', salary: 65000, hireDate: new Date('2023-08-01'), contractType: 'CDI', status: 'ON_LEAVE' },
  ];
  const createdEmployees = [];
  for (const emp of employeesData) {
    const e = await prisma.employee.create({ data: { ...emp, companyId: company.id } }).catch(() => null);
    if (e) createdEmployees.push(e);
  }
  console.log(`✅ ${createdEmployees.length} employés créés`);

  // CUSTOMERS
  const customersData = [
    { name: 'Sonatrach', email: 'contact@sonatrach.dz', phone: '+213 21 54 60 00', type: 'COMPANY', status: 'ACTIVE', country: 'Algérie' },
    { name: 'Cevital', email: 'info@cevital.com', phone: '+213 34 18 80 00', type: 'COMPANY', status: 'ACTIVE', country: 'Algérie' },
    { name: 'Air Algérie', email: 'contact@airalgerie.dz', phone: '+213 21 50 40 00', type: 'COMPANY', status: 'ACTIVE', country: 'Algérie' },
    { name: 'Mohamed Amrani', email: 'm.amrani@gmail.com', phone: '+213 55 12 34 56', type: 'INDIVIDUAL', status: 'ACTIVE', country: 'Algérie' },
    { name: 'Nexans Algérie', email: 'info@nexans.dz', phone: '+213 21 30 45 00', type: 'COMPANY', status: 'PROSPECT', country: 'Algérie' },
    { name: 'Algérie Télécom', email: 'contact@algerietelecom.dz', phone: '+213 21 23 45 67', type: 'COMPANY', status: 'PROSPECT', country: 'Algérie' },
    { name: 'Sara Benouali', email: 's.benouali@gmail.com', phone: '+213 66 98 76 54', type: 'INDIVIDUAL', status: 'LEAD', country: 'Algérie' },
  ];
  const createdCustomers = [];
  for (const cust of customersData) {
    const c = await prisma.customer.create({ data: { ...cust, companyId: company.id } }).catch(() => null);
    if (c) createdCustomers.push(c);
  }
  console.log(`✅ ${createdCustomers.length} clients créés`);

  // PRODUCTS
  const productsData = [
    { name: 'Moteur électrique 5kW', sku: 'MOT-5KW', category: 'Équipements', buyPrice: 45000, sellPrice: 65000, stockQty: 12, minStockQty: 5, unit: 'pcs', location: 'Zone A' },
    { name: 'Câble électrique 6mm²', sku: 'CAB-6MM', category: 'Matériaux', buyPrice: 850, sellPrice: 1200, stockQty: 3, minStockQty: 100, unit: 'ml', location: 'Zone B' },
    { name: 'Variateur de fréquence 22kW', sku: 'VAR-22KW', category: 'Équipements', buyPrice: 85000, sellPrice: 120000, stockQty: 3, minStockQty: 2, unit: 'pcs', location: 'Zone A' },
    { name: 'Huile hydraulique 20L', sku: 'HUI-HYD-20', category: 'Consommables', buyPrice: 2500, sellPrice: 3500, stockQty: 45, minStockQty: 10, unit: 'pcs', location: 'Zone C' },
    { name: 'Roulement à billes 6205', sku: 'RLT-6205', category: 'Pièces détachées', buyPrice: 450, sellPrice: 700, stockQty: 2, minStockQty: 20, unit: 'pcs', location: 'Zone B' },
    { name: 'Filtre à air industriel', sku: 'FLT-AIR-01', category: 'Consommables', buyPrice: 1200, sellPrice: 1800, stockQty: 28, minStockQty: 8, unit: 'pcs', location: 'Zone C' },
    { name: 'Pompe centrifuge 2"', sku: 'PMP-CEN-2', category: 'Équipements', buyPrice: 32000, sellPrice: 48000, stockQty: 6, minStockQty: 3, unit: 'pcs', location: 'Zone A' },
    { name: 'Disjoncteur 63A', sku: 'DIS-63A', category: 'Matériaux', buyPrice: 1800, sellPrice: 2800, stockQty: 0, minStockQty: 15, unit: 'pcs', location: 'Zone B' },
  ];
  for (const prod of productsData) {
    await prisma.product.create({ data: { ...prod, companyId: company.id } }).catch(() => {});
  }
  console.log(`✅ ${productsData.length} produits créés`);

  // ORDERS
  if (createdCustomers.length > 0) {
    const ordersData = [
      { customerId: createdCustomers[0]?.id, totalAmount: 1250000, status: 'DELIVERED', orderDate: new Date('2026-01-15'), reference: 'CMD-2026-0001' },
      { customerId: createdCustomers[1]?.id, totalAmount: 890000, status: 'DELIVERED', orderDate: new Date('2026-02-03'), reference: 'CMD-2026-0002' },
      { customerId: createdCustomers[2]?.id, totalAmount: 450000, status: 'PROCESSING', orderDate: new Date('2026-03-12'), reference: 'CMD-2026-0003' },
      { customerId: createdCustomers[0]?.id, totalAmount: 670000, status: 'SHIPPED', orderDate: new Date('2026-03-20'), reference: 'CMD-2026-0004' },
      { customerId: createdCustomers[3]?.id, totalAmount: 125000, status: 'CONFIRMED', orderDate: new Date('2026-04-01'), reference: 'CMD-2026-0005' },
      { customerId: createdCustomers[1]?.id, totalAmount: 980000, status: 'DELIVERED', orderDate: new Date('2026-04-05'), reference: 'CMD-2026-0006' },
      { customerId: createdCustomers[2]?.id, totalAmount: 320000, status: 'DRAFT', orderDate: new Date('2026-04-10'), reference: 'CMD-2026-0007' },
    ];
    for (const order of ordersData) {
      if (order.customerId) {
        await prisma.order.create({ data: { ...order, companyId: company.id, currency: 'DZD' } }).catch(() => {});
      }
    }
    console.log(`✅ ${ordersData.length} commandes créées`);
  }

  // PROJECTS
  const projectsData = [
    { name: 'Refonte Système ERP', status: 'IN_PROGRESS', priority: 'HIGH', startDate: new Date('2026-01-01'), budget: 5000000, progress: 65 },
    { name: 'Extension Entrepôt Zone C', status: 'PLANNING', priority: 'MEDIUM', startDate: new Date('2026-03-15'), budget: 8000000, progress: 10 },
    { name: 'Certification ISO 9001', status: 'IN_PROGRESS', priority: 'HIGH', startDate: new Date('2026-02-01'), budget: 1500000, progress: 40 },
    { name: 'Nouveau Site Web', status: 'COMPLETED', priority: 'LOW', startDate: new Date('2025-10-01'), endDate: new Date('2026-03-31'), budget: 800000, progress: 100 },
  ];
  for (const proj of projectsData) {
    await prisma.project.create({ data: { ...proj, companyId: company.id } }).catch(() => {});
  }
  console.log(`✅ ${projectsData.length} projets créés`);

  // LEAVE REQUESTS
  if (createdEmployees.length > 0) {
    const adminUser = createdUsers['admin@nexuserp.demo'];
    const leavesData = [
      { employeeId: createdEmployees[1]?.id, type: 'ANNUAL', startDate: new Date('2026-04-15'), endDate: new Date('2026-04-20'), days: 5, status: 'PENDING', reason: 'Vacances familiales' },
      { employeeId: createdEmployees[2]?.id, type: 'SICK', startDate: new Date('2026-04-10'), endDate: new Date('2026-04-11'), days: 2, status: 'APPROVED', approvedBy: adminUser?.id },
      { employeeId: createdEmployees[7]?.id, type: 'MATERNITY', startDate: new Date('2026-04-01'), endDate: new Date('2026-07-01'), days: 90, status: 'APPROVED', approvedBy: adminUser?.id },
    ];
    for (const leave of leavesData) {
      if (leave.employeeId && adminUser) {
        await prisma.leaveRequest.create({ data: { ...leave, userId: adminUser.id } }).catch(() => {});
      }
    }
    console.log('✅ Congés créés');
  }

  console.log('\n🎉 Base de données initialisée avec succès !');
  console.log('─────────────────────────────────────────');
  console.log('🌐 Frontend : http://localhost:5173');
  console.log('📧 Email    : admin@nexuserp.demo');
  console.log('🔑 Mot de passe : nexuserp2025');
  console.log('─────────────────────────────────────────');
}

main().catch(console.error).finally(() => prisma.$disconnect());
