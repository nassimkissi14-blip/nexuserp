import prisma from '../lib/prisma.js';

const ENTITY_MAP = {
  '/employees':  'EMPLOYEE',
  '/leaves':     'LEAVE',
  '/payroll':    'PAYROLL',
  '/customers':  'CUSTOMER',
  '/products':   'PRODUCT',
  '/orders':     'ORDER',
  '/invoices':   'INVOICE',
  '/quotes':     'QUOTE',
  '/users':      'USER',
  '/projects':   'PROJECT',
  '/evaluations':'EVALUATION',
  '/expenses':   'EXPENSE',
};

const METHOD_ACTION = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' };

export function auditLog(req, res, next) {
  const action = METHOD_ACTION[req.method];
  if (!action || !req.user) return next();

  const entity = Object.entries(ENTITY_MAP).find(([p]) => req.path.startsWith(p))?.[1];
  if (!entity) return next();

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (body?.success && req.user) {
      prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action,
          entity,
          entityId: body?.data?.id || req.params?.id || null,
          newData: action !== 'DELETE' ? (body?.data || null) : null,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']?.slice(0, 200) || null,
        },
      }).catch(() => {});
    }
    return originalJson(body);
  };
  next();
}
