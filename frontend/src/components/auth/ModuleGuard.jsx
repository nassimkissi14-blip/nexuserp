import { Outlet, Navigate } from 'react-router-dom';
import { useModulesStore } from '../../store/index.js';

export default function ModuleGuard({ slug }) {
  const { isModuleEnabled, modules } = useModulesStore();

  // Attendre que les modules soient chargés
  if (!modules.length) return null;

  if (!isModuleEnabled(slug)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}