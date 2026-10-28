import { useState, useEffect } from 'react';
import {
  Cpu,
  Server,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Activity,
  Layers,
  AlertTriangle,
  Zap,
  Sliders,
  Check,
  X,
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Spinner, Alert } from '../../components/ui/Primitives';
import { Field } from '../../components/ui/Field';
import CustomSelect from '../../components/ui/CustomSelect';
import Modal from '../../components/ui/Modal';
import LocatorHint from '../../components/qa/LocatorHint';
import { cn } from '../../utils/format';

const INITIAL_PIPELINES = [
  {
    id: 'pipe-1',
    name: 'CI: Build, Lint & Unit Tests',
    branch: 'main',
    environment: 'staging',
    status: 'success',
    duration_seconds: 142,
    triggered_by: 'devops.eng@empresa.com',
    last_run: '2026-10-28T10:15:00Z',
  },
  {
    id: 'pipe-2',
    name: 'Docker Container Build & ECR Push',
    branch: 'main',
    environment: 'staging',
    status: 'success',
    duration_seconds: 210,
    triggered_by: 'devops.eng@empresa.com',
    last_run: '2026-10-28T10:20:00Z',
  },
  {
    id: 'pipe-3',
    name: 'Kubernetes Cluster Rolling Deploy (EKS)',
    branch: 'release/v2.4',
    environment: 'production',
    status: 'success',
    duration_seconds: 185,
    triggered_by: 'admin@empresa.com',
    last_run: '2026-10-27T18:45:00Z',
  },
  {
    id: 'pipe-4',
    name: 'Security Vulnerability Scan (Trivy + Sonar)',
    branch: 'main',
    environment: 'staging',
    status: 'failed',
    duration_seconds: 94,
    triggered_by: 'auditor@empresa.com',
    last_run: '2026-10-26T16:00:00Z',
  },
];

const INITIAL_SERVICES = [
  { id: 'srv-1', name: 'api-gateway', replicas: 4, cpu_percent: 24, mem_mb: 512, status: 'healthy', region: 'us-east-1' },
  { id: 'srv-2', name: 'auth-service', replicas: 3, cpu_percent: 18, mem_mb: 384, status: 'healthy', region: 'us-east-1' },
  { id: 'srv-3', name: 'postgres-database', replicas: 2, cpu_percent: 54, mem_mb: 2048, status: 'healthy', region: 'us-east-1' },
  { id: 'srv-4', name: 'redis-cache-cluster', replicas: 3, cpu_percent: 12, mem_mb: 256, status: 'healthy', region: 'us-east-1' },
  { id: 'srv-5', name: 'async-worker-queue', replicas: 2, cpu_percent: 38, mem_mb: 768, status: 'healthy', region: 'us-east-1' },
];

export default function DevOpsPipelinesModule() {
  const { user, logAudit } = useSupabaseAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('pipelines'); // 'pipelines' | 'infrastructure'
  const [pipelines, setPipelines] = useState(() => {
    const saved = localStorage.getItem('portal_devops_pipelines');
    return saved ? JSON.parse(saved) : INITIAL_PIPELINES;
  });
  const [services, setServices] = useState(() => {
    const saved = localStorage.getItem('portal_devops_services');
    return saved ? JSON.parse(saved) : INITIAL_SERVICES;
  });

  // Modal Disparar Pipeline
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);
  const [triggerForm, setTriggerForm] = useState({
    pipelineId: 'pipe-1',
    branch: 'main',
    environment: 'staging',
    timeout: 30,
    cleanCache: true,
  });

  // Consola de ejecución en vivo
  const [executingPipeline, setExecutingPipeline] = useState(null);
  const [executionLogs, setExecutionLogs] = useState([]);
  const [executingProgress, setExecutingProgress] = useState(0);

  // Modal Escalar Réplicas
  const [scaleModalService, setScaleModalService] = useState(null);
  const [targetReplicas, setTargetReplicas] = useState(3);

  // Modal Reiniciar Servicio
  const [restartModalService, setRestartModalService] = useState(null);
  const [confirmRestartText, setConfirmRestartText] = useState('');

  const persistPipelines = (data) => {
    setPipelines(data);
    localStorage.setItem('portal_devops_pipelines', JSON.stringify(data));
  };

  const persistServices = (data) => {
    setServices(data);
    localStorage.setItem('portal_devops_services', JSON.stringify(data));
  };

  const handleTriggerPipeline = () => {
    const targetPipe = pipelines.find((p) => p.id === triggerForm.pipelineId) || pipelines[0];
    setTriggerModalOpen(false);
    setExecutingPipeline(targetPipe);
    setExecutingProgress(0);
    setExecutionLogs([
      `[00:01] Iniciando runner en cluster k8s-us-east-1...`,
      `[00:02] Checkout branch '${triggerForm.branch}' (clean-cache: ${triggerForm.cleanCache ? 'SI' : 'NO'})...`,
    ]);

    let step = 0;
    const interval = setInterval(() => {
      step += 25;
      setExecutingProgress(step);

      if (step === 25) {
        setExecutionLogs((prev) => [...prev, `[00:15] Compilando imágenes OCI con BuildKit...`]);
      } else if (step === 50) {
        setExecutionLogs((prev) => [...prev, `[00:45] Ejecutando análisis estático SonarQube (0 vulnerabilidades)...`]);
      } else if (step === 75) {
        setExecutionLogs((prev) => [...prev, `[01:10] Actualizando ReplicaSets en Kubernetes (${triggerForm.environment})...`]);
      } else if (step >= 100) {
        clearInterval(interval);
        setExecutionLogs((prev) => [
          ...prev,
          `[01:30] Pipeline completado con éxito (Status: SUCCESS, Exit code: 0).`,
        ]);

        const updated = pipelines.map((p) =>
          p.id === targetPipe.id
            ? { ...p, status: 'success', last_run: new Date().toISOString(), duration_seconds: 90 }
            : p
        );
        persistPipelines(updated);
        logAudit('trigger_pipeline', 'devops_pipelines', {
          name: targetPipe.name,
          branch: triggerForm.branch,
          environment: triggerForm.environment,
        });
        toast.success('Pipeline Exitoso', `El pipeline ${targetPipe.name} finalizó correctamente.`);
      }
    }, 500);
  };

  const handleScaleSubmit = (e) => {
    e.preventDefault();
    if (!scaleModalService) return;

    const count = Number(targetReplicas);
    if (count < 1 || count > 20) {
      toast.error('Número Inválido', 'Las réplicas deben estar entre 1 y 20.');
      return;
    }

    const updated = services.map((s) => (s.id === scaleModalService.id ? { ...s, replicas: count } : s));
    persistServices(updated);
    logAudit('scale_service', 'cloud_services', { service: scaleModalService.name, replicas: count });
    toast.success('Servicio Escalado', `${scaleModalService.name} ahora tiene ${count} réplicas activas.`);
    setScaleModalService(null);
  };

  const handleRestartSubmit = (e) => {
    e.preventDefault();
    if (!restartModalService || confirmRestartText.trim() !== 'REINICIAR') return;

    logAudit('restart_service', 'cloud_services', { service: restartModalService.name });
    toast.info('Servicio Reiniciado', `Pods de ${restartModalService.name} reiniciados en modo Rolling.`);
    setRestartModalService(null);
    setConfirmRestartText('');
  };

  const totalReplicas = services.reduce((acc, s) => acc + s.replicas, 0);

  return (
    <div className="space-y-6 animate-slide-up" data-testid="devops-pipelines-module">
      <PageHeader
        icon={Cpu}
        eyebrow="Portal Cloud · Rol DevOps & Cloud Engineer"
        title="Pipelines CI/CD & Monitoreo de Infraestructura"
        description="Automatización de integración continua, despliegues en Kubernetes y observabilidad de servicios."
        badge={<span className="badge badge-yellow">DevOps</span>}
      >
        <button
          type="button"
          onClick={() => setTriggerModalOpen(true)}
          className="btn btn-primary gap-2 shadow-soft"
          data-testid="trigger-pipeline-btn"
        >
          <Play className="h-4 w-4" />
          <span>Disparar Pipeline</span>
        </button>
      </PageHeader>

      {/* Tabs */}
      <div className="flex border-b border-moss-200">
        <button
          type="button"
          onClick={() => setActiveTab('pipelines')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'pipelines'
              ? 'border-moss-700 text-moss-900'
              : 'border-transparent text-moss-500 hover:text-moss-800'
          }`}
          data-testid="tab-pipelines-btn"
        >
          <Terminal className="h-4 w-4" />
          <span>Pipelines CI/CD ({pipelines.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('infrastructure')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'infrastructure'
              ? 'border-moss-700 text-moss-900'
              : 'border-transparent text-moss-500 hover:text-moss-800'
          }`}
          data-testid="tab-infrastructure-btn"
        >
          <Server className="h-4 w-4" />
          <span>Servicios Cloud & Nodos ({services.length})</span>
        </button>
      </div>

      {/* TAB 1: PIPELINES */}
      {activeTab === 'pipelines' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Builds Exitosos</span>
                <div className="h-8 w-8 rounded-xl bg-moss-100 flex items-center justify-center text-moss-700">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-moss-900" data-testid="kpi-build-success">
                98.4%
              </p>
              <p className="text-[11px] text-moss-500 mt-1 font-medium">Últimos 120 builds en CI</p>
            </div>

            <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Duración Media</span>
                <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-moss-900">2.6 min</p>
              <p className="text-[11px] text-moss-500 mt-1 font-medium">Optimizado con caché OCI</p>
            </div>

            <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Réplicas Activas</span>
                <div className="h-8 w-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
                  <Server className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-moss-900">{totalReplicas}</p>
              <p className="text-[11px] text-moss-500 mt-1 font-medium">Distribuidas en 3 zonas AWS</p>
            </div>

            <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Clúster EKS</span>
                <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                  <Zap className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-moss-600 animate-pulse" />
                <span className="font-display text-xl font-bold text-moss-900">Saludable</span>
              </div>
              <p className="text-[11px] text-moss-500 mt-1 font-medium">Kubernetes v1.29 (Zero Alerts)</p>
            </div>
          </div>

          <div className="table-container shadow-soft" data-testid="pipelines-table-container">
            <table className="table min-w-[1000px]" data-testid="pipelines-table">
              <colgroup>
                <col className="w-[32%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-moss-200/90 bg-moss-100/70 text-[11px] font-bold uppercase tracking-wider text-moss-700">
                  <th scope="col" className="px-5 py-4 text-left font-bold text-moss-800">Nombre del Pipeline</th>
                  <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Rama (Branch)</th>
                  <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Entorno</th>
                  <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Duración</th>
                  <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Estado</th>
                  <th scope="col" className="px-5 py-4 text-left font-bold text-moss-800">Iniciado Por</th>
                </tr>
              </thead>
              <tbody>
                {pipelines.map((pipe) => (
                  <tr key={pipe.id} data-testid={`pipeline-row-${pipe.id}`}>
                    <td className="px-5 py-4 align-middle">
                      <span className="font-bold text-sm text-moss-900 block leading-snug">{pipe.name}</span>
                    </td>

                    <td className="px-4 py-4 align-middle">
                      <code className="rounded bg-moss-100 border border-moss-300 px-2 py-0.5 font-mono text-xs font-bold text-moss-800">
                        {pipe.branch}
                      </code>
                    </td>

                    <td className="px-4 py-4 align-middle">
                      <span className="badge badge-gray uppercase text-xs font-mono font-semibold">{pipe.environment}</span>
                    </td>

                    <td className="px-4 py-4 align-middle">
                      <span className="text-xs font-mono font-semibold text-moss-700">{pipe.duration_seconds} seg</span>
                    </td>

                    <td className="px-4 py-4 align-middle">
                      {pipe.status === 'success' ? (
                        <span className="badge badge-green text-xs font-semibold inline-flex items-center gap-1.5 py-1 px-2.5 shadow-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Exitoso
                        </span>
                      ) : (
                        <span className="badge badge-red text-xs font-semibold inline-flex items-center gap-1.5 py-1 px-2.5 shadow-xs">
                          <XCircle className="h-3.5 w-3.5" /> Fallido
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-moss-500 to-moss-700 text-xs font-bold text-white shadow-xs">
                          {(pipe.triggered_by || 'D')[0].toUpperCase()}
                        </div>
                        <span className="font-mono text-xs text-moss-700 truncate max-w-[130px]" title={pipe.triggered_by}>
                          {pipe.triggered_by?.split('@')[0]}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INFRAESTRUCTURA */}
      {activeTab === 'infrastructure' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((srv) => (
              <div key={srv.id} className="card p-5 shadow-soft space-y-4" data-testid={`service-card-${srv.name}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-moss-900 text-sm font-mono">{srv.name}</h3>
                    <p className="text-[11px] text-moss-500 font-mono">Región: {srv.region}</p>
                  </div>
                  <span className="badge badge-green text-[10px]">100% ONLINE</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center border-y border-moss-200/60 py-3">
                  <div>
                    <p className="text-[11px] text-moss-500">Réplicas</p>
                    <p className="font-bold text-moss-900 text-base" data-testid={`replicas-val-${srv.name}`}>
                      {srv.replicas}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-moss-500">CPU</p>
                    <p className="font-bold text-moss-900 text-base">{srv.cpu_percent}%</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-moss-500">RAM</p>
                    <p className="font-bold text-moss-900 text-base">{srv.mem_mb} MB</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScaleModalService(srv);
                      setTargetReplicas(srv.replicas);
                    }}
                    className="btn btn-secondary btn-sm flex-1 gap-1"
                    data-testid={`scale-service-btn-${srv.name}`}
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>Escalar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRestartModalService(srv);
                      setConfirmRestartText('');
                    }}
                    className="btn btn-ghost btn-sm text-warning-700 hover:bg-warning-50 gap-1"
                    data-testid={`restart-service-btn-${srv.name}`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reiniciar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Disparar Pipeline */}
      <Modal
        open={triggerModalOpen}
        onClose={() => setTriggerModalOpen(false)}
        title="Disparar Pipeline CI/CD Manualmente"
        description="Selecciona el flujo de integración y los parámetros de compilación."
        size="md"
        data-testid="trigger-pipeline-modal"
      >
        <div className="space-y-4">
          <Field label="Pipeline Objetivo" id="trigger-pipeline-select">
            <CustomSelect
              id="trigger-pipeline-select"
              testId="trigger-pipeline-select"
              value={triggerForm.pipelineId}
              onChange={(e) => setTriggerForm((p) => ({ ...p, pipelineId: e.target.value }))}
              options={pipelines.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Field>

          <Field label="Rama de Código (Branch)" id="trigger-branch-select">
            <CustomSelect
              id="trigger-branch-select"
              testId="trigger-branch-select"
              value={triggerForm.branch}
              onChange={(e) => setTriggerForm((p) => ({ ...p, branch: e.target.value }))}
              options={[
                { value: 'main', label: 'main (Rama Principal de Producción)' },
                { value: 'staging', label: 'staging (Entorno de Pruebas QA)' },
                { value: 'hotfix/patch-2.4', label: 'hotfix/patch-2.4 (Parche Crítico)' },
              ]}
            />
          </Field>

          <Field label="Entorno de Ejecución" id="trigger-env-select">
            <CustomSelect
              id="trigger-env-select"
              testId="trigger-env-select"
              value={triggerForm.environment}
              onChange={(e) => setTriggerForm((p) => ({ ...p, environment: e.target.value }))}
              options={[
                { value: 'staging', label: 'Staging QA (EKS Cluster Sandbox)' },
                { value: 'production', label: 'Production (EKS Cluster Live)' },
              ]}
            />
          </Field>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="clean-cache-checkbox"
              type="checkbox"
              checked={triggerForm.cleanCache}
              onChange={(e) => setTriggerForm((p) => ({ ...p, cleanCache: e.target.checked }))}
              className="h-4 w-4 rounded border-moss-300 text-moss-600 focus:ring-moss-500"
              data-testid="clean-cache-checkbox"
            />
            <label htmlFor="clean-cache-checkbox" className="text-xs text-moss-800">
              Limpiar caché de dependencias (Recompilación completa)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-moss-200">
            <button type="button" onClick={() => setTriggerModalOpen(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleTriggerPipeline}
              className="btn btn-primary gap-1.5"
              data-testid="start-pipeline-btn"
            >
              <Play className="h-4 w-4" />
              <span>Ejecutar Ahora</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Consola de Ejecución en Vivo */}
      <Modal
        open={Boolean(executingPipeline)}
        onClose={() => setExecutingPipeline(null)}
        title={`Ejecutando: ${executingPipeline?.name || ''}`}
        description="Logs de consola de Kubernetes y BuildKit en tiempo real."
        size="lg"
        data-testid="executing-pipeline-modal"
      >
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span>Progreso de Build</span>
              <span className="font-mono text-moss-700">{executingProgress}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-moss-100">
              <div
                className="h-full bg-gradient-to-r from-moss-500 to-moss-700 transition-all duration-300"
                style={{ width: `${executingProgress}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-moss-800 bg-moss-950 p-4 font-mono text-xs text-moss-200 h-52 overflow-y-auto space-y-1">
            {executionLogs.map((log, index) => (
              <p key={index} className="leading-relaxed">
                {log}
              </p>
            ))}
          </div>

          {executingProgress >= 100 && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setExecutingPipeline(null)}
                className="btn btn-primary btn-sm"
                data-testid="close-pipeline-log-btn"
              >
                Cerrar Visor
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Escalar Réplicas */}
      <Modal
        open={Boolean(scaleModalService)}
        onClose={() => setScaleModalService(null)}
        title={`Escalar Réplicas: ${scaleModalService?.name || ''}`}
        description="Ajusta el número de pods paralelos en el clúster."
        size="sm"
        data-testid="scale-service-modal"
      >
        <form onSubmit={handleScaleSubmit} className="space-y-4" data-testid="scale-service-form">
          <Field
            label={`Cantidad de Réplicas (1 - 20): ${targetReplicas}`}
            id="replicas-slider"
            help="El balanceador distribuirá el tráfico entre los pods seleccionados."
          >
            <input
              id="replicas-slider"
              type="range"
              min="1"
              max="20"
              value={targetReplicas}
              onChange={(e) => setTargetReplicas(Number(e.target.value))}
              className="w-full accent-moss-600"
              data-testid="replicas-slider"
            />
          </Field>

          <div className="flex justify-end gap-3 pt-3 border-t border-moss-200">
            <button type="button" onClick={() => setScaleModalService(null)} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" data-testid="confirm-scale-btn">
              Aplicar Escalamiento
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Reinicio con Confirmación Crítica */}
      <Modal
        open={Boolean(restartModalService)}
        onClose={() => setRestartModalService(null)}
        title={`Confirmación Crítica: Reiniciar ${restartModalService?.name || ''}`}
        description="Esta acción forzará el reinicio progresivo de todos los pods del servicio."
        size="sm"
        data-testid="restart-service-modal"
      >
        <form onSubmit={handleRestartSubmit} className="space-y-4" data-testid="restart-service-form">
          <Alert variant="warning" title="Atención Operativa">
            Escribe exactamente la palabra <strong className="font-mono">REINICIAR</strong> para confirmar el reinicio seguro.
          </Alert>

          <Field label="Palabra de Confirmación *" id="restart-confirm-input">
            <input
              id="restart-confirm-input"
              type="text"
              required
              value={confirmRestartText}
              onChange={(e) => setConfirmRestartText(e.target.value)}
              placeholder="REINICIAR"
              className="input uppercase font-mono"
              data-testid="restart-confirm-input"
              autoFocus
            />
          </Field>

          <div className="flex justify-end gap-3 pt-3 border-t border-moss-200">
            <button type="button" onClick={() => setRestartModalService(null)} className="btn btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={confirmRestartText.trim() !== 'REINICIAR'}
              className="btn btn-danger"
              data-testid="confirm-restart-btn"
            >
              Reiniciar Pods
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
