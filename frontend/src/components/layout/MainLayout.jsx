import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useNotificationsStore, useModulesStore } from '../../store/index.js';
import { useModulesConfigStore } from '../../store/modulesConfig.js';
import { useTheme } from '../../context/ThemeContext.jsx';
import {
  Bell, LogOut, ChevronRight,
  Menu, X, Moon, Sun, Bot, Search,
} from 'lucide-react';
import CommandPalette from '../CommandPalette.jsx';
import SimulationPanel from '../SimulationPanel.jsx';

// Department → allowed module slugs (null = all modules)
const DEPT_MODULE_ACCESS = {
  'direction':           null,
  'administration':      null,
  'maintenance':         ['maintenance', 'communication'],
  'ressources humaines': ['rh', 'communication'],
  'crm & ventes':        ['crm', 'sales', 'communication'],
  'crm':                 ['crm', 'sales', 'communication'],
  'finance':             ['finance', 'communication'],
  'stock':               ['stock', 'communication'],
  'logistique':          ['stock', 'logistics', 'communication'],
  'production':          ['production', 'communication'],
  'projets':             ['projects', 'communication'],
  'achats':              ['purchases', 'communication'],
  'communication':       ['communication'],
  'it':                  ['ai', 'analytics', 'communication'],
};

const normDept = (dept) =>
  (dept || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

const TOOL_LINKS = [
  { icon: '📅', label: 'Calendrier',           route: '/calendar'               },
  { icon: '📱', label: 'QR Manager',           route: '/qr-manager'             },
  { icon: '🗂️', label: 'QR par module',       route: '/qr-module-manager'      },
  { icon: '📤', label: 'Exports & Rapports',   route: '/reports/export'         },
  { icon: '🏭', label: 'Simulation industrielle', route: '/simulation/dashboard' },
];

const ADMIN_LINKS = [
  { icon: '⚙️', label: 'Modules',      route: '/admin/modules'    },
  { icon: '👤', label: 'Utilisateurs', route: '/admin/users'      },
  { icon: '🔧', label: 'Paramètres',   route: '/admin/settings'   },
  { icon: '🔀', label: 'Workflow',     route: '/admin/workflows'  },
  { icon: '📋', label: 'Logs',         route: '/admin/logs'       },
];

// Framer Motion variants ──────────────────────────────────────────────────────

const subMenuVariants = {
  hidden: { opacity: 0, height: 0, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
  visible: {
    opacity: 1, height: 'auto',
    transition: { duration: 0.25, ease: [0, 0, 0.2, 1], staggerChildren: 0.04, delayChildren: 0.04 },
  },
};

const subItemVariants = {
  hidden:  { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.18 } },
};

const notifPanelVariants = {
  hidden:  { opacity: 0, scale: 0.96, y: -8 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, scale: 0.96, y: -8, transition: { duration: 0.15 } },
};

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  enter:   { opacity: 1, y: 0,  transition: { duration: 0.26, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

// Animated page outlet ────────────────────────────────────────────────────────
function PageOutlet() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        style={{ flex: 1 }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

// Main component ──────────────────────────────────────────────────────────────
export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState({});
  const [notifOpen, setNotifOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const { darkMode, toggle: toggleDarkMode } = useTheme();
  const { user, logout } = useAuthStore();
  const { notifications, unreadCount, fetchNotifications, markAllRead } = useNotificationsStore();
  const { getVisible } = useModulesConfigStore();
  const { fetchModules, isModuleEnabled } = useModulesStore();

  // Expand all visible modules on first load
  useEffect(() => {
    const expanded = getVisible().reduce((acc, m) => ({ ...acc, [m.slug]: true }), {});
    setExpandedModules(expanded);
  }, []);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { fetchNotifications(); }, []);
  useEffect(() => { fetchModules(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(p => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleExpand = (slug) =>
    setExpandedModules(prev => ({ ...prev, [slug]: !prev[slug] }));

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Compute allowed slugs based on department (SUPER_ADMIN and Direction see everything)
  const dept = normDept(user?.department);
  const isSuperOrDir = user?.role === 'SUPER_ADMIN' || dept === 'direction' || dept === 'administration';
  const allowedSlugs = isSuperOrDir ? null : (DEPT_MODULE_ACCESS[dept] ?? null);

  // Sidebar modules filtered by company-enabled + user department
  const displayModules = getVisible()
    .filter(m => isModuleEnabled(m.slug))
    .filter(m => !allowedSlugs || allowedSlugs.includes(m.slug));

  // Admin system links only for Direction + SUPER_ADMIN
  const showAdminLinks = isSuperOrDir;

  // Theme-aware colors — aligned with premium CSS variables
  const C = {
    bg:          darkMode ? '#04060f'               : '#f0f2f8',
    bgCard:      darkMode ? '#0b1120'               : '#ffffff',
    bgSidebar:   darkMode ? '#060a16'               : '#1a1f35',
    border:      darkMode ? 'rgba(255,255,255,0.07)': 'rgba(0,0,0,0.08)',
    textPrimary: darkMode ? '#f1f5ff'               : '#0f172a',
    textMuted:   darkMode ? '#3d4f6e'               : '#64748b',
    textSub:     darkMode ? '#8b9cbf'               : '#334155',
    separator:   darkMode ? 'rgba(255,255,255,0.07)': 'rgba(0,0,0,0.08)',
    navHover:    darkMode ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.06)',
    navActive:   'rgba(99,102,241,0.15)',
    topbar:      darkMode ? 'rgba(4,6,15,0.85)'     : 'rgba(26,31,53,0.96)',
  };

  const navItemBase = (isActive, accent = '#6366f1') => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: sidebarOpen ? '8px 12px' : '8px',
    borderRadius: 8,
    color: isActive ? '#a5b4fc' : C.textSub,
    background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
    cursor: 'pointer', textDecoration: 'none',
    border: 'none', width: '100%', textAlign: 'left',
    fontSize: 13.5, fontFamily: 'inherit',
    whiteSpace: 'nowrap', overflow: 'hidden',
    justifyContent: sidebarOpen ? 'flex-start' : 'center',
    position: 'relative',
    transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
    boxShadow: isActive ? 'inset 2px 0 0 #6366f1' : 'none',
  });

  const subBase = (isActive) => ({
    ...navItemBase(isActive),
    paddingLeft: 28, fontSize: 12.5,
    color: isActive ? '#a5b4fc' : C.textMuted,
    background: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
    boxShadow: isActive ? 'inset 2px 0 0 rgba(99,102,241,0.5)' : 'none',
  });

  const SectionLabel = ({ label }) => sidebarOpen ? (
    <div className="section-label" style={{ color: C.separator }}>{label}</div>
  ) : (
    <div style={{ height: 1, background: C.separator, margin: '8px 4px' }} />
  );

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: C.bg, color: C.textPrimary,
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>

      {/* ═══════════════════════════════════════
          SIDEBAR (animated)
      ═══════════════════════════════════════ */}
      <motion.aside
        animate={{ width: sidebarOpen ? 262 : 64, minWidth: sidebarOpen ? 262 : 64 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        style={{
          background: C.bgSidebar,
          borderRight: `1px solid ${C.separator}`,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', zIndex: 100,
          height: '100vh', position: 'sticky', top: 0,
        }}
      >
        {/* Logo */}
        <div style={{
          padding: sidebarOpen ? '16px' : '16px 8px',
          borderBottom: `1px solid ${C.separator}`,
          display: 'flex', alignItems: 'center', gap: 10,
          minHeight: 64, justifyContent: sidebarOpen ? 'flex-start' : 'center',
        }}>
          <motion.div
            whileHover={{ scale: 1.08, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'white', flexShrink: 0, cursor: 'pointer' }}
            onClick={() => navigate('/dashboard')}
          >
            N
          </motion.div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div style={{ fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg,#818cf8,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>NexusERP</div>
                <div style={{ fontSize: 10, color: '#334155', marginTop: 2 }}>Plateforme ERP</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto', overflowX: 'hidden' }}>

          {/* Dashboard */}
          <NavLink to="/dashboard" style={({ isActive }) => navItemBase(isActive)}>
            {({ isActive }) => (
              <motion.div
                whileHover={{ x: isActive ? 0 : 2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}
              >
                <span style={{ fontSize: 15, flexShrink: 0 }}>📊</span>
                <AnimatePresence>{sidebarOpen && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ fontWeight: 500 }}>Dashboard</motion.span>}</AnimatePresence>
              </motion.div>
            )}
          </NavLink>

          {/* NexusAI */}
          <NavLink to="/ai/assistant" style={() => ({
            ...navItemBase(location.pathname.startsWith('/ai'), '#f43f5e'),
            background: location.pathname.startsWith('/ai') ? 'rgba(244,63,94,0.12)' : 'transparent',
            color: location.pathname.startsWith('/ai') ? '#f87171' : C.textSub,
            marginBottom: 4,
          })}>
            <motion.div
              whileHover={{ x: 2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}
            >
              <Bot size={15} style={{ flexShrink: 0 }} />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <span style={{ fontWeight: 600 }}>NexusAI</span>
                    <span style={{ marginLeft: 'auto', fontSize: 9, background: 'rgba(244,63,94,0.2)', color: '#f87171', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>IA</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </NavLink>

          <SectionLabel label="Modules" />

          {/* Modules dynamiques */}
          {displayModules.map(mod => {
            const isExpanded = expandedModules[mod.slug];
            const isActive = location.pathname.startsWith(`/${mod.slug}`);
            // Only show enabled sub-modules
            const subLinks = (mod.subModules || []).filter(s => s.enabled);

            return (
              <div key={mod.id} style={{ marginBottom: 2 }}>
                <motion.button
                  whileHover={{ x: isActive ? 0 : 2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => { if (subLinks.length > 0) toggleExpand(mod.slug); else navigate(`/${mod.slug}`); }}
                  style={navItemBase(isActive)}
                >
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{mod.icon}</span>
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 6 }}>
                        <span style={{ flex: 1, fontWeight: 500 }}>{mod.name}</span>
                        {subLinks.length > 0 && (
                          <motion.span
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ color: C.textMuted, display: 'flex' }}
                          >
                            <ChevronRight size={13} />
                          </motion.span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>

                <AnimatePresence>
                  {sidebarOpen && isExpanded && (
                    <motion.div
                      variants={subMenuVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      style={{ overflow: 'hidden' }}
                    >
                      {subLinks.map((link, i) => (
                        <motion.div key={i} variants={subItemVariants}>
                          <NavLink to={link.route} style={({ isActive }) => subBase(isActive)}>
                            <span style={{ color: C.textMuted, fontSize: 14, marginRight: 2 }}>›</span>
                            <span>{link.name}</span>
                          </NavLink>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          <SectionLabel label="Outils" />

          {TOOL_LINKS.map(link => (
            <NavLink key={link.route} to={link.route} style={({ isActive }) => navItemBase(isActive)}>
              <motion.div whileHover={{ x: 2 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{link.icon}</span>
                <AnimatePresence>{sidebarOpen && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ fontWeight: 500 }}>{link.label}</motion.span>}</AnimatePresence>
              </motion.div>
            </NavLink>
          ))}

          {showAdminLinks && (
            <>
              <SectionLabel label="Système" />
              {ADMIN_LINKS.map(link => (
                <NavLink key={link.route} to={link.route} style={({ isActive }) => navItemBase(isActive)}>
                  {({ isActive }) => (
                    <motion.div whileHover={{ x: isActive ? 0 : 2 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{link.icon}</span>
                      <AnimatePresence>
                        {sidebarOpen && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ fontWeight: 500 }}>{link.label}</motion.span>}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Footer */}
        <div style={{ padding: '10px 8px', borderTop: `1px solid ${C.separator}` }}>
          <AnimatePresence mode="wait">
            {sidebarOpen ? (
              <motion.div key="user-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 4, background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)', borderRadius: 8, border: `1px solid ${C.separator}` }}>
                <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', boxShadow: '0 0 10px rgba(99,102,241,0.35)' }}>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.firstName} {user?.lastName}</div>
                  <div style={{ fontSize: 10, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>{user?.role}</div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="user-icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ x: 2, background: 'rgba(239,68,68,0.1)' }}
            whileTap={{ scale: 0.97 }}
            onClick={handleLogout}
            style={{ ...navItemBase(false), color: '#ef4444', justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
          >
            <LogOut size={14} style={{ flexShrink: 0 }} />
            <AnimatePresence>{sidebarOpen && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ fontWeight: 500 }}>Déconnexion</motion.span>}</AnimatePresence>
          </motion.button>
        </div>
      </motion.aside>

      {/* ═══════════════════════════════════════
          MAIN AREA
      ═══════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* TOPBAR */}
        <header style={{
          height: 64,
          background: C.topbar,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${C.separator}`,
          display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 12,
          position: 'sticky', top: 0, zIndex: 50,
        }}>

          {/* Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.separator}`, borderRadius: 8, padding: 7, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {sidebarOpen
                ? <motion.div key="x"   initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}><X size={18} /></motion.div>
                : <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}><Menu size={18} /></motion.div>
              }
            </AnimatePresence>
          </motion.button>

          {/* Breadcrumb */}
          <div style={{ flex: 1, fontSize: 13, color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {location.pathname.split('/').filter(Boolean).map((seg, i, arr) => (
              <span key={i}>
                <span style={{ color: i === arr.length - 1 ? C.textSub : C.textMuted, textTransform: 'capitalize' }}>{seg}</span>
                {i < arr.length - 1 && <span style={{ margin: '0 6px', color: C.separator }}>/</span>}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

            {/* Command Palette trigger */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setPaletteOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${C.separator}`,
                color: C.textMuted, fontSize: 12, fontWeight: 500,
                minWidth: 180,
              }}
            >
              <Search size={13} />
              <span style={{ flex: 1, textAlign: 'left', color: C.textMuted }}>Rechercher…</span>
              <kbd style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.separator}`, borderRadius: 5, padding: '1px 6px', fontSize: 10, fontFamily: 'monospace', color: C.textMuted }}>⌃K</kbd>
            </motion.button>

            {/* AI button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/ai/assistant')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 8, color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              <Bot size={14} /> NexusAI
            </motion.button>

            {/* Dark mode */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9, rotate: 20 }}
              onClick={toggleDarkMode}
              title={darkMode ? 'Mode clair' : 'Mode sombre'}
              style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.separator}`, borderRadius: 8, padding: 7, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {darkMode
                  ? <motion.div key="sun"  initial={{ rotate: -60, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 60, opacity: 0 }} transition={{ duration: 0.2 }}><Sun  size={16} color="#fbbf24" /></motion.div>
                  : <motion.div key="moon" initial={{ rotate: 60,  opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -60, opacity: 0 }} transition={{ duration: 0.2 }}><Moon size={16} color="#6366f1" /></motion.div>
                }
              </AnimatePresence>
            </motion.button>

            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => setNotifOpen(!notifOpen)}
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.separator}`, borderRadius: 8, padding: 7, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative' }}
              >
                <Bell size={16} />
                <AnimatePresence>
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      style={{ position: 'absolute', top: 0, right: 0, background: '#ef4444', color: 'white', fontSize: 9, fontWeight: 700, borderRadius: 10, padding: '1px 4px', minWidth: 14, textAlign: 'center', transform: 'translate(30%,-30%)' }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    variants={notifPanelVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    style={{
                      position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                      width: 350, background: C.bgCard,
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
                      zIndex: 200, overflow: 'hidden',
                      transformOrigin: 'top right',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications</span>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>Tout lire</button>
                        )}
                        <button onClick={() => setNotifOpen(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                      </div>
                    </div>
                    <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '32px 24px', textAlign: 'center', color: C.textMuted }}>
                          <div style={{ fontSize: 36, marginBottom: 10 }}>🔕</div>
                          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Tout est calme</div>
                          <div style={{ fontSize: 12 }}>Aucune notification pour l'instant</div>
                        </div>
                      ) : notifications.slice(0, 12).map((n, i) => (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.18 }}
                          onClick={() => { if (n.link) { navigate(n.link); setNotifOpen(false); } }}
                          style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, borderLeft: !n.isRead ? '3px solid #6366f1' : '3px solid transparent', background: !n.isRead ? 'rgba(99,102,241,0.05)' : 'transparent', cursor: n.link ? 'pointer' : 'default' }}
                        >
                          <div style={{ fontSize: 13, fontWeight: !n.isRead ? 600 : 400 }}>{n.title}</div>
                          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{n.message}</div>
                          {n.link && <div style={{ fontSize: 11, color: '#6366f1', marginTop: 4, fontWeight: 600 }}>→ Voir</div>}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar */}
            <motion.div
              whileHover={{ scale: 1.06, boxShadow: '0 0 24px rgba(99,102,241,0.55)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/admin/settings')}
              title={`${user?.firstName} ${user?.lastName}`}
              style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: '0 0 14px rgba(99,102,241,0.3)' }}
            >
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </motion.div>
          </div>
        </header>

        {/* PAGE CONTENT with transition */}
        <main style={{ flex: 1, overflowY: 'auto', background: C.bg }}>
          <div style={{ padding: 28 }}>
            <PageOutlet />
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* Simulation Panel */}
      <SimulationPanel />
    </div>
  );
}
