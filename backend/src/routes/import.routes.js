import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function parseSheet(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

function toDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d) ? null : d;
}

/* ── POST /import/employees ──────────────────────────────────────── */
router.post('/employees', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'DIRECTOR'), upload.single('file'), async (req, res, next) => {
  try {
    const rows = parseSheet(req.file.buffer);
    const companyId = req.companyId;
    let created = 0, skipped = 0;
    const errors = [];

    for (const [i, row] of rows.entries()) {
      const firstName = String(row['Prénom'] || row['Prenom'] || row['firstName'] || '').trim();
      const lastName  = String(row['Nom']    || row['lastName']  || '').trim();
      const email     = String(row['Email']  || row['email']     || '').trim().toLowerCase();
      const position  = String(row['Poste']  || row['Position']  || row['position'] || 'Non défini').trim();
      const department= String(row['Département'] || row['Departement'] || row['department'] || 'Non défini').trim();
      const salary    = parseFloat(row['Salaire'] || row['salary'] || 0);
      const hireDate  = toDate(row['Date embauche'] || row['hireDate']) || new Date();
      const contract  = String(row['Contrat'] || row['contractType'] || 'CDI').trim().toUpperCase();

      if (!firstName || !lastName || !email) { skipped++; errors.push(`Ligne ${i+2}: prénom/nom/email requis`); continue; }

      const validContracts = ['CDI','CDD','INTERIM','STAGE','FREELANCE'];
      await prisma.employee.create({
        data: {
          companyId, firstName, lastName, email, position, department,
          salary: salary || 0,
          hireDate,
          contractType: validContracts.includes(contract) ? contract : 'CDI',
        },
      });
      created++;
    }

    res.json({ success: true, data: { created, skipped, errors } });
  } catch (e) { next(e); }
});

/* ── POST /import/customers ──────────────────────────────────────── */
router.post('/customers', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'DIRECTOR'), upload.single('file'), async (req, res, next) => {
  try {
    const rows = parseSheet(req.file.buffer);
    const companyId = req.companyId;
    let created = 0, skipped = 0;
    const errors = [];

    for (const [i, row] of rows.entries()) {
      const name  = String(row['Nom'] || row['name'] || '').trim();
      const email = String(row['Email'] || row['email'] || '').trim().toLowerCase() || null;
      const phone = String(row['Téléphone'] || row['phone'] || '').trim() || null;
      const address = String(row['Adresse'] || row['address'] || '').trim() || null;
      const type  = String(row['Type'] || row['type'] || 'COMPANY').trim().toUpperCase();
      const status= String(row['Statut'] || row['status'] || 'ACTIVE').trim().toUpperCase();

      if (!name) { skipped++; errors.push(`Ligne ${i+2}: nom requis`); continue; }

      const validTypes = ['INDIVIDUAL','COMPANY'];
      const validStatus = ['LEAD','PROSPECT','ACTIVE','INACTIVE'];
      await prisma.customer.create({
        data: {
          companyId, name, email, phone, address,
          type: validTypes.includes(type) ? type : 'COMPANY',
          status: validStatus.includes(status) ? status : 'ACTIVE',
        },
      });
      created++;
    }

    res.json({ success: true, data: { created, skipped, errors } });
  } catch (e) { next(e); }
});

/* ── POST /import/products ───────────────────────────────────────── */
router.post('/products', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'DIRECTOR'), upload.single('file'), async (req, res, next) => {
  try {
    const rows = parseSheet(req.file.buffer);
    const companyId = req.companyId;
    let created = 0, skipped = 0;
    const errors = [];

    for (const [i, row] of rows.entries()) {
      const name     = String(row['Nom'] || row['name'] || '').trim();
      const sku      = String(row['SKU'] || row['sku'] || '').trim() || null;
      const category = String(row['Catégorie'] || row['category'] || 'Général').trim();
      const price    = parseFloat(row['Prix'] || row['price'] || 0);
      const cost     = parseFloat(row['Coût'] || row['cost'] || 0);
      const stock    = parseInt(row['Stock'] || row['stockQuantity'] || 0);
      const minStock = parseInt(row['Stock min'] || row['minStock'] || 0);
      const unit     = String(row['Unité'] || row['unit'] || 'unité').trim();
      const description = String(row['Description'] || row['description'] || '').trim() || null;

      if (!name) { skipped++; errors.push(`Ligne ${i+2}: nom requis`); continue; }

      await prisma.product.create({
        data: {
          companyId, name, sku, category, price, cost,
          stockQuantity: stock, minStockLevel: minStock, unit, description,
        },
      });
      created++;
    }

    res.json({ success: true, data: { created, skipped, errors } });
  } catch (e) { next(e); }
});

/* ── GET /import/template/:type ─────────────────────────────── */
router.get('/template/:type', authenticate, (req, res) => {
  const templates = {
    employees: [['Prénom','Nom','Email','Poste','Département','Salaire','Date embauche','Contrat'],
                ['Mohamed','Benali','m.benali@entreprise.dz','Développeur','IT',80000,'2024-01-15','CDI']],
    customers:  [['Nom','Email','Téléphone','Adresse','Type','Statut'],
                 ['Sonatrach','contact@sonatrach.dz','+213 21 54 60 00','Alger','COMPANY','ACTIVE']],
    products:   [['Nom','SKU','Catégorie','Prix','Coût','Stock','Stock min','Unité','Description'],
                 ['Relais 24V','REL-24V','Électronique',1200,800,50,10,'unité','Relais industriel 24V']],
  };

  const data = templates[req.params.type];
  if (!data) return res.status(404).json({ success: false, message: 'Type inconnu' });

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', `attachment; filename="template-${req.params.type}.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

export default router;
