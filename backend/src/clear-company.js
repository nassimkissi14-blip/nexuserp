import prisma from './lib/prisma.js';

const companyId = process.argv[2];
if (!companyId) { console.error('Usage: node src/clear-company.js <companyId>'); process.exit(1); }

async function main() {
  console.log(`🗑️  Nettoyage des données pour la compagnie: ${companyId}`);

  // Supprimer dans l'ordre pour respecter les FK
  const steps = [
    ['Évaluations',         () => prisma.evaluation.deleteMany({ where: { employee: { companyId } } })],
    ['Fiches de paie',      () => prisma.payroll.deleteMany({ where: { employee: { companyId } } })],
    ['Congés',              () => prisma.leaveRequest.deleteMany({ where: { employee: { companyId } } })],
    ['Notes de frais',      () => prisma.expenseReport.deleteMany({ where: { employee: { companyId } } })],
    ['Recrutements',        () => prisma.recruitment.deleteMany({ where: { companyId } })],
    ['Employés',            () => prisma.employee.deleteMany({ where: { companyId } })],

    ['Tâches',              () => prisma.task.deleteMany({ where: { project: { companyId } } })],
    ['Projets',             () => prisma.project.deleteMany({ where: { companyId } })],

    ['Mouvements stock',    () => prisma.stockMovement.deleteMany({ where: { companyId } })],

    ['Lignes devis',        () => prisma.quoteItem.deleteMany({ where: { quote: { companyId } } })],
    ['Devis',               () => prisma.quote.deleteMany({ where: { companyId } })],

    ['Lignes factures',     () => prisma.invoiceItem.deleteMany({ where: { invoice: { companyId } } })],
    ['Factures',            () => prisma.invoice.deleteMany({ where: { companyId } })],

    ['Lignes avoirs',       () => prisma.creditNoteItem.deleteMany({ where: { creditNote: { companyId } } })],
    ['Avoirs',              () => prisma.creditNote.deleteMany({ where: { companyId } })],

    ['Lignes commandes',    () => prisma.orderItem.deleteMany({ where: { order: { companyId } } })],
    ['Commandes',           () => prisma.order.deleteMany({ where: { companyId } })],

    ['Lignes cmd achats',   () => prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { companyId } } })],
    ['Cmds achats',         () => prisma.purchaseOrder.deleteMany({ where: { companyId } })],

    ['Clients',             () => prisma.customer.deleteMany({ where: { companyId } })],
    ['Fournisseurs',        () => prisma.supplier.deleteMany({ where: { companyId } })],
    ['Produits',            () => prisma.product.deleteMany({ where: { companyId } })],

    ['Ordres fabrication',  () => prisma.productionOrder.deleteMany({ where: { companyId } })],
    ['Nomenclatures',       () => prisma.bOM.deleteMany({ where: { companyId } })],
    ['Postes de charge',    () => prisma.workCenter.deleteMany({ where: { companyId } })],

    ['Interventions maint', () => prisma.maintenanceOrder.deleteMany({ where: { companyId } })],
    ['Demandes maint',      () => prisma.maintenanceRequest.deleteMany({ where: { companyId } })],
    ['Équipements',         () => prisma.equipment.deleteMany({ where: { companyId } })],

    ['Expéditions',         () => prisma.shipment.deleteMany({ where: { companyId } })],
    ['Transporteurs',       () => prisma.carrier.deleteMany({ where: { companyId } })],

    ['Budget',              () => prisma.budgetLine.deleteMany({ where: { companyId } })],
    ['Trésorerie',          () => prisma.treasuryEntry.deleteMany({ where: { companyId } })],
    ['Comptabilité',        () => prisma.accountingEntry.deleteMany({ where: { companyId } })],

    ['Notifications',       () => prisma.notification.deleteMany({ where: { companyId } })],
    ['Messages',            () => prisma.message.deleteMany({ where: { companyId } })],
    ['Annonces',            () => prisma.announcement.deleteMany({ where: { companyId } })],
    ['Audit logs',          () => prisma.auditLog.deleteMany({ where: { companyId } })],
  ];

  for (const [label, fn] of steps) {
    try {
      const result = await fn();
      if (result.count > 0) console.log(`  ✅ ${label}: ${result.count} supprimé(s)`);
    } catch (e) {
      // Table may not exist or no rows — skip silently
      if (!e.message.includes('Unknown field') && !e.message.includes('does not exist')) {
        console.log(`  ⚠️  ${label}: ${e.message}`);
      }
    }
  }

  console.log('\n✨ Base de données nettoyée — compagnie et utilisateurs conservés.');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
