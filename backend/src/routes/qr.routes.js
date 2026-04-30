import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

// Base QR controller
import {
  generateBatch,
  listQrCodes,
  getTypes,
  getEntities,
  scanQr,
  deleteQr,
  deleteBatch,
  exportZip,
} from '../controllers/qrController.js';

// Module (department-based) QR controller
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  listSubDepts,
  createSubDept,
  deleteSubDept,
  discoverDepartments,
  importDiscovered,
  generateModuleBatch,
  moduleStats,
} from '../controllers/qrModuleController.js';

const router = Router();

/* ─── Public ────────────────────────────────────────────────────────────── */
router.get('/scan/:uniqueCode', scanQr);

/* ─── Authenticated ─────────────────────────────────────────────────────── */
router.use(authenticate);

// Base QR
router.get('/',               listQrCodes);
router.get('/types',          getTypes);
router.get('/entities/:type', getEntities);
router.get('/export/zip',     exportZip);

router.post('/generate-batch', generateBatch);
router.delete('/batch',        deleteBatch);
router.delete('/:id',          deleteQr);

// Module-based generation
router.post('/module-batch',   generateModuleBatch);
router.get('/module-stats',    moduleStats);

// Department management
router.get('/departments',         listDepartments);
router.post('/departments',        createDepartment);
router.patch('/departments/:id',   updateDepartment);
router.delete('/departments/:id',  deleteDepartment);

// Sub-department management
router.get('/departments/:deptId/sub-depts',  listSubDepts);
router.post('/departments/:deptId/sub-depts', createSubDept);
router.delete('/sub-depts/:id',               deleteSubDept);

// Auto-discover from existing data
router.get('/discover/:module',         discoverDepartments);
router.post('/discover/:module/import', importDiscovered);

export default router;
