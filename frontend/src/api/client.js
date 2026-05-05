import axios from 'axios';

const BASE_URL = (import.meta.env.VITE_API_URL)
  || `http://${window.location.hostname}:3001/api/v1`;

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexuserp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthRoute = url.includes('/auth/');
      if (!isAuthRoute) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export const authAPI = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  register: (data) => apiClient.post('/auth/register', data),
  me: () => apiClient.get('/auth/me'),
  logout: () => apiClient.post('/auth/logout'),
};

export const modulesAPI = {
  getAll: () => apiClient.get('/modules'),
  toggle: (moduleId) => apiClient.patch(`/modules/${moduleId}/toggle`),
  toggleSubmodule: (submoduleId) => apiClient.patch(`/modules/submodules/${submoduleId}/toggle`),
  reorder: (order) => apiClient.patch('/modules/reorder', { order }),
};

export const dashboardAPI = {
  getKPIs: () => apiClient.get('/dashboard/kpis'),
};

export const employeesAPI = {
  getAll: (params) => apiClient.get('/employees', { params }),
  getById: (id) => apiClient.get(`/employees/${id}`),
  create: (data) => apiClient.post('/employees', data),
  update: (id, data) => apiClient.patch(`/employees/${id}`, data),
  delete: (id) => apiClient.delete(`/employees/${id}`),
};

export const leavesAPI = {
  getAll: (params) => apiClient.get('/leaves', { params }),
  create: (data) => apiClient.post('/leaves', data),
  approve: (id) => apiClient.patch(`/leaves/${id}/approve`),
  reject: (id) => apiClient.patch(`/leaves/${id}/reject`),
  cancel: (id) => apiClient.delete(`/leaves/${id}`),
};

export const payrollAPI = {
  getAll: (params) => apiClient.get('/payroll', { params }),
  generate: (data) => apiClient.post('/payroll/generate', data),
  update: (id, data) => apiClient.patch(`/payroll/${id}`, data),
  markPaid: (id) => apiClient.patch(`/payroll/${id}/pay`),
  delete: (id) => apiClient.delete(`/payroll/${id}`),
};

export const customersAPI = {
  getAll: (params) => apiClient.get('/customers', { params }),
  getById: (id) => apiClient.get(`/customers/${id}`),
  create: (data) => apiClient.post('/customers', data),
  update: (id, data) => apiClient.patch(`/customers/${id}`, data),
  delete: (id) => apiClient.delete(`/customers/${id}`),
};

export const productsAPI = {
  getAll: (params) => apiClient.get('/products', { params }),
  getCategories: () => apiClient.get('/products/categories'),
  create: (data) => apiClient.post('/products', data),
  update: (id, data) => apiClient.patch(`/products/${id}`, data),
  delete: (id) => apiClient.delete(`/products/${id}`),
};

export const ordersAPI = {
  getAll: (params) => apiClient.get('/orders', { params }),
  create: (data) => apiClient.post('/orders', data),
  update: (id, data) => apiClient.patch(`/orders/${id}`, data),
  advance: (id) => apiClient.patch(`/orders/${id}/advance`),
  delete: (id) => apiClient.delete(`/orders/${id}`),
};

export const invoicesAPI = {
  getAll: (params) => apiClient.get('/invoices', { params }),
  getById: (id) => apiClient.get(`/invoices/${id}`),
  create: (data) => apiClient.post('/invoices', data),
  update: (id, data) => apiClient.patch(`/invoices/${id}`, data),
  pay: (id) => apiClient.post(`/invoices/${id}/pay`),
  delete: (id) => apiClient.delete(`/invoices/${id}`),
};

export const quotesAPI = {
  getAll: (params) => apiClient.get('/quotes', { params }),
  create: (data) => apiClient.post('/quotes', data),
  update: (id, data) => apiClient.patch(`/quotes/${id}`, data),
  convert: (id) => apiClient.post(`/quotes/${id}/convert`),
  delete: (id) => apiClient.delete(`/quotes/${id}`),
};

export const projectsAPI = {
  getAll: (params) => apiClient.get('/projects', { params }),
  getById: (id) => apiClient.get(`/projects/${id}`),
  create: (data) => apiClient.post('/projects', data),
  update: (id, data) => apiClient.patch(`/projects/${id}`, data),
  delete: (id) => apiClient.delete(`/projects/${id}`),
  getTasks: (id) => apiClient.get(`/projects/${id}/tasks`),
  getAllTasks: (params) => apiClient.get('/projects/tasks/all', { params }),
  createTask: (projectId, data) => apiClient.post(`/projects/${projectId}/tasks`, data),
  updateTask: (taskId, data) => apiClient.patch(`/projects/tasks/${taskId}`, data),
  deleteTask: (taskId) => apiClient.delete(`/projects/tasks/${taskId}`),
};

export const suppliersAPI = {
  getAll: (params) => apiClient.get('/suppliers', { params }),
  getById: (id) => apiClient.get(`/suppliers/${id}`),
  create: (data) => apiClient.post('/suppliers', data),
  update: (id, data) => apiClient.patch(`/suppliers/${id}`, data),
  delete: (id) => apiClient.delete(`/suppliers/${id}`),
};

export const purchasesAPI = {
  getAll: (params) => apiClient.get('/purchases', { params }),
  create: (data) => apiClient.post('/purchases', data),
  update: (id, data) => apiClient.patch(`/purchases/${id}`, data),
  advance: (id) => apiClient.patch(`/purchases/${id}/advance`),
  delete: (id) => apiClient.delete(`/purchases/${id}`),
};

export const messagesAPI = {
  getConversations: () => apiClient.get('/messages/conversations'),
  getThread: (userId) => apiClient.get(`/messages/thread/${userId}`),
  markRead: (userId) => apiClient.patch(`/messages/read/${userId}`),
};

export const usersAPI = {
  getAll: () => apiClient.get('/users'),
  getColleagues: () => apiClient.get('/users/colleagues'),
  create: (data) => apiClient.post('/users', data),
  update: (id, data) => apiClient.patch(`/users/${id}`, data),
};

export const recruitmentAPI = {
  getAll: (params) => apiClient.get('/recruitment', { params }),
  create: (data) => apiClient.post('/recruitment', data),
  update: (id, data) => apiClient.patch(`/recruitment/${id}`, data),
  hire: (id, data) => apiClient.post(`/recruitment/${id}/hire`, data),
  delete: (id) => apiClient.delete(`/recruitment/${id}`),
};

export const uploadCV = (employeeId, file) => {
  const formData = new FormData();
  formData.append('cv', file);
  return apiClient.post(`/employees/${employeeId}/cv`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadCandidateCV = (candidateId, file) => {
  const formData = new FormData();
  formData.append('cv', file);
  return apiClient.post(`/recruitment/${candidateId}/cv`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const notificationsAPI = {
  getAll: () => apiClient.get('/notifications'),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
};

export const iotAPI = {
  dashboard:        ()         => apiClient.get('/iot/dashboard'),
  sensors:          ()         => apiClient.get('/iot/sensors'),
  createSensor:     (data)     => apiClient.post('/iot/sensors', data),
  updateSensor:     (id, data) => apiClient.patch(`/iot/sensors/${id}`, data),
  deleteSensor:     (id)       => apiClient.delete(`/iot/sensors/${id}`),
  readings:         (id, min)  => apiClient.get(`/iot/readings/${id}?minutes=${min || 10}`),
  ingest:           (data)     => apiClient.post('/iot/ingest', data),
  simulations:      ()         => apiClient.get('/iot/simulations'),
  createSimulation: (data)     => apiClient.post('/iot/simulations', data),
  setStatus:        (id, s)    => apiClient.patch(`/iot/simulations/${id}/status`, { status: s }),
  simEvents:        (id)       => apiClient.get(`/iot/simulations/${id}/events`),
  pushEvent:        (id, data) => apiClient.post(`/iot/simulations/${id}/events`, data),
};

export const analyticsAPI = {
  overview:     (params) => apiClient.get('/analytics/overview', { params }),
  healthScore:  ()       => apiClient.get('/analytics/health-score'),
  smartAlerts:  ()       => apiClient.get('/analytics/smart-alerts'),
  financeSummary: ()     => apiClient.get('/analytics/finance-summary'),
};

export const gpaoAPI = {
  routings:       ()         => apiClient.get('/gpao/routings'),
  getRouting:     (id)       => apiClient.get(`/gpao/routings/${id}`),
  createRouting:  (d)        => apiClient.post('/gpao/routings', d),
  updateRouting:  (id, d)    => apiClient.patch(`/gpao/routings/${id}`, d),
  deleteRouting:  (id)       => apiClient.delete(`/gpao/routings/${id}`),
  catalog:        (p)        => apiClient.get('/gpao/supplier-catalog', { params: p }),
  addCatalog:     (d)        => apiClient.post('/gpao/supplier-catalog', d),
  bulkCatalog:    (d)        => apiClient.post('/gpao/supplier-catalog/bulk', d),
  updateCatalog:  (id, d)    => apiClient.patch(`/gpao/supplier-catalog/${id}`, d),
  deleteCatalog:  (id)       => apiClient.delete(`/gpao/supplier-catalog/${id}`),
  calendars:      ()         => apiClient.get('/gpao/calendars'),
  createCalendar: (d)        => apiClient.post('/gpao/calendars', d),
  updateCalendar: (id, d)    => apiClient.patch(`/gpao/calendars/${id}`, d),
  generateDays:   (id, d)    => apiClient.post(`/gpao/calendars/${id}/generate`, d),
  updateDay:      (id, d)    => apiClient.patch(`/gpao/calendars/${id}/day`, d),
  runMrp:         (d)        => apiClient.post('/gpao/mrp/run', d),
  computeLlc:     ()         => apiClient.post('/gpao/bom/compute-llc'),
  bomTree:        (pid)      => apiClient.get(`/gpao/bom/${pid}/tree`),
  runScheduling:  (d)        => apiClient.post('/gpao/scheduling/run', d),
  firmOf:         (id)       => apiClient.post(`/gpao/of/${id}/firm`),
  firmAllOfs:     (d)        => apiClient.post('/gpao/of/firm-all', d || {}),
  shortage:       (id)       => apiClient.get(`/gpao/of/${id}/shortage`),
  charges:        ()         => apiClient.get('/gpao/charges'),
};

export default apiClient;