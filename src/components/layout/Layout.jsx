import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  Crosshair,
  Menu,
  MousePointerClick,
  ScanSearch,
  ShoppingCart,
  Wifi,
  WifiOff,
  X,
  Zap,
  ChevronRight,
  RotateCcw,
  FileCode2,
  LogIn,
  LogOut,
  User,
  Database,
} from 'lucide-react';
import { MODULES, PORTAL_MODULES } from '../../modules';
import { useQA } from '../../context/QAContext';
import { useCart } from '../../modules/ecommerce/CartContext';
import { useNetworkConfig } from '../../hooks/useNetworkConfig';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';
import { useToast } from '../../context/ToastContext';
import { FAILURE_RATES, NETWORK_MODES, setNetworkConfig } from '../../services/network';
import { cn } from '../../utils/format';
import LocatorInspector from '../qa/LocatorInspector';
import LocatorHint from '../qa/LocatorHint';
import CustomSelect from '../ui/CustomSelect';
import GherkinDrawer from '../qa/GherkinDrawer';

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3 px-2" data-testid="brand-link">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-moss-400 to-moss-600 shadow-lift ring-1 ring-white/20">
        <Crosshair className="h-5 w-5 text-white" aria-hidden />
      </div>
      <div className="leading-tight">
        <p className="font-display text-[17px] font-bold text-white">Automation</p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-moss-400">Suite · QA Lab</p>
      </div>
    </Link>
  );
}

function Sidebar({ open, onClose }) {
  const { user, profile, signOut, logAudit } = useSupabaseAuth();
  const isAdmin = profile?.role === 'admin';
  const [rolePreview, setRolePreview] = useState('all');
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = async () => {
    try {
      if (logAudit && user) {
        await logAudit('logout', 'auth.users', { email: user.email, role: profile?.role });
      }
      await signOut();
      toast.info('Sesión cerrada', 'Has salido del portal.');
    } catch (err) {
      console.warn('Error cerrando sesión:', err);
    } finally {
      if (onClose) onClose();
      navigate('/login', { replace: true });
    }
  };

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-moss-950/50 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        data-testid="sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-gradient-to-b from-moss-800 via-moss-900 to-moss-950 px-4 py-5 transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <div className="relative flex items-center justify-between">
          {user ? (
            <Link to="/portal/users" className="flex items-center gap-3 px-2" data-testid="portal-brand-link">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-moss-400 to-moss-600 shadow-lift ring-1 ring-white/20">
                <Database className="h-5 w-5 text-white" aria-hidden />
              </div>
              <div className="leading-tight">
                <p className="font-display text-[17px] font-bold text-white">Portal Cloud</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.20em] text-moss-400">
                  {isAdmin ? 'Administrador' : 'Colaborador'}
                </p>
              </div>
            </Link>
          ) : (
            <Brand />
          )}

          <button
            type="button"
            className="rounded-lg p-2 text-moss-300 hover:bg-white/10 lg:hidden"
            onClick={onClose}
            aria-label="Cerrar menú"
            data-testid="sidebar-close-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="relative mt-8 flex-1 space-y-1 overflow-y-auto" aria-label="Navegación principal">
          {user ? (
            <>
              {isAdmin ? (
                <div className="mb-3 px-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-moss-400">
                      Filtrar Vista por Rol
                    </p>
                    <span className="badge badge-moss !text-[9px] !py-0 !px-1 font-mono">RBAC</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { key: 'all', label: 'Todos' },
                      { key: 'admin', label: 'Admin' },
                      { key: 'qa_lead', label: 'QA Lead' },
                      { key: 'developer', label: 'Dev' },
                      { key: 'devops', label: 'DevOps' },
                      { key: 'auditor', label: 'Auditor' },
                      { key: 'support', label: 'Soporte' },
                    ].map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setRolePreview(r.key)}
                        data-testid={`filter-role-${r.key}-btn`}
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-semibold transition',
                          rolePreview === r.key
                            ? 'bg-moss-500 text-white font-bold shadow-soft'
                            : 'bg-white/5 text-moss-300 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-moss-400">
                  Módulos de {profile?.role?.toUpperCase() || 'USUARIO'}
                </p>
              )}

              {PORTAL_MODULES.filter((m) => {
                if (isAdmin && rolePreview === 'all') return true;
                const effectiveRole = isAdmin && rolePreview !== 'all' ? rolePreview : (profile?.role || 'admin');
                return m.roles.includes('*') || m.roles.includes(effectiveRole);
              }).map((m) => {
                const Icon = m.icon;
                return (
                  <NavLink
                    key={m.key}
                    to={m.path}
                    onClick={onClose}
                    data-testid={m.testId}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-white/10 text-white shadow-inner ring-1 ring-white/10 font-bold'
                          : 'text-moss-300 hover:bg-white/5 hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg transition',
                            isActive ? 'bg-moss-500 text-white shadow-soft' : 'bg-white/5 text-moss-400 group-hover:text-moss-200',
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="flex-1 truncate">{m.label}</span>
                        {m.badge && (
                          <span className="rounded bg-moss-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-moss-300 ring-1 ring-moss-400/30">
                            {m.badge}
                          </span>
                        )}
                        {isActive && <ChevronRight className="h-4 w-4 text-moss-400" aria-hidden />}
                      </>
                    )}
                  </NavLink>
                );
              })}

              <div className="pt-6 border-t border-white/10 mt-6 space-y-1">
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-moss-500">
                  Pruebas Automatizadas
                </p>
                <Link
                  to="/"
                  onClick={onClose}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-moss-300 hover:bg-white/5 hover:text-white transition"
                  data-testid="sidebar-switch-to-qa-btn"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-moss-400 group-hover:text-moss-200">
                    <Crosshair className="h-4 w-4" />
                  </span>
                  <span className="flex-1">Suite de Pruebas QA</span>
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-moss-500">
                Módulos de Práctica
              </p>
              {MODULES.map((m) => {
                const Icon = m.icon;
                return (
                  <NavLink
                    key={m.key}
                    to={m.path}
                    end={m.path === '/'}
                    onClick={onClose}
                    data-testid={m.testId}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-white/10 text-white shadow-inner ring-1 ring-white/10'
                          : 'text-moss-300 hover:bg-white/5 hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg transition',
                            isActive ? 'bg-moss-500 text-white shadow-soft' : 'bg-white/5 text-moss-400 group-hover:text-moss-200',
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="flex-1 truncate">{m.label}</span>
                        {isActive && <ChevronRight className="h-4 w-4 text-moss-400" aria-hidden />}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </>
          )}
        </nav>

        {user ? (
          <div className="relative mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-moss-500 to-moss-800 text-sm font-bold text-white shadow-soft ring-1 ring-white/20">
                {(profile?.full_name || user.email || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">{profile?.full_name || 'Usuario'}</p>
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-moss-400/20 px-1.5 py-0.5 text-[9px] font-bold text-moss-300">
                    {profile?.role || 'Admin'}
                  </span>
                  <span className="truncate font-mono text-[10px] text-moss-400">{user.email}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg p-1.5 text-moss-400 hover:bg-white/10 hover:text-white transition"
                title="Cerrar sesión"
                data-testid="sidebar-logout-btn"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="relative mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-moss-300">
            <p className="mb-1 font-semibold text-moss-100">Convención de selectores</p>
            <p>
              Todo elemento interactivo expone <code className="code-chip">data-testid</code> estable en kebab-case:{' '}
              <span className="font-mono text-moss-200">módulo-elemento-tipo</span>.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}

export function getRoleHomeRoute(role) {
  switch (role) {
    case 'qa_lead':
      return '/portal/qa-plans';
    case 'developer':
      return '/portal/dev-releases';
    case 'devops':
      return '/portal/devops-pipelines';
    case 'auditor':
      return '/portal/security-compliance';
    case 'support':
      return '/portal/support-tickets';
    case 'admin':
    default:
      return '/portal/users';
  }
}

const ROUTE_LABELS = {
  '/login': 'Iniciar Sesión',
  '/portal': 'Gestión de Usuarios (Admin)',
  '/portal/users': 'Gestión de Usuarios (Admin)',
  '/portal/qa-plans': 'Suites & Planes de Prueba (QA Lead)',
  '/portal/dev-releases': 'Releases & Feature Flags (Dev Senior)',
  '/portal/devops-pipelines': 'Pipelines CI/CD & Clúster (DevOps)',
  '/portal/security-compliance': 'Seguridad & Cumplimiento (Auditor)',
  '/portal/support-tickets': 'Mesa de Ayuda & Tickets L2 (Soporte)',
  '/portal/audit': 'Auditoría y Registros',
  '/portal/profile': 'Mi Perfil y Credenciales',
  '/ecommerce/cart': 'Carrito de Compras',
  '/ecommerce/checkout': 'Checkout',
};

function getBreadcrumbLabel(pathname) {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  if (pathname.startsWith('/ecommerce/order/')) return 'Confirmación de Pedido';
  const found = MODULES.find((m) => (m.path === '/' ? pathname === '/' : pathname.startsWith(m.path)));
  return found?.label || 'Página no encontrada';
}

function Topbar({ onMenu }) {
  const { showLocators, toggleLocators, inspector, setInspector, gherkinOpen, toggleGherkin } = useQA();
  const network = useNetworkConfig();
  const { itemCount } = useCart();
  const { user, profile, signOut, logAudit } = useSupabaseAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const breadcrumbLabel = getBreadcrumbLabel(location.pathname);
  const homeRoute = getRoleHomeRoute(profile?.role);

  const handleLogout = async () => {
    try {
      if (logAudit && user) {
        await logAudit('logout', 'auth.users', { email: user.email, role: profile?.role });
      }
      await signOut();
      toast.info('Sesión cerrada', 'Has salido del portal.');
    } catch (err) {
      console.warn('Error cerrando sesión:', err);
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <header
      data-qa-ignore
      className="sticky top-0 z-30 border-b border-moss-200/80 bg-moss-50/75 backdrop-blur-xl"
      data-testid="topbar"
    >
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          className="btn btn-ghost btn-icon lg:hidden"
          onClick={onMenu}
          aria-label="Abrir menú"
          data-testid="sidebar-open-btn"
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm md:flex" data-testid="breadcrumb">
          <Link to={user ? homeRoute : '/'} className="text-moss-600 hover:text-moss-900">
            {user ? 'Portal' : 'Suite'}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-moss-400" aria-hidden />
          <span className="truncate font-semibold text-moss-900">{breadcrumbLabel}</span>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {!user && (
            <>
              <div
                className="hidden items-center gap-1.5 rounded-xl border border-moss-200 bg-white/90 p-1 shadow-sm sm:flex"
                title="Simulación de red"
              >
                <span className="pl-1.5 text-moss-600">
                  {network.mode === 'instant' ? <Zap className="h-4 w-4" /> : network.failureRate > 0 ? <WifiOff className="h-4 w-4 text-warning-600" /> : <Wifi className="h-4 w-4" />}
                </span>
                <div className="w-32">
                  <CustomSelect
                    id="network-mode-select"
                    testId="network-mode-select"
                    size="sm"
                    ariaLabel="Velocidad de red"
                    value={network.mode}
                    onChange={(e) => setNetworkConfig({ mode: e.target.value })}
                    options={Object.entries(NETWORK_MODES).map(([k, v]) => ({
                      value: k,
                      label: v.label,
                    }))}
                  />
                </div>
                <div className="w-28">
                  <CustomSelect
                    id="network-failure-select"
                    testId="network-failure-select"
                    size="sm"
                    ariaLabel="Tasa de fallos de red"
                    value={String(network.failureRate)}
                    onChange={(e) => setNetworkConfig({ failureRate: Number(e.target.value) })}
                    options={FAILURE_RATES.map((f) => ({
                      value: String(f.value),
                      label: f.label,
                    }))}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={toggleGherkin}
                aria-pressed={gherkinOpen}
                data-testid="topbar-gherkin-btn"
                title="Casos y escenarios de prueba en Gherkin (BDD)"
                className={cn('btn btn-sm', gherkinOpen ? 'btn-primary' : 'btn-secondary')}
              >
                <FileCode2 className="h-4 w-4" />
                <span className="hidden xl:inline">Escenarios Gherkin</span>
              </button>

              <Link
                to="/ecommerce/cart"
                className="btn btn-secondary btn-sm relative"
                data-testid="topbar-cart-link"
                aria-label={`Carrito con ${itemCount} artículos`}
              >
                <ShoppingCart className="h-4 w-4" />
                <span
                  data-testid="topbar-cart-count"
                  className={cn(
                    'absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow ring-2 ring-moss-50 transition',
                    itemCount > 0 ? 'scale-100 bg-moss-600' : 'scale-90 bg-moss-400',
                  )}
                >
                  {itemCount}
                </span>
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={toggleLocators}
            aria-pressed={showLocators}
            data-testid="toggle-locators-btn"
            title="Mostrar / ocultar íconos de localizador"
            className={cn('btn btn-sm', showLocators ? 'btn-primary' : 'btn-secondary')}
          >
            <Crosshair className="h-4 w-4" />
            <span className="hidden xl:inline">Localizadores</span>
          </button>
          <button
            type="button"
            onClick={() => setInspector((v) => !v)}
            aria-pressed={inspector}
            data-testid="toggle-inspector-btn"
            title="Modo inspector: resalta elementos con data-testid"
            className={cn('btn btn-sm', inspector ? 'btn-primary animate-pulse-ring' : 'btn-secondary')}
          >
            {inspector ? <MousePointerClick className="h-4 w-4" /> : <ScanSearch className="h-4 w-4" />}
            <span className="hidden xl:inline">Inspector</span>
          </button>

          {/* Autenticación Real Supabase */}
          {user ? (
            <div className="flex items-center gap-1.5 pl-2 border-l border-moss-200">
              <Link
                to={homeRoute}
                className="flex items-center gap-2 rounded-xl bg-white px-2.5 py-1 text-xs font-semibold text-moss-800 shadow-sm border border-moss-200 hover:border-moss-400 transition"
                data-testid="topbar-user-profile-btn"
                title="Ir a tu Módulo Principal en el Portal"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-moss-500 to-moss-800 text-[11px] font-bold text-white shadow-soft">
                  {(profile?.full_name || user.email || 'U')[0].toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[110px] truncate">{profile?.full_name || user.email?.split('@')[0]}</span>
                <span className="badge badge-green text-[10px] py-0 px-1.5 hidden md:inline">
                  {profile?.role || 'QA Lead'}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-ghost btn-icon btn-sm text-moss-500 hover:text-moss-900"
                title="Cerrar sesión de Supabase"
                data-testid="topbar-logout-btn"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="btn btn-primary btn-sm gap-1.5 shadow-sm"
              data-testid="topbar-login-btn"
              title="Iniciar sesión en Supabase Cloud"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Iniciar Sesión</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { gherkinOpen, toggleGherkin } = useQA();
  const { user, loading } = useSupabaseAuth();
  const location = useLocation();
  const isPortalRoute = location.pathname.startsWith('/portal');

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // Si no está autenticado y está intentando acceder a una ruta protegida del portal
  if (!loading && !user && isPortalRoute) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Pantalla de carga mientras se valida sesión en rutas del portal
  if (loading && isPortalRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand-50" data-testid="portal-root-loading">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-moss-300 border-t-moss-600" />
          <p className="text-sm font-medium text-moss-700">Verificando sesión segura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-lg bg-moss-800 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-72">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main id="main-content" className="mx-auto max-w-7xl 2xl:max-w-[1600px] px-4 py-6 sm:px-6 lg:py-8 transition-all duration-300" data-testid="main-content">
          <Outlet />
        </main>

        {/* Footer condicional: Cuando está autenticado o en el portal, NUNCA muestra el mensaje de datos simulados */}
        {user ? (
          <footer className="mx-auto flex max-w-7xl 2xl:max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 pb-6 text-xs text-moss-500 sm:px-6 border-t border-moss-200/60 pt-4 mt-8">
            <span className="flex items-center gap-2 font-medium text-moss-700">
              <span className="h-2 w-2 rounded-full bg-moss-500 animate-pulse" />
              <span>Portal de Administración · Base de Datos PostgreSQL (Supabase)</span>
            </span>
            <span className="font-mono text-[11px] text-moss-500">
              Sesión activa: <strong className="text-moss-700">{user.email}</strong>
            </span>
          </footer>
        ) : !isPortalRoute && location.pathname !== '/login' && !loading ? (
          <footer className="mx-auto flex max-w-7xl 2xl:max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 pb-8 text-xs text-moss-600 sm:px-6">
            <span>Automation Suite · Entorno de práctica QA · Datos 100% simulados</span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                data-testid="reset-all-data-btn"
                className="inline-flex items-center gap-1 font-medium text-moss-700 underline-offset-4 hover:underline"
                onClick={() => {
                  if (window.confirm('¿Restablecer todos los datos locales (carrito, bloqueos, ajustes)?')) {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }
                }}
              >
                <RotateCcw className="h-3 w-3" /> Restablecer datos locales
              </button>
              <LocatorHint testId="reset-all-data-btn" />
            </span>
          </footer>
        ) : null}
      </div>
      <LocatorInspector />
      <GherkinDrawer />

      {/* BOTÓN FLOTANTE DISCRETO PARA ABRIR ESCENARIOS GHERKIN (SOLO EN MODO PRÁCTICA) */}
      {!gherkinOpen && !user && (
        <button
          type="button"
          onClick={toggleGherkin}
          data-testid="floating-gherkin-btn"
          aria-label="Abrir escenarios de prueba Gherkin"
          className="fixed right-4 bottom-5 z-30 flex items-center gap-2 rounded-full border border-moss-300 bg-moss-900/90 px-3.5 py-2 text-xs font-bold text-white shadow-lift backdrop-blur hover:bg-moss-800 transition-all hover:scale-105 active:scale-95 group ring-2 ring-moss-500/20"
          title="Ver escenarios de prueba BDD / Gherkin para este módulo"
        >
          <FileCode2 className="h-4 w-4 text-moss-400 group-hover:text-moss-300 transition-colors" />
          <span className="hidden sm:inline">Escenarios Gherkin</span>
          <span className="badge badge-moss !text-[9px] !py-0 !px-1 font-mono">BDD</span>
        </button>
      )}
    </div>
  );
}
