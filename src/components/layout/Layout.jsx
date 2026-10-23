import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import { MODULES } from '../../modules';
import { useQA } from '../../context/QAContext';
import { useCart } from '../../modules/ecommerce/CartContext';
import { useNetworkConfig } from '../../hooks/useNetworkConfig';
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
          <Brand />
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

        <nav className="relative mt-8 flex-1 space-y-1" aria-label="Navegación principal">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-moss-500">Módulos</p>
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
                    <span className="flex-1">{m.label}</span>
                    {isActive && <ChevronRight className="h-4 w-4 text-moss-400" aria-hidden />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="relative mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-moss-300">
          <p className="mb-1 font-semibold text-moss-100">Convención de selectores</p>
          <p>
            Todo elemento interactivo expone <code className="code-chip">data-testid</code> estable en kebab-case:{' '}
            <span className="font-mono text-moss-200">módulo-elemento-tipo</span>.
          </p>
        </div>
      </aside>
    </>
  );
}

function Topbar({ onMenu }) {
  const { showLocators, toggleLocators, inspector, setInspector, gherkinOpen, toggleGherkin } = useQA();
  const network = useNetworkConfig();
  const { itemCount } = useCart();
  const location = useLocation();
  const current = MODULES.find((m) => (m.path === '/' ? location.pathname === '/' : location.pathname.startsWith(m.path)));

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
          <Link to="/" className="text-moss-600 hover:text-moss-900">
            Suite
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-moss-400" aria-hidden />
          <span className="truncate font-semibold text-moss-900">{current?.label || 'No encontrado'}</span>
        </nav>

        <div className="ml-auto flex items-center gap-2">
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
        </div>
      </div>
    </header>
  );
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { gherkinOpen, toggleGherkin } = useQA();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

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
      </div>
      <LocatorInspector />
      <GherkinDrawer />

      {/* BOTÓN FLOTANTE DISCRETO PARA ABRIR ESCENARIOS GHERKIN */}
      {!gherkinOpen && (
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
