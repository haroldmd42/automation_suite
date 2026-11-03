import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';
import { getRoleHomeRoute } from '../layout/Layout';
import { Spinner } from '../ui/Primitives';

/**
 * Route Guard para todas las rutas protegidas bajo /portal/*
 * Bloquea el acceso y redirige inmediatamente a /login si no hay sesión activa en Supabase,
 * o a la ruta principal del rol del usuario si intenta acceder a una sección de otro rol.
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, profile, loading, isConfigured } = useSupabaseAuth();
  const location = useLocation();

  if (loading || (user && isConfigured && !profile)) {
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-moss-600"
        data-testid="portal-auth-loading"
      >
        <Spinner className="h-7 w-7 text-moss-600" />
        <p className="text-sm font-medium">Verificando sesión y permisos del rol...</p>
      </div>
    );
  }

  if (!user) {
    // Redirige al login de inmediato si la sesión fue cerrada o no existe
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const userRole = profile?.role || user?.user_metadata?.role || 'qa_lead';
  const homeRoute = getRoleHomeRoute(userRole);

  // Si está en la raíz /portal exacta, redirigir a la sección correspondiente a su rol
  if (location.pathname === '/portal' || location.pathname === '/portal/') {
    return <Navigate to={homeRoute} replace />;
  }

  // Validar acceso exclusivo por rol si se especifican roles permitidos
  if (allowedRoles && !allowedRoles.includes('*') && !allowedRoles.includes(userRole)) {
    return <Navigate to={homeRoute} replace />;
  }

  return children ? children : <Outlet />;
}
