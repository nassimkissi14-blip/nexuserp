/**
 * seed-full.js — Données médicales complètes pour Promédal SARL
 * Fabricant de consommables médicaux : compresses, seringues, perfuseurs, gaz...
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const now = new Date();
const d = (offset) => new Date(now.getTime() + offset * 86400000);

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) { console.error('Entreprise introuvable'); process.exit(1); }
  const CID = company.id;
  const adminUser = await prisma.user.findFirst({ where: { companyId: CID, role: 'SUPER_ADMIN' } });
  const director  = await prisma.user.findFirst({ where: { companyId: CID, role: 'DIRECTOR' } });
  const managers  = await prisma.user.findMany({ where: { companyId: CID, role: 'MANAGER' } });
  const employees = await prisma.employee.findMany({ where: { companyId: CID } });

  const UID   = adminUser?.id || director?.id;
  const DIRID = director?.id  || UID;

  console.log('\n🏭 Promédal SARL — Consommables médicaux — seed complet\n');

  // ══════════════════════════════════════════
  // 1. NETTOYAGE
  // ══════════════════════════════════════════
  await prisma.simulationSession.deleteMany({ where: { companyId: CID } });
  await prisma.ioTSensor.deleteMany({ where: { companyId: CID } });
  await prisma.shipment.deleteMany({ where: { companyId: CID } });
  await prisma.carrier.deleteMany({ where: { companyId: CID } });
  await prisma.creditNote.deleteMany({ where: { companyId: CID } });
  await prisma.productionOrder.deleteMany({ where: { companyId: CID } });
  await prisma.maintenanceLog.deleteMany({ where: { companyId: CID } });
  await prisma.maintenanceOrder.deleteMany({ where: { companyId: CID } });
  await prisma.maintenanceRequest.deleteMany({ where: { companyId: CID } });
  await prisma.equipment.deleteMany({ where: { companyId: CID } });
  await prisma.routingPhase.deleteMany({ where: { routing: { companyId: CID } } });
  await prisma.routing.deleteMany({ where: { companyId: CID } });
  await prisma.workCenter.deleteMany({ where: { companyId: CID } });
  await prisma.workCalendarDay.deleteMany({ where: { calendar: { companyId: CID } } });
  await prisma.workCalendar.deleteMany({ where: { companyId: CID } });
  await prisma.supplierCatalog.deleteMany({ where: { companyId: CID } });
  await prisma.bomItem.deleteMany({ where: { bom: { companyId: CID } } });
  await prisma.bom.deleteMany({ where: { companyId: CID } });
  await prisma.stockMovement.deleteMany({ where: { companyId: CID } });
  await prisma.inventoryLine.deleteMany({ where: { inventorySession: { companyId: CID } } });
  await prisma.inventorySession.deleteMany({ where: { companyId: CID } });
  await prisma.invoiceItem.deleteMany({ where: { invoice: { companyId: CID } } });
  await prisma.invoice.deleteMany({ where: { companyId: CID } });
  await prisma.orderItem.deleteMany({ where: { order: { companyId: CID } } });
  await prisma.order.deleteMany({ where: { companyId: CID } });
  await prisma.quoteItem.deleteMany({ where: { quote: { companyId: CID } } });
  await prisma.quote.deleteMany({ where: { companyId: CID } });
  const supplierIds = (await prisma.supplier.findMany({ where: { companyId: CID }, select: { id: true } })).map(s => s.id);
  if (supplierIds.length > 0) {
    const poIds = (await prisma.purchaseOrder.findMany({ where: { supplierId: { in: supplierIds } }, select: { id: true } })).map(p => p.id);
    if (poIds.length > 0) await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: { in: poIds } } });
    await prisma.purchaseOrder.deleteMany({ where: { supplierId: { in: supplierIds } } });
  }
  await prisma.product.deleteMany({ where: { companyId: CID } });
  await prisma.customer.deleteMany({ where: { companyId: CID } });
  await prisma.supplier.deleteMany({ where: { companyId: CID } });
  await prisma.task.deleteMany({ where: { project: { companyId: CID } } });
  await prisma.projectMember.deleteMany({ where: { project: { companyId: CID } } });
  await prisma.project.deleteMany({ where: { companyId: CID } });
  await prisma.announcement.deleteMany({ where: { companyId: CID } });
  await prisma.budgetLine.deleteMany({ where: { companyId: CID } });
  await prisma.treasuryEntry.deleteMany({ where: { companyId: CID } });
  await prisma.journalEntry.deleteMany({ where: { companyId: CID } });
  await prisma.candidate.deleteMany({ where: { companyId: CID } });
  const empIds = (await prisma.employee.findMany({ where: { companyId: CID }, select: { id: true } })).map(e => e.id);
  if (empIds.length > 0) {
    await prisma.expenseReport.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.evaluation.deleteMany({ where: { employeeId: { in: empIds } } });
  }
  await prisma.projectResource.deleteMany({ where: { companyId: CID } });
  console.log('🧹 Nettoyage OK');

  // ══════════════════════════════════════════
  // 2. PRODUITS
  // ══════════════════════════════════════════
  const P = {};
  const prodsData = [
    // ── Produits finis FABRIQUÉS
    { sku: 'CMP-1010-B100', name: 'Compresse stérile 10×10 cm — boîte 100',    category: 'Compresses & pansements', unit: 'boîte',  buyPrice: 0,     sellPrice: 980,    stockQty: 420,  minStockQty: 100, articleType: 'FABRIQUE', leadTime: 3,  safetyStock: 50,  lotSize: 100, description: 'Compresse non-tissée stérile, 4 plis, emballage individuel sous blister, stérilisation EtO' },
    { sku: 'CMP-0505-B100', name: 'Compresse stérile 5×5 cm — boîte 100',      category: 'Compresses & pansements', unit: 'boîte',  buyPrice: 0,     sellPrice: 620,    stockQty: 680,  minStockQty: 150, articleType: 'FABRIQUE', leadTime: 3,  safetyStock: 80,  lotSize: 100 },
    { sku: 'SRG-5ML-AG',   name: 'Seringue jetable 5 ml avec aiguille 21G',    category: 'Seringues & aiguilles',   unit: 'boîte',  buyPrice: 0,     sellPrice: 1850,   stockQty: 310,  minStockQty: 80,  articleType: 'FABRIQUE', leadTime: 5,  safetyStock: 40,  lotSize: 50,  description: 'Seringue PP 5ml, aiguille inox 21G×1½", emballage blister stérile, boîte 100 pcs' },
    { sku: 'SRG-10ML-AG',  name: 'Seringue jetable 10 ml avec aiguille 20G',   category: 'Seringues & aiguilles',   unit: 'boîte',  buyPrice: 0,     sellPrice: 2100,   stockQty: 220,  minStockQty: 60,  articleType: 'FABRIQUE', leadTime: 5,  safetyStock: 30,  lotSize: 50 },
    { sku: 'PRF-STD-G',    name: 'Set de perfusion standard avec filtre',       category: 'Perfusion & transfusion', unit: 'boîte',  buyPrice: 0,     sellPrice: 3400,   stockQty: 185,  minStockQty: 50,  articleType: 'FABRIQUE', leadTime: 7,  safetyStock: 25,  lotSize: 25,  description: 'Perfuseur PVC médical, filtre 15µm, chambre goutte-à-goutte, longueur 150cm, stérile EtO' },
    { sku: 'BGZ-10X5',     name: 'Bande de gaze hydrophile 10cm×5m',           category: 'Compresses & pansements', unit: 'boîte',  buyPrice: 0,     sellPrice: 750,    stockQty: 540,  minStockQty: 120, articleType: 'FABRIQUE', leadTime: 3,  safetyStock: 60,  lotSize: 100, description: 'Bande gaze coton 100%, armure simple, non stérile, boîte 12 pièces' },
    { sku: 'PAN-ADH-B100', name: 'Pansement adhésif assortis — boîte 100',     category: 'Compresses & pansements', unit: 'boîte',  buyPrice: 0,     sellPrice: 880,    stockQty: 390,  minStockQty: 100, articleType: 'FABRIQUE', leadTime: 4,  safetyStock: 50,  lotSize: 100, description: 'Pansements adhésifs bande et coupelles, assortis, emballage individuel' },
    { sku: 'GLT-LAT-M-100',name: 'Gants examen latex taille M — boîte 100',   category: 'Gants médicaux',          unit: 'boîte',  buyPrice: 0,     sellPrice: 1650,   stockQty: 460,  minStockQty: 100, articleType: 'FABRIQUE', leadTime: 5,  safetyStock: 50,  lotSize: 100 },
    { sku: 'CTH-IV-G18',   name: 'Cathéter IV 18G avec obturateur',            category: 'Perfusion & transfusion', unit: 'boîte',  buyPrice: 0,     sellPrice: 4800,   stockQty: 120,  minStockQty: 30,  articleType: 'FABRIQUE', leadTime: 7,  safetyStock: 15,  lotSize: 25,  description: 'Cathéter intraveineux 18G, Teflon®, ailettes, obturateur, stérile EtO, boîte 50' },

    // ── Matières premières / composants ACHETÉS
    { sku: 'MAT-COT-25',   name: 'Coton hydrophile brut rouleau 25 kg',        category: 'Matières premières',      unit: 'rouleau',buyPrice: 12500,  sellPrice: 0,     stockQty: 28,   minStockQty: 8,   articleType: 'ACHETE', leadTime: 7,  safetyStock: 4,   lotSize: 5 },
    { sku: 'MAT-SMS-30',   name: 'Non-tissé SMS 30 g/m² — rouleau 500m',      category: 'Matières premières',      unit: 'rouleau',buyPrice: 18000,  sellPrice: 0,     stockQty: 15,   minStockQty: 5,   articleType: 'ACHETE', leadTime: 10, safetyStock: 3,   lotSize: 5 },
    { sku: 'MAT-PP-25',    name: 'Polypropylène médical PP — sac 25 kg',       category: 'Matières premières',      unit: 'sac',    buyPrice: 9800,   sellPrice: 0,     stockQty: 42,   minStockQty: 10,  articleType: 'ACHETE', leadTime: 7,  safetyStock: 5,   lotSize: 10 },
    { sku: 'MAT-PVC-KG',   name: 'PVC médical souple (granulés) — sac 25 kg', category: 'Matières premières',      unit: 'sac',    buyPrice: 11200,  sellPrice: 0,     stockQty: 18,   minStockQty: 5,   articleType: 'ACHETE', leadTime: 14, safetyStock: 3,   lotSize: 5 },
    { sku: 'MAT-INX-FIL',  name: 'Fil acier inox 304 Ø0,7 mm — bobine 5 kg', category: 'Matières premières',      unit: 'bobine', buyPrice: 8400,   sellPrice: 0,     stockQty: 22,   minStockQty: 6,   articleType: 'ACHETE', leadTime: 10, safetyStock: 3,   lotSize: 5 },
    { sku: 'MAT-LAT-20',   name: 'Latex naturel concentré 60 % — bidon 20 L', category: 'Matières premières',      unit: 'bidon',  buyPrice: 16500,  sellPrice: 0,     stockQty: 12,   minStockQty: 4,   articleType: 'ACHETE', leadTime: 14, safetyStock: 2,   lotSize: 4 },
    { sku: 'EMB-BLI-STE',  name: 'Sachet blister stérile kraft/PE (lot 1000)', category: 'Emballages',             unit: 'lot',    buyPrice: 4200,   sellPrice: 0,     stockQty: 55,   minStockQty: 15,  articleType: 'ACHETE', leadTime: 5,  safetyStock: 8,   lotSize: 10 },
    { sku: 'EMB-CTN-M',    name: 'Carton d\'emballage moyen (lot 50)',          category: 'Emballages',             unit: 'lot',    buyPrice: 1800,   sellPrice: 0,     stockQty: 80,   minStockQty: 20,  articleType: 'ACHETE', leadTime: 3,  safetyStock: 10,  lotSize: 20 },
    { sku: 'MAT-ETO-BON',  name: 'Oxyde d\'éthylène EtO — bouteille 10 kg',   category: 'Stérilisation',           unit: 'bouteille',buyPrice:32000, sellPrice: 0,     stockQty: 6,    minStockQty: 2,   articleType: 'ACHETE', leadTime: 21, safetyStock: 1,   lotSize: 2 },
    { sku: 'MAT-GDG',      name: 'Chambre goutte-à-goutte PVC (lot 500)',      category: 'Composants perfusion',    unit: 'lot',    buyPrice: 9500,   sellPrice: 0,     stockQty: 10,   minStockQty: 3,   articleType: 'ACHETE', leadTime: 14, safetyStock: 2,   lotSize: 5 },
    { sku: 'MAT-FLT-15',   name: 'Filtre air 15 µm perfuseur (lot 500)',       category: 'Composants perfusion',    unit: 'lot',    buyPrice: 7200,   sellPrice: 0,     stockQty: 8,    minStockQty: 2,   articleType: 'ACHETE', leadTime: 14, safetyStock: 1,   lotSize: 3 },
  ];

  for (const p of prodsData) {
    const prod = await prisma.product.create({ data: { ...p, companyId: CID } });
    P[p.sku] = prod;
  }
  console.log(`✅ ${prodsData.length} produits créés`);

  // ══════════════════════════════════════════
  // 3. POSTES DE CHARGE
  // ══════════════════════════════════════════
  const WC = {};
  const wcData = [
    { code: 'DECOUP',  name: 'Ligne de découpe coton & gaze',       type: 'F', capacity: 8, machineCount: 2, weeklyHours: 40, occupancyRate: 0.85, notes: '2 découpeuses rotatives — lames à vérifier toutes les 72h' },
    { code: 'INJECT',  name: 'Injection plastique PP/PVC',          type: 'F', capacity: 8, machineCount: 3, weeklyHours: 40, occupancyRate: 0.90, notes: 'Presses Arburg 320t — moules seringues 5ml et 10ml' },
    { code: 'CONDITI', name: 'Conditionnement & emballage',         type: 'A', capacity: 8, machineCount: 4, weeklyHours: 40, occupancyRate: 0.88, notes: 'Ligne semi-auto : thermo-scelleuse + étiqueteuse + encaisseuse' },
    { code: 'STERIL',  name: 'Chambre de stérilisation EtO',        type: 'F', capacity: 16, machineCount: 1, weeklyHours: 40, occupancyRate: 0.70, notes: 'Cycle 12h — température 55°C — ne pas ouvrir avant fin dégazage 48h' },
    { code: 'QUALIT',  name: 'Contrôle qualité & métrologie',       type: 'C', capacity: 8, machineCount: 1, weeklyHours: 35, occupancyRate: 0.65, notes: 'Tests : intégrité emballage, stérilité, résistance rupture — ISO 11135' },
  ];
  for (const wc of wcData) {
    const w = await prisma.workCenter.create({ data: { ...wc, companyId: CID } });
    WC[wc.code] = w;
  }
  console.log(`✅ ${wcData.length} postes de charge créés`);

  // ══════════════════════════════════════════
  // 4. GAMMES
  // ══════════════════════════════════════════
  const routingsData = [
    {
      code: 'G-CMP', name: 'Gamme Compresses stériles', productId: P['CMP-1010-B100'].id,
      phases: [
        { sequence: 1, name: 'Découpe coton & pliage 4 plis',       workCenterId: WC['DECOUP'].id,  setupTime: 0.25, machineTime: 0.02, laborTime: 0.01, transferTime: 0.10 },
        { sequence: 2, name: 'Conditionnement blister individuel',   workCenterId: WC['CONDITI'].id, setupTime: 0.50, machineTime: 0.01, laborTime: 0.01, transferTime: 0.25 },
        { sequence: 3, name: 'Mise en boîte 100 pcs & fermeture',   workCenterId: WC['CONDITI'].id, setupTime: 0.25, machineTime: 0.008,laborTime: 0.005,transferTime: 0.50 },
        { sequence: 4, name: 'Stérilisation EtO cycle 12h',         workCenterId: WC['STERIL'].id,  setupTime: 1.00, machineTime: 0.12, laborTime: 0.05, transferTime: 2.00 },
        { sequence: 5, name: 'Contrôle qualité & libération lot',   workCenterId: WC['QUALIT'].id,  setupTime: 0.00, machineTime: 0.05, laborTime: 0.05, transferTime: 0.00 },
      ],
    },
    {
      code: 'G-SRG', name: 'Gamme Seringues jetables', productId: P['SRG-5ML-AG'].id,
      phases: [
        { sequence: 1, name: 'Injection corps seringue PP',          workCenterId: WC['INJECT'].id,  setupTime: 0.50, machineTime: 0.005,laborTime: 0.002,transferTime: 0.10 },
        { sequence: 2, name: 'Assemblage piston + aiguille inox',    workCenterId: WC['CONDITI'].id, setupTime: 0.25, machineTime: 0.01, laborTime: 0.01, transferTime: 0.10 },
        { sequence: 3, name: 'Emballage blister individuel',         workCenterId: WC['CONDITI'].id, setupTime: 0.50, machineTime: 0.008,laborTime: 0.005,transferTime: 0.25 },
        { sequence: 4, name: 'Mise en boîte 100 pcs',               workCenterId: WC['CONDITI'].id, setupTime: 0.25, machineTime: 0.005,laborTime: 0.003,transferTime: 0.50 },
        { sequence: 5, name: 'Stérilisation EtO',                   workCenterId: WC['STERIL'].id,  setupTime: 1.00, machineTime: 0.12, laborTime: 0.05, transferTime: 2.00 },
        { sequence: 6, name: 'Contrôle & libération lot',           workCenterId: WC['QUALIT'].id,  setupTime: 0.00, machineTime: 0.04, laborTime: 0.04, transferTime: 0.00 },
      ],
    },
    {
      code: 'G-PRF', name: 'Gamme Set de perfusion', productId: P['PRF-STD-G'].id,
      phases: [
        { sequence: 1, name: 'Extrusion & découpe tube PVC 150cm',  workCenterId: WC['INJECT'].id,  setupTime: 0.50, machineTime: 0.03, laborTime: 0.01, transferTime: 0.10 },
        { sequence: 2, name: 'Assemblage chambre + filtre + aiguille', workCenterId: WC['CONDITI'].id, setupTime: 0.50, machineTime: 0.04, laborTime: 0.03, transferTime: 0.10 },
        { sequence: 3, name: 'Emballage sachet individuel scellé',   workCenterId: WC['CONDITI'].id, setupTime: 0.25, machineTime: 0.02, laborTime: 0.01, transferTime: 0.50 },
        { sequence: 4, name: 'Stérilisation EtO cycle 12h',         workCenterId: WC['STERIL'].id,  setupTime: 1.00, machineTime: 0.12, laborTime: 0.05, transferTime: 2.00 },
        { sequence: 5, name: 'CQ : test intégrité & stérilité',     workCenterId: WC['QUALIT'].id,  setupTime: 0.00, machineTime: 0.06, laborTime: 0.06, transferTime: 0.00 },
      ],
    },
    {
      code: 'G-GLT', name: 'Gamme Gants latex', productId: P['GLT-LAT-M-100'].id,
      phases: [
        { sequence: 1, name: 'Trempage formes en latex',             workCenterId: WC['INJECT'].id,  setupTime: 1.00, machineTime: 0.01, laborTime: 0.005,transferTime: 0.25 },
        { sequence: 2, name: 'Vulcanisation & chlorination',        workCenterId: WC['STERIL'].id,  setupTime: 0.50, machineTime: 0.05, laborTime: 0.02, transferTime: 0.50 },
        { sequence: 3, name: 'Dépoudrage & mise en boîte 100 pcs',  workCenterId: WC['CONDITI'].id, setupTime: 0.25, machineTime: 0.01, laborTime: 0.01, transferTime: 0.25 },
        { sequence: 4, name: 'Contrôle qualité (AQL 1,5)',          workCenterId: WC['QUALIT'].id,  setupTime: 0.00, machineTime: 0.03, laborTime: 0.03, transferTime: 0.00 },
      ],
    },
  ];
  const R = {};
  for (const r of routingsData) {
    const { phases, ...rest } = r;
    const routing = await prisma.routing.create({ data: { ...rest, companyId: CID, phases: { create: phases } } });
    R[r.code] = routing;
  }
  console.log(`✅ ${routingsData.length} gammes créées`);

  // ══════════════════════════════════════════
  // 5. NOMENCLATURES (BOM)
  // ══════════════════════════════════════════
  const bomsData = [
    {
      productId: P['CMP-1010-B100'].id, version: '2.0',
      description: 'Compresse 10×10 / boîte 100 — coton + SMS + blister + EtO',
      items: [
        { productId: P['MAT-COT-25'].id,  quantity: 0.12,  unit: 'rouleau', scrapRate: 0.03 },
        { productId: P['MAT-SMS-30'].id,  quantity: 0.05,  unit: 'rouleau', scrapRate: 0.03 },
        { productId: P['EMB-BLI-STE'].id, quantity: 0.10,  unit: 'lot',     scrapRate: 0.02 },
        { productId: P['EMB-CTN-M'].id,   quantity: 0.02,  unit: 'lot',     scrapRate: 0.00 },
        { productId: P['MAT-ETO-BON'].id, quantity: 0.005, unit: 'bouteille',scrapRate: 0.00 },
      ],
    },
    {
      productId: P['CMP-0505-B100'].id, version: '1.5',
      items: [
        { productId: P['MAT-COT-25'].id,  quantity: 0.06,  unit: 'rouleau', scrapRate: 0.03 },
        { productId: P['MAT-SMS-30'].id,  quantity: 0.025, unit: 'rouleau', scrapRate: 0.03 },
        { productId: P['EMB-BLI-STE'].id, quantity: 0.10,  unit: 'lot',     scrapRate: 0.02 },
        { productId: P['EMB-CTN-M'].id,   quantity: 0.02,  unit: 'lot',     scrapRate: 0.00 },
        { productId: P['MAT-ETO-BON'].id, quantity: 0.004, unit: 'bouteille',scrapRate: 0.00 },
      ],
    },
    {
      productId: P['SRG-5ML-AG'].id, version: '3.1',
      description: 'Seringue 5ml / boîte 100 — corps PP + aiguille inox + blister EtO',
      items: [
        { productId: P['MAT-PP-25'].id,   quantity: 0.08,  unit: 'sac',      scrapRate: 0.04 },
        { productId: P['MAT-INX-FIL'].id, quantity: 0.04,  unit: 'bobine',   scrapRate: 0.02 },
        { productId: P['EMB-BLI-STE'].id, quantity: 0.10,  unit: 'lot',      scrapRate: 0.02 },
        { productId: P['EMB-CTN-M'].id,   quantity: 0.02,  unit: 'lot',      scrapRate: 0.00 },
        { productId: P['MAT-ETO-BON'].id, quantity: 0.006, unit: 'bouteille',scrapRate: 0.00 },
      ],
    },
    {
      productId: P['PRF-STD-G'].id, version: '2.2',
      description: 'Set perfusion / boîte 25 — tube PVC + chambre + filtre + EtO',
      items: [
        { productId: P['MAT-PVC-KG'].id,  quantity: 0.12,  unit: 'sac',      scrapRate: 0.05 },
        { productId: P['MAT-GDG'].id,     quantity: 0.05,  unit: 'lot',      scrapRate: 0.02 },
        { productId: P['MAT-FLT-15'].id,  quantity: 0.05,  unit: 'lot',      scrapRate: 0.01 },
        { productId: P['MAT-INX-FIL'].id, quantity: 0.02,  unit: 'bobine',   scrapRate: 0.02 },
        { productId: P['EMB-BLI-STE'].id, quantity: 0.025, unit: 'lot',      scrapRate: 0.02 },
        { productId: P['EMB-CTN-M'].id,   quantity: 0.02,  unit: 'lot',      scrapRate: 0.00 },
        { productId: P['MAT-ETO-BON'].id, quantity: 0.008, unit: 'bouteille',scrapRate: 0.00 },
      ],
    },
    {
      productId: P['GLT-LAT-M-100'].id, version: '1.3',
      items: [
        { productId: P['MAT-LAT-20'].id,  quantity: 0.25,  unit: 'bidon',    scrapRate: 0.05 },
        { productId: P['EMB-CTN-M'].id,   quantity: 0.02,  unit: 'lot',      scrapRate: 0.00 },
      ],
    },
  ];
  for (const b of bomsData) {
    const { items, ...rest } = b;
    await prisma.bom.create({ data: { ...rest, companyId: CID, items: { create: items } } });
  }
  console.log(`✅ ${bomsData.length} nomenclatures créées`);

  // ══════════════════════════════════════════
  // 6. CLIENTS
  // ══════════════════════════════════════════
  const C = [];
  const clientsData = [
    { name: 'CHU Mustapha Pacha Alger',          email: 'pharmacie.chu@mustapha.dz',   phone: '021 23 45 67', address: 'Bd Krim Belkacem, Alger-Centre',         type: 'COMPANY',     status: 'ACTIVE',   notes: 'Client grand compte — pharmacie centrale, commandes mensuelles, paiement 60j fin de mois. Contact: Mme Benmansour' },
    { name: 'EHU 1er Novembre Oran',              email: 'pharma@ehu-oran.dz',           phone: '041 41 10 20', address: 'BP 4166 El-Mnaouer, Oran',                type: 'COMPANY',     status: 'ACTIVE',   notes: 'Hôpital universitaire — appels d\'offres annuels, délai paiement 90j. Réf. marché MP-2026-0044' },
    { name: 'Clinique Amouri Sétif',              email: 'amouri.clinique@gmail.com',    phone: '036 84 22 11', address: 'Cité des sports, Sétif',                  type: 'COMPANY',     status: 'ACTIVE',   notes: 'Clinique privée — paiement comptant livraison' },
    { name: 'Hôpital Frantz Fanon Blida',         email: 'daf@fanon-blida.dz',           phone: '025 41 22 10', address: 'Bd Colonel Lotfi, Blida',                  type: 'COMPANY',     status: 'ACTIVE',   notes: 'Marché public — prévoir BL en 3 exemplaires + attestation de conformité' },
    { name: 'MedPharma Distribution SARL',        email: 'achat@medpharma.dz',           phone: '021 78 34 56', address: 'Zone industrielle Réghaïa, Alger',         type: 'COMPANY',     status: 'ACTIVE',   notes: 'Distributeur agréé — remise 10%, commandes ≥500 boîtes. Livraison entrepôt Rouïba' },
    { name: 'Pharmacie Centrale Constantine',      email: 'pharmacentrale.cte@yahoo.fr', phone: '031 67 44 90', address: 'Rue Larbi Ben Mhidi, Constantine',         type: 'COMPANY',     status: 'ACTIVE' },
    { name: 'Polyclinique El Hayat Annaba',        email: 'elhayat.annaba@hotmail.com',  phone: '038 86 33 77', address: 'Cité El Bouni, Annaba',                    type: 'COMPANY',     status: 'PROSPECT', notes: 'En attente devis seringues + compresses — contact Dr. Khedim' },
    { name: 'Centre de dialyse Tlemcen',           email: 'dialyse.tlemcen@gmail.com',   phone: '043 27 55 66', address: 'Rue du 1er Novembre, Tlemcen',             type: 'COMPANY',     status: 'ACTIVE',   notes: 'Fort consommateur perfuseurs — commandes bi-mensuelles' },
    { name: 'Etablissement sanitaire de Béjaïa',  email: 'esb.achat@esb.dz',            phone: '034 17 88 44', address: 'Route de Sidi Ali Labhar, Béjaïa',         type: 'COMPANY',     status: 'LEAD',     notes: 'Premier contact suite salon médical — demande tarif gants et compresses' },
    { name: 'Dr. Raouf Cheriet (cabinet privé)',  email: 'r.cheriet@cabinet-med.dz',    phone: '0770 12 34 56', address: '14 Rue Didouche Mourad, Alger',            type: 'INDIVIDUAL',  status: 'ACTIVE',   notes: 'Commandes petites quantités — paiement immédiat espèces ou virement' },
  ];
  for (const c of clientsData) {
    const cl = await prisma.customer.create({ data: { ...c, companyId: CID } });
    C.push(cl);
  }
  console.log(`✅ ${C.length} clients créés`);

  // ══════════════════════════════════════════
  // 7. FOURNISSEURS
  // ══════════════════════════════════════════
  const F = [];
  const fournsData = [
    { name: 'Coton & Fibres Maghreb SARL',   email: 'ventes@cotonmaghreb.dz',       phone: '036 72 44 11', address: 'Zone industrielle Sétif',           country: 'DZ', taxId: '099136072', paymentTerms: 30 },
    { name: 'PolyChem Algeria',               email: 'commercial@polychem.dz',       phone: '021 55 88 44', address: 'Lot 22 ZI Oued Smar, Alger',        country: 'DZ', taxId: '099155088', paymentTerms: 30 },
    { name: 'Emballage Médical Pro',          email: 'emp.algerie@gmail.com',        phone: '025 33 11 77', address: 'Zone artisanale Blida',              country: 'DZ', taxId: '099225033', paymentTerms: 15 },
    { name: 'Inox & Aciers Spéciaux DZ',     email: 'info@inoxaciers.dz',           phone: '021 44 22 88', address: 'Haï Bouabdallah, Alger',            country: 'DZ', taxId: '099144022', paymentTerms: 30 },
    { name: 'SterMed France — EtO & gaz méd.',email: 'export@stermed-france.com',   phone: '+33 4 72 33 88 55', address: '8 Rue des Laboratoires, Lyon 69007', country: 'FR', taxId: 'FR22481234567', paymentTerms: 60 },
    { name: 'LatexTech Malaysia Sdn. Bhd.',   email: 'sales@latextech.com.my',       phone: '+60 3 8888 1234', address: 'Shah Alam Industrial Park, Selangor', country: 'MY', taxId: 'MY201401234567', paymentTerms: 45 },
  ];
  for (const f of fournsData) {
    const fo = await prisma.supplier.create({ data: { ...f, companyId: CID } });
    F.push(fo);
  }
  console.log(`✅ ${F.length} fournisseurs créés`);

  // ══════════════════════════════════════════
  // 8. CATALOGUE FOURNISSEURS
  // ══════════════════════════════════════════
  const catalogData = [
    { supplierId: F[0].id, productId: P['MAT-COT-25'].id,  price: 12200, leadTime: 7,  minQty: 5,  isDefault: true,  reference: 'CFM-COT25K' },
    { supplierId: F[0].id, productId: P['MAT-SMS-30'].id,  price: 17500, leadTime: 10, minQty: 5,  isDefault: true,  reference: 'CFM-SMS30G' },
    { supplierId: F[1].id, productId: P['MAT-PP-25'].id,   price: 9600,  leadTime: 7,  minQty: 10, isDefault: true,  reference: 'PC-PP25MED' },
    { supplierId: F[1].id, productId: P['MAT-PVC-KG'].id,  price: 11000, leadTime: 14, minQty: 5,  isDefault: true,  reference: 'PC-PVCSFT' },
    { supplierId: F[2].id, productId: P['EMB-BLI-STE'].id, price: 4000,  leadTime: 5,  minQty: 10, isDefault: true,  reference: 'EMP-BLI1K' },
    { supplierId: F[2].id, productId: P['EMB-CTN-M'].id,   price: 1750,  leadTime: 3,  minQty: 20, isDefault: true,  reference: 'EMP-CTN50' },
    { supplierId: F[3].id, productId: P['MAT-INX-FIL'].id, price: 8200,  leadTime: 10, minQty: 5,  isDefault: true,  reference: 'IAS-FIL07' },
    { supplierId: F[4].id, productId: P['MAT-ETO-BON'].id, price: 31000, leadTime: 21, minQty: 2,  isDefault: true,  reference: 'SM-ETO10K' },
    { supplierId: F[4].id, productId: P['MAT-GDG'].id,     price: 9200,  leadTime: 14, minQty: 5,  isDefault: true,  reference: 'SM-GDG500' },
    { supplierId: F[4].id, productId: P['MAT-FLT-15'].id,  price: 7000,  leadTime: 14, minQty: 3,  isDefault: true,  reference: 'SM-FLT15' },
    { supplierId: F[5].id, productId: P['MAT-LAT-20'].id,  price: 16000, leadTime: 14, minQty: 4,  isDefault: true,  reference: 'LT-LAT60-20L' },
  ];
  for (const cat of catalogData) {
    await prisma.supplierCatalog.create({ data: { ...cat, companyId: CID } }).catch(() => {});
  }
  console.log('✅ Catalogue fournisseurs créé');

  // ══════════════════════════════════════════
  // 9. COMMANDES CLIENTS
  // ══════════════════════════════════════════
  const ordersData = [
    { customerId: C[0].id, reference: 'CMD-2026-001', status: 'DELIVERED',  totalAmount: 1245000, orderDate: d(-50), deliveryDate: d(-22), notes: 'Livraison mensuelle CHU — lot compresses + seringues 5ml. Tout reçu OK.' },
    { customerId: C[1].id, reference: 'CMD-2026-002', status: 'PROCESSING', totalAmount: 2180000, orderDate: d(-18), deliveryDate: d(15),  notes: 'Marché MP-2026-0044 EHU Oran — urgent, inauguration service réa le 15/05' },
    { customerId: C[4].id, reference: 'CMD-2026-003', status: 'CONFIRMED',  totalAmount: 3750000, orderDate: d(-10), deliveryDate: d(30),  notes: 'Commande distributeur MedPharma — remise 10% appliquée, livraison entrepôt Rouïba' },
    { customerId: C[7].id, reference: 'CMD-2026-004', status: 'CONFIRMED',  totalAmount: 612000,  orderDate: d(-8),  deliveryDate: d(20),  notes: 'Dialyse Tlemcen — perfuseurs bi-mensuel, voir historique précédent' },
    { customerId: C[3].id, reference: 'CMD-2026-005', status: 'DELIVERED',  totalAmount: 588000,  orderDate: d(-60), deliveryDate: d(-30), notes: 'Hôpital Fanon — BL fait en 3 exemplaires, attestation de conformité jointe' },
    { customerId: C[2].id, reference: 'CMD-2026-006', status: 'SHIPPED',    totalAmount: 415000,  orderDate: d(-25), deliveryDate: d(3),   notes: 'Clinique Amouri — livraison directe cabinet, contact M. Amouri sur place' },
    { customerId: C[9].id, reference: 'CMD-2026-007', status: 'DELIVERED',  totalAmount: 88000,   orderDate: d(-70), deliveryDate: d(-55) },
    { customerId: C[5].id, reference: 'CMD-2026-008', status: 'DRAFT',      totalAmount: 960000,  orderDate: d(-2),  deliveryDate: d(45),  notes: 'À confirmer avant le 03/05 — attente bon de commande pharmacie Constantine' },
    { customerId: C[0].id, reference: 'CMD-2026-009', status: 'CONFIRMED',  totalAmount: 1840000, orderDate: d(-3),  deliveryDate: d(60),  notes: 'CHU — lot 2 trimestre 2026, mix compresses + gants + seringues' },
  ];
  const O = [];
  for (const o of ordersData) {
    const order = await prisma.order.create({ data: { ...o, companyId: CID, currency: 'DZD' } });
    O.push(order);
  }
  // Items
  const orderItemsMap = [
    [ { productId: P['CMP-1010-B100'].id, quantity: 600, unitPrice: 980,  totalPrice: 588000  }, { productId: P['SRG-5ML-AG'].id, quantity: 300, unitPrice: 1850, totalPrice: 555000 }, { productId: P['BGZ-10X5'].id, quantity: 136, unitPrice: 750, totalPrice: 102000 } ],
    [ { productId: P['PRF-STD-G'].id,    quantity: 400, unitPrice: 3400, totalPrice: 1360000 }, { productId: P['SRG-10ML-AG'].id,quantity: 300, unitPrice: 2100, totalPrice: 630000 }, { productId: P['CMP-1010-B100'].id, quantity: 194, unitPrice: 980, totalPrice: 190120 } ],
    [ { productId: P['CMP-1010-B100'].id,quantity: 1500,unitPrice: 882,  totalPrice: 1323000 }, { productId: P['GLT-LAT-M-100'].id,quantity:800, unitPrice: 1485,totalPrice: 1188000}, { productId: P['SRG-5ML-AG'].id,quantity:600, unitPrice: 1665, totalPrice: 999000} ],
    [ { productId: P['PRF-STD-G'].id,    quantity: 180, unitPrice: 3400, totalPrice: 612000  } ],
    [ { productId: P['SRG-5ML-AG'].id,   quantity: 200, unitPrice: 1850, totalPrice: 370000  }, { productId: P['CMP-0505-B100'].id,quantity:200, unitPrice: 620, totalPrice: 124000 }, { productId: P['PAN-ADH-B100'].id, quantity:107, unitPrice: 880, totalPrice: 93960} ],
    [ { productId: P['GLT-LAT-M-100'].id,quantity: 150, unitPrice: 1650, totalPrice: 247500  }, { productId: P['CMP-1010-B100'].id,quantity:150, unitPrice: 980, totalPrice: 147000 }, { productId: P['BGZ-10X5'].id, quantity:27, unitPrice: 750, totalPrice: 20250} ],
    [ { productId: P['CMP-0505-B100'].id,quantity:  80, unitPrice: 620,  totalPrice: 49600   }, { productId: P['PAN-ADH-B100'].id, quantity:  44, unitPrice: 880, totalPrice: 38720} ],
    [ { productId: P['CMP-1010-B100'].id,quantity: 500, unitPrice: 980,  totalPrice: 490000  }, { productId: P['SRG-5ML-AG'].id, quantity:200, unitPrice: 1850,totalPrice: 370000}, { productId: P['PAN-ADH-B100'].id,quantity:114,unitPrice:880,totalPrice:100320} ],
    [ { productId: P['CMP-1010-B100'].id,quantity: 600, unitPrice: 980,  totalPrice: 588000  }, { productId: P['GLT-LAT-M-100'].id,quantity:500,unitPrice:1650,totalPrice:825000}, { productId: P['SRG-5ML-AG'].id,quantity:230,unitPrice:1850,totalPrice:425500}, { productId: P['SRG-10ML-AG'].id,quantity:1,unitPrice:2100,totalPrice:2100} ],
  ];
  for (let i = 0; i < O.length; i++) {
    for (const item of orderItemsMap[i]) {
      await prisma.orderItem.create({ data: { orderId: O[i].id, discount: 0, ...item } });
    }
  }
  console.log(`✅ ${O.length} commandes créées`);

  // ══════════════════════════════════════════
  // 10. DEVIS
  // ══════════════════════════════════════════
  const quotesData = [
    { customerId: C[6].id, reference: 'DEV-2026-001', status: 'SENT',     subtotal: 2016807, taxRate: 19, taxAmount: 383193, totalAmount: 2400000, issueDate: d(-6),  validUntil: d(24), notes: 'Devis Polyclinique El Hayat — compresses + seringues 6 mois — tarif préliminaire, frais transport non inclus' },
    { customerId: C[8].id, reference: 'DEV-2026-002', status: 'SENT',     subtotal: 630252,  taxRate: 19, taxAmount: 119748, totalAmount: 750000,  issueDate: d(-4),  validUntil: d(26), notes: 'Premier devis ES Béjaïa — gants + compresses' },
    { customerId: C[4].id, reference: 'DEV-2026-003', status: 'ACCEPTED', subtotal: 3151261, taxRate: 19, taxAmount: 598739, totalAmount: 3750000, issueDate: d(-15), validUntil: d(15), notes: 'Converti en CMD-2026-003' },
    { customerId: C[7].id, reference: 'DEV-2026-004', status: 'ACCEPTED', subtotal: 514286,  taxRate: 19, taxAmount: 97714,  totalAmount: 612000,  issueDate: d(-12), validUntil: d(18) },
    { customerId: C[1].id, reference: 'DEV-2025-088', status: 'REJECTED', subtotal: 1848739, taxRate: 19, taxAmount: 351261, totalAmount: 2200000, issueDate: d(-95), validUntil: d(-65), notes: 'Refusé — prix trop élevé selon DAF EHU, ont négocié un avenant par la suite sur base CMD-2026-002' },
  ];
  for (const q of quotesData) {
    const quote = await prisma.quote.create({ data: { ...q, companyId: CID, currency: 'DZD' } });
    await prisma.quoteItem.create({ data: { quoteId: quote.id, description: 'Consommables médicaux Promédal (voir annexe détail)', quantity: 1, unitPrice: q.subtotal, totalPrice: q.subtotal } });
  }
  console.log(`✅ ${quotesData.length} devis créés`);

  // ══════════════════════════════════════════
  // 11. FACTURES
  // ══════════════════════════════════════════
  const invoicesData = [
    { customerId: C[0].id, orderId: O[0].id, reference: 'FAC-2026-001', status: 'PAID',    subtotal: 1046218, taxRate: 19, taxAmount: 198782, totalAmount: 1245000, issueDate: d(-48), dueDate: d(-18), paidAt: d(-15), notes: 'Paiement reçu par virement BNA — merci CHU' },
    { customerId: C[4].id, orderId: O[2].id, reference: 'FAC-2026-002', status: 'SENT',    subtotal: 3151261, taxRate: 19, taxAmount: 598739, totalAmount: 3750000, issueDate: d(-8),  dueDate: d(22),  notes: 'Remise 10% incluse — 1er versement attendu avant le 15/05' },
    { customerId: C[3].id, orderId: O[4].id, reference: 'FAC-2026-003', status: 'PAID',    subtotal: 494118,  taxRate: 19, taxAmount: 93882,  totalAmount: 588000,  issueDate: d(-58), dueDate: d(-28), paidAt: d(-22) },
    { customerId: C[7].id, orderId: O[3].id, reference: 'FAC-2026-004', status: 'SENT',    subtotal: 514286,  taxRate: 19, taxAmount: 97714,  totalAmount: 612000,  issueDate: d(-6),  dueDate: d(24) },
    { customerId: C[1].id, orderId: O[1].id, reference: 'FAC-2026-005', status: 'DRAFT',   subtotal: 1831933, taxRate: 19, taxAmount: 348067, totalAmount: 2180000, issueDate: d(-15), dueDate: d(75),  notes: 'Facture provisoire — à finaliser après réception totale CMD-2026-002' },
    { customerId: C[9].id, orderId: O[6].id, reference: 'FAC-2025-199', status: 'PAID',    subtotal: 73950,   taxRate: 19, taxAmount: 14050,  totalAmount: 88000,   issueDate: d(-68), dueDate: d(-38), paidAt: d(-35) },
    { customerId: C[2].id, orderId: O[5].id, reference: 'FAC-2026-006', status: 'OVERDUE', subtotal: 348739,  taxRate: 19, taxAmount: 66261,  totalAmount: 415000,  issueDate: d(-23), dueDate: d(-8),  notes: 'Relance envoyée 28/04 — M. Amouri ne répond pas. Escalader à direction.' },
  ];
  for (const inv of invoicesData) {
    const invoice = await prisma.invoice.create({ data: { ...inv, companyId: CID, currency: 'DZD' } });
    await prisma.invoiceItem.create({ data: { invoiceId: invoice.id, description: 'Consommables médicaux Promédal SARL', quantity: 1, unitPrice: inv.subtotal, totalPrice: inv.subtotal } });
  }
  console.log(`✅ ${invoicesData.length} factures créées`);

  // Avoirs
  await prisma.creditNote.create({ data: { companyId: CID, customerId: C[0].id, reference: 'AV-2026-001', invoiceRef: 'FAC-2026-001', amount: 98000, reason: 'Lot compresses CMP-0505 — 100 boîtes refusées à réception (emballage défectueux, lot JA2603). Avoir appliqué sur prochaine commande.', status: 'APPLIED', issuedAt: d(-12) } });
  await prisma.creditNote.create({ data: { companyId: CID, customerId: C[4].id, reference: 'AV-2026-002', invoiceRef: 'FAC-2026-002', amount: 375000, reason: 'Remise fidélité négociée directement avec DG — accord verbal confirmé par mail du 22/04', status: 'ISSUED', issuedAt: d(-6) } });
  console.log('✅ 2 avoirs créés');

  // ══════════════════════════════════════════
  // 12. COMMANDES ACHAT
  // ══════════════════════════════════════════
  const purchasesRaw = [
    { supplierId: F[0].id, reference: 'ACH-2026-001', status: 'RECEIVED',  totalAmount: 183000, orderDate: d(-20), deliveryDate: d(-8),  notes: 'Coton + SMS reçus — 15 rouleaux coton & 5 SMS. Vérif. humidité à l\'entrée OK.' },
    { supplierId: F[1].id, reference: 'ACH-2026-002', status: 'CONFIRMED', totalAmount: 192000, orderDate: d(-12), deliveryDate: d(10),  notes: 'PP + PVC pour production seringues & perfuseurs — urgent, stock critique' },
    { supplierId: F[2].id, reference: 'ACH-2026-003', status: 'SENT',      totalAmount: 91000,  orderDate: d(-5),  deliveryDate: d(12) },
    { supplierId: F[4].id, reference: 'ACH-2026-004', status: 'CONFIRMED', totalAmount: 248000, orderDate: d(-25), deliveryDate: d(10),  notes: 'EtO + chambre GDG + filtres — commande annuelle SterMed France, délai port Alger ≈ 21j' },
    { supplierId: F[5].id, reference: 'ACH-2026-005', status: 'DRAFT',     totalAmount: 64000,  orderDate: d(-2),  deliveryDate: d(40),  notes: 'Latex Malaisie — 4 bidons. Transit maritime Penang → Alger. À valider avec direction.' },
  ];
  for (const po of purchasesRaw) {
    const { notes, ...rest } = po;
    await prisma.purchaseOrder.create({
      data: {
        ...rest,
        items: { create: [{ productId: P['MAT-COT-25'].id, quantity: 5, unitPrice: po.totalAmount / 5, totalPrice: po.totalAmount }] },
      },
    }).catch(() => {});
  }
  console.log('✅ Commandes achat créées');

  // ══════════════════════════════════════════
  // 13. ORDRES DE FABRICATION
  // ══════════════════════════════════════════
  const ofData = [
    { number: 'OF-2026-0001', productId: P['CMP-1010-B100'].id, quantity: 500, status: 'COMPLETED',   priority: 'HIGH',   plannedStart: d(-22), plannedEnd: d(-18), needDate: d(-15), producedQty: 500,  notes: 'Lot JA2604 — libéré CQ le 10/04. 500 boîtes vers CHU.' },
    { number: 'OF-2026-0002', productId: P['SRG-5ML-AG'].id,    quantity: 300, status: 'IN_PROGRESS', priority: 'HIGH',   plannedStart: d(-5),  plannedEnd: d(5),   needDate: d(8),   producedQty: 120,  notes: 'EHU Oran — injection corps en cours, assemblage aiguilles demain' },
    { number: 'OF-2026-0003', productId: P['PRF-STD-G'].id,     quantity: 400, status: 'FIRM',        priority: 'HIGH',   plannedStart: d(3),   plannedEnd: d(14),  needDate: d(17),  notes: 'EHU Oran CMD-2026-002 — confirmer stock PVC avant lancement' },
    { number: 'OF-2026-0004', productId: P['GLT-LAT-M-100'].id, quantity: 800, status: 'FIRM',        priority: 'MEDIUM', plannedStart: d(8),   plannedEnd: d(18),  needDate: d(22),  notes: 'MedPharma CMD-2026-003 — trempage latex à planifier avec Tchouar' },
    { number: 'OF-2026-0005', productId: P['CMP-0505-B100'].id, quantity: 300, status: 'SUGGESTED',   priority: 'MEDIUM', plannedStart: d(20),  plannedEnd: d(24),  needDate: d(28),  notes: 'Issu MRP — à affermir' },
    { number: 'OF-2026-0006', productId: P['SRG-10ML-AG'].id,   quantity: 200, status: 'SUGGESTED',   priority: 'LOW',    plannedStart: d(25),  plannedEnd: d(33),  needDate: d(36) },
    { number: 'OF-2026-0007', productId: P['CTH-IV-G18'].id,    quantity: 50,  status: 'FIRM',        priority: 'HIGH',   plannedStart: d(5),   plannedEnd: d(16),  needDate: d(20),  notes: 'Petit lot test cathéters — validation process avant série' },
  ];
  for (const of_ of ofData) {
    await prisma.productionOrder.create({ data: { ...of_, companyId: CID, unit: 'boîte' } });
  }
  console.log(`✅ ${ofData.length} ordres de fabrication créés`);

  // ══════════════════════════════════════════
  // 14. ÉQUIPEMENTS MAINTENANCE
  // ══════════════════════════════════════════
  const EQ = [];
  const equipData = [
    { code: 'EQ-001', name: 'Découpeuse rotative Weber coton/gaze',     type: 'MACHINE',      location: 'Atelier découpe',      manufacturer: 'Weber Maschinenbau', model: 'CUT-350',   serialNumber: 'WM350-2020-0441', purchaseDate: new Date('2020-05-15'), status: 'ACTIVE',      lastMaintenance: d(-30), nextMaintenance: d(30),  notes: 'Lames à vérifier toutes les 72h de production — rechange en stock (3 jeux)' },
    { code: 'EQ-002', name: 'Presse injection plastique Arburg 320T',   type: 'MACHINE',      location: 'Atelier injection',    manufacturer: 'Arburg',             model: '320S 500-70',serialNumber: 'ARB320-2019-2234',purchaseDate: new Date('2019-09-01'), status: 'ACTIVE',      lastMaintenance: d(-45), nextMaintenance: d(45),  notes: 'Moules seringues 5ml & 10ml — refroidissement eau glycolée' },
    { code: 'EQ-003', name: 'Autoclave de stérilisation EtO 4m³',       type: 'INSTALLATION', location: 'Chambre stérilisation',manufacturer: 'Steri-Vac',          model: '3XL',        serialNumber: 'SV3XL-2021-0077', purchaseDate: new Date('2021-03-20'), status: 'ACTIVE',      lastMaintenance: d(-14), nextMaintenance: d(76),  notes: 'Certification EN ISO 11135. Prochain audit CNAS : 15/09/2026. Log cycle quotidien obligatoire.' },
    { code: 'EQ-004', name: 'Ligne thermo-scelleuse blister semi-auto', type: 'MACHINE',      location: 'Conditionnement',      manufacturer: 'Multivac',           model: 'R145',       serialNumber: 'MV145-2022-0311', purchaseDate: new Date('2022-07-10'), status: 'ACTIVE',      lastMaintenance: d(-20), nextMaintenance: d(40),  notes: 'Contrôle pression de scellage hebdomadaire — cartouches chauffantes (réf. MV-H145)' },
    { code: 'EQ-005', name: 'Microscope de contrôle qualité ×400',      type: 'INSTRUMENT',   location: 'Labo qualité',         manufacturer: 'Olympus',            model: 'CX23',       serialNumber: 'OL-CX23-2021-904',purchaseDate: new Date('2021-11-05'), status: 'ACTIVE',      lastMaintenance: d(-90), nextMaintenance: d(90) },
    { code: 'EQ-006', name: 'Compresseur air sec 300L 10 bar',          type: 'MACHINE',      location: 'Utilités',             manufacturer: 'Atlas Copco',        model: 'GA15',       serialNumber: 'AC-GA15-2018-557',purchaseDate: new Date('2018-04-12'), status: 'MAINTENANCE', lastMaintenance: d(-2),  nextMaintenance: d(88),  notes: 'EN RÉVISION — vidange huile + filtre séparateur. Prévoir arrêt ligne injection 2j.' },
  ];
  for (const eq of equipData) {
    const e = await prisma.equipment.create({ data: { ...eq, companyId: CID } });
    EQ.push(e);
  }
  console.log(`✅ ${EQ.length} équipements créés`);

  // Demandes et ordres maintenance
  const mrData = [
    { number: 'DM-2026-001', equipmentId: EQ[5].id, title: 'Compresseur — chute pression en charge', description: 'Le GA15 tombe à 6 bar sous charge alors qu\'il devrait tenir 8,5 bar. Filtre séparateur saturé + vidange huile dépassée. Arrêt prévu 2 jours.', type: 'BREAKDOWN', priority: 'HIGH',   status: 'IN_PROGRESS', reportedAt: d(-2) },
    { number: 'DM-2026-002', equipmentId: EQ[0].id, title: 'Lames découpeuse — usure prématurée lot coton lourd', description: 'Les lames s\'émoussent trop vite sur la nouvelle qualité coton 25kg (fibres plus grossières). Essayer les lames carbure réf. WM-LC350.', type: 'INSPECTION',  priority: 'MEDIUM', status: 'OPEN',        reportedAt: d(-7) },
    { number: 'DM-2026-003', equipmentId: EQ[2].id, title: 'Remplacement joints autoclave EtO', description: 'Fuite légère détectée sur joint de porte lors du cycle du 18/04. Arrêt cycle + décontamination effectués. Joints à commander chez Steri-Vac.', type: 'BREAKDOWN',  priority: 'HIGH',   status: 'CLOSED',      reportedAt: d(-12), resolvedAt: d(-9) },
    { number: 'DM-2026-004', equipmentId: EQ[3].id, title: 'Calibrage température scelleuse', description: 'Thermocouple scelleuse donne 3°C d\'écart vs sonde étalon. Impact sur intégrité du scellage compresses. Recalibrage urgent avant lot OF-2026-0001.', type: 'PREVENTIVE', priority: 'HIGH',   status: 'CLOSED',      reportedAt: d(-18), resolvedAt: d(-17) },
  ];
  const MRs = [];
  for (const mr of mrData) {
    const m = await prisma.maintenanceRequest.create({ data: { ...mr, companyId: CID } });
    MRs.push(m);
  }
  const moData = [
    { number: 'OT-2026-001', equipmentId: EQ[5].id, requestId: MRs[0].id, title: 'Vidange huile + remplacement filtre séparateur GA15', type: 'CORRECTIVE', status: 'IN_PROGRESS', priority: 'HIGH',   plannedDate: d(-1), startedAt: d(0), estimatedHours: 4, laborCost: 6000, partsCost: 18000, notes: 'Pièces commandées Atlas Copco — livraison demain matin' },
    { number: 'OT-2026-002', equipmentId: EQ[2].id, requestId: MRs[2].id, title: 'Remplacement joints porte autoclave + test étanchéité', type: 'CORRECTIVE', status: 'COMPLETED',  priority: 'HIGH',   plannedDate: d(-9), startedAt: d(-9), completedAt: d(-9), estimatedHours: 3, actualHours: 2.5, laborCost: 4500, partsCost: 8500 },
    { number: 'OT-2026-003', equipmentId: EQ[1].id, requestId: null, title: 'Révision semestrielle presse Arburg', type: 'PREVENTIVE', status: 'PLANNED', priority: 'MEDIUM', plannedDate: d(10), estimatedHours: 6, laborCost: 9000, notes: 'Planifier avec Tchouar — arrêt ligne injection 1 journée' },
  ];
  for (const mo of moData) {
    await prisma.maintenanceOrder.create({ data: { ...mo, companyId: CID } });
  }
  console.log(`✅ Maintenance : ${MRs.length} demandes, ${moData.length} ordres`);

  // ══════════════════════════════════════════
  // 15. PROJETS
  // ══════════════════════════════════════════
  const projectsData = [
    {
      name: 'Certification ISO 13485 — Dispositifs médicaux', description: 'Obtenir la certification ISO 13485 pour valider le SMQ et accéder aux marchés publics nationaux et à l\'export (Tunisie, Maroc). Audit de certification prévu T3 2026.', status: 'IN_PROGRESS', priority: 'CRITICAL', startDate: d(-60), endDate: d(180), budget: 2200000, progress: 25,
      tasks: [
        { title: 'Diagnostic écart ISO 13485 vs situation actuelle', status: 'DONE',        priority: 'HIGH',     dueDate: d(-45), description: 'Gap analysis réalisé par consultant externe — 42 écarts identifiés' },
        { title: 'Rédaction Manuel Qualité & Politique qualité',      status: 'IN_PROGRESS', priority: 'HIGH',     dueDate: d(20) },
        { title: 'Procédures maîtrise documents et enregistrements',  status: 'IN_PROGRESS', priority: 'MEDIUM',   dueDate: d(20) },
        { title: 'Procédures traçabilité lots & matières',            status: 'TODO',        priority: 'HIGH',     dueDate: d(45) },
        { title: 'Formation personnel BPF + ISO 13485 (2 sessions)',  status: 'TODO',        priority: 'MEDIUM',   dueDate: d(60) },
        { title: 'Audit interne à blanc',                             status: 'TODO',        priority: 'HIGH',     dueDate: d(120) },
        { title: 'Audit de certification CNAS / organisme tiers',     status: 'TODO',        priority: 'CRITICAL', dueDate: d(165) },
      ],
    },
    {
      name: 'Nouvelle ligne seringues 20 ml — Capex 2026', description: 'Acquisition d\'une presse injection 500T + moule 20ml + ligne de conditionnement pour étendre la gamme seringues et répondre aux demandes en sérologie et prélèvement.', status: 'PLANNING', priority: 'HIGH', startDate: d(-15), endDate: d(270), budget: 8500000, progress: 8,
      tasks: [
        { title: 'Cahier des charges technique presse 500T',          status: 'IN_PROGRESS', priority: 'HIGH',     dueDate: d(15) },
        { title: 'Consultation 3 fabricants (Arburg, Engel, Haitian)',status: 'TODO',        priority: 'HIGH',     dueDate: d(30) },
        { title: 'Dossier financement BDL / ANDI',                    status: 'TODO',        priority: 'HIGH',     dueDate: d(30) },
        { title: 'Commande équipement',                               status: 'TODO',        priority: 'HIGH',     dueDate: d(90) },
        { title: 'Travaux aménagement bâtiment B',                    status: 'TODO',        priority: 'MEDIUM',   dueDate: d(150) },
        { title: 'Réception & mise en service',                       status: 'TODO',        priority: 'HIGH',     dueDate: d(240) },
      ],
    },
    {
      name: 'Export Maghreb — Tunisie & Maroc 2026', description: 'Développer les ventes export vers la Tunisie et le Maroc. Conditions : certification ISO 13485 + homologation ministère de la santé local. Premier contact distributeurs T1 2026.', status: 'PLANNING', priority: 'MEDIUM', startDate: d(30), endDate: d(360), budget: 1500000, progress: 3,
      tasks: [
        { title: 'Étude réglementaire Tunisie (homologation DPMLD)',  status: 'TODO',        priority: 'HIGH',     dueDate: d(60) },
        { title: 'Étude réglementaire Maroc (AMIP)',                  status: 'TODO',        priority: 'MEDIUM',   dueDate: d(60) },
        { title: 'Identification 2 distributeurs Tunisie',            status: 'TODO',        priority: 'MEDIUM',   dueDate: d(90) },
        { title: 'Mission commerciale Tunis — salon Pharmaplus',      status: 'TODO',        priority: 'HIGH',     dueDate: d(180) },
      ],
    },
  ];
  for (const proj of projectsData) {
    const { tasks: taskList, ...projRest } = proj;
    const project = await prisma.project.create({ data: { ...projRest, companyId: CID } });
    if (DIRID) await prisma.projectMember.create({ data: { projectId: project.id, userId: DIRID, role: 'manager' } }).catch(() => {});
    for (const task of taskList) {
      await prisma.task.create({ data: { ...task, projectId: project.id } });
    }
  }
  console.log(`✅ ${projectsData.length} projets créés`);

  // ══════════════════════════════════════════
  // 16. TRANSPORTEURS & EXPÉDITIONS
  // ══════════════════════════════════════════
  const carriersData = [
    { name: 'Transport Sanitaire Express TSE', type: 'ROAD', phone: '0661 88 44 22', email: 'tse.algerie@gmail.com',   address: 'Réghaïa, Alger',      notes: 'Spécialiste transport médicaments & consommables — véhicule réfrigéré disponible' },
    { name: 'Trans-Maghreb Logistics',         type: 'ROAD', phone: '021 55 66 77', email: 'ops@transmaghreb.dz',      address: 'Chéraga, Alger',      notes: 'Couverture nationale + export Tunisie/Maroc' },
    { name: 'Messagerie Rapide Nationale MRN', type: 'ROAD', phone: '021 33 44 55', email: 'mrn.alger@mrn.dz',         address: 'Bir Mourad Raïs',     notes: 'Petits colis urgents < 30 kg — délai J+1' },
  ];
  const CR = [];
  for (const c of carriersData) {
    const carrier = await prisma.carrier.create({ data: { ...c, companyId: CID } });
    CR.push(carrier);
  }
  const shipmentsData = [
    { reference: 'EXP-2026-001', customerId: C[0].id, carrierId: CR[0].id, destination: 'CHU Mustapha Pacha — Pharmacie centrale, Alger', status: 'DELIVERED',  weight: 420, shippedAt: d(-24), deliveredAt: d(-23), notes: '500 boîtes compresses 10×10 + 300 seringues 5ml. BL signé. Tout OK.' },
    { reference: 'EXP-2026-002', customerId: C[3].id, carrierId: CR[0].id, destination: 'Hôpital Fanon — Dépôt pharmacie, Blida',          status: 'DELIVERED',  weight: 280, shippedAt: d(-32), deliveredAt: d(-31), notes: 'BL en 3 exemplaires + attest. conformité — archivés dossier client Fanon' },
    { reference: 'EXP-2026-003', customerId: C[2].id, carrierId: CR[1].id, destination: 'Clinique Amouri — Sétif (300 km)',                  status: 'IN_TRANSIT', weight: 195, shippedAt: d(-1),  notes: 'Départ hier matin — ETA demain 10h. Contacter M. Amouri pour réception.' },
    { reference: 'EXP-2026-004', customerId: C[1].id, carrierId: CR[0].id, destination: 'EHU 1er Novembre — Pharmacie, Oran',               status: 'PREPARING',  weight: 0,   notes: 'En attente fin OF-2026-0002 + OF-2026-0003 — départ prévu 15/05' },
  ];
  for (const s of shipmentsData) {
    await prisma.shipment.create({ data: { ...s, companyId: CID } });
  }
  console.log(`✅ ${CR.length} transporteurs, ${shipmentsData.length} expéditions créées`);

  // ══════════════════════════════════════════
  // 17. BUDGET 2026
  // ══════════════════════════════════════════
  const budgetData = [
    { category: 'Achats matières',    label: 'Coton & non-tissés SMS',              type: 'EXPENSE', budgeted: 2400000,  actual: 730000 },
    { category: 'Achats matières',    label: 'Polymères PP / PVC médical',          type: 'EXPENSE', budgeted: 1800000,  actual: 420000 },
    { category: 'Achats matières',    label: 'Oxyde éthylène EtO + gaz stérilisation', type: 'EXPENSE', budgeted: 640000, actual: 248000 },
    { category: 'Achats matières',    label: 'Latex naturel',                       type: 'EXPENSE', budgeted: 790000,  actual: 96000  },
    { category: 'Achats matières',    label: 'Emballages & blisters',               type: 'EXPENSE', budgeted: 480000,  actual: 141000 },
    { category: 'Achats matières',    label: 'Aciers inox (aiguilles)',             type: 'EXPENSE', budgeted: 320000,  actual: 98400  },
    { category: 'Personnel',          label: 'Salaires bruts & charges sociales',   type: 'EXPENSE', budgeted: 5200000,  actual: 1750000},
    { category: 'Personnel',          label: 'Primes de production',                type: 'EXPENSE', budgeted: 520000,  actual: 0      },
    { category: 'Maintenance',        label: 'Maintenance préventive équipements',  type: 'EXPENSE', budgeted: 420000,  actual: 32500  },
    { category: 'Certifications',     label: 'ISO 13485 — consultant & audit',      type: 'EXPENSE', budgeted: 2200000, actual: 280000 },
    { category: 'Investissements',    label: 'Ligne seringues 20ml (Capex)',        type: 'EXPENSE', budgeted: 8500000, actual: 0      },
    { category: 'Logistique',         label: 'Transport & livraisons clients',      type: 'EXPENSE', budgeted: 360000,  actual: 94000  },
    { category: 'Frais généraux',     label: 'Loyer usine & bureaux',              type: 'EXPENSE', budgeted: 960000,  actual: 320000 },
    { category: 'Frais généraux',     label: 'Eau, électricité, gaz industriel',   type: 'EXPENSE', budgeted: 480000,  actual: 148000 },
    { category: 'Ventes',             label: 'CA consommables médicaux — national',type: 'INCOME',  budgeted: 28000000, actual: 6671000},
    { category: 'Ventes',             label: 'CA export prévu (Tunisie / Maroc)',   type: 'INCOME',  budgeted: 3500000, actual: 0      },
  ];
  for (const b of budgetData) {
    await prisma.budgetLine.create({ data: { ...b, year: 2026, companyId: CID } });
  }
  console.log(`✅ ${budgetData.length} lignes budget créées`);

  // ══════════════════════════════════════════
  // 18. TRÉSORERIE
  // ══════════════════════════════════════════
  const treasuryData = [
    { type: 'CREDIT', amount: 1245000, description: 'Encaissement FAC-2026-001 — CHU Mustapha Pacha',       reference: 'FAC-2026-001', category: 'Encaissement client',    date: d(-15) },
    { type: 'CREDIT', amount: 588000,  description: 'Encaissement FAC-2026-003 — Hôpital Fanon Blida',      reference: 'FAC-2026-003', category: 'Encaissement client',    date: d(-22) },
    { type: 'CREDIT', amount: 88000,   description: 'Encaissement FAC-2025-199 — Dr. Cheriet',              reference: 'FAC-2025-199', category: 'Encaissement client',    date: d(-35) },
    { type: 'CREDIT', amount: 1090000, description: 'Acompte 50% CMD-2026-002 — EHU Oran',                  reference: 'ACOMPTE-EHU-002', category: 'Encaissement client', date: d(-16) },
    { type: 'DEBIT',  amount: 1750000, description: 'Virement salaires Avril 2026',                         reference: 'VIR-SAL-04/2026', category: 'Salaires',           date: d(-16) },
    { type: 'DEBIT',  amount: 183000,  description: 'Paiement ACH-2026-001 — Coton & Fibres Maghreb',       reference: 'ACH-2026-001', category: 'Achat matières',         date: d(-10) },
    { type: 'DEBIT',  amount: 248000,  description: 'Acompte ACH-2026-004 — SterMed France (50%)',          reference: 'ACH-2026-004', category: 'Achat matières',         date: d(-20) },
    { type: 'DEBIT',  amount: 94000,   description: 'Frais transport & livraisons Avril 2026',               reference: 'TRANS-04/2026', category: 'Logistique',           date: d(-18) },
    { type: 'DEBIT',  amount: 280000,  description: 'Consultant ISO 13485 — facture avancement phase 1',    reference: 'PROJ-ISO-PH1',  category: 'Projets',              date: d(-30) },
    { type: 'DEBIT',  amount: 32500,   description: 'Maintenance compresseur + autoclave EtO (pièces)',     reference: 'MAINT-04/2026', category: 'Maintenance',          date: d(-8)  },
  ];
  for (const t of treasuryData) {
    await prisma.treasuryEntry.create({ data: { ...t, companyId: CID } });
  }
  console.log(`✅ ${treasuryData.length} entrées de trésorerie créées`);

  // ══════════════════════════════════════════
  // 19. ÉCRITURES COMPTABLES
  // ══════════════════════════════════════════
  const journalData = [
    {
      reference: 'JNL-2026-001', date: d(-15), description: 'Encaissement FAC-2026-001 CHU Mustapha', totalDebit: 1245000, totalCredit: 1245000, isBalanced: true,
      lines: [ { accountCode: '512', accountLabel: 'Banque BNA — compte courant', debit: 1245000, credit: 0 }, { accountCode: '411', accountLabel: 'Clients — CHU Mustapha Pacha', debit: 0, credit: 1245000 } ],
    },
    {
      reference: 'JNL-2026-002', date: d(-16), description: 'Virement salaires Avril 2026', totalDebit: 1750000, totalCredit: 1750000, isBalanced: true,
      lines: [ { accountCode: '641', accountLabel: 'Rémunérations du personnel', debit: 1750000, credit: 0 }, { accountCode: '512', accountLabel: 'Banque BNA — compte courant', debit: 0, credit: 1750000 } ],
    },
    {
      reference: 'JNL-2026-003', date: d(-10), description: 'Achat matières — Coton & Fibres Maghreb SARL', totalDebit: 183000, totalCredit: 183000, isBalanced: true,
      lines: [
        { accountCode: '601', accountLabel: 'Achats matières premières', debit: 153782, credit: 0 },
        { accountCode: '4456', accountLabel: 'TVA déductible 19%',       debit: 29218,  credit: 0 },
        { accountCode: '401', accountLabel: 'Fournisseurs — Coton & Fibres Maghreb', debit: 0, credit: 183000 },
      ],
    },
  ];
  for (const j of journalData) {
    const { lines, ...jRest } = j;
    await prisma.journalEntry.create({ data: { ...jRest, companyId: CID, lines: { create: lines } } });
  }
  console.log(`✅ ${journalData.length} écritures comptables créées`);

  // ══════════════════════════════════════════
  // 20. ANNONCES
  // ══════════════════════════════════════════
  if (UID) {
    const annonces = [
      { title: 'Rappel BPF — traçabilité numéros de lots OBLIGATOIRE', content: 'Suite à l\'audit interne du 20/04, il est rappelé à tout le personnel de production que l\'enregistrement du numéro de lot matière sur chaque ordre de fabrication est OBLIGATOIRE dès réception. Non-conformité = blocage du lot.', priority: 'URGENT' },
      { title: 'Réunion qualité mensuelle — Lundi 05/05 à 9h00', content: 'Ordre du jour : avancement ISO 13485, résultats CQ Avril (taux rebuts), incident autoclave EtO du 18/04, bilan réclamations clients. Présence obligatoire chefs d\'atelier.', priority: 'HIGH', expiresAt: d(6) },
      { title: 'Félicitations — Meriem Boudiaf nous rejoint en CQ', content: 'Nous souhaitons la bienvenue à Meriem Boudiaf qui prend ses fonctions de Technicienne Contrôle Qualité ce lundi. Elle sera sous la supervision de l\'équipe Kissi. Bon courage Meriem !', priority: 'NORMAL', expiresAt: d(30) },
      { title: 'Salon médical Alger — 14-16 mai 2026 — stand Promédal', content: 'Promédal sera présent au Salon International de la Santé Alger (SISA) du 14 au 16 mai. Belkaid coordonne le stand. Bénévoles pour animation : contacter RH avant le 07/05.', priority: 'NORMAL', expiresAt: d(17) },
    ];
    for (const ann of annonces) {
      await prisma.announcement.create({ data: { ...ann, companyId: CID, authorId: UID } });
    }
    console.log(`✅ ${annonces.length} annonces créées`);
  }

  // ══════════════════════════════════════════
  // 21. NOTES DE FRAIS
  // ══════════════════════════════════════════
  if (empIds.length > 0 && UID) {
    const expData = [
      { employeeId: empIds[5] || empIds[0], userId: UID, title: 'Salon SISA Alger — transport & hébergement',   amount: 28500, date: d(-35), category: 'Commercial',    description: '3 jours salon + 2 nuits hôtel Hilton + taxi — représentation Promédal', status: 'REIMBURSED' },
      { employeeId: empIds[0],              userId: UID, title: 'Déplacement CHU Mustapha — réunion pharmacie', amount: 4200,  date: d(-12), category: 'Déplacement',  description: 'Taxi A/R + déjeuner sur place avec Mme Benmansour pharmacie centrale', status: 'APPROVED' },
      { employeeId: empIds[3] || empIds[0], userId: UID, title: 'Formation comptabilité analytique — Alger',    amount: 12000, date: d(-20), category: 'Formation',     description: 'Inscription séminaire 2 jours Centre de formation DZ Management', status: 'APPROVED' },
      { employeeId: empIds[6] || empIds[0], userId: UID, title: 'Pièces urgentes compresseur — achat local',    amount: 4800,  date: d(-3),  category: 'Maintenance',   description: 'Joints + filtre achetés en urgence Alger centre (rupture fournisseur habituel)', status: 'PENDING' },
      { employeeId: empIds[2] || empIds[0], userId: UID, title: 'Visite fournisseur Coton Maghreb — Sétif',     amount: 9600,  date: d(-25), category: 'Déplacement',  description: 'Billet train A/R + nuit hôtel + visite entrepôt qualité coton — rapport joint', status: 'APPROVED' },
    ];
    for (const exp of expData) {
      await prisma.expenseReport.create({ data: { ...exp, currency: 'DZD' } });
    }
    console.log(`✅ ${expData.length} notes de frais créées`);
  }

  // ══════════════════════════════════════════
  // 22. ÉVALUATIONS
  // ══════════════════════════════════════════
  if (empIds.length >= 4 && UID) {
    const evalData = [
      { employeeId: empIds[1], evaluatorId: DIRID || UID, period: 'S2-2025', score: 8.5, comments: 'Très bonne gestion des absences et de la paie. Dossier ISO 13485 bien suivi côté RH. Objectif : digitaliser les fiches de présence avant T3 2026.', goals: { objectifs: ['Mettre en place pointeuse digitale T2 2026', 'Former 2 opérateurs aux BPF avant juin'] } },
      { employeeId: empIds[2], evaluatorId: DIRID || UID, period: 'S2-2025', score: 9.0, comments: 'Excellent pilotage production — taux de service 96%, taux rebut compresses < 1,5%. Point d\'amélioration : intégrer mieux l\'ordonnancement MRP dans le planning hebdo.', goals: { objectifs: ['Réduire rebuts seringues à <3%', 'Adopter jalonnement MRP dès lancement ligne 20ml'] } },
      { employeeId: empIds[3], evaluatorId: DIRID || UID, period: 'S2-2025', score: 7.5, comments: 'Bonne tenue de la comptabilité générale. Délai clôture mensuelle encore trop long (J+15 vs J+8 objectif). Trésorerie à mieux anticiper — 2 tensions signalées.', goals: { objectifs: ['Clôture mensuelle à J+8 maximum', 'Tableau de bord tréso hebdomadaire'] } },
      { employeeId: empIds[5], evaluatorId: DIRID || UID, period: 'S2-2025', score: 8.0, comments: 'CA en progression +18% vs N-1, pipeline CRM bien alimenté. Effort de prospection à maintenir sur Constantine & Béjaïa. Dossier EHU Oran bien géré.', goals: { objectifs: ['Signer 1 distributeur Tunisie T3 2026', 'Alimenter CRM pipeline toutes les 48h'] } },
    ];
    for (const ev of evalData) {
      await prisma.evaluation.create({ data: ev });
    }
    console.log(`✅ ${evalData.length} évaluations créées`);
  }

  // ══════════════════════════════════════════
  // 23. CANDIDATS RECRUTEMENT
  // ══════════════════════════════════════════
  const candidatesData = [
    { name: 'Adel Hamouche',    position: 'Opérateur injection plastique',            email: 'a.hamouche@gmail.com',    phone: '0661 33 22 11', stage: 'INTERVIEW', note: 'Entretien technique 08/05 avec Tchouar — 5 ans Arburg 280T chez SiBal Alger. Profil solide.' },
    { name: 'Meriem Boudiaf',   position: 'Technicienne contrôle qualité médicale',   email: 'm.boudiaf@yahoo.fr',      phone: '0550 77 44 88', stage: 'HIRED',     note: 'Recrutée, prise de poste 28/04 — Licence biologie + 2 ans labo pharmaceutique' },
    { name: 'Karima Belacel',   position: 'Responsable assurance qualité (ISO 13485)',email: 'k.belacel@outlook.com',   phone: '0771 55 33 99', stage: 'OFFER',     note: 'Offre envoyée 25/04 — 8 ans Saidal, auditeur interne ISO 13485. Très fort profil, salaire à négocier.' },
    { name: 'Djamel Ferhat',    position: 'Opérateur conditionnement',                email: 'dj.ferhat@gmail.com',     phone: '0660 22 88 44', stage: 'APPLIED',   note: 'CV reçu — ex-Unilever Alger, conditionnement FMCG. À appeler pour entretien téléphonique' },
    { name: 'Yasmine Oussedik', position: 'Ingénieure procédés stérilisation EtO',   email: 'y.oussedik@hotmail.com',  phone: '0552 44 66 88', stage: 'REJECTED',  note: 'Profil intéressant mais prétentions salariales hors budget (240 000 DA net demandé). Dossier archivé.' },
  ];
  for (const c of candidatesData) {
    await prisma.candidate.create({ data: { ...c, companyId: CID } });
  }
  console.log(`✅ ${candidatesData.length} candidats créés`);

  // ══════════════════════════════════════════
  // 24. MOUVEMENTS DE STOCK
  // ══════════════════════════════════════════
  const mvtData = [
    { productId: P['CMP-1010-B100'].id, type: 'IN',         quantity: 500,  reference: 'OF-2026-0001', notes: 'Réception lot JA2604 — libéré CQ le 10/04' },
    { productId: P['MAT-COT-25'].id,   type: 'IN',         quantity: 15,   unitPrice: 12200, reference: 'ACH-2026-001', notes: '15 rouleaux coton + contrôle humidité OK' },
    { productId: P['MAT-SMS-30'].id,   type: 'IN',         quantity: 5,    unitPrice: 17500, reference: 'ACH-2026-001', notes: '5 rouleaux SMS' },
    { productId: P['CMP-1010-B100'].id, type: 'OUT',        quantity: 600,  reference: 'EXP-2026-001', notes: 'Livraison CHU Mustapha + Fanon' },
    { productId: P['SRG-5ML-AG'].id,   type: 'OUT',        quantity: 200,  reference: 'EXP-2026-001', notes: 'Livraison CHU Mustapha' },
    { productId: P['MAT-COT-25'].id,   type: 'OUT',        quantity: 3,    reference: 'OF-2026-0001', notes: 'Consommation OF-2026-0001 compresses 10×10' },
    { productId: P['MAT-PP-25'].id,    type: 'IN',         quantity: 12,   unitPrice: 9600,  reference: 'ACH-2026-002', notes: 'Réception partielle PP — 8 sacs restants à livrer' },
    { productId: P['CMP-0505-B100'].id, type: 'ADJUSTMENT', quantity: -15,  reference: 'INV-2026-01', notes: 'Écart inventaire — 15 boîtes compresses 5×5 emballages abîmés, retrait lot' },
  ];
  for (const mv of mvtData) {
    await prisma.stockMovement.create({ data: { ...mv, companyId: CID } });
  }
  console.log(`✅ ${mvtData.length} mouvements de stock créés`);

  // ══════════════════════════════════════════
  // 25. SESSION INVENTAIRE
  // ══════════════════════════════════════════
  const invSession = await prisma.inventorySession.create({
    data: { companyId: CID, reference: 'INV-2026-01', status: 'COMPLETED', notes: 'Inventaire tournant Avril 2026 — zone matières premières & produits finis', startedAt: d(-14), completedAt: d(-13) },
  });
  for (const il of [
    { productId: P['CMP-1010-B100'].id, theoreticalQty: 420, countedQty: 420, variance: 0 },
    { productId: P['CMP-0505-B100'].id, theoreticalQty: 695, countedQty: 680, variance: -15, notes: '15 boîtes emballage abîmé — retirées et rebuts enregistrés' },
    { productId: P['MAT-COT-25'].id,    theoreticalQty: 28,  countedQty: 28,  variance: 0 },
    { productId: P['MAT-PP-25'].id,     theoreticalQty: 44,  countedQty: 42,  variance: -2, notes: 'Écart de 2 sacs — probablement consommé non déclaré sur OF urgent' },
    { productId: P['SRG-5ML-AG'].id,    theoreticalQty: 310, countedQty: 312, variance: 2, notes: 'Écart positif +2 boîtes — erreur saisie réception précédente' },
  ]) {
    await prisma.inventoryLine.create({ data: { ...il, inventorySessionId: invSession.id } });
  }
  console.log('✅ Session inventaire créée');

  // ══════════════════════════════════════════
  // 26. CALENDRIER 2026
  // ══════════════════════════════════════════
  const calendar = await prisma.workCalendar.create({
    data: { companyId: CID, name: 'Calendrier Promédal 2026 — semaine dim-jeu (Algérie)', year: 2026, weekStart: '08:00', weekDuration: 8 },
  });
  const feriesAlg = new Set(['2026-01-01','2026-01-12','2026-05-01','2026-06-19','2026-07-05','2026-11-01']);
  const days = [];
  for (let mo = 1; mo <= 12; mo++) {
    const dim = new Date(2026, mo - 1, 0).getDate();
    for (let dy = 1; dy <= dim; dy++) {
      const dt  = new Date(2026, mo - 1, dy);
      const dow = dt.getDay();
      const key = dt.toISOString().split('T')[0];
      const isWeekend = dow === 5 || dow === 6; // vendredi + samedi off (Algérie)
      const isFerie   = feriesAlg.has(key);
      days.push({ calendarId: calendar.id, date: dt, startTime: '08:00', duration: isWeekend || isFerie ? 0 : 8, isWorking: !isWeekend && !isFerie, label: isFerie ? 'Jour férié' : undefined });
    }
  }
  await prisma.workCalendarDay.createMany({ data: days });
  console.log(`✅ Calendrier 2026 — ${days.filter(d => d.isWorking).length} jours ouvrables`);

  // ══════════════════════════════════════════
  // 27. RESSOURCES PROJET
  // ══════════════════════════════════════════
  const resourcesData = [
    { name: 'Yassine Tchouar — Resp. Production', type: 'HUMAN',     status: 'BUSY',      project: 'Ligne seringues 20ml',   skills: 'Production, Injection plastique, Planification MRP', capacity: 80 },
    { name: 'Nassim Kissi — Resp. RH',            type: 'HUMAN',     status: 'BUSY',      project: 'ISO 13485',              skills: 'RH, Formation, Processus qualité', capacity: 60 },
    { name: 'Consultant qualité ISO 13485',        type: 'HUMAN',     status: 'BUSY',      project: 'ISO 13485',              skills: 'ISO 13485, SMQ, Audit, BPF', capacity: 100, cost: 65000 },
    { name: 'Presse Arburg 320T',                  type: 'EQUIPMENT', status: 'IN_USE',    project: 'Prod. série seringues',  capacity: 90 },
    { name: 'Autoclave EtO Steri-Vac 3XL',        type: 'EQUIPMENT', status: 'IN_USE',    project: 'Prod. série compresses', capacity: 70 },
    { name: 'Budget Capex ligne 20ml',             type: 'FINANCIAL', status: 'AVAILABLE', project: 'Ligne seringues 20ml',   cost: 8500000 },
  ];
  for (const r of resourcesData) {
    await prisma.projectResource.create({ data: { ...r, companyId: CID } });
  }
  console.log(`✅ ${resourcesData.length} ressources projet créées`);

  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║       PROMÉDAL SARL — Consommables médicaux — Données chargées   ║');
  console.log('╠═══════════════════════════════════════════════════════════════════╣');
  console.log('║  Produits : 9 FABRIQUÉS + 11 ACHETÉS = 20 articles               ║');
  console.log('║  Clients : 10   Fournisseurs : 6   Catalogue : 11 références     ║');
  console.log('║  Commandes : 9  Devis : 5   Factures : 6   Avoirs : 2            ║');
  console.log('║  OFs : 7   BOM : 5   Gammes : 4   Postes : 5                     ║');
  console.log('║  Équipements : 6   Demandes maint. : 4   Ordres : 3              ║');
  console.log('║  Projets : 3   Tâches : 17   Transporteurs : 3   Expéditions : 4 ║');
  console.log('║  Budget : 16 lig.   Trésorerie : 10   Écritures : 3              ║');
  console.log('║  Annonces : 4   Notes frais : 5   Évaluations : 4   Candidats : 5║');
  console.log('║  Calendrier 2026 (sem. dim-jeu, jours fériés algériens)          ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
