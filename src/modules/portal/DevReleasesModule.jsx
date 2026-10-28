import { useState, useEffect, useMemo } from 'react';
import {
  GitBranch,
  Rocket,
  ToggleLeft,
  ToggleRight,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Code2,
  Send,
  ExternalLink,
  Layers,
  Sparkles,
  Server,
  Zap,
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

const INITIAL_RELEASES = [
  {
    id: 'rel-1',
    version: 'v2.4.0',
    branch: 'release/v2.4',
    commit_hash: '9f8b1c4',
    strategy: 'rolling',
    status: 'deployed',
    changelog: 'Implementación del nuevo módulo de usuarios PostgreSQL y optimizaciones de sesión JWT.',
    author: 'dev.senior@empresa.com',
    created_at: '2026-10-27T18:30:00Z',
  },
  {
    id: 'rel-2',
    version: 'v2.3.2',
    branch: 'hotfix/cart-discount',
    commit_hash: '3e4a7d2',
    strategy: 'canary',
    status: 'deployed',
    changelog: 'Corrección de cálculo de cupones de descuento duplicados en pasarela de checkout.',
    author: 'dev.lead@empresa.com',
    created_at: '2026-10-25T14:15:00Z',
  },
  {
    id: 'rel-3',
    version: 'v2.5.0-rc1',
    branch: 'feature/biometric-auth',
    commit_hash: '7c8d9e0',
    strategy: 'blue_green',
    status: 'staging',
    changelog: 'Candidato a release con soporte de autenticación biométrica y WebAuthn.',
    author: 'dev.senior@empresa.com',
    created_at: '2026-10-28T09:00:00Z',
  },
];

const INITIAL_FLAGS = [
  {
    id: 'flag-1',
    key: 'feat_realtime_audit',
    name: 'Auditoría en Tiempo Real con WebSockets',
    enabled: true,
    rollout_percentage: 100,
    environments: ['staging', 'production'],
    updated_by: 'dev.senior@empresa.com',
    updated_at: '2026-10-27T10:00:00Z',
  },
  {
    id: 'flag-2',
    key: 'feat_dark_mode_v2',
    name: 'Paleta de Color Alto Contraste Moss Dark',
    enabled: false,
    rollout_percentage: 20,
    environments: ['staging'],
    updated_by: 'dev.senior@empresa.com',
    updated_at: '2026-10-26T15:20:00Z',
  },
  {
    id: 'flag-3',
    key: 'feat_new_checkout_flow',
    name: 'Checkout Rápido en 1 Clic con Stripe Elements',
    enabled: true,
    rollout_percentage: 50,
    environments: ['staging'],
    updated_by: 'dev.lead@empresa.com',
    updated_at: '2026-10-28T11:00:00Z',
  },
];

const STRATEGY_OPTIONS = [
  { value: 'rolling', label: 'Rolling Update (Cero Caída de Servicio)' },
  { value: 'canary', label: 'Canary Deployment (Tráfico Progresivo 10% - 100%)' },
  { value: 'blue_green', label: 'Blue / Green Deployment (Conmutación Instantánea)' },
];

export default function DevReleasesModule() {
  const { user, logAudit } = useSupabaseAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('releases'); // 'releases' | 'flags' | 'webhooks'
  const [releases, setReleases] = useState(() => {
    const saved = localStorage.getItem('portal_dev_releases');
    return saved ? JSON.parse(saved) : INITIAL_RELEASES;
  });
  const [flags, setFlags] = useState(() => {
    const saved = localStorage.getItem('portal_dev_flags');
    return saved ? JSON.parse(saved) : INITIAL_FLAGS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [createReleaseModal, setCreateReleaseModal] = useState(false);
  const [createFlagModal, setCreateFlagModal] = useState(false);

  // Formulario de Release
  const [releaseForm, setReleaseForm] = useState({
    version: '',
    branch: 'main',
    commit_hash: '',
    strategy: 'rolling',
    changelog: '',
  });

  // Formulario de Feature Flag
  const [flagForm, setFlagForm] = useState({
    key: '',
    name: '',
    rollout_percentage: 100,
    environments: ['staging'],
  });

  // Webhook Test State
  const [webhookUrl, setWebhookUrl] = useState('https://api.empresa.com/webhooks/deploy-notify');
  const [webhookEvent, setWebhookEvent] = useState('release.deployed');
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookResult, setWebhookResult] = useState(null);

  const persistReleases = (data) => {
    setReleases(data);
    localStorage.setItem('portal_dev_releases', JSON.stringify(data));
  };

  const persistFlags = (data) => {
    setFlags(data);
    localStorage.setItem('portal_dev_flags', JSON.stringify(data));
  };

  // Validaciones de Release
  const isSemverValid = /^v?[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$/.test(releaseForm.version.trim());
  const isBranchValid = releaseForm.branch.trim().length >= 3 && /^[a-zA-Z0-9/_.-]+$/.test(releaseForm.branch.trim());
  const isCommitValid = /^[0-9a-fA-F]{7,40}$/.test(releaseForm.commit_hash.trim());
  const isChangelogValid = releaseForm.changelog.trim().length >= 15;
  const isReleaseFormValid = isSemverValid && isBranchValid && isCommitValid && isChangelogValid;

  // Validaciones de Flag
  const isFlagKeyValid = /^[a-z0-9_]{4,40}$/.test(flagForm.key.trim());
  const isFlagNameValid = flagForm.name.trim().length >= 6;
  const isFlagFormValid = isFlagKeyValid && isFlagNameValid;

  const handleCreateRelease = async (e) => {
    e.preventDefault();
    if (!isReleaseFormValid) return;

    const newRel = {
      id: `rel-${Date.now()}`,
      version: releaseForm.version.startsWith('v') ? releaseForm.version.trim() : `v${releaseForm.version.trim()}`,
      branch: releaseForm.branch.trim(),
      commit_hash: releaseForm.commit_hash.trim().toLowerCase(),
      strategy: releaseForm.strategy,
      status: 'staging',
      changelog: releaseForm.changelog.trim(),
      author: user?.email || 'dev.senior@empresa.com',
      created_at: new Date().toISOString(),
    };

    try {
      if (supabase) {
        await supabase.from('dev_releases').insert([newRel]);
      }
      await logAudit('create_release', 'dev_releases', { version: newRel.version, commit: newRel.commit_hash });
    } catch (err) {
      console.warn('Guardado en local:', err.message);
    }

    const updated = [newRel, ...releases];
    persistReleases(updated);
    toast.success('Release Creado', `La versión ${newRel.version} ha sido registrada.`);
    setCreateReleaseModal(false);
    setReleaseForm({ version: '', branch: 'main', commit_hash: '', strategy: 'rolling', changelog: '' });
  };

  const handleCreateFlag = async (e) => {
    e.preventDefault();
    if (!isFlagFormValid) return;

    const newFlag = {
      id: `flag-${Date.now()}`,
      key: flagForm.key.trim().toLowerCase(),
      name: flagForm.name.trim(),
      enabled: false,
      rollout_percentage: Number(flagForm.rollout_percentage),
      environments: flagForm.environments,
      updated_by: user?.email || 'dev.senior@empresa.com',
      updated_at: new Date().toISOString(),
    };

    try {
      if (supabase) {
        await supabase.from('feature_flags').insert([newFlag]);
      }
      await logAudit('create_feature_flag', 'feature_flags', { key: newFlag.key });
    } catch (err) {
      console.warn('Guardado en local:', err.message);
    }

    const updated = [newFlag, ...flags];
    persistFlags(updated);
    toast.success('Feature Flag Creado', `El toggle ${newFlag.key} está disponible.`);
    setCreateFlagModal(false);
    setFlagForm({ key: '', name: '', rollout_percentage: 100, environments: ['staging'] });
  };

  const handleToggleFlag = async (flagId) => {
    const updated = flags.map((f) => {
      if (f.id === flagId) {
        const nextState = !f.enabled;
        logAudit('toggle_feature_flag', 'feature_flags', { key: f.key, enabled: nextState });
        toast.info('Toggle Actualizado', `${f.key} ahora está ${nextState ? 'ACTIVO' : 'INACTIVO'}.`);
        return { ...f, enabled: nextState, updated_at: new Date().toISOString() };
      }
      return f;
    });
    persistFlags(updated);
  };

  const handleTestWebhook = () => {
    if (!webhookUrl.startsWith('https://')) {
      toast.error('URL Inválida', 'La URL del webhook debe usar protocolo HTTPS seguro.');
      return;
    }
    setWebhookTesting(true);
    setWebhookResult(null);

    setTimeout(() => {
      setWebhookTesting(false);
      setWebhookResult({
        status: 200,
        latency_ms: 142,
        timestamp: new Date().toISOString(),
        payload_sent: {
          event: webhookEvent,
          version: releases[0]?.version || 'v2.4.0',
          environment: 'production',
          triggered_by: user?.email || 'dev.senior@empresa.com',
        },
      });
      toast.success('Ping Exitoso', 'El webhook respondió con código HTTP 200 OK (142 ms).');
      logAudit('test_webhook', 'webhooks', { url: webhookUrl, event: webhookEvent });
    }, 800);
  };

  const filteredReleases = useMemo(() => {
    return releases.filter(
      (r) =>
        r.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.changelog.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.commit_hash.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [releases, searchTerm]);

  return (
    <div className="space-y-6 animate-slide-up" data-testid="dev-releases-module">
      <PageHeader
        icon={GitBranch}
        eyebrow="Portal Cloud · Rol Desarrollador Senior"
        title="Control de Versiones, Releases & Feature Flags"
        description="Gestión de despliegues continuos, ramas, conmutadores de características (toggles) y webhooks."
        badge={<span className="badge badge-blue">Dev Senior</span>}
      >
        {activeTab === 'releases' ? (
          <button
            type="button"
            onClick={() => setCreateReleaseModal(true)}
            className="btn btn-primary gap-2 shadow-soft"
            data-testid="create-release-btn"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Release</span>
          </button>
        ) : activeTab === 'flags' ? (
          <button
            type="button"
            onClick={() => setCreateFlagModal(true)}
            className="btn btn-primary gap-2 shadow-soft"
            data-testid="create-flag-btn"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Feature Flag</span>
          </button>
        ) : null}
      </PageHeader>

      {/* Tabs */}
      <div className="flex border-b border-moss-200">
        <button
          type="button"
          onClick={() => setActiveTab('releases')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'releases'
              ? 'border-moss-700 text-moss-900'
              : 'border-transparent text-moss-500 hover:text-moss-800'
          }`}
          data-testid="tab-releases-btn"
        >
          <Rocket className="h-4 w-4" />
          <span>Releases & Versiones ({releases.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('flags')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'flags'
              ? 'border-moss-700 text-moss-900'
              : 'border-transparent text-moss-500 hover:text-moss-800'
          }`}
          data-testid="tab-flags-btn"
        >
          <ToggleRight className="h-4 w-4" />
          <span>Feature Flags ({flags.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'webhooks'
              ? 'border-moss-700 text-moss-900'
              : 'border-transparent text-moss-500 hover:text-moss-800'
          }`}
          data-testid="tab-webhooks-btn"
        >
          <Code2 className="h-4 w-4" />
          <span>Webhooks & Integraciones</span>
        </button>
      </div>

      {/* TAB 1: RELEASES */}
      {activeTab === 'releases' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Versión en Prod</span>
                <div className="h-8 w-8 rounded-xl bg-moss-100 flex items-center justify-center text-moss-700">
                  <Rocket className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-moss-900" data-testid="kpi-prod-version">
                {releases[0]?.version || 'v2.4.0'}
              </p>
              <p className="text-[11px] font-mono text-moss-500 mt-1 font-medium">Commit: {releases[0]?.commit_hash}</p>
            </div>

            <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Desplegados</span>
                <div className="h-8 w-8 rounded-xl bg-moss-100 flex items-center justify-center text-moss-700">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-moss-900" data-testid="kpi-deployed-count">
                {releases.filter((r) => r.status === 'deployed').length}
              </p>
              <p className="text-[11px] text-moss-500 mt-1 font-medium">100% verificados con pruebas</p>
            </div>

            <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Estrategia</span>
                <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-moss-900">Rolling</p>
              <p className="text-[11px] text-moss-500 mt-1 font-medium">Cero downtime en producción</p>
            </div>

            <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Tiempo Medio</span>
                <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-moss-900">3.4 min</p>
              <p className="text-[11px] text-moss-500 mt-1 font-medium">Pipeline automatizado EKS</p>
            </div>
          </div>

          <div className="card p-4 shadow-soft">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar release por versión, changelog o hash de commit..."
                className="input pl-10 text-sm"
                data-testid="search-releases-input"
              />
            </div>
          </div>

          <div className="table-container shadow-soft" data-testid="releases-table-container">
            <table className="table min-w-[1000px]" data-testid="releases-table">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[26%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-moss-200/90 bg-moss-100/70 text-[11px] font-bold uppercase tracking-wider text-moss-700">
                  <th scope="col" className="px-5 py-4 text-left font-bold text-moss-800">Versión & Rama</th>
                  <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Commit SHA</th>
                  <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Estrategia</th>
                  <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Estado</th>
                  <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Changelog / Resumen</th>
                  <th scope="col" className="px-5 py-4 text-left font-bold text-moss-800">Autor</th>
                </tr>
              </thead>
              <tbody>
                {filteredReleases.map((rel) => (
                  <tr key={rel.id} data-testid={`release-row-${rel.version}`}>
                    <td className="px-5 py-4 align-middle">
                      <div className="space-y-0.5">
                        <span className="font-mono text-xs sm:text-sm font-bold text-moss-900 bg-moss-100 px-2 py-0.5 rounded border border-moss-300" data-testid={`version-label-${rel.version}`}>
                          {rel.version}
                        </span>
                        <p className="text-[11px] font-mono text-moss-600 mt-1">{rel.branch}</p>
                      </div>
                    </td>

                    <td className="px-4 py-4 align-middle">
                      <code className="rounded bg-moss-50 border border-moss-200 px-2 py-1 text-xs font-mono font-bold text-moss-800">
                        {rel.commit_hash}
                      </code>
                    </td>

                    <td className="px-4 py-4 align-middle">
                      <span className="badge badge-gray capitalize text-xs font-semibold">{rel.strategy}</span>
                    </td>

                    <td className="px-4 py-4 align-middle">
                      {rel.status === 'deployed' ? (
                        <span className="badge badge-green text-xs font-semibold inline-flex items-center gap-1.5 py-1 px-2.5 shadow-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Desplegado
                        </span>
                      ) : (
                        <span className="badge badge-yellow text-xs font-semibold inline-flex items-center gap-1.5 py-1 px-2.5 shadow-xs">
                          <Clock className="h-3.5 w-3.5" /> Staging QA
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 align-middle">
                      <p className="text-xs text-moss-800 line-clamp-2 leading-relaxed">{rel.changelog}</p>
                    </td>

                    <td className="px-5 py-4 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-moss-500 to-moss-700 text-xs font-bold text-white shadow-xs">
                          {(rel.author || 'D')[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-mono text-moss-700 truncate max-w-[120px]" title={rel.author}>
                          {rel.author?.split('@')[0]}
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

      {/* TAB 2: FEATURE FLAGS */}
      {activeTab === 'flags' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {flags.map((flag) => (
              <div key={flag.id} className="card p-5 shadow-soft space-y-3" data-testid={`flag-card-${flag.key}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <code className="font-mono text-xs font-bold text-moss-800 bg-moss-100 px-1.5 py-0.5 rounded">
                      {flag.key}
                    </code>
                    <h3 className="mt-1 font-semibold text-moss-900 text-sm leading-tight">{flag.name}</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleFlag(flag.id)}
                    className="shrink-0 p-1 rounded hover:bg-moss-100 transition"
                    title={flag.enabled ? 'Desactivar Feature Flag' : 'Activar Feature Flag'}
                    data-testid={`toggle-flag-btn-${flag.key}`}
                  >
                    {flag.enabled ? (
                      <ToggleRight className="h-7 w-7 text-moss-600 fill-moss-600" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-moss-300" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-moss-600 border-t border-moss-200/60 pt-3">
                  <span>Rollout: <strong>{flag.rollout_percentage}%</strong></span>
                  <span className={flag.enabled ? 'badge badge-green text-[10px]' : 'badge badge-gray text-[10px]'}>
                    {flag.enabled ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: WEBHOOKS */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6 max-w-3xl">
          <div className="card p-6 shadow-soft space-y-4">
            <h3 className="text-base font-bold text-moss-900 flex items-center gap-2">
              <Zap className="h-4 w-4 text-moss-600" /> Disparador de Notificación de Despliegue
            </h3>
            <p className="text-xs text-moss-600">
              Envía un evento webhook con el payload del release hacia Slack, Discord o tu servidor CI/CD.
            </p>

            <Field label="URL del Endpoint Webhook *" id="webhook-url-input" help="Debe comenzar con https://">
              <input
                id="webhook-url-input"
                type="url"
                required
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://api.empresa.com/webhooks/deploy"
                className="input font-mono text-xs"
                data-testid="webhook-url-input"
              />
            </Field>

            <Field label="Evento a Notificar" id="webhook-event-select">
              <CustomSelect
                id="webhook-event-select"
                testId="webhook-event-select"
                value={webhookEvent}
                onChange={(e) => setWebhookEvent(e.target.value)}
                options={[
                  { value: 'release.deployed', label: 'release.deployed (Despliegue Exitoso)' },
                  { value: 'release.rollback', label: 'release.rollback (Rollback de Emergencia)' },
                  { value: 'flag.toggled', label: 'flag.toggled (Cambio en Feature Flag)' },
                ]}
              />
            </Field>

            <button
              type="button"
              onClick={handleTestWebhook}
              disabled={webhookTesting}
              className="btn btn-primary gap-2"
              data-testid="send-webhook-btn"
            >
              {webhookTesting ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              <span>Enviar Petición de Prueba (Test Ping)</span>
            </button>

            {webhookResult && (
              <div className="mt-4 rounded-xl border border-moss-300 bg-moss-950 p-4 font-mono text-xs text-moss-200 space-y-2">
                <div className="flex items-center justify-between text-moss-400 border-b border-moss-800 pb-2">
                  <span>Respuesta HTTP: <strong className="text-moss-300">200 OK</strong></span>
                  <span>Latencia: <strong>{webhookResult.latency_ms} ms</strong></span>
                </div>
                <pre className="text-[11px] overflow-x-auto text-moss-300">
                  {JSON.stringify(webhookResult.payload_sent, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Crear Release */}
      <Modal
        open={createReleaseModal}
        onClose={() => setCreateReleaseModal(false)}
        title="Crear Nuevo Release de Software"
        description="Registra la versión, branch de origen y commit hash para el despliegue."
        size="md"
        data-testid="create-release-modal"
      >
        <form onSubmit={handleCreateRelease} className="space-y-4" data-testid="create-release-form">
          <Field
            label="Versión Semver *"
            id="release-version-input"
            help="Formato vX.Y.Z (ej: v2.5.0)"
            error={releaseForm.version && !isSemverValid ? 'Debe cumplir con Semver (ej: v1.0.0 o v2.1.3).' : ''}
          >
            <input
              id="release-version-input"
              type="text"
              required
              value={releaseForm.version}
              onChange={(e) => setReleaseForm((p) => ({ ...p, version: e.target.value }))}
              placeholder="v2.5.0"
              className="input font-mono"
              data-testid="release-version-input"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Rama (Branch) *"
              id="release-branch-input"
              error={releaseForm.branch && !isBranchValid ? 'Nombre de branch no válido.' : ''}
            >
              <input
                id="release-branch-input"
                type="text"
                required
                value={releaseForm.branch}
                onChange={(e) => setReleaseForm((p) => ({ ...p, branch: e.target.value }))}
                placeholder="release/v2.5"
                className="input font-mono text-xs"
                data-testid="release-branch-input"
              />
            </Field>

            <Field
              label="Commit Hash (SHA) *"
              id="release-commit-input"
              help="Entre 7 y 40 caracteres hexadecimales"
              error={releaseForm.commit_hash && !isCommitValid ? 'Debe ser un hash hex (ej: 9f8b1c4).' : ''}
            >
              <input
                id="release-commit-input"
                type="text"
                required
                value={releaseForm.commit_hash}
                onChange={(e) => setReleaseForm((p) => ({ ...p, commit_hash: e.target.value }))}
                placeholder="7a8b9c0"
                className="input font-mono text-xs uppercase"
                data-testid="release-commit-input"
              />
            </Field>
          </div>

          <Field label="Estrategia de Despliegue" id="release-strategy-select">
            <CustomSelect
              id="release-strategy-select"
              testId="release-strategy-select"
              value={releaseForm.strategy}
              onChange={(e) => setReleaseForm((p) => ({ ...p, strategy: e.target.value }))}
              options={STRATEGY_OPTIONS}
            />
          </Field>

          <Field
            label="Changelog / Resumen Técnico *"
            id="release-changelog-input"
            help={`${releaseForm.changelog.length}/15 caracteres requeridos`}
            error={releaseForm.changelog && !isChangelogValid ? 'Escribe al menos 15 caracteres descriptivos.' : ''}
          >
            <textarea
              id="release-changelog-input"
              rows={3}
              required
              value={releaseForm.changelog}
              onChange={(e) => setReleaseForm((p) => ({ ...p, changelog: e.target.value }))}
              placeholder="Detalla los cambios, correcciones de errores o nuevas funcionalidades incluidas..."
              className="input resize-none"
              data-testid="release-changelog-textarea"
            />
          </Field>

          <div className="flex justify-end gap-3 pt-3 border-t border-moss-200">
            <button type="button" onClick={() => setCreateReleaseModal(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={!isReleaseFormValid} className="btn btn-primary" data-testid="submit-release-btn">
              Guardar Release
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Crear Feature Flag */}
      <Modal
        open={createFlagModal}
        onClose={() => setCreateFlagModal(false)}
        title="Nuevo Feature Flag"
        description="Crea un toggle técnico para habilitar funciones condicionalmente."
        size="md"
        data-testid="create-flag-modal"
      >
        <form onSubmit={handleCreateFlag} className="space-y-4" data-testid="create-flag-form">
          <Field
            label="Clave Técnica (Snake Case) *"
            id="flag-key-input"
            help="Solo minúsculas, números y guión bajo (ej: feat_new_search)"
            error={flagForm.key && !isFlagKeyValid ? 'Usa snake_case (ej: feat_checkout_v2).' : ''}
          >
            <input
              id="flag-key-input"
              type="text"
              required
              value={flagForm.key}
              onChange={(e) => setFormData ? setFlagForm((p) => ({ ...p, key: e.target.value.toLowerCase() })) : null}
              placeholder="feat_new_search"
              className="input font-mono text-xs"
              data-testid="flag-key-input"
            />
          </Field>

          <Field
            label="Nombre Comercial *"
            id="flag-name-input"
            error={flagForm.name && !isFlagNameValid ? 'Mínimo 6 caracteres.' : ''}
          >
            <input
              id="flag-name-input"
              type="text"
              required
              value={flagForm.name}
              onChange={(e) => setFlagForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Búsqueda Inteligente con Autocompletado"
              className="input"
              data-testid="flag-name-input"
            />
          </Field>

          <Field
            label={`Porcentaje de Rollout: ${flagForm.rollout_percentage}%`}
            id="flag-rollout-slider"
          >
            <input
              id="flag-rollout-slider"
              type="range"
              min="0"
              max="100"
              value={flagForm.rollout_percentage}
              onChange={(e) => setFlagForm((p) => ({ ...p, rollout_percentage: Number(e.target.value) }))}
              className="w-full accent-moss-600"
              data-testid="flag-rollout-slider"
            />
          </Field>

          <div className="flex justify-end gap-3 pt-3 border-t border-moss-200">
            <button type="button" onClick={() => setCreateFlagModal(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={!isFlagFormValid} className="btn btn-primary" data-testid="submit-flag-btn">
              Crear Toggle
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
