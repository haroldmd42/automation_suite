import { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Play,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  Download,
  Calendar,
  Layers,
  Sparkles,
  ShieldAlert,
  Percent,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Spinner, Alert } from '../../components/ui/Primitives';
import { Field } from '../../components/ui/Field';
import CustomSelect from '../../components/ui/CustomSelect';
import CustomDatePicker from '../../components/ui/CustomDatePicker';
import Modal from '../../components/ui/Modal';
import LocatorHint from '../../components/qa/LocatorHint';
import { cn } from '../../utils/format';

const TEST_TYPES = [
  { value: 'regression', label: 'Pruebas de Regresión (Regression)' },
  { value: 'smoke', label: 'Pruebas de Humo (Smoke Tests)' },
  { value: 'api', label: 'Pruebas de Integración API / Contract' },
  { value: 'e2e', label: 'Pruebas de Flujo Completo (End-to-End)' },
  { value: 'performance', label: 'Pruebas de Rendimiento y Carga' },
  { value: 'security', label: 'Pruebas de Vulnerabilidad / Seguridad' },
];

const ENVIRONMENTS = [
  { value: 'dev', label: 'Desarrollo (Dev)' },
  { value: 'staging', label: 'Entorno de Pruebas (Staging QA)' },
  { value: 'preprod', label: 'Pre-Producción (Mirror)' },
  { value: 'prod', label: 'Producción (Canary)' },
];

const PRIORITIES = [
  { value: 'low', label: 'Baja (P4)', badge: 'badge-gray' },
  { value: 'medium', label: 'Media (P3)', badge: 'badge-blue' },
  { value: 'high', label: 'Alta (P2)', badge: 'badge-yellow' },
  { value: 'critical', label: 'Crítica / Bloqueante (P1)', badge: 'badge-red' },
];

const INITIAL_SUITES = [
  {
    id: 'suite-1',
    code: 'TS-AUTH-001',
    title: 'Suite de Autenticación, JWT y Recuperación',
    test_type: 'regression',
    environment: 'staging',
    priority: 'critical',
    coverage_target: 95,
    cases_count: 24,
    passed_count: 23,
    failed_count: 1,
    status: 'passed',
    assigned_to: 'qa.lead@empresa.com',
    test_date: '2026-10-28',
    tags: ['#auth', '#jwt', '#security'],
  },
  {
    id: 'suite-2',
    code: 'TS-ECOM-002',
    title: 'Flujo Crítico de Checkout y Pasarela de Pagos',
    test_type: 'e2e',
    environment: 'staging',
    priority: 'critical',
    coverage_target: 90,
    cases_count: 18,
    passed_count: 18,
    failed_count: 0,
    status: 'passed',
    assigned_to: 'qa.tester@empresa.com',
    test_date: '2026-10-27',
    tags: ['#checkout', '#payments', '#e2e'],
  },
  {
    id: 'suite-3',
    code: 'TS-PERF-003',
    title: 'Prueba de Carga: 500 Usuarios Concurrentes en API',
    test_type: 'performance',
    environment: 'preprod',
    priority: 'high',
    coverage_target: 85,
    cases_count: 10,
    passed_count: 7,
    failed_count: 3,
    status: 'failed',
    assigned_to: 'qa.perf@empresa.com',
    test_date: '2026-10-26',
    tags: ['#performance', '#k6', '#load'],
  },
  {
    id: 'suite-4',
    code: 'TS-SMK-004',
    title: 'Smoke Test de Despliegue en Ambiente Staging',
    test_type: 'smoke',
    environment: 'staging',
    priority: 'medium',
    coverage_target: 100,
    cases_count: 8,
    passed_count: 8,
    failed_count: 0,
    status: 'passed',
    assigned_to: 'qa.lead@empresa.com',
    test_date: '2026-10-28',
    tags: ['#smoke', '#pipeline'],
  },
];

export default function QaPlansModule() {
  const { user, profile, logAudit } = useSupabaseAuth();
  const toast = useToast();

  const [suites, setSuites] = useState(() => {
    const saved = localStorage.getItem('portal_qa_suites');
    return saved ? JSON.parse(saved) : INITIAL_SUITES;
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterEnv, setFilterEnv] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal de Creación
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    test_type: 'regression',
    environment: 'staging',
    priority: 'high',
    coverage_target: 90,
    cases_count: 12,
    assigned_to: user?.email || '',
    test_date: new Date().toISOString().slice(0, 10),
    tagsInput: '#qa, #regression',
    requirements: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Modal de Ejecución en Vivo
  const [runningSuite, setRunningSuite] = useState(null);
  const [runProgress, setRunProgress] = useState(0);
  const [runLogs, setRunLogs] = useState([]);

  // Guardar en localStorage y Supabase
  const persistSuites = (newSuites) => {
    setSuites(newSuites);
    localStorage.setItem('portal_qa_suites', JSON.stringify(newSuites));
  };

  // Cargar de Supabase si la tabla existe
  const loadSuites = async () => {
    if (!supabase) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('qa_test_suites')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setSuites(data);
        localStorage.setItem('portal_qa_suites', JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Usando suites locales:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuites();
  }, []);

  // Validaciones del formulario de creación
  const isCodeValid = formData.code.trim().length >= 4 && /^[A-Z0-9-]+$/.test(formData.code.trim());
  const isTitleValid = formData.title.trim().length >= 6;
  const isCasesValid = Number(formData.cases_count) >= 1 && Number(formData.cases_count) <= 500;
  const isRequirementsValid = formData.requirements.trim().length >= 10;
  const isFormValid = isCodeValid && isTitleValid && isCasesValid && isRequirementsValid;

  const handleCreateSuite = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    const tags = formData.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const newSuite = {
      id: `suite-${Date.now()}`,
      code: formData.code.trim().toUpperCase(),
      title: formData.title.trim(),
      test_type: formData.test_type,
      environment: formData.environment,
      priority: formData.priority,
      coverage_target: Number(formData.coverage_target),
      cases_count: Number(formData.cases_count),
      passed_count: 0,
      failed_count: 0,
      status: 'pending',
      assigned_to: formData.assigned_to.trim() || user?.email || 'qa.lead@empresa.com',
      test_date: formData.test_date,
      tags,
      created_at: new Date().toISOString(),
    };

    try {
      if (supabase) {
        await supabase.from('qa_test_suites').insert([newSuite]);
      }
      await logAudit('create_test_suite', 'qa_test_suites', { code: newSuite.code, title: newSuite.title });
    } catch (err) {
      console.warn('Guardado en modo local:', err.message);
    }

    const updated = [newSuite, ...suites];
    persistSuites(updated);
    toast.success('Suite Creada', `La suite ${newSuite.code} se registró correctamente.`);
    setCreateModalOpen(false);
    setFormData({
      code: '',
      title: '',
      test_type: 'regression',
      environment: 'staging',
      priority: 'high',
      coverage_target: 90,
      cases_count: 12,
      assigned_to: user?.email || '',
      test_date: new Date().toISOString().slice(0, 10),
      tagsInput: '#qa, #regression',
      requirements: '',
    });
    setSubmitting(false);
  };

  // Simulación de Ejecución Automatizada
  const handleRunSuite = (suite) => {
    setRunningSuite(suite);
    setRunProgress(0);
    setRunLogs([`Iniciando ejecución de suite ${suite.code}...`, `Entorno objetivo: ${suite.environment.toUpperCase()}`]);

    let current = 0;
    const interval = setInterval(() => {
      current += 20;
      setRunProgress(current);

      if (current === 40) {
        setRunLogs((prev) => [...prev, `Validando ${suite.cases_count} casos de prueba automatizados...`]);
      } else if (current === 80) {
        setRunLogs((prev) => [...prev, `Ejecutando assertions y verificaciones de respuesta HTTP...`]);
      } else if (current >= 100) {
        clearInterval(interval);
        const hasFailures = Math.random() < 0.25; // 25% de probabilidad de tener 1 fallo
        const failedCount = hasFailures ? 1 : 0;
        const passedCount = suite.cases_count - failedCount;
        const finalStatus = failedCount === 0 ? 'passed' : 'failed';

        setRunLogs((prev) => [
          ...prev,
          `Ejecución finalizada. Pasados: ${passedCount}, Fallados: ${failedCount}`,
          `Estado final: ${finalStatus.toUpperCase()}`,
        ]);

        const updated = suites.map((s) =>
          s.id === suite.id
            ? { ...s, status: finalStatus, passed_count: passedCount, failed_count: failedCount, last_run: new Date().toISOString() }
            : s
        );
        persistSuites(updated);
        logAudit('run_test_suite', 'qa_test_suites', { code: suite.code, status: finalStatus });
        toast.info('Ejecución Completada', `Suite ${suite.code}: ${finalStatus === 'passed' ? '100% exitosa' : 'con fallos reportados'}.`);
      }
    }, 400);
  };

  // Filtros aplicados
  const filteredSuites = useMemo(() => {
    return suites.filter((s) => {
      const matchSearch =
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.assigned_to?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'all' || s.test_type === filterType;
      const matchEnv = filterEnv === 'all' || s.environment === filterEnv;
      const matchStatus = filterStatus === 'all' || s.status === filterStatus;
      return matchSearch && matchType && matchEnv && matchStatus;
    });
  }, [suites, searchTerm, filterType, filterEnv, filterStatus]);

  // KPIs
  const totalCases = suites.reduce((acc, s) => acc + (s.cases_count || 0), 0);
  const totalPassed = suites.reduce((acc, s) => acc + (s.passed_count || 0), 0);
  const passRate = totalCases > 0 ? Math.round((totalPassed / totalCases) * 100) : 0;
  const criticalCount = suites.filter((s) => s.priority === 'critical').length;

  return (
    <div className="space-y-6 animate-slide-up" data-testid="qa-plans-module">
      <PageHeader
        icon={CheckSquare}
        eyebrow="Portal Cloud · Rol Líder de Calidad"
        title="Planes de Prueba & Suites de Calidad"
        description="Gestión integral de suites automatizadas, cobertura de pruebas, ejecución en vivo y reportes de calidad."
        badge={<span className="badge badge-green">QA Lead</span>}
      >
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="btn btn-primary gap-2 shadow-soft"
          data-testid="create-suite-btn"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva Test Suite</span>
        </button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Total de Suites</span>
            <div className="h-8 w-8 rounded-xl bg-moss-100 flex items-center justify-center text-moss-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-moss-900" data-testid="kpi-total-suites">
            {suites.length}
          </p>
          <p className="text-[11px] text-moss-500 mt-1 font-medium">{totalCases} casos registrados</p>
        </div>

        <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Pass Rate</span>
            <div className="h-8 w-8 rounded-xl bg-moss-100 flex items-center justify-center text-moss-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-moss-900" data-testid="kpi-pass-rate">
              {passRate}%
            </span>
            <span className="badge badge-green text-[10px]">{totalPassed} pasados</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-moss-100">
            <div className="h-full bg-moss-600 rounded-full transition-all duration-500" style={{ width: `${passRate}%` }} />
          </div>
        </div>

        <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Suites Críticas</span>
            <div className="h-8 w-8 rounded-xl bg-red-50 flex items-center justify-center text-danger-700">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-danger-600" data-testid="kpi-critical-suites">
            {criticalCount}
          </p>
          <p className="text-[11px] text-danger-700 mt-1 font-medium">Prioridad P1 para release</p>
        </div>

        <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Meta Cobertura</span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-moss-900" data-testid="kpi-avg-coverage">
            92%
          </p>
          <p className="text-[11px] text-moss-500 mt-1 font-medium">Estándar corporativo cumplido</p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="card p-4 shadow-soft space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, título o responsable..."
              className="input pl-10 text-sm"
              data-testid="search-qa-suite-input"
            />
          </div>

          <div>
            <CustomSelect
              id="filter-qa-type"
              testId="filter-qa-type-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              ariaLabel="Filtrar por tipo"
              options={[{ value: 'all', label: 'Todos los tipos' }, ...TEST_TYPES]}
            />
          </div>

          <div>
            <CustomSelect
              id="filter-qa-env"
              testId="filter-qa-env-select"
              value={filterEnv}
              onChange={(e) => setFilterEnv(e.target.value)}
              ariaLabel="Filtrar por entorno"
              options={[{ value: 'all', label: 'Todos los entornos' }, ...ENVIRONMENTS]}
            />
          </div>

          <div>
            <CustomSelect
              id="filter-qa-status"
              testId="filter-qa-status-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              ariaLabel="Filtrar por estado"
              options={[
                { value: 'all', label: 'Todos los estados' },
                { value: 'passed', label: 'Aprobado (Passed)' },
                { value: 'failed', label: 'Fallido (Failed)' },
                { value: 'pending', label: 'Pendiente (Pending)' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Tabla de Suites */}
      <div className="table-container shadow-soft" data-testid="qa-suites-table-container">
        <table className="table min-w-[1000px]" data-testid="qa-suites-table">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[11%]" />
            <col className="w-[7%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-moss-200/90 bg-moss-100/70 text-[11px] font-bold uppercase tracking-wider text-moss-700">
              <th scope="col" className="px-5 py-4 text-left font-bold text-moss-800">Código & Test Suite</th>
              <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Tipo & Entorno</th>
              <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Prioridad</th>
              <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Casos & Cobertura</th>
              <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Estado</th>
              <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Responsable</th>
              <th scope="col" className="px-5 py-4 text-right font-bold text-moss-800">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuites.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-moss-500" data-testid="no-qa-suites-found">
                  No se encontraron suites de prueba con los filtros aplicados.
                </td>
              </tr>
            ) : (
              filteredSuites.map((suite) => (
                <tr key={suite.id} data-testid={`suite-row-${suite.code}`}>
                  <td className="px-5 py-4 align-middle">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="font-mono text-xs font-bold text-moss-900 bg-moss-100 px-2 py-0.5 rounded border border-moss-300 shadow-xs"
                          data-testid={`suite-code-${suite.code}`}
                        >
                          {suite.code}
                        </span>
                        {suite.tags?.map((t) => (
                          <span key={t} className="rounded bg-moss-50 px-1.5 py-0.5 text-[10px] font-mono text-moss-600 border border-moss-200">
                            {t}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-moss-900 leading-snug">{suite.title}</p>
                    </div>
                  </td>

                  <td className="px-4 py-4 align-middle">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-xs font-bold text-moss-800">
                        {TEST_TYPES.find((t) => t.value === suite.test_type)?.label.split(' ')[0] || suite.test_type}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-moss-100 text-moss-700 border border-moss-300/70">
                        <span className="h-1.5 w-1.5 rounded-full bg-moss-600" />
                        {suite.environment}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-4 align-middle">
                    {suite.priority === 'critical' ? (
                      <span className="badge badge-red text-xs font-bold inline-flex items-center gap-1 py-1 px-2.5">
                        <AlertTriangle className="h-3 w-3" /> Crítica P1
                      </span>
                    ) : suite.priority === 'high' ? (
                      <span className="badge badge-yellow text-xs font-bold inline-flex items-center gap-1 py-1 px-2.5">
                        <Clock className="h-3 w-3" /> Alta P2
                      </span>
                    ) : suite.priority === 'medium' ? (
                      <span className="badge badge-blue text-xs font-bold inline-flex items-center gap-1 py-1 px-2.5">
                        Media P3
                      </span>
                    ) : (
                      <span className="badge badge-gray text-xs font-bold inline-flex items-center gap-1 py-1 px-2.5">
                        Baja P4
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4 align-middle">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-moss-900 block">{suite.cases_count} casos</span>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-moss-200">
                          <div className="h-full bg-moss-600 rounded-full" style={{ width: `${suite.coverage_target}%` }} />
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-moss-600">{suite.coverage_target}%</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 align-middle">
                    {suite.status === 'passed' ? (
                      <span className="badge badge-green text-xs font-semibold inline-flex items-center gap-1.5 py-1 px-2.5 shadow-xs" data-testid={`status-badge-${suite.code}`}>
                        <CheckCircle2 className="h-3.5 w-3.5 text-moss-700" /> Aprobado
                      </span>
                    ) : suite.status === 'failed' ? (
                      <span className="badge badge-red text-xs font-semibold inline-flex items-center gap-1.5 py-1 px-2.5 shadow-xs" data-testid={`status-badge-${suite.code}`}>
                        <XCircle className="h-3.5 w-3.5 text-danger-700" /> Fallos ({suite.failed_count})
                      </span>
                    ) : (
                      <span className="badge badge-gray text-xs font-semibold inline-flex items-center gap-1.5 py-1 px-2.5 shadow-xs" data-testid={`status-badge-${suite.code}`}>
                        <Clock className="h-3.5 w-3.5 text-moss-500" /> Pendiente
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4 align-middle">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-moss-500 to-moss-700 text-xs font-bold text-white shadow-xs">
                        {(suite.assigned_to || 'Q')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-moss-900 block leading-tight truncate">
                          {suite.assigned_to?.split('@')[0]}
                        </span>
                        <span className="text-[10px] font-mono text-moss-500 block truncate max-w-[120px]" title={suite.assigned_to}>
                          {suite.assigned_to}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 align-middle text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenRunModal(suite)}
                      className="btn btn-secondary btn-sm gap-1.5 hover:border-moss-600 hover:text-moss-900 shadow-xs text-xs font-medium inline-flex items-center"
                      data-testid={`run-suite-btn-${suite.code}`}
                    >
                      <Play className="h-3.5 w-3.5 text-moss-600 fill-current" />
                      <span>Ejecutar</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Creación de Test Suite */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Crear Nueva Test Suite de Calidad"
        description="Define los parámetros de ejecución, cobertura y requerimientos para el plan de pruebas."
        size="lg"
        data-testid="create-suite-modal"
      >
        <form onSubmit={handleCreateSuite} className="space-y-4" data-testid="create-suite-form">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Código de la Suite *"
              id="suite-code-input"
              help="Formato alfanumérico sin espacios (ej: TS-AUTH-005)"
              error={formData.code && !isCodeValid ? 'Usa mayúsculas, números o guiones (mín. 4 caracteres).' : ''}
            >
              <input
                id="suite-code-input"
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="TS-REG-001"
                className="input uppercase font-mono"
                data-testid="suite-code-input"
              />
            </Field>

            <Field
              label="Título de la Suite *"
              id="suite-title-input"
              help="Nombre descriptivo de la funcionalidad a certificar"
              error={formData.title && !isTitleValid ? 'El título debe tener al menos 6 caracteres.' : ''}
            >
              <input
                id="suite-title-input"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                placeholder="Regresión de Registro y Permisos"
                className="input"
                data-testid="suite-title-input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Tipo de Prueba" id="suite-type-select">
              <CustomSelect
                id="suite-type-select"
                testId="suite-type-select"
                value={formData.test_type}
                onChange={(e) => setFormData((p) => ({ ...p, test_type: e.target.value }))}
                options={TEST_TYPES}
              />
            </Field>

            <Field label="Entorno Objetivo" id="suite-env-select">
              <CustomSelect
                id="suite-env-select"
                testId="suite-env-select"
                value={formData.environment}
                onChange={(e) => setFormData((p) => ({ ...p, environment: e.target.value }))}
                options={ENVIRONMENTS}
              />
            </Field>

            <Field label="Prioridad" id="suite-priority-select">
              <CustomSelect
                id="suite-priority-select"
                testId="suite-priority-select"
                value={formData.priority}
                onChange={(e) => setFormData((p) => ({ ...p, priority: e.target.value }))}
                options={PRIORITIES}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={`Meta de Cobertura: ${formData.coverage_target}%`}
              id="suite-coverage-slider"
              help="Porcentaje mínimo requerido de aserciones válidas"
            >
              <input
                id="suite-coverage-slider"
                type="range"
                min="50"
                max="100"
                value={formData.coverage_target}
                onChange={(e) => setFormData((p) => ({ ...p, coverage_target: Number(e.target.value) }))}
                className="w-full accent-moss-600"
                data-testid="suite-coverage-slider"
              />
            </Field>

            <Field
              label="Cantidad de Casos *"
              id="suite-cases-input"
              help="Número de casos de prueba incluidos (1 - 500)"
              error={!isCasesValid ? 'Debe ser entre 1 y 500.' : ''}
            >
              <input
                id="suite-cases-input"
                type="number"
                min="1"
                max="500"
                required
                value={formData.cases_count}
                onChange={(e) => setFormData((p) => ({ ...p, cases_count: e.target.value }))}
                className="input"
                data-testid="suite-cases-input"
              />
            </Field>
          </div>

          <Field
            label="Requerimientos & Criterios de Aceptación *"
            id="suite-reqs-textarea"
            help={`${formData.requirements.length}/10 caracteres mínimos requeridos`}
            error={formData.requirements && !isRequirementsValid ? 'Detalla al menos 10 caracteres con los criterios de prueba.' : ''}
          >
            <textarea
              id="suite-reqs-textarea"
              rows={3}
              required
              value={formData.requirements}
              onChange={(e) => setFormData((p) => ({ ...p, requirements: e.target.value }))}
              placeholder="Ejemplo: Validar que los usuarios con rol Admin tengan acceso total y que las credenciales erróneas bloqueen tras 5 intentos..."
              className="input resize-none"
              data-testid="suite-requirements-textarea"
            />
          </Field>

          <Field label="Etiquetas (Tags)" id="suite-tags-input" help="Separadas por coma (ej: #smoke, #auth, #api)">
            <input
              id="suite-tags-input"
              type="text"
              value={formData.tagsInput}
              onChange={(e) => setFormData((p) => ({ ...p, tagsInput: e.target.value }))}
              placeholder="#qa, #regression"
              className="input font-mono text-xs"
              data-testid="suite-tags-input"
            />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-moss-200">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="btn btn-secondary"
              data-testid="cancel-create-suite-btn"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isFormValid || submitting}
              className="btn btn-primary"
              data-testid="submit-create-suite-btn"
            >
              {submitting ? <Spinner className="h-4 w-4" /> : 'Guardar Test Suite'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Ejecución en Vivo */}
      <Modal
        open={Boolean(runningSuite)}
        onClose={() => setRunningSuite(null)}
        title={`Ejecutando: ${runningSuite?.code || ''}`}
        description={`Suite: ${runningSuite?.title || ''}`}
        size="md"
        data-testid="running-suite-modal"
      >
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span>Progreso de Aserciones</span>
              <span className="font-mono text-moss-700">{runProgress}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-moss-100">
              <div
                className="h-full bg-gradient-to-r from-moss-500 to-moss-700 transition-all duration-300"
                style={{ width: `${runProgress}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-moss-800 bg-moss-950 p-4 font-mono text-xs text-moss-200 h-44 overflow-y-auto space-y-1">
            {runLogs.map((log, index) => (
              <p key={index} className="flex items-center gap-2">
                <span className="text-moss-500">&gt;</span>
                <span>{log}</span>
              </p>
            ))}
          </div>

          {runProgress >= 100 && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setRunningSuite(null)}
                className="btn btn-primary btn-sm"
                data-testid="close-run-modal-btn"
              >
                Cerrar Ejecución
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
