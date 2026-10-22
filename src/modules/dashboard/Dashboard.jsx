import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bug,
  CircleCheck,
  Code2,
  Crosshair,
  FlaskConical,
  Gauge,
  Layers,
  ScanSearch,
  Sparkles,
  Timer,
} from 'lucide-react';
import { TEST_MODULES } from '../../modules';
import { useNetworkConfig } from '../../hooks/useNetworkConfig';
import { NETWORK_MODES } from '../../services/network';
import { cn } from '../../utils/format';
import LocatorHint from '../../components/qa/LocatorHint';

const DIFF_STYLE = {
  Intermedio: 'badge-blue',
  Avanzado: 'badge-yellow',
  Experto: 'badge-red',
};

function Stat({ icon: Icon, label, value, testId }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur" data-testid={testId}>
      <div className="flex items-center gap-2 text-xs font-medium text-moss-300">
        <Icon className="h-4 w-4 text-moss-400" aria-hidden /> {label}
      </div>
      <p className="mt-1 font-display text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function ModuleCard({ m, index }) {
  const Icon = m.icon;
  const cardId = `dashboard-card-${m.key}`;
  return (
    <article
      data-testid={cardId}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-moss-200 bg-white/85 p-6 shadow-soft backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-moss-300 hover:shadow-lift animate-slide-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-moss-300/40 to-transparent blur-2xl transition-opacity duration-300 group-hover:opacity-100 sm:opacity-60" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-moss-500 to-moss-700 text-white shadow-soft ring-1 ring-moss-700/10 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-[-4deg]">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('badge', DIFF_STYLE[m.difficulty])} data-testid={`${cardId}-difficulty`}>
            {m.difficulty}
          </span>
          <LocatorHint testId={cardId} label={m.label} />
        </div>
      </div>
      <h2 className="relative mt-5 text-xl font-bold">{m.label}</h2>
      <p className="relative mt-2 text-sm leading-relaxed text-moss-700">{m.description}</p>
      <ul className="relative mt-4 space-y-1.5">
        {m.challenges.map((c) => (
          <li key={c} className="flex items-start gap-2 text-sm text-moss-800">
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-moss-500" aria-hidden />
            {c}
          </li>
        ))}
      </ul>
      <div className="relative mt-6 flex items-center justify-between border-t border-moss-100 pt-4">
        <span className="text-xs font-medium text-moss-600">
          <span className="font-bold text-moss-900">{m.scenarios}</span> escenarios sugeridos
        </span>
        <Link
          to={m.path}
          data-testid={`${cardId}-link`}
          className="btn btn-primary btn-sm group/btn"
          aria-label={`Abrir módulo ${m.label}`}
        >
          Practicar <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}

const SNIPPETS = [
  {
    label: 'Playwright',
    code: `await page.goto('/?network=instant#/auth');
await page.getByTestId('login-username-input').fill('standard_user');
await page.getByTestId('login-password-input').fill('Secret@123');
await page.getByTestId('login-submit-btn').click();
await expect(page.getByTestId('auth-session-panel')).toBeVisible();`,
  },
  {
    label: 'Cypress',
    code: `cy.visit('/#/ecommerce');
cy.get('[data-testid="product-card-P-1001"] [data-testid="add-to-cart-btn"]').click();
cy.get('[data-testid="topbar-cart-count"]').should('have.text', '1');`,
  },
  {
    label: 'Selenium',
    code: `driver.get(BASE + "/#/tables");
WebDriverWait(driver, 10).until(
  EC.invisibility_of_element_located((By.CSS_SELECTOR, "[data-testid='table-loading']")))
rows = driver.find_elements(By.CSS_SELECTOR, "[data-testid='table-row']")`,
  },
];

export default function Dashboard() {
  const network = useNetworkConfig();
  const total = TEST_MODULES.reduce((acc, m) => acc + m.scenarios, 0);

  return (
    <div data-testid="dashboard-page">
      {/* Hero */}
      <section className="relative mb-8 overflow-hidden rounded-[2rem] card-dark p-8 sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-moss-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-moss-400/15 blur-3xl" />
        <div className="relative grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-moss-200">
              <Sparkles className="h-3.5 w-3.5 text-moss-400" /> Laboratorio QA de automatización web
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] text-white text-balance sm:text-5xl" data-testid="dashboard-title">
              Domina la automatización con escenarios <span className="bg-gradient-to-r from-moss-300 to-moss-400 bg-clip-text text-transparent">del mundo real</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-moss-300">
              Cinco módulos diseñados para romper scripts frágiles: latencia de red simulada, fallos aleatorios,
              estados intermedios, validaciones cruzadas y componentes complejos. Cada elemento interactivo expone un{' '}
              <code className="code-chip !bg-white/10">data-testid</code> estable.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/auth" className="btn btn-lg bg-moss-200 text-moss-900 shadow-lift hover:bg-white" data-testid="hero-start-btn">
                Comenzar <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#qa-guide" className="btn btn-lg border border-white/15 text-moss-100 hover:bg-white/10" data-testid="hero-guide-link">
                Guía de uso
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat icon={Layers} label="Módulos" value={TEST_MODULES.length} testId="stat-modules" />
            <Stat icon={FlaskConical} label="Escenarios" value={`${total}+`} testId="stat-scenarios" />
            <Stat icon={Timer} label="Latencia actual" value={NETWORK_MODES[network.mode].label.split(' (')[0]} testId="stat-latency" />
            <Stat icon={Bug} label="Tasa de fallos" value={`${Math.round(network.failureRate * 100)}%`} testId="stat-failure" />
          </div>
        </div>
      </section>

      {/* Modules */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold">Módulos de práctica</h2>
          <p className="text-sm text-moss-600">Elige un módulo; cada uno incluye casos límite documentados.</p>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" data-testid="dashboard-module-grid">
        {TEST_MODULES.map((m, i) => (
          <ModuleCard key={m.key} m={m} index={i} />
        ))}
        <article className="flex flex-col justify-between rounded-3xl border border-dashed border-moss-300 bg-moss-50/60 p-6 animate-slide-up">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-moss-200 text-moss-700">
              <Gauge className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl font-bold">Control de red</h2>
            <p className="mt-2 text-sm text-moss-700">
              Todas las peticiones tardan <strong>2-4 s</strong> por defecto. Cambia la velocidad o inyecta fallos 503 desde la
              barra superior, por URL o desde tu test runner.
            </p>
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <code className="block rounded-lg bg-moss-900 px-3 py-2 font-mono text-moss-200">?network=instant&amp;failRate=0.3#/tables</code>
            <code className="block rounded-lg bg-moss-900 px-3 py-2 font-mono text-moss-200">window.__QA_SUITE__.setNetwork(&#123; mode: 'fast' &#125;)</code>
          </div>
        </article>
      </div>

      {/* Guide */}
      <section id="qa-guide" className="mt-10 grid gap-5 lg:grid-cols-[1fr_1.3fr]" data-testid="qa-guide">
        <div className="card p-6">
          <h2 className="text-xl font-bold">Asistencia de localizadores</h2>
          <ul className="mt-4 space-y-4 text-sm text-moss-800">
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-moss-100 text-moss-700">
                <Crosshair className="h-4 w-4" />
              </span>
              <span>
                <strong>Íconos de mira:</strong> junto a cada control aparece un ícono{' '}
                <Crosshair className="inline h-3.5 w-3.5" />. Haz clic para ver el <em>data-testid</em>, CSS, XPath y los
                comandos para Playwright, Cypress y Selenium listos para copiar.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-moss-100 text-moss-700">
                <ScanSearch className="h-4 w-4" />
              </span>
              <span>
                <strong>Modo inspector:</strong> resalta en vivo cualquier elemento con <em>data-testid</em>. Un clic copia el
                selector sin ejecutar la acción. <kbd className="kbd">Esc</kbd> para salir.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-moss-100 text-moss-700">
                <Code2 className="h-4 w-4" />
              </span>
              <span>
                <strong>Convención:</strong> <code className="code-chip">módulo-elemento-tipo</code>, p. ej.{' '}
                <code className="code-chip">checkout-next-btn</code>. Los errores de campo usan el sufijo{' '}
                <code className="code-chip">-error</code>.
              </span>
            </li>
          </ul>
        </div>
        <div className="card-dark overflow-hidden p-6">
          <h2 className="text-xl font-bold text-white">Snippets de inicio rápido</h2>
          <div className="mt-4 space-y-3">
            {SNIPPETS.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-black/20">
                <p className="border-b border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-moss-400">
                  {s.label}
                </p>
                <pre className="overflow-x-auto px-4 py-3 font-mono text-[12px] leading-relaxed text-moss-200">{s.code}</pre>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
