/**
 * Seed complet Promédal SARL — utilisateurs + employés réels
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) { console.error('Entreprise introuvable'); process.exit(1); }
  const CID = company.id;
  console.log(`\n🏭 Promédal SARL — id: ${CID}\n`);

  /* ── 1. Nettoyage users + employees ──────────────────────────── */
  await prisma.leaveRequest.deleteMany({ where: { employee: { companyId: CID } } });
  await prisma.payroll.deleteMany({ where: { companyId: CID } });
  await prisma.user.deleteMany({ where: { companyId: CID } });
  await prisma.employee.deleteMany({ where: { companyId: CID } });
  console.log('🧹 Anciens users/employés supprimés');

  const hash = await bcrypt.hash('promedal2025', 12);

  /* ── 2. Utilisateurs avec accès plateforme ───────────────────── */
  //
  // Mekamcha  = Directeur général → DIRECTOR  → voit tout
  // Les autres → MANAGER ou OPERATOR, accès limité à leur module
  //
  const usersData = [
    // Compte admin système (caché, ne pas partager)
    {
      firstName: 'Admin',    lastName: 'Système',
      email: 'admin@promedal.dz',
      role: 'SUPER_ADMIN',   department: 'Administration',
      position: 'Administrateur système',
      salary: 0,
    },
    // Directeur général
    {
      firstName: 'Rachid',   lastName: 'Mekamcha',
      email: 'r.mekamcha@promedal.dz',
      role: 'DIRECTOR',      department: 'Direction',
      position: 'Directeur Général',
      salary: 320000,
    },
    // Responsable RH
    {
      firstName: 'Nassim',   lastName: 'Kissi',
      email: 'n.kissi@promedal.dz',
      role: 'MANAGER',       department: 'Ressources Humaines',
      position: 'Responsable RH',
      salary: 135000,
    },
    // Responsable production / technique
    {
      firstName: 'Yassine',  lastName: 'Tchouar',
      email: 'y.tchouar@promedal.dz',
      role: 'MANAGER',       department: 'Production',
      position: 'Responsable Production',
      salary: 125000,
    },
    // Comptable / finance
    {
      firstName: 'Chahine',  lastName: 'Zeggai',
      email: 'c.zeggai@promedal.dz',
      role: 'MANAGER',       department: 'Finance',
      position: 'Responsable Finance',
      salary: 118000,
    },
    // Responsable stock
    {
      firstName: 'Hassam',   lastName: 'Ahmed',
      email: 'h.ahmed@promedal.dz',
      role: 'OPERATOR',      department: 'Stock & Logistique',
      position: 'Responsable Stock',
      salary: 90000,
    },
    // Commercial
    {
      firstName: 'Faycel',   lastName: 'Belkaid',
      email: 'f.belkaid@promedal.dz',
      role: 'OPERATOR',      department: 'CRM & Ventes',
      position: 'Commercial',
      salary: 80000,
    },
    // Technicien maintenance
    {
      firstName: 'Fethi',    lastName: 'Boudahri',
      email: 'fe.boudahri@promedal.dz',
      role: 'OPERATOR',      department: 'Maintenance',
      position: 'Technicien de maintenance',
      salary: 78000,
    },
  ];

  const createdUsers = [];
  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        companyId: CID,
        firstName: u.firstName,
        lastName:  u.lastName,
        email:     u.email,
        password:  hash,
        role:      u.role,
        department: u.department,
      },
    });
    createdUsers.push({ ...u, id: user.id });
  }
  console.log(`✅ ${createdUsers.length} comptes utilisateurs créés`);

  /* ── 3. Employés avec fiche RH (utilisateurs ci-dessus + extras) */
  const empData = [
    // Les users ci-dessus (sauf admin système)
    { firstName: 'Rachid',   lastName: 'Mekamcha',  email: 'r.mekamcha@promedal.dz',   position: 'Directeur Général',            department: 'Direction',          salary: 320000, hireDate: new Date('2018-03-01'), contractType: 'CDI', status: 'ACTIVE', phone: '0661 22 33 44' },
    { firstName: 'Nassim',   lastName: 'Kissi',     email: 'n.kissi@promedal.dz',       position: 'Responsable RH',               department: 'Ressources Humaines', salary: 135000, hireDate: new Date('2019-06-15'), contractType: 'CDI', status: 'ACTIVE', phone: '0770 11 55 66' },
    { firstName: 'Yassine',  lastName: 'Tchouar',   email: 'y.tchouar@promedal.dz',     position: 'Responsable Production',       department: 'Production',         salary: 125000, hireDate: new Date('2019-09-01'), contractType: 'CDI', status: 'ACTIVE', phone: '0550 44 77 88' },
    { firstName: 'Chahine',  lastName: 'Zeggai',    email: 'c.zeggai@promedal.dz',      position: 'Responsable Finance',          department: 'Finance',            salary: 118000, hireDate: new Date('2020-02-10'), contractType: 'CDI', status: 'ACTIVE', phone: '0771 66 99 00' },
    { firstName: 'Hassam',   lastName: 'Ahmed',     email: 'h.ahmed@promedal.dz',       position: 'Responsable Stock',            department: 'Stock & Logistique', salary: 90000,  hireDate: new Date('2020-07-01'), contractType: 'CDI', status: 'ACTIVE', phone: '0560 33 22 11' },
    { firstName: 'Faycel',   lastName: 'Belkaid',   email: 'f.belkaid@promedal.dz',     position: 'Commercial',                   department: 'CRM & Ventes',       salary: 80000,  hireDate: new Date('2021-01-15'), contractType: 'CDI', status: 'ACTIVE', phone: '0661 55 44 33' },
    { firstName: 'Fethi',    lastName: 'Boudahri',  email: 'fe.boudahri@promedal.dz',   position: 'Technicien de maintenance',    department: 'Maintenance',        salary: 78000,  hireDate: new Date('2021-05-01'), contractType: 'CDI', status: 'ACTIVE', phone: '0770 22 88 99' },
    // Employés supplémentaires (pas de compte plateforme)
    { firstName: 'Amira',    lastName: 'Bouzid',    email: 'a.bouzid@promedal.dz',      position: 'Comptable',                    department: 'Finance',            salary: 85000,  hireDate: new Date('2021-09-01'), contractType: 'CDI', status: 'ACTIVE', phone: '0661 10 20 30' },
    { firstName: 'Samir',    lastName: 'Merabet',   email: 's.merabet@promedal.dz',     position: 'Technicien de production',     department: 'Production',         salary: 72000,  hireDate: new Date('2022-03-15'), contractType: 'CDI', status: 'ACTIVE', phone: '0550 77 66 55' },
    { firstName: 'Rania',    lastName: 'Khelifi',   email: 'r.khelifi@promedal.dz',     position: 'Assistante commerciale',       department: 'CRM & Ventes',       salary: 68000,  hireDate: new Date('2022-06-01'), contractType: 'CDI', status: 'ACTIVE', phone: '0770 44 33 22' },
    { firstName: 'Hicham',   lastName: 'Benamara',  email: 'h.benamara@promedal.dz',    position: 'Magasinier',                   department: 'Stock & Logistique', salary: 62000,  hireDate: new Date('2022-10-01'), contractType: 'CDD', status: 'ACTIVE', phone: '0561 88 77 66' },
    { firstName: 'Souad',    lastName: 'Rahmani',   email: 's.rahmani@promedal.dz',     position: 'Secrétaire de direction',      department: 'Direction',          salary: 65000,  hireDate: new Date('2023-01-10'), contractType: 'CDI', status: 'ACTIVE', phone: '0662 55 44 33' },
    { firstName: 'Walid',    lastName: 'Djaafri',   email: 'w.djaafri@promedal.dz',     position: 'Technicien électricien',       department: 'Maintenance',        salary: 74000,  hireDate: new Date('2023-04-01'), contractType: 'CDI', status: 'ACTIVE', phone: '0551 22 33 44' },
    { firstName: 'Lynda',    lastName: 'Aouissi',   email: 'l.aouissi@promedal.dz',     position: 'Assistante RH',                department: 'Ressources Humaines', salary: 64000, hireDate: new Date('2023-07-15'), contractType: 'CDD', status: 'ACTIVE', phone: '0771 99 88 77' },
    { firstName: 'Omar',     lastName: 'Benkheira', email: 'o.benkheira@promedal.dz',   position: 'Opérateur de production',      department: 'Production',         salary: 60000,  hireDate: new Date('2023-11-01'), contractType: 'CDD', status: 'ACTIVE', phone: '0660 11 22 33' },
    { firstName: 'Fateh',    lastName: 'Boukhari',  email: 'fa.boukhari@promedal.dz',   position: 'Chauffeur-livreur',            department: 'Stock & Logistique', salary: 58000,  hireDate: new Date('2024-02-01'), contractType: 'CDI', status: 'ACTIVE', phone: '0552 66 77 88' },
    { firstName: 'Sabrina',  lastName: 'Maamri',    email: 'sa.maamri@promedal.dz',     position: 'Chargée de clientèle',         department: 'CRM & Ventes',       salary: 66000,  hireDate: new Date('2024-05-01'), contractType: 'CDI', status: 'ACTIVE', phone: '0773 33 44 55' },
    { firstName: 'Kamel',    lastName: 'Ounas',     email: 'k.ounas@promedal.dz',       position: 'Agent de sécurité',            department: 'Administration',     salary: 52000,  hireDate: new Date('2024-08-15'), contractType: 'CDD', status: 'ACTIVE', phone: '0661 88 99 00' },
  ];

  const createdEmployees = [];
  for (const emp of empData) {
    const e = await prisma.employee.create({
      data: { ...emp, companyId: CID },
    });
    createdEmployees.push(e);
  }
  console.log(`✅ ${createdEmployees.length} fiches employés créées`);

  /* ── 4. Congés ───────────────────────────────────────────────── */
  const adminUser = createdUsers.find(u => u.role === 'SUPER_ADMIN');
  const now = new Date();
  const leaveData = [
    { emp: createdEmployees[1], type: 'ANNUAL',  start: new Date(now.getFullYear(), now.getMonth(), 5),  end: new Date(now.getFullYear(), now.getMonth(), 12), days: 7,  status: 'PENDING',  reason: 'voyage famille' },
    { emp: createdEmployees[5], type: 'SICK',    start: new Date(now.getFullYear(), now.getMonth(), 2),  end: new Date(now.getFullYear(), now.getMonth(), 4),  days: 3,  status: 'PENDING',  reason: 'ordonnance médecin' },
    { emp: createdEmployees[2], type: 'ANNUAL',  start: new Date(now.getFullYear(), now.getMonth(), 20), end: new Date(now.getFullYear(), now.getMonth(), 27), days: 6,  status: 'PENDING',  reason: 'mariage' },
    { emp: createdEmployees[3], type: 'ANNUAL',  start: new Date(now.getFullYear(), now.getMonth() - 1, 10), end: new Date(now.getFullYear(), now.getMonth() - 1, 20), days: 10, status: 'APPROVED', reason: '' },
    { emp: createdEmployees[0], type: 'SICK',    start: new Date(now.getFullYear(), now.getMonth() - 1, 3), end: new Date(now.getFullYear(), now.getMonth() - 1, 5), days: 2, status: 'APPROVED', reason: 'grippe' },
    { emp: createdEmployees[6], type: 'ANNUAL',  start: new Date(now.getFullYear(), now.getMonth(), 8),  end: new Date(now.getFullYear(), now.getMonth(), 10), days: 2,  status: 'PENDING',  reason: 'affaire personnelle' },
  ];
  for (const l of leaveData) {
    await prisma.leaveRequest.create({
      data: { employeeId: l.emp.id, userId: adminUser.id, type: l.type, startDate: l.start, endDate: l.end, days: l.days, status: l.status, reason: l.reason },
    });
  }
  console.log(`✅ ${leaveData.length} demandes de congé créées`);

  /* ── 5. Bulletins de paie ────────────────────────────────────── */
  for (let m = 3; m >= 1; m--) {
    const rawMonth = now.getMonth() - m + 1;
    const monthNum = ((rawMonth % 12) + 12) % 12 || 12;
    const yearNum  = rawMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
    for (const emp of createdEmployees) {
      await prisma.payroll.create({
        data: { companyId: CID, employeeId: emp.id, month: monthNum, year: yearNum, baseSalary: emp.salary || 60000, netSalary: Math.round((emp.salary || 60000) * 0.87), paidAt: new Date(yearNum, monthNum - 1, 28) },
      }).catch(() => {});
    }
  }
  console.log('✅ Bulletins de paie créés (3 derniers mois)');

  /* ── Résumé ──────────────────────────────────────────────────── */
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║           IDENTIFIANTS PROMÉDAL SARL                ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  Mot de passe COMMUN : promedal2025                 ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  for (const u of createdUsers) {
    const label = `${u.firstName} ${u.lastName}`.padEnd(22);
    console.log(`║  ${label} ${u.email}`);
  }
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
