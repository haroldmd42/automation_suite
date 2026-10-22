import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CircleCheck,
  CircleX,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  User,
} from 'lucide-react';
import { Field, inputCls, Checkbox } from '../../components/ui/Field';
import { Alert, Spinner } from '../../components/ui/Primitives';
import Modal from '../../components/ui/Modal';
import LocatorHint from '../../components/qa/LocatorHint';
import { useCountdown } from '../../hooks/common';
import { cn } from '../../utils/format';
import { USERNAME_RE, isValidEmail, passwordRules, passwordStrength } from '../../utils/validators';
import * as api from './authApi';

/* ------------------------------------------------------------------ */
/*  Password input con mostrar/ocultar y detección de Bloq Mayús       */
/* ------------------------------------------------------------------ */
export function PasswordInput({ id, value, onChange, onBlur, testId, error, placeholder, autoComplete, disabled }) {
  const [visible, setVisible] = useState(false);
  const [caps, setCaps] = useState(false);
  const detectCaps = (e) => setCaps(!!e.getModifierState?.('CapsLock'));
  return (
    <>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onBlur={(e) => {
            setCaps(false);
            onBlur?.(e);
          }}
          onKeyDown={detectCaps}
          onKeyUp={detectCaps}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={!!error}
          data-testid={testId}
          className={inputCls(error, 'pr-11')}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          data-testid={`${testId}-toggle-visibility`}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-moss-500 transition hover:text-moss-800"
          tabIndex={0}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {caps && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-warning-700" data-testid="caps-lock-warning" role="status">
          <TriangleAlert className="h-3.5 w-3.5" /> Bloq Mayús está activado
        </p>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Login                                                              */
/* ------------------------------------------------------------------ */
function validateLogin({ username, password }) {
  const errors = {};
  const u = username.trim();
  if (!u) errors.username = 'El usuario es obligatorio';
  else if (!USERNAME_RE.test(u)) errors.username = 'Entre 3 y 20 caracteres: letras, números o guion bajo';
  if (!password) errors.password = 'La contraseña es obligatoria';
  else if (password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres';
  return errors;
}

export function LoginForm({ onResult, log, prefill, sessionExpired, onLockChange }) {
  const [values, setValues] = useState(() => ({
    username: localStorage.getItem('qa_auth_remember') || '',
    password: '',
    remember: !!localStorage.getItem('qa_auth_remember'),
  }));
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [lock, setLock] = useState(() => api.getLockState(values.username));
  const [forgotOpen, setForgotOpen] = useState(false);
  const inFlight = useRef(false);
  const remaining = useCountdown(lock.lockedUntil);

  useEffect(() => {
    if (prefill) {
      setValues((v) => ({ ...v, username: prefill.username, password: prefill.password }));
      setTouched({});
      setServerError(null);
    }
  }, [prefill]);

  // Recalcula el estado de bloqueo cuando cambia el usuario.
  useEffect(() => {
    setLock(api.getLockState(values.username));
  }, [values.username]);

  // Al terminar la cuenta regresiva se libera el bloqueo.
  useEffect(() => {
    if (lock.lockedUntil && remaining === 0) {
      setLock(api.getLockState(values.username));
      setServerError(null);
      log('info', `Bloqueo expirado para "${values.username.trim().toLowerCase()}"`);
      onLockChange?.();
    }
  }, [remaining, lock.lockedUntil, values.username, log, onLockChange]);

  const errors = validateLogin(values);
  const showErr = (k) => (touched[k] ? errors[k] : undefined);
  const isLocked = !!lock.lockedUntil && remaining > 0;

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setValues((s) => ({ ...s, [k]: v }));
    if (serverError?.code === 'INVALID_CREDENTIALS') setServerError(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (inFlight.current) return; // prevención de doble envío
    setTouched({ username: true, password: true });
    if (Object.keys(errors).length) {
      log('warning', 'Validación de cliente fallida');
      return;
    }
    if (isLocked) return;
    inFlight.current = true;
    setSubmitting(true);
    setServerError(null);
    log('info', `POST /api/login → usuario "${values.username.trim().toLowerCase()}"`);
    try {
      const res = await api.login({ username: values.username, password: values.password });
      if (values.remember) localStorage.setItem('qa_auth_remember', values.username.trim().toLowerCase());
      else localStorage.removeItem('qa_auth_remember');
      log('success', `Respuesta 200 · ${res.status}`);
      onResult(res, values.username.trim().toLowerCase(), values.password);
    } catch (err) {
      setServerError({ code: err.code, message: err.message, remaining: err.remaining, status: err.status });
      log('error', `Respuesta ${err.status ?? 'ERR'} · ${err.code}`);
      if (err.code === 'ACCOUNT_LOCKED') setLock({ attempts: api.MAX_ATTEMPTS, lockedUntil: err.lockedUntil });
      else setLock(api.getLockState(values.username));
      onLockChange?.();
      setValues((s) => ({ ...s, password: '' }));
      setTouched((t) => ({ ...t, password: false }));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate data-testid="login-form" className="space-y-5" aria-busy={submitting}>
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-moss-500 to-moss-700 text-white shadow-lift">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold">Iniciar sesión</h2>
        <p className="mt-1 text-sm text-moss-600">Accede con una de las cuentas de prueba</p>
      </div>

      {sessionExpired && (
        <Alert tone="warning" icon={TriangleAlert} title="Tu sesión ha expirado" testId="auth-session-expired-alert">
          Por seguridad cerramos tu sesión por inactividad.
        </Alert>
      )}

      {isLocked && (
        <Alert tone="error" icon={ShieldAlert} title="Cuenta bloqueada temporalmente" testId="login-locked-alert">
          Demasiados intentos fallidos. Podrás intentarlo de nuevo en{' '}
          <strong data-testid="login-lock-countdown" className="font-mono">
            {remaining}s
          </strong>
          .
        </Alert>
      )}

      {serverError && !isLocked && (
        <Alert
          tone={serverError.code === 'SERVICE_UNAVAILABLE' || serverError.code === 'SIMULATED_FAILURE' ? 'warning' : 'error'}
          icon={CircleX}
          title={serverError.message}
          testId="login-error-alert"
        >
          {serverError.code === 'INVALID_CREDENTIALS' && (
            <span data-testid="login-attempts-remaining">
              Te quedan <strong>{serverError.remaining}</strong> intento{serverError.remaining === 1 ? '' : 's'} antes del bloqueo.
            </span>
          )}
          {(serverError.code === 'SERVICE_UNAVAILABLE' || serverError.code === 'SIMULATED_FAILURE') && (
            <span>Este error no cuenta como intento fallido. Reintenta.</span>
          )}
        </Alert>
      )}

      <Field label="Usuario" htmlFor="login-username" testId="login-username-input" error={showErr('username')} required>
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-500" />
          <input
            id="login-username"
            autoComplete="username"
            value={values.username}
            onChange={set('username')}
            onBlur={() => setTouched((t) => ({ ...t, username: true }))}
            placeholder="standard_user"
            aria-invalid={!!showErr('username')}
            data-testid="login-username-input"
            className={inputCls(showErr('username'), 'pl-10')}
            disabled={submitting}
          />
        </div>
      </Field>

      <Field
        label="Contraseña"
        htmlFor="login-password"
        testId="login-password-input"
        error={showErr('password')}
        required
        labelExtra={
          <button
            type="button"
            className="text-xs font-semibold text-moss-600 hover:text-moss-900 hover:underline"
            data-testid="forgot-password-link"
            onClick={() => setForgotOpen(true)}
          >
            ¿Olvidaste tu contraseña?
          </button>
        }
      >
        <PasswordInput
          id="login-password"
          value={values.password}
          onChange={set('password')}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          testId="login-password-input"
          error={showErr('password')}
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={submitting}
        />
      </Field>

      <div className="flex items-center justify-between">
        <Checkbox
          id="login-remember"
          checked={values.remember}
          onChange={(c) => setValues((s) => ({ ...s, remember: c }))}
          label="Recordar usuario"
          testId="login-remember-checkbox"
        />
        {lock.attempts > 0 && !isLocked && (
          <span className="badge badge-yellow" data-testid="login-failed-attempts">
            {lock.attempts}/{api.MAX_ATTEMPTS} fallidos
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="btn btn-primary btn-lg w-full"
          disabled={submitting || isLocked}
          data-testid="login-submit-btn"
          data-state={submitting ? 'loading' : isLocked ? 'locked' : 'idle'}
        >
          {submitting ? (
            <>
              <Spinner testId="login-spinner" /> Verificando...
            </>
          ) : isLocked ? (
            <>
              <Lock className="h-4 w-4" /> Bloqueado ({remaining}s)
            </>
          ) : (
            'Iniciar sesión'
          )}
        </button>
        <LocatorHint testId="login-submit-btn" />
      </div>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Forgot password                                                    */
/* ------------------------------------------------------------------ */
function ForgotPasswordModal({ open, onClose }) {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setEmail('');
      setTouched(false);
      setState('idle');
      setError(null);
    }
  }, [open]);

  const err = !email.trim() ? 'El correo es obligatorio' : !isValidEmail(email) ? 'Formato de correo inválido' : null;

  const submit = async (e) => {
    e?.preventDefault();
    setTouched(true);
    if (err) return;
    setState('loading');
    setError(null);
    try {
      await api.requestPasswordReset(email);
      setState('sent');
    } catch (ex) {
      setError(ex.message);
      setState('idle');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Recuperar contraseña"
      description="Te enviaremos un enlace de recuperación."
      testId="forgot-password-modal"
      icon={Mail}
      size="sm"
      footer={
        state === 'sent' ? (
          <button type="button" className="btn btn-primary" onClick={onClose} data-testid="forgot-password-done-btn">
            Entendido
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" onClick={onClose} data-testid="forgot-password-cancel-btn">
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={submit}
              disabled={state === 'loading'}
              data-testid="forgot-password-submit-btn"
            >
              {state === 'loading' && <Spinner />} Enviar enlace
            </button>
          </>
        )
      }
    >
      {state === 'sent' ? (
        <Alert tone="success" icon={CircleCheck} title="Solicitud enviada" testId="forgot-password-success">
          Si <strong>{email}</strong> está registrado, recibirás un correo en los próximos minutos.
        </Alert>
      ) : (
        <form onSubmit={submit} noValidate>
          {error && (
            <Alert tone="error" icon={CircleX} title={error} testId="forgot-password-error" className="mb-4" />
          )}
          <Field label="Correo electrónico" htmlFor="forgot-email" testId="forgot-password-email-input" error={touched ? err : null} required>
            <input
              id="forgot-email"
              type="email"
              data-autofocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              data-testid="forgot-password-email-input"
              className={inputCls(touched && err)}
              placeholder="tu@empresa.com"
            />
          </Field>
        </form>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  OTP / MFA                                                          */
/* ------------------------------------------------------------------ */
export function OtpForm({ challenge, onSuccess, onCancel, log }) {
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [expiresAt, setExpiresAt] = useState(challenge.expiresAt);
  const [resendAt, setResendAt] = useState(challenge.resendAt);
  const refs = useRef([]);
  const expiresIn = useCountdown(expiresAt);
  const resendIn = useCountdown(resendAt);
  const code = digits.join('');

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const setDigit = (i, val) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      setDigits((d) => d.map((x, idx) => (idx === i ? '' : x)));
      return;
    }
    // Soporte de pegado: distribuye varios dígitos.
    setDigits((d) => {
      const next = [...d];
      clean
        .slice(0, 6 - i)
        .split('')
        .forEach((c, k) => {
          next[i + k] = c;
        });
      return next;
    });
    const nextIdx = Math.min(5, i + clean.length);
    refs.current[nextIdx]?.focus();
    setError(null);
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError({ message: 'Ingresa los 6 dígitos del código' });
      return;
    }
    setSubmitting(true);
    setError(null);
    log('info', 'POST /api/mfa/verify');
    try {
      const res = await api.verifyOtp({ challengeId: challenge.challengeId, code });
      log('success', 'OTP verificado');
      onSuccess(res.session);
    } catch (err) {
      log('error', `MFA ${err.code}`);
      if (err.code === 'OTP_LOCKED' || err.code === 'OTP_INVALIDATED') {
        onCancel(err.message);
        return;
      }
      setError({ message: err.message, remaining: err.remaining, code: err.code });
      setDigits(Array(6).fill(''));
      refs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      const res = await api.resendOtp({ challengeId: challenge.challengeId });
      setExpiresAt(res.expiresAt);
      setResendAt(res.resendAt);
      setError(null);
      setDigits(Array(6).fill(''));
      log('info', 'Nuevo OTP enviado');
    } catch (err) {
      setError({ message: err.message });
      if (err.code === 'OTP_INVALIDATED') onCancel(err.message);
    } finally {
      setResending(false);
    }
  };

  const expired = expiresIn === 0;

  return (
    <form onSubmit={submit} className="space-y-5" data-testid="mfa-form" noValidate>
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-info-500 to-moss-700 text-white shadow-lift">
          <Smartphone className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold">Verificación en dos pasos</h2>
        <p className="mt-1 text-sm text-moss-600">
          Enviamos un código de 6 dígitos a <strong>{challenge.maskedPhone}</strong>
        </p>
      </div>

      {error && (
        <Alert tone="error" icon={CircleX} title={error.message} testId="mfa-error-alert">
          {error.remaining != null && (
            <span data-testid="mfa-attempts-remaining">Intentos restantes: {error.remaining}</span>
          )}
        </Alert>
      )}
      {expired && !error && (
        <Alert tone="warning" icon={TriangleAlert} title="El código ha expirado" testId="mfa-expired-alert">
          Solicita un nuevo código para continuar.
        </Alert>
      )}

      <div>
        <div className="mb-2 flex items-center justify-center gap-1.5 text-sm font-medium text-moss-800">
          Código OTP <LocatorHint testId="otp-digit-0" label="primer dígito" />
        </div>
        <div className="flex justify-center gap-2" role="group" aria-label="Código de verificación">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={d}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={6}
              aria-label={`Dígito ${i + 1}`}
              data-testid={`otp-digit-${i}`}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
              disabled={submitting || expired}
              className={cn(
                'h-14 w-12 rounded-xl border bg-white text-center font-mono text-2xl font-bold text-moss-900 shadow-sm transition focus:border-moss-600 focus:outline-none focus:ring-4 focus:ring-moss-600/15 disabled:bg-moss-100',
                error ? 'border-danger-500' : d ? 'border-moss-500' : 'border-moss-300',
              )}
            />
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-moss-600">
          El código expira en{' '}
          <strong className={cn('font-mono', expiresIn <= 10 && 'text-danger-600')} data-testid="otp-expiry-timer">
            {expiresIn}s
          </strong>
        </p>
      </div>

      <button type="submit" className="btn btn-primary btn-lg w-full" disabled={submitting || expired} data-testid="mfa-submit-btn">
        {submitting ? <Spinner /> : <ShieldCheck className="h-4 w-4" />} Verificar código
      </button>

      <div className="flex items-center justify-between text-sm">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onCancel()} data-testid="mfa-cancel-btn">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={resend}
          disabled={resendIn > 0 || resending}
          data-testid="otp-resend-btn"
        >
          {resending ? <Spinner /> : <RefreshCw className="h-3.5 w-3.5" />}
          {resendIn > 0 ? `Reenviar en ${resendIn}s` : 'Reenviar código'}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Cambio forzado de contraseña                                       */
/* ------------------------------------------------------------------ */
export function ChangePasswordForm({ username, onSuccess, onCancel, log }) {
  const [v, setV] = useState({ current: '', next: '', confirm: '' });
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const rules = passwordRules(v.next);
  const strength = passwordStrength(v.next);

  const errors = {};
  if (!v.current) errors.current = 'Ingresa tu contraseña actual';
  if (!v.next) errors.next = 'Ingresa una nueva contraseña';
  else if (!rules.every((r) => r.ok)) errors.next = 'La contraseña no cumple todos los requisitos';
  if (!v.confirm) errors.confirm = 'Confirma la nueva contraseña';
  else if (v.confirm !== v.next) errors.confirm = 'Las contraseñas no coinciden';

  const show = (k) => (touched[k] ? errors[k] : undefined);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ current: true, next: true, confirm: true });
    if (Object.keys(errors).length) return;
    setSubmitting(true);
    setServerError(null);
    log('info', 'POST /api/password/change');
    try {
      const res = await api.changePassword({ username, currentPassword: v.current, newPassword: v.next });
      log('success', 'Contraseña actualizada');
      onSuccess(res.session);
    } catch (err) {
      log('error', `Cambio de contraseña ${err.code}`);
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const bar = { red: 'bg-danger-500', yellow: 'bg-warning-500', blue: 'bg-info-500', green: 'bg-moss-600', gray: 'bg-moss-300' }[strength.tone];

  return (
    <form onSubmit={submit} className="space-y-4" noValidate data-testid="change-password-form">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-warning-500 to-moss-700 text-white shadow-lift">
          <KeyRound className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold">Contraseña caducada</h2>
        <p className="mt-1 text-sm text-moss-600">
          Hola <strong>{username}</strong>, debes definir una nueva contraseña para continuar.
        </p>
      </div>

      {serverError && <Alert tone="error" icon={CircleX} title={serverError} testId="change-password-error-alert" />}

      <Field label="Contraseña actual" htmlFor="cp-current" testId="change-password-current-input" error={show('current')} required>
        <PasswordInput id="cp-current" value={v.current} onChange={set('current')} onBlur={blur('current')} testId="change-password-current-input" error={show('current')} autoComplete="current-password" />
      </Field>
      <Field label="Nueva contraseña" htmlFor="cp-new" testId="change-password-new-input" error={show('next')} required>
        <PasswordInput id="cp-new" value={v.next} onChange={set('next')} onBlur={blur('next')} testId="change-password-new-input" error={show('next')} autoComplete="new-password" />
      </Field>

      <div data-testid="password-strength" data-strength={strength.label}>
        <div className="flex items-center justify-between text-xs">
          <span className="text-moss-600">Fortaleza</span>
          <span className="font-semibold text-moss-800" data-testid="password-strength-label">{strength.label}</span>
        </div>
        <div className="mt-1 grid grid-cols-4 gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={cn('h-1.5 rounded-full transition-colors', i <= strength.score ? bar : 'bg-moss-200')} />
          ))}
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {rules.map((r) => (
            <li
              key={r.id}
              data-testid={`password-rule-${r.id}`}
              data-ok={r.ok}
              className={cn('flex items-center gap-1.5 text-xs', r.ok ? 'text-moss-700' : 'text-moss-500')}
            >
              {r.ok ? <CircleCheck className="h-3.5 w-3.5 text-moss-600" /> : <CircleX className="h-3.5 w-3.5" />}
              {r.label}
            </li>
          ))}
        </ul>
      </div>

      <Field label="Confirmar contraseña" htmlFor="cp-confirm" testId="change-password-confirm-input" error={show('confirm')} required>
        <PasswordInput id="cp-confirm" value={v.confirm} onChange={set('confirm')} onBlur={blur('confirm')} testId="change-password-confirm-input" error={show('confirm')} autoComplete="new-password" />
      </Field>

      <button type="submit" className="btn btn-primary btn-lg w-full" disabled={submitting} data-testid="change-password-submit-btn">
        {submitting && <Spinner />} Actualizar contraseña
      </button>
      <button type="button" className="btn btn-ghost w-full" onClick={onCancel} data-testid="change-password-cancel-btn">
        <LogOut className="h-4 w-4" /> Cancelar y volver
      </button>
    </form>
  );
}
