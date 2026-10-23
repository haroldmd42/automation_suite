import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FileCode2,
  X,
  Copy,
  Check,
  Download,
  Search,
  Filter,
  Sparkles,
  ChevronDown,
  Layers,
  Code2,
  Tag,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { useQA } from '../../context/QAContext';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../utils/format';
import { GHERKIN_FEATURES, generateGherkinText, generateScenarioText } from '../../data/gherkinScenarios';
import { MODULES } from '../../modules';

export default function GherkinDrawer() {
  const { gherkinOpen, setGherkinOpen } = useQA();
  const location = useLocation();
  const toast = useToast();

  // Módulo activo inferido de la ruta actual
  const currentModuleKey = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/users')) return 'users';
    if (path.startsWith('/auth')) return 'auth';
    if (path.startsWith('/ecommerce')) return 'ecommerce';
    if (path.startsWith('/controls')) return 'controls';
    if (path.startsWith('/async')) return 'async';
    if (path.startsWith('/tables')) return 'tables';
    return 'dashboard';
  }, [location.pathname]);

  // Módulo seleccionado en el drawer (inicialmente igual a la ruta activa)
  const [selectedModuleKey, setSelectedModuleKey] = useState(currentModuleKey);
  const [filterTag, setFilterTag] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Sincronizar automáticamente con la ruta cuando el usuario navegue
  useEffect(() => {
    setSelectedModuleKey(currentModuleKey);
  }, [currentModuleKey]);

  // Manejo de tecla Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && gherkinOpen) {
        setGherkinOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gherkinOpen, setGherkinOpen]);

  // Bloqueo de scroll de fondo cuando el drawer está abierto en móviles
  useEffect(() => {
    if (gherkinOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [gherkinOpen]);

  const activeFeature = GHERKIN_FEATURES[selectedModuleKey] || GHERKIN_FEATURES.dashboard;

  // Filtrado de escenarios
  const filteredScenarios = useMemo(() => {
    if (!activeFeature?.scenarios) return [];
    return activeFeature.scenarios.filter((sc) => {
      if (filterTag !== 'all' && !sc.tags?.includes(filterTag)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = sc.title.toLowerCase().includes(q);
        const matchesDesc = sc.description?.toLowerCase().includes(q);
        const matchesSteps = sc.steps?.some((st) => st.text.toLowerCase().includes(q));
        const matchesLocators = sc.involvedLocators?.some((l) => l.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesSteps && !matchesLocators) return false;
      }
      return true;
    });
  }, [activeFeature, filterTag, searchQuery]);

  // Lista de tags únicos disponibles en la feature actual
  const availableTags = useMemo(() => {
    if (!activeFeature?.scenarios) return [];
    const set = new Set();
    activeFeature.scenarios.forEach((sc) => sc.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [activeFeature]);

  // Copiar escenario individual
  const handleCopyScenario = (scenario) => {
    const text = generateScenarioText(activeFeature, scenario);
    navigator.clipboard?.writeText(text);
    setCopiedId(scenario.id);
    toast.success(`Escenario "${scenario.title}" copiado en Gherkin`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copiar feature completo
  const handleCopyFeature = () => {
    const text = generateGherkinText(activeFeature);
    navigator.clipboard?.writeText(text);
    setCopiedId('full-feature');
    toast.success(`Archivo completo ${activeFeature.fileName} copiado`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Descargar archivo .feature
  const handleDownloadFeature = () => {
    const text = generateGherkinText(activeFeature);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFeature.fileName || `${selectedModuleKey}.feature`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Descargando ${activeFeature.fileName}...`);
  };

  if (!gherkinOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gherkin-drawer-title"
      data-testid="gherkin-drawer-container"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* TELÓN DE FONDO (BACKDROP) */}
      <div
        className="fixed inset-0 bg-moss-950/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={() => setGherkinOpen(false)}
        aria-hidden="true"
        data-testid="gherkin-drawer-backdrop"
      />

      {/* PANEL LATERAL DESLIZABLE (OFFCANVAS) */}
      <div
        data-testid="gherkin-drawer-panel"
        className="relative flex h-full w-full max-w-2xl flex-col bg-moss-50 shadow-2xl ring-1 ring-moss-300 transition-transform duration-300 overflow-hidden sm:border-l sm:border-moss-300"
      >
        {/* CABECERA SUPERIOR */}
        <div className="border-b border-moss-200 bg-gradient-to-r from-moss-800 via-moss-900 to-moss-950 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-moss-400 to-moss-600 text-white shadow-soft ring-1 ring-white/20">
                <FileCode2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    id="gherkin-drawer-title"
                    className="font-display text-base font-bold text-white sm:text-lg"
                    data-testid="gherkin-drawer-title"
                  >
                    Escenarios BDD (Gherkin)
                  </h2>
                  <span className="badge badge-moss text-[10px] font-mono uppercase tracking-wide">
                    QA Practice
                  </span>
                </div>
                <p className="text-xs text-moss-300 mt-0.5">
                  Casos de prueba ejecutables listos para Cucumber, Playwright-BDD y Behave.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setGherkinOpen(false)}
              data-testid="close-gherkin-drawer-btn"
              className="rounded-xl p-1.5 text-moss-300 hover:bg-white/10 hover:text-white transition-colors"
              title="Cerrar panel de escenarios (Esc)"
              aria-label="Cerrar panel de escenarios"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* SELECTOR DE MÓDULO & ACCIONES GLOBALES */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-white/10">
            {/* Selector de módulo */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-moss-400 shrink-0">
                Módulo:
              </span>
              <div className="relative flex-1 max-w-xs">
                <select
                  value={selectedModuleKey}
                  onChange={(e) => {
                    setSelectedModuleKey(e.target.value);
                    setFilterTag('all');
                    setSearchQuery('');
                  }}
                  data-testid="gherkin-module-select"
                  className="w-full appearance-none rounded-lg border border-white/20 bg-moss-900/90 px-3 py-1.5 pr-8 text-xs font-semibold text-white focus:border-moss-400 focus:outline-none focus:ring-1 focus:ring-moss-400"
                >
                  {MODULES.map((m) => (
                    <option key={m.key} value={m.key} className="bg-moss-900 text-white">
                      {m.label} {m.key === currentModuleKey ? '• (Ubicación Actual)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-moss-400" />
              </div>
            </div>

            {/* Botones de Copiar Feature y Descargar */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyFeature}
                data-testid="copy-full-feature-btn"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition"
                title="Copiar archivo .feature completo"
              >
                {copiedId === 'full-feature' ? (
                  <Check className="h-3.5 w-3.5 text-moss-300" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Copiar .feature</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadFeature}
                data-testid="download-feature-file-btn"
                className="inline-flex items-center gap-1.5 rounded-lg bg-moss-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-moss-500 shadow-soft transition"
                title="Descargar archivo .feature"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Descargar</span>
              </button>
            </div>
          </div>
        </div>

        {/* METADATOS DE LA FEATURE ACTUAL */}
        <div className="border-b border-moss-200 bg-white px-5 py-3.5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-moss-800">
                  Feature:
                </span>
                <span className="font-bold text-sm text-moss-900" data-testid="gherkin-feature-title">
                  {activeFeature.featureTitle}
                </span>
                <span className="font-mono text-[11px] text-moss-500">
                  ({activeFeature.fileName})
                </span>
              </div>
              <p className="text-xs text-moss-600 leading-relaxed max-w-xl">
                {activeFeature.description}
              </p>
            </div>
          </div>

          {/* BUSCADOR Y FILTROS POR TAG */}
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-moss-100">
            {/* Buscador */}
            <div className="relative flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-moss-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por paso, selector o palabra..."
                data-testid="gherkin-search-input"
                className="w-full rounded-lg border border-moss-300 bg-moss-50/50 pl-8 pr-3 py-1 text-xs text-moss-900 placeholder:text-moss-400 focus:border-moss-600 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Tags Pills */}
            <div className="flex flex-wrap items-center gap-1 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setFilterTag('all')}
                data-testid="filter-tag-all"
                className={cn(
                  'rounded-lg px-2 py-0.5 text-[11px] font-semibold transition',
                  filterTag === 'all'
                    ? 'bg-moss-800 text-white shadow-xs'
                    : 'bg-moss-100 text-moss-700 hover:bg-moss-200',
                )}
              >
                Todos ({activeFeature.scenarios?.length || 0})
              </button>
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setFilterTag(tag)}
                  data-testid={`filter-tag-${tag.replace('@', '')}`}
                  className={cn(
                    'rounded-lg px-2 py-0.5 text-[11px] font-mono transition',
                    filterTag === tag
                      ? 'bg-moss-700 text-white shadow-xs font-bold'
                      : 'bg-moss-100 text-moss-700 hover:bg-moss-200',
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CONTENEDOR PRINCIPAL: LISTADO DE ESCENARIOS */}
        <div
          data-testid="gherkin-scenarios-list"
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4"
        >
          {filteredScenarios.length === 0 ? (
            <div
              data-testid="gherkin-no-results"
              className="card p-8 text-center space-y-2 border-dashed border-moss-300"
            >
              <p className="font-semibold text-sm text-moss-800">
                No se encontraron escenarios que coincidan con la búsqueda.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilterTag('all');
                  setSearchQuery('');
                }}
                className="btn btn-secondary btn-sm"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            filteredScenarios.map((scenario, index) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                index={index}
                isCopied={copiedId === scenario.id}
                onCopy={() => handleCopyScenario(scenario)}
              />
            ))
          )}
        </div>

        {/* PIE DEL DRAWER */}
        <div className="border-t border-moss-200 bg-white px-5 py-3 flex items-center justify-between text-xs text-moss-600">
          <span className="flex items-center gap-1.5 font-medium">
            <BookOpen className="h-3.5 w-3.5 text-moss-600" />
            <span>{filteredScenarios.length} escenarios listos para automatización</span>
          </span>
          <button
            type="button"
            onClick={() => setGherkinOpen(false)}
            data-testid="close-gherkin-drawer-footer-btn"
            className="btn btn-secondary btn-sm !py-1"
          >
            Cerrar Guía
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Tarjeta individual para renderizar un Escenario con sintaxis resaltada y selectores
 */
function ScenarioCard({ scenario, index, isCopied, onCopy }) {
  const [showLocators, setShowLocators] = useState(false);

  return (
    <article
      data-testid={`gherkin-scenario-card-${scenario.id}`}
      className="card border-moss-200/90 bg-white p-4 shadow-sm hover:border-moss-400 transition-colors space-y-3"
    >
      {/* Cabecera del escenario: Tags y Botón Copiar */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {scenario.tags?.map((tag) => (
              <span
                key={tag}
                className={cn(
                  'badge text-[10px] font-mono py-0 px-1.5',
                  tag === '@smoke' && 'bg-green-100 text-green-800 border-green-300 font-bold',
                  tag === '@happy-path' && 'bg-blue-100 text-blue-800 border-blue-300',
                  tag === '@negativo' && 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
                  tag !== '@smoke' && tag !== '@happy-path' && tag !== '@negativo' && 'badge-moss',
                )}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Título del Escenario */}
          <h3 className="font-bold text-sm text-moss-900 flex items-center gap-2">
            <span className="text-moss-400 font-mono text-xs">#{index + 1}</span>
            <span>{scenario.title}</span>
          </h3>
          {scenario.description && (
            <p className="text-xs text-moss-600 italic">
              {scenario.description}
            </p>
          )}
        </div>

        {/* Botón Copiar Escenario */}
        <button
          type="button"
          onClick={onCopy}
          data-testid={`copy-scenario-btn-${scenario.id}`}
          className="btn btn-secondary !px-2.5 !py-1 text-xs shrink-0"
          title="Copiar este escenario en sintaxis Gherkin"
        >
          {isCopied ? (
            <>
              <Check className="h-3 w-3 text-green-600" />
              <span className="text-green-700 font-bold">¡Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 text-moss-600" />
              <span>Copiar Gherkin</span>
            </>
          )}
        </button>
      </div>

      {/* Bloque de Pasos Gherkin con Resaltado de Sintaxis */}
      <div className="rounded-xl border border-moss-200/90 bg-moss-950 p-3.5 font-mono text-[11.5px] leading-relaxed text-moss-100 overflow-x-auto shadow-inner">
        <div className="text-moss-400 text-[11px] mb-1.5 font-sans font-semibold border-b border-moss-800/80 pb-1 flex items-center justify-between">
          <span>{scenario.type || 'Scenario'}: {scenario.title}</span>
          <span className="text-moss-500 font-mono text-[10px]">.feature</span>
        </div>

        <div className="space-y-1">
          {scenario.steps.map((st, sIdx) => {
            const kw = st.keyword.trim();
            return (
              <div key={sIdx} className="flex items-start gap-2">
                <span
                  className={cn(
                    'w-14 shrink-0 font-bold select-none text-right',
                    kw === 'Given' && 'text-emerald-400',
                    kw === 'When' && 'text-sky-300',
                    kw === 'Then' && 'text-amber-300 font-extrabold',
                    kw === 'And' && 'text-moss-400',
                    kw === 'But' && 'text-rose-400',
                  )}
                >
                  {kw}
                </span>
                <span className="text-moss-100 flex-1">
                  {formatStepTextWithHighlights(st.text)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Tabla de Ejemplos si es Scenario Outline */}
        {scenario.examples?.length > 0 && (
          <div className="mt-3 pt-2 border-t border-moss-800/80 space-y-1">
            <span className="text-amber-400 font-bold text-[11px]">Examples:</span>
            <div className="overflow-x-auto text-[11px] text-moss-200">
              <table className="border border-moss-700 text-left w-full">
                <thead>
                  <tr className="bg-moss-900 border-b border-moss-700 text-moss-300">
                    {Object.keys(scenario.examples[0]).map((key) => (
                      <th key={key} className="px-2 py-1 font-bold">
                        | {key}
                      </th>
                    ))}
                    <th className="px-1 py-1">|</th>
                  </tr>
                </thead>
                <tbody>
                  {scenario.examples.map((ex, exIdx) => (
                    <tr key={exIdx} className="border-b border-moss-800/60 hover:bg-white/5">
                      {Object.values(ex).map((val, valIdx) => (
                        <td key={valIdx} className="px-2 py-0.5 text-moss-100">
                          | {val}
                        </td>
                      ))}
                      <td className="px-1 py-0.5">|</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Selectores involucrados (Desplegable) */}
      {scenario.involvedLocators?.length > 0 && (
        <div className="pt-1 text-xs">
          <button
            type="button"
            onClick={() => setShowLocators((v) => !v)}
            data-testid={`toggle-locators-${scenario.id}`}
            className="text-[11px] font-semibold text-moss-700 hover:text-moss-900 inline-flex items-center gap-1.5"
          >
            <Code2 className="h-3.5 w-3.5 text-moss-600" />
            <span>
              {showLocators ? 'Ocultar localizadores' : `Ver ${scenario.involvedLocators.length} localizadores involucrados (data-testid)`}
            </span>
          </button>

          {showLocators && (
            <div className="mt-2 flex flex-wrap gap-1.5 rounded-lg bg-moss-50 p-2.5 border border-moss-200">
              {scenario.involvedLocators.map((loc) => (
                <span
                  key={loc}
                  className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[11px] font-mono text-moss-800 border border-moss-200 shadow-2xs"
                  title={`[data-testid="${loc}"]`}
                >
                  <span className="text-moss-400 select-none">[data-testid=</span>
                  <strong className="text-moss-900">"{loc}"</strong>
                  <span className="text-moss-400 select-none">]</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * Resalta cadenas entre comillas y selectores [data-testid="..."] en los pasos de Gherkin
 */
function formatStepTextWithHighlights(text) {
  // Dividir texto por comillas o brackets
  const parts = text.split(/("[^"]*"|\[data-testid="[^"]*"\])/g);
  return parts.map((part, i) => {
    if (part.startsWith('[data-testid=')) {
      return (
        <span key={i} className="text-sky-300 font-bold bg-sky-950/60 px-1 py-0.2 rounded border border-sky-800/60">
          {part}
        </span>
      );
    }
    if (part.startsWith('"') && part.endsWith('"')) {
      return (
        <span key={i} className="text-amber-200 font-semibold">
          {part}
        </span>
      );
    }
    return part;
  });
}
