import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Clock,
  Database,
  Fingerprint,
  History,
  Lock,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Unlock,
  Users,
} from 'lucide-react';
import { PageHeader, Panel } from '../../components/ui/Primitives';
import Modal from '../../components/ui/Modal';
import LocatorHint from '../../components/qa/LocatorHint';
import { useToast } from '../../context/ToastContext';
import { useCountdown } from '../../hooks/common';
import { cn, formatTime } from '../../utils/format';
import * as api from './authApi';
import { ChangePasswordForm, LoginForm, OtpForm } from './AuthForms';

const SESSION_KEY = 'qa_auth_session';

function loadSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    return s && s.expiresAt > Date.now() ? s : null;
  } catch {
    return null;
  }
}

const LOG_TONE = {
  info: 'text-info-200',
  success: 'text-moss-300',
  warning: 'text-warning-200',
  error: 'text-danger-200',
};

function SessionPanel({ session, onLogout, onExtend }) {
  const remaining = useCountdown(session.expiresAt);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pct = Math.min(100, (remaining / api.SESSION_SECONDS) * 100);
  const warn = remaining <= api.SESSION_WARNING_SECONDS;

  useEffect(() => {
    if (remaining === 0) onLogout('expired');
  }, [remaining, onLogout]);

  return (
    <div data-testid="auth-session-panel" className="space-y-5 animate-slide-up">
      <div className="text-center">
        <div className="relative mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-moss-400 to-moss-700 font-display text-2xl font-bold text-white shadow-lift ring-4 ring-moss-200">
          {session.user.name
            .split(' ')
            .map((p) => p[0])
            .join('')}
          <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-moss-500 ring-2 ring-white" />
        </div>
        <p className="text-sm text-moss-600">Bienvenido/a</p>
        <h2 className="text-2xl font-bold" data-testid="auth-welcome-name">
          {session.user.name}
        </h2>
        <span className="badge badge-green mt-2" data-testid="auth-user-role">
          <ShieldCheck className="h-3 w-3" /> {session.user.role}
        </span>
      </div>

      <div className="rounded-2xl border border-moss-200 bg-moss-50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 font-medium text-moss-700">
            <Clock className="h-4 w-4" /> La sesión expira en
          </span>
          <span
            className={cn('font-mono text-lg font-bold', warn ? 'text-danger-600' : 'text-moss-900')}
            data-testid="auth-session-timer"
          >
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-moss-200">
          <div
            className={cn('h-full rounded-full transition-all duration-500', warn ? 'bg-danger-500' : 'bg-moss-600')}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-moss-950 p-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-moss-400">Access token (simulado)</p>
        <code className="block break-all font-mono text-[11px] text-moss-200" data-testid="auth-session-token">
          {session.token}
        </code>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="btn btn-secondary" onClick={onExtend} data-testid="auth-extend-session-btn">
          <RotateCcw className="h-4 w-4" /> Extender
        </button>
        <button type="button" className="btn btn-danger" onClick={() => setConfirmOpen(true)} data-testid="auth-logout-btn">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="¿Cerrar sesión?"
        description="Tendrás que volver a autenticarte."
        testId="logout-confirm-modal"
        size="sm"
        icon={LogOut}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmOpen(false)} data-testid="logout-cancel-btn">
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                setConfirmOpen(false);
                onLogout('manual');
              }}
              data-testid="logout-confirm-btn"
            >
              Sí, cerrar sesión
            </button>
          </>
        }
      >
        <p className="text-sm text-moss-700">Se eliminará el token de la sesión actual.</p>
      </Modal>

      <Modal
        open={warn && remaining > 0 && !confirmOpen}
        onClose={onExtend}
        title="Tu sesión está por expirar"
        testId="session-warning-modal"
        size="sm"
        icon={TriangleAlert}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => onLogout('manual')} data-testid="session-warning-logout-btn">
              Cerrar sesión
            </button>
            <button type="button" className="btn btn-primary" onClick={onExtend} data-testid="session-warning-extend-btn" data-autofocus>
              Mantener sesión
            </button>
          </>
        }
      >
        <p className="text-sm text-moss-700">
          Cerraremos tu sesión automáticamente en{' '}
          <strong className="font-mono text-danger-600" data-testid="session-warning-countdown">
            {remaining}s
          </strong>
          .
        </p>
      </Modal>
    </div>
  );
}

export default function AuthModule() {
  const toast = useToast();
  const [session, setSession] = useState(loadSession);
  const [view, setView] = useState(() => (loadSession() ? 'session' : 'login'));
  const [challenge, setChallenge] = useState(null);
  const [pendingUser, setPendingUser] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [events, setEvents] = useState([]);
  const [locks, setLocks] = useState(api.getAllLockStates);
  const [, force] = useState(0);

  const log = useCallback((tone, message) => {
    setEvents((e) => [{ id: `${Date.now()}-${Math.random()}`, tone, message, time: formatTime() }, ...e].slice(0, 40));
  }, []);

  const refreshLocks = useCallback(() => setLocks(api.getAllLockStates()), []);

  // Refresca la tabla de bloqueos cada segundo para mostrar cuentas regresivas.
  useEffect(() => {
    const id = setInterval(() => {
      setLocks(api.getAllLockStates());
      force((x) => x + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const startSession = useCallback(
    (s) => {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      setSession(s);
      setView('session');
      setSessionExpired(false);
      setChallenge(null);
      setPendingUser(null);
      toast.success('Sesión iniciada', `Bienvenido/a, ${s.user.name}`);
      log('success', `Sesión creada para ${s.user.username}`);
    },
    [toast, log],
  );

  const onLoginResult = (res, username) => {
    if (res.status === 'OK') startSession(res.session);
    else if (res.status === 'MFA_REQUIRED') {
      setChallenge(res);
      setView('mfa');
      log('warning', 'MFA requerido');
    } else if (res.status === 'PASSWORD_EXPIRED') {
      setPendingUser(username);
      setView('change_password');
      log('warning', 'Contraseña caducada');
    }
  };

  const logout = useCallback(
    (reason) => {
      sessionStorage.removeItem(SESSION_KEY);
      setSession(null);
      setView('login');
      if (reason === 'expired') {
        setSessionExpired(true);
        toast.warning('Sesión expirada', 'Vuelve a iniciar sesión.');
        log('warning', 'Sesión expirada por timeout');
      } else {
        toast.info('Sesión cerrada');
        log('info', 'Logout manual');
      }
    },
    [toast, log],
  );

  const extend = useCallback(() => {
    setSession((s) => {
      if (!s) return s;
      const next = { ...s, expiresAt: Date.now() + api.SESSION_SECONDS * 1000 };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      return next;
    });
    log('info', 'Sesión extendida');
    toast.success('Sesión extendida', `${api.SESSION_SECONDS} segundos adicionales`, { duration: 2500 });
  }, [log, toast]);

  const resetAll = () => {
    api.resetAuthData();
    refreshLocks();
    setPrefill({ username: '', password: '', t: Date.now() });
    toast.info('Datos de autenticación restablecidos', 'Bloqueos, contraseñas cambiadas y contadores reiniciados.');
    log('info', 'Reset de datos de autenticación');
  };

  return (
    <div data-testid="auth-page">
      <PageHeader
        icon={Lock}
        eyebrow="Módulo 01"
        title="Autenticación y manejo de estados"
        description={`Simulador avanzado para pruebas QA: bloqueo tras ${api.MAX_ATTEMPTS} intentos fallidos durante ${api.LOCK_SECONDS} s (persistente al recargar), MFA, contraseña caducada, sesión de ${api.SESSION_SECONDS} s con advertencia y errores 503 transitorios.`}
        testId="auth-header"
        actions={
          <span className="badge bg-white/10 text-moss-100 ring-1 ring-white/15" data-testid="auth-current-view">
            Estado: {view}
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,460px)_1fr]">
        <div className="card relative overflow-hidden p-6 sm:p-8" data-testid="auth-card" data-view={view}>
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-moss-300/30 blur-3xl" />
          <div className="relative">
            {view === 'login' && (
              <LoginForm
                onResult={onLoginResult}
                log={log}
                prefill={prefill}
                sessionExpired={sessionExpired}
                onLockChange={refreshLocks}
              />
            )}
            {view === 'mfa' && challenge && (
              <OtpForm
                challenge={challenge}
                log={log}
                onSuccess={startSession}
                onCancel={(msg) => {
                  setChallenge(null);
                  setView('login');
                  if (msg) toast.error('Verificación cancelada', msg);
                }}
              />
            )}
            {view === 'change_password' && pendingUser && (
              <ChangePasswordForm
                username={pendingUser}
                log={log}
                onSuccess={startSession}
                onCancel={() => {
                  setPendingUser(null);
                  setView('login');
                }}
              />
            )}
            {view === 'session' && session && <SessionPanel session={session} onLogout={logout} onExtend={extend} />}
          </div>
        </div>

        <div className="space-y-6">
          <Panel
            icon={Users}
            title="Cuentas de prueba"
            description="Haz clic en “Usar” para autocompletar el formulario."
            testId="auth-test-users"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-moss-200">
                    <th className="table-th !px-2">Usuario</th>
                    <th className="table-th !px-2">Contraseña</th>
                    <th className="table-th !px-2">Comportamiento</th>
                    <th className="table-th !px-2"><span className="sr-only">Acción</span></th>
                  </tr>
                </thead>
                <tbody>
                  {api.TEST_USERS.map((u) => (
                    <tr key={u.username} className="border-b border-moss-100 last:border-0" data-testid={`test-user-row-${u.username}`}>
                      <td className="px-2 py-2.5 font-mono text-xs font-semibold text-moss-900">{u.username}</td>
                      <td className="px-2 py-2.5 font-mono text-xs text-moss-700">{u.password}</td>
                      <td className="px-2 py-2.5">
                        <span className={cn('badge', `badge-${u.tone}`)}>{u.behavior}</span>
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={view !== 'login'}
                          data-testid={`auth-fill-${u.username}`}
                          onClick={() => setPrefill({ username: u.username, password: u.password, t: Date.now() })}
                        >
                          Usar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-moss-600">
              El usuario no distingue mayúsculas y se recortan espacios; la contraseña sí distingue mayúsculas. Usuarios
              inexistentes también acumulan intentos (protección contra enumeración).
            </p>
          </Panel>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel
              icon={Fingerprint}
              title="Bloqueos activos"
              testId="auth-lock-table"
              actions={
                <button type="button" className="btn btn-secondary btn-sm" onClick={resetAll} data-testid="auth-reset-btn">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              }
            >
              {locks.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-moss-600" data-testid="auth-no-locks">
                  <Unlock className="h-4 w-4" /> Sin intentos fallidos registrados.
                </p>
              ) : (
                <ul className="space-y-2">
                  {locks.map((l) => {
                    const secs = l.lockedUntil ? Math.max(0, Math.ceil((l.lockedUntil - Date.now()) / 1000)) : 0;
                    return (
                      <li
                        key={l.username}
                        data-testid={`auth-lock-${l.username}`}
                        className="flex items-center justify-between rounded-xl bg-moss-50 px-3 py-2 text-sm ring-1 ring-moss-200"
                      >
                        <span className="font-mono text-xs font-semibold">{l.username}</span>
                        {l.lockedUntil ? (
                          <span className="badge badge-red">
                            <Lock className="h-3 w-3" /> {secs}s
                          </span>
                        ) : (
                          <span className="badge badge-yellow">
                            {l.attempts}/{api.MAX_ATTEMPTS}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel icon={History} title="Log de eventos" testId="auth-event-log" bodyClassName="!p-0">
              <ol className="max-h-64 space-y-1 overflow-y-auto bg-moss-950 p-4 font-mono text-[11.5px]" aria-live="polite">
                {events.length === 0 && (
                  <li className="flex items-center gap-2 text-moss-500">
                    <Activity className="h-3.5 w-3.5" /> Esperando actividad...
                  </li>
                )}
                {events.map((e) => (
                  <li key={e.id} data-testid="auth-event-item" data-tone={e.tone} className="flex gap-2">
                    <span className="text-moss-500">{e.time}</span>
                    <span className={LOG_TONE[e.tone]}>{e.message}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
          <div className="flex items-center gap-2 text-xs text-moss-600">
            <LocatorHint testId="auth-event-item" /> Cada evento expone <code className="code-chip">data-tone</code> para aserciones.
          </div>
        </div>
      </div>
    </div>
  );
}
