import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({ select: { id: true, name: true } });
  if (!company) { console.error('Aucune entreprise'); process.exit(1); }
  console.log('Entreprise:', company.name);

  // Upsert modules manquants
  for (const mod of [
    { name: 'Production', slug: 'production', icon: '🏭', color: '#f97316', sortOrder: 9 },
    { name: 'Maintenance', slug: 'maintenance', icon: '🔧', color: '#a855f7', sortOrder: 10 },
    { name: 'Achats', slug: 'purchases', icon: '🛒', color: '#0ea5e9', sortOrder: 11 },
  ]) {
    const m = await prisma.module.upsert({ where: { slug: mod.slug }, create: mod, update: {} });
    await prisma.companyModule.upsert({
      where: { companyId_moduleId: { companyId: company.id, moduleId: m.id } },
      create: { companyId: company.id, moduleId: m.id, enabled: true },
      update: { enabled: true },
    });
  }

  const prodModule = await prisma.module.findFirst({ where: { slug: 'production' } });

  const subs = [
    { name: 'OF / Fabrication',   slug: 'production-orders',     route: '/production/orders',          sortOrder: 1 },
    { name: 'Nomenclatures',      slug: 'production-bom',        route: '/production/bom',             sortOrder: 2 },
    { name: 'Postes de charge',   slug: 'production-workcenters', route: '/production/workcenters',    sortOrder: 3 },
    { name: 'Gammes',             slug: 'gpao-routings',         route: '/production/routings',         sortOrder: 4 },
    { name: 'Calendriers',        slug: 'gpao-calendars',        route: '/production/calendars',        sortOrder: 5 },
    { name: 'Catalogue fourn.',   slug: 'gpao-supplier-catalog', route: '/production/supplier-catalog', sortOrder: 6 },
    { name: 'Calcul MRP (CBN)',   slug: 'gpao-mrp',              route: '/production/mrp',              sortOrder: 7 },
    { name: 'Jalonnement',        slug: 'gpao-scheduling',       route: '/production/scheduling',       sortOrder: 8 },
    { name: 'Manquants',          slug: 'gpao-shortage',         route: '/production/shortage',         sortOrder: 9 },
    { name: 'Tableau de charges', slug: 'gpao-charges',          route: '/production/charges',          sortOrder: 10 },
  ];

  let created = 0, skipped = 0;
  for (const sub of subs) {
    // Upsert SubModule (global)
    const subMod = await prisma.subModule.upsert({
      where: { slug: sub.slug },
      create: { moduleId: prodModule.id, name: sub.name, slug: sub.slug, route: sub.route, icon: '⚙️', sortOrder: sub.sortOrder },
      update: { route: sub.route, sortOrder: sub.sortOrder },
    });

    // Link to company
    const linked = await prisma.companySubmodule.upsert({
      where: { companyId_submoduleId: { companyId: company.id, submoduleId: subMod.id } },
      create: { companyId: company.id, submoduleId: subMod.id, enabled: true },
      update: { enabled: true },
    });

    const isNew = linked.id === linked.id; // always true, just to skip counting; track by checking create vs update
    console.log(`  OK  ${sub.slug}`);
    created++;
  }

  console.log(`\n✅ ${created} sous-modules GPAO configurés pour ${company.name}`);
}

main().catch(e => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
