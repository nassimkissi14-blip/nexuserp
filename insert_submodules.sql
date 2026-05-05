DO $$
DECLARE
  cid TEXT := 'cmoju8f0p0000htb5dl48wceo';
  mid_rh TEXT; mid_crm TEXT; mid_sales TEXT; mid_stock TEXT;
  mid_finance TEXT; mid_projects TEXT; mid_comm TEXT; mid_admin TEXT;
  mid_maint TEXT; mid_purchases TEXT;
BEGIN
  SELECT id INTO mid_rh        FROM modules WHERE slug='rh';
  SELECT id INTO mid_crm       FROM modules WHERE slug='crm';
  SELECT id INTO mid_sales     FROM modules WHERE slug='sales';
  SELECT id INTO mid_stock     FROM modules WHERE slug='stock';
  SELECT id INTO mid_finance   FROM modules WHERE slug='finance';
  SELECT id INTO mid_projects  FROM modules WHERE slug='projects';
  SELECT id INTO mid_comm      FROM modules WHERE slug='communication';
  SELECT id INTO mid_admin     FROM modules WHERE slug='admin';
  SELECT id INTO mid_maint     FROM modules WHERE slug='maintenance';
  SELECT id INTO mid_purchases FROM modules WHERE slug='purchases';

  INSERT INTO sub_modules(id,"moduleId",name,slug,icon,"sortOrder",route) VALUES
    (gen_random_uuid()::text, mid_rh, 'Employés',       'rh-employees',   '👤', 1, '/rh/employees'),
    (gen_random_uuid()::text, mid_rh, 'Congés',         'rh-leaves',      '🏖️', 2, '/rh/leaves'),
    (gen_random_uuid()::text, mid_rh, 'Paie',           'rh-payroll',     '💰', 3, '/rh/payroll'),
    (gen_random_uuid()::text, mid_rh, 'Recrutement',    'rh-recruitment', '🔍', 4, '/rh/recruitment'),
    (gen_random_uuid()::text, mid_rh, 'Évaluations',    'rh-evaluations', '⭐', 5, '/rh/evaluations'),
    (gen_random_uuid()::text, mid_rh, 'Notes de frais', 'rh-expenses',    '🧾', 6, '/rh/expenses'),
    (gen_random_uuid()::text, mid_rh, 'Mon Espace',     'rh-myspace',     '👤', 7, '/rh/my-space'),

    (gen_random_uuid()::text, mid_crm, 'Clients',  'crm-customers', '🤝', 1, '/crm/customers'),
    (gen_random_uuid()::text, mid_crm, 'Pipeline', 'crm-pipeline',  '📊', 2, '/crm/pipeline'),

    (gen_random_uuid()::text, mid_sales, 'Commandes', 'sales-orders',   '📋', 1, '/sales/orders'),
    (gen_random_uuid()::text, mid_sales, 'Factures',  'sales-invoices', '🧾', 2, '/sales/invoices'),
    (gen_random_uuid()::text, mid_sales, 'Devis',     'sales-quotes',   '📝', 3, '/sales/quotes'),
    (gen_random_uuid()::text, mid_sales, 'Avoirs',    'sales-credits',  '↩️', 4, '/sales/credits'),

    (gen_random_uuid()::text, mid_stock, 'Produits',   'stock-products',  '📦', 1, '/stock/products'),
    (gen_random_uuid()::text, mid_stock, 'Inventaire', 'stock-inventory', '📋', 2, '/stock/inventory'),
    (gen_random_uuid()::text, mid_stock, 'Mouvements', 'stock-movements', '🔄', 3, '/stock/movements'),
    (gen_random_uuid()::text, mid_stock, 'Alertes',    'stock-alerts',    '🔔', 4, '/stock/alerts'),

    (gen_random_uuid()::text, mid_finance, 'Trésorerie',   'finance-treasury',   '🏦', 1, '/finance/treasury'),
    (gen_random_uuid()::text, mid_finance, 'Comptabilité', 'finance-accounting', '📒', 2, '/finance/accounting'),
    (gen_random_uuid()::text, mid_finance, 'Budget',       'finance-budget',     '📊', 3, '/finance/budget'),
    (gen_random_uuid()::text, mid_finance, 'Rapports',     'finance-reports',    '📈', 4, '/finance/reports'),

    (gen_random_uuid()::text, mid_projects, 'Projets', 'projects-list',  '🗂️', 1, '/projects'),
    (gen_random_uuid()::text, mid_projects, 'Tâches',  'projects-tasks', '✅', 2, '/projects/tasks'),
    (gen_random_uuid()::text, mid_projects, 'Gantt',   'projects-gantt', '📅', 3, '/projects/gantt'),

    (gen_random_uuid()::text, mid_comm, 'Messagerie', 'comm-messages',      '💬', 1, '/messaging'),
    (gen_random_uuid()::text, mid_comm, 'Annonces',   'comm-announcements', '📢', 2, '/communication/announcements'),
    (gen_random_uuid()::text, mid_comm, 'Calendrier', 'comm-calendar',      '📅', 3, '/communication/calendar'),

    (gen_random_uuid()::text, mid_admin, 'Modules',      'admin-modules',  '🧩', 1, '/admin/modules'),
    (gen_random_uuid()::text, mid_admin, 'Utilisateurs', 'admin-users',    '👤', 2, '/admin/users'),
    (gen_random_uuid()::text, mid_admin, 'Paramètres',   'admin-settings', '⚙️', 3, '/admin/settings'),
    (gen_random_uuid()::text, mid_admin, 'Logs',         'admin-logs',     '📋', 4, '/admin/logs'),

    (gen_random_uuid()::text, mid_maint, 'Équipements',   'maint-equipment',   '🔩', 1, '/maintenance/equipment'),
    (gen_random_uuid()::text, mid_maint, 'Interventions', 'maint-work-orders', '🛠️', 2, '/maintenance/work-orders'),
    (gen_random_uuid()::text, mid_maint, 'Préventif',     'maint-preventive',  '📅', 3, '/maintenance/preventive'),
    (gen_random_uuid()::text, mid_maint, 'Demandes',      'maint-requests',    '📝', 4, '/maintenance/requests'),

    (gen_random_uuid()::text, mid_purchases, 'Fournisseurs', 'purchases-suppliers', '🏭', 1, '/purchases/suppliers'),
    (gen_random_uuid()::text, mid_purchases, 'Commandes',    'purchases-orders',    '📦', 2, '/purchases/orders')
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO company_submodules(id,"companyId","submoduleId",enabled)
  SELECT gen_random_uuid()::text, cid, sm.id, true FROM sub_modules sm
  WHERE NOT EXISTS (
    SELECT 1 FROM company_submodules cs WHERE cs."companyId"=cid AND cs."submoduleId"=sm.id
  );

  RAISE NOTICE 'Done. Submodules: %', (SELECT count(*) FROM sub_modules);
END $$;
