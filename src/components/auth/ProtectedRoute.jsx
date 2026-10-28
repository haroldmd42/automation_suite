import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';
import { Spinner } from '../ui/Primitives';

/**
 * Route Guard para todas las rutas protegidas bajo /portal/*
 * Bloquea el acceso y redirige inmediatamente a /login si no hay sesión activa en Supabase.
 */
export default function ProtectedRoute() {
  const { user, loading } = useSupabaseAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-moss-600"
        data-testid="portal-auth-loading"
      >
        <Spinner className="h-7 w-7 text-moss-600" />
        <p className="text-sm font-medium">Verificando sesión segura del portal...</p>
      </div>
    );
  }

  if (!user) {
    // Redirige al login de inmediato si la sesión fue cerrada o no existe
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
