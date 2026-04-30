import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/index.js';

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}