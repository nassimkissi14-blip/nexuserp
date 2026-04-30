import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/index.js';

const ROLE_LEVELS = {
  OPERATOR:   1,
  MANAGER:    2,
  DIRECTOR:   3,
  ADMIN:      4,
  SUPER_ADMIN: 5,
};

/**
 * RoleGuard — blocks access to routes based on minimum role.
 *
 * Usage:
 *   <RoleGuard minRole="ADMIN" />           — require ADMIN or higher
 *   <RoleGuard roles={['ADMIN', 'MANAGER']} /> — require one of these roles
 *   <RoleGuard minRole="MANAGER" dept="rh" />  — require MANAGER+ OR being in dept "rh"
 *
 * OPERATOR: sees only their department pages
 * MANAGER:  sees their department + cross-department reports
 * DIRECTOR/ADMIN/SUPER_ADMIN: full access
 */
export default function RoleGuard({ minRole, roles, dept, children, redirect = '/dashboard' }) {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;

  const userLevel = ROLE_LEVELS[user.role] || 0;

  // Check by explicit roles list
  if (roles && roles.length > 0) {
    if (!roles.includes(user.role)) {
      return <AccessDenied />;
    }
    return children || <div />;
  }

  // Check by minimum role level
  if (minRole) {
    const minLevel = ROLE_LEVELS[minRole] || 0;

    // If a department is specified, OPERATORs and MANAGERs in that dept bypass the minRole check
    if (dept && userLevel < minLevel) {
      const userDept = (user.department || '').toLowerCase();
      if (userDept !== dept.toLowerCase()) {
        return <AccessDenied />;
      }
      // In their dept they can see it (but restricted view handled by the page itself)
      return children || <div />;
    }

    if (userLevel < minLevel) {
      return <AccessDenied />;
    }
  }

  return children || <div />;
}

function AccessDenied() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '60vh', gap: 16, textAlign: 'center',
    }}>
      <div style={{ fontSize: 64 }}>🔒</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Accès refusé</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 320 }}>
        Vous n'avez pas les permissions nécessaires pour accéder à cette section.
        Contactez votre administrateur.
      </p>
      <a href="/dashboard" style={{ marginTop: 8, color: 'var(--accent-primary)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
        ← Retour au tableau de bord
      </a>
    </div>
  );
}
