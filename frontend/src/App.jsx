import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/index.js';
import { useSocket } from './hooks/useSocket.js';

import MainLayout from './components/layout/MainLayout.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import RoleGuard from './components/auth/RoleGuard.jsx';
import ModuleGuard from './components/auth/ModuleGuard.jsx';
import Onboarding from './components/Onboarding.jsx';

// Pages publiques
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import WelcomePage from './pages/WelcomePage.jsx';

// Core
import DashboardPage from './pages/DashboardPage.jsx';
import DeptDashboardPage from './pages/DeptDashboardPage.jsx';

// RH
import EmployeesPage from './pages/rh/EmployeesPage.jsx';
import PendingApprovalsPage from './pages/rh/PendingApprovalsPage.jsx';
import LeavesPage from './pages/rh/LeavesPage.jsx';
import PayrollPage from './pages/rh/PayrollPage.jsx';
import RecruitmentPage from './pages/rh/RecruitmentPage.jsx';

// CRM
import CustomersPage from './pages/crm/CustomersPage.jsx';
import PipelinePage from './pages/crm/PipelinePage.jsx';

// Ventes
import OrdersPage from './pages/sales/OrdersPage.jsx';
import QuotesPage from './pages/sales/QuotesPage.jsx';
import InvoicesPage from './pages/finance/InvoicesPage.jsx';

// Stock
import ProductsPage from './pages/stock/ProductsPage.jsx';
import MovementsPage from './pages/stock/MovementsPage.jsx';
import AlertsPage from './pages/stock/AlertsPage.jsx';

// Projets
import ProjectsPage from './pages/projects/ProjectsPage.jsx';
import TasksPage from './pages/projects/TasksPage.jsx';

// Communication
import MessagingPage from './pages/MessagingPage.jsx';

// AI
import AIAgentPage from './pages/AIAgentPage.jsx';
import AIAnalyticsPage from './pages/AIAnalyticsPage.jsx';
import AIReportsPage from './pages/AIReportsPage.jsx';

// Finance
import AccountingPage from './pages/finance/AccountingPage.jsx';
import BudgetPage from './pages/finance/BudgetPage.jsx';
import TreasuryPage from './pages/finance/TreasuryPage.jsx';

// Projets
import GanttPage from './pages/projects/GanttPage.jsx';
import ResourcesPage from './pages/projects/ResourcesPage.jsx';

// Stock
import InventoryPage from './pages/stock/InventoryPage.jsx';

// Communication
import AnnouncementsPage from './pages/communication/AnnouncementsPage.jsx';
import SharedCalendarPage from './pages/communication/CalendarPage.jsx';

// Admin
import ModulesAdminPage from './pages/ModulesAdminPage.jsx';
import UsersPage from './pages/admin/UsersPage.jsx';
import SettingsPage from './pages/admin/SettingsPage.jsx';
import BackupPage from './pages/admin/BackupPage.jsx';
import LanguagePage from './pages/admin/LanguagePage.jsx';
import WorkflowPage from './pages/admin/WorkflowPage.jsx';
import ActivityLogsPage from './pages/logs/ActivityLogsPage.jsx';

// Production / Maintenance / Performance
import ProductionPage from './pages/production/ProductionPage.jsx';
import BomPage from './pages/production/BomPage.jsx';
import WorkCentersPage from './pages/production/WorkCentersPage.jsx';
import RoutingsPage from './pages/production/RoutingsPage.jsx';
import CalendarsPage from './pages/production/CalendarsPage.jsx';
import SupplierCatalogPage from './pages/production/SupplierCatalogPage.jsx';
import MrpPage from './pages/production/MrpPage.jsx';
import SchedulingPage from './pages/production/SchedulingPage.jsx';
import ShortagePage from './pages/production/ShortagePage.jsx';
import ChargesPage from './pages/production/ChargesPage.jsx';
import MaintenancePage from './pages/maintenance/MaintenancePage.jsx';
import EquipmentPage from './pages/maintenance/EquipmentPage.jsx';
import RequestsPage from './pages/maintenance/RequestsPage.jsx';
import WorkOrdersPage from './pages/maintenance/WorkOrdersPage.jsx';
import PreventivePage from './pages/maintenance/PreventivePage.jsx';
import PerformancePage from './pages/performance/PerformancePage.jsx';

// Reports
import ExportPage from './pages/reports/ExportPage.jsx';

// Logistics
import ShipmentsPage from './pages/logistics/ShipmentsPage.jsx';
import CarriersPage from './pages/logistics/CarriersPage.jsx';
import TrackingPage from './pages/logistics/TrackingPage.jsx';

// RH extras
import ExpensesPage from './pages/rh/ExpensesPage.jsx';
import EvaluationsPage from './pages/rh/EvaluationsPage.jsx';
import MonEspacePage from './pages/rh/MonEspacePage.jsx';

// Sales extras
import CreditsPage from './pages/sales/CreditsPage.jsx';

// Finance
import FinanceReportsPage from './pages/finance/FinanceReportsPage.jsx';

// Analytics
import BIDashboardsPage from './pages/analytics/BIDashboardsPage.jsx';
import CustomReportsPage from './pages/analytics/CustomReportsPage.jsx';

// QR Manager
import QRManagerPage from './pages/QRManagerPage.jsx';
import QrScanPage from './pages/QrScanPage.jsx';
import QRModuleManagerPage from './pages/QRModuleManagerPage.jsx';

// Achats
import SuppliersPage from './pages/purchases/SuppliersPage.jsx';
import PurchasesPage from './pages/purchases/PurchasesPage.jsx';

// Simulation industrielle
import SimulationDashboardPage from './pages/simulation/SimulationDashboardPage.jsx';



import { keepPreviousData } from '@tanstack/react-query';
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, placeholderData: keepPreviousData } },
});

// Page Coming Soon générique
const ComingSoon = ({ title, icon }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '60vh', gap: 16
  }}>
    <div style={{ fontSize: 64 }}>{icon || '🚧'}</div>
    <h2 style={{ fontSize: 24, fontWeight: 700 }}>{title || 'En développement'}</h2>
    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Ce module sera disponible prochainement</p>
  </div>
);

function AppInit({ setShowOnboarding, onLogin }) {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  useSocket();

  // Gestion globale des 401 : logout propre sans rechargement de page
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [logout, navigate]);

  // Onboarding uniquement — fetchModules est maintenant dans MainLayout
  useEffect(() => {
    if (isAuthenticated && user) {
      const seen = localStorage.getItem(`onboarding_done_${user.id}`);
      if (!seen) {
        setTimeout(() => setShowOnboarding(true), 800);
      }
    }
  }, [isAuthenticated, user]);

  return null;
}

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user } = useAuthStore();

  const completeOnboarding = () => {
    if (user?.id) {
      localStorage.setItem(`onboarding_done_${user.id}`, 'done');
    }
    setShowOnboarding(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInit setShowOnboarding={setShowOnboarding} />

        {/* Onboarding overlay */}
        {showOnboarding && <Onboarding onComplete={completeOnboarding} />}

        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
            },
          }}
        />

        <Routes>
          {/* ── Pages publiques ── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/qr/:code" element={<QrScanPage />} />

          {/* ── Pages protégées ── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>

              {/* Dashboard */}
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Dept stats — accessible by route param */}
              <Route path="/stats/:dept" element={<DeptDashboardPage />} />

              {/* Demandes en attente — hors ModuleGuard (accessible même si RH désactivé) */}
              <Route path="/rh/pending" element={<PendingApprovalsPage />} />

              {/* ── RH ── */}
              <Route element={<ModuleGuard slug="rh" />}>
                <Route path="/rh/employees" element={<EmployeesPage />} />
                <Route path="/rh/employes" element={<EmployeesPage />} />
                <Route path="/rh/leaves" element={<LeavesPage />} />
                <Route path="/rh/conges" element={<LeavesPage />} />
                <Route path="/rh/conge" element={<LeavesPage />} />
                <Route path="/rh/payroll" element={<PayrollPage />} />
                <Route path="/rh/paie" element={<PayrollPage />} />
                <Route path="/rh/salaires" element={<PayrollPage />} />
                <Route path="/rh/recrutement" element={<RecruitmentPage />} />
                <Route path="/rh/recruitment" element={<RecruitmentPage />} />
                <Route path="/rh/expenses" element={<ExpensesPage />} />
                <Route path="/rh/evaluations" element={<EvaluationsPage />} />
                <Route path="/rh/performance" element={<PerformancePage />} />
                <Route path="/rh/mon-espace" element={<MonEspacePage />} />
              </Route>

              {/* ── CRM ── */}
              <Route element={<ModuleGuard slug="crm" />}>
                <Route path="/crm/customers" element={<CustomersPage />} />
                <Route path="/crm/clients" element={<CustomersPage />} />
                <Route path="/crm/pipeline" element={<PipelinePage />} />
              </Route>

              {/* ── VENTES ── */}
              <Route element={<ModuleGuard slug="sales" />}>
                <Route path="/sales/orders" element={<OrdersPage />} />
                <Route path="/sales/commandes" element={<OrdersPage />} />
                <Route path="/sales/invoices" element={<InvoicesPage />} />
                <Route path="/sales/factures" element={<InvoicesPage />} />
                <Route path="/finance/invoices" element={<InvoicesPage />} />
                <Route path="/sales/quotes" element={<QuotesPage />} />
                <Route path="/sales/devis" element={<QuotesPage />} />
                <Route path="/sales/credits" element={<CreditsPage />} />
              </Route>

              {/* ── ACHATS ── */}
              <Route element={<ModuleGuard slug="purchases" />}>
                <Route path="/purchases/suppliers" element={<SuppliersPage />} />
                <Route path="/purchases/orders" element={<PurchasesPage />} />
              </Route>

              {/* ── STOCK ── */}
              <Route element={<ModuleGuard slug="stock" />}>
                <Route path="/stock/products" element={<ProductsPage />} />
                <Route path="/stock/produits" element={<ProductsPage />} />
                <Route path="/stock/movements" element={<MovementsPage />} />
                <Route path="/stock/inventory" element={<InventoryPage />} />
                <Route path="/stock/alerts" element={<AlertsPage />} />
              </Route>

              {/* ── FINANCE ── */}
              <Route element={<ModuleGuard slug="finance" />}>
                <Route path="/finance/accounting" element={<AccountingPage />} />
                <Route path="/finance/budget" element={<BudgetPage />} />
                <Route path="/finance/treasury" element={<TreasuryPage />} />
                <Route path="/finance/reports" element={<FinanceReportsPage />} />
                <Route path="/finance/invoices" element={<InvoicesPage />} />
                <Route path="/finance/factures" element={<InvoicesPage />} />
                <Route path="/finance/quotes" element={<QuotesPage />} />
                <Route path="/finance/devis" element={<QuotesPage />} />
              </Route>

              {/* ── PROJETS ── */}
              <Route element={<ModuleGuard slug="projects" />}>
                <Route path="/projects/list" element={<ProjectsPage />} />
                <Route path="/projects/tasks" element={<TasksPage />} />
                <Route path="/projects/gantt" element={<GanttPage />} />
                <Route path="/projects/resources" element={<ResourcesPage />} />
              </Route>

              {/* ── PRODUCTION ── */}
              <Route element={<ModuleGuard slug="production" />}>
                <Route path="/production/manufacturing" element={<ProductionPage />} />
                <Route path="/production/orders" element={<ProductionPage />} />
                <Route path="/production/bom" element={<BomPage />} />
                <Route path="/production/workcenters" element={<WorkCentersPage />} />
                <Route path="/production/planning" element={<ProductionPage />} />
                <Route path="/production/routings" element={<RoutingsPage />} />
                <Route path="/production/calendars" element={<CalendarsPage />} />
                <Route path="/production/supplier-catalog" element={<SupplierCatalogPage />} />
                <Route path="/production/mrp" element={<MrpPage />} />
                <Route path="/production/scheduling" element={<SchedulingPage />} />
                <Route path="/production/shortage" element={<ShortagePage />} />
                <Route path="/production/charges" element={<ChargesPage />} />
              </Route>

              {/* ── MAINTENANCE ── */}
              <Route element={<ModuleGuard slug="maintenance" />}>
                <Route path="/maintenance/equipment" element={<EquipmentPage />} />
                <Route path="/maintenance/requests" element={<RequestsPage />} />
                <Route path="/maintenance/orders" element={<WorkOrdersPage />} />
                <Route path="/maintenance/work-orders" element={<WorkOrdersPage defaultType="CORRECTIVE" />} />
                <Route path="/maintenance/history" element={<MaintenancePage />} />
                <Route path="/maintenance/interventions" element={<WorkOrdersPage />} />
                <Route path="/maintenance/schedule" element={<PreventivePage />} />
                <Route path="/maintenance/preventive" element={<PreventivePage />} />
              </Route>

              {/* ── LOGISTIQUE ── */}
              <Route element={<ModuleGuard slug="logistics" />}>
                <Route path="/logistics/shipments" element={<ShipmentsPage />} />
                <Route path="/logistics/carriers" element={<CarriersPage />} />
                <Route path="/logistics/tracking" element={<TrackingPage />} />
              </Route>

              {/* ── COMMUNICATION ── */}
              <Route element={<ModuleGuard slug="communication" />}>
                <Route path="/communication/messaging" element={<MessagingPage />} />
                <Route path="/communication/messagerie" element={<MessagingPage />} />
                <Route path="/communication/announcements" element={<AnnouncementsPage />} />
                <Route path="/communication/calendar" element={<SharedCalendarPage />} />
              </Route>

              {/* ── ANALYTICS ── */}
              <Route path="/analytics/dashboards" element={<BIDashboardsPage />} />
              <Route path="/analytics/reports" element={<CustomReportsPage />} />

              {/* ── AI ── */}
              <Route path="/ai" element={<AIAgentPage />} />
              <Route path="/ai/assistant" element={<AIAgentPage />} />
              <Route path="/ai/analytics" element={<AIAnalyticsPage />} />
              <Route path="/ai/reports" element={<AIReportsPage />} />

              {/* ── ADMIN — accès restreint selon le rôle ── */}
              <Route path="/admin/modules"   element={<RoleGuard minRole="MANAGER"><ModulesAdminPage /></RoleGuard>} />
              <Route path="/admin/users"     element={<RoleGuard minRole="DIRECTOR"><UsersPage /></RoleGuard>} />
              <Route path="/admin/backup"    element={<RoleGuard minRole="SUPER_ADMIN"><BackupPage /></RoleGuard>} />
              <Route path="/admin/languages" element={<RoleGuard minRole="DIRECTOR"><LanguagePage /></RoleGuard>} />

              {/* ── MON COMPTE — accessibles à tous les employés ── */}
              <Route path="/admin/settings"  element={<SettingsPage />} />
              <Route path="/admin/workflows" element={<WorkflowPage />} />

              {/* ── OUTILS (libres) ── */}
              <Route path="/calendar" element={<SharedCalendarPage />} />
              <Route path="/reports/export" element={<ExportPage />} />
              <Route path="/qr-manager" element={<QRManagerPage />} />
              <Route path="/qr-module-manager" element={<QRModuleManagerPage />} />
              <Route path="/simulation/dashboard" element={<SimulationDashboardPage />} />

              {/* Redirection par défaut */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />

            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}