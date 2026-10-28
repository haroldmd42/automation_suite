import { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Mail,
  Lock,
  User,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Database,
  ExternalLink,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  UserCheck,
  Shield,
  Building,
} from 'lucide-react';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';
import { useToast } from '../../context/ToastContext';
import { translateAuthError } from '../../services/supabaseClient';
import { Spinner, Alert } from '../../components/ui/Primitives';
import { Field } from '../../components/ui/Field';
import CustomSelect from '../../components/ui/CustomSelect';
import LocatorHint from '../../components/qa/LocatorHint';
import { cn } from '../../utils/format';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador (Admin)' },
  { value: 'qa_lead', label: 'Líder de Calidad (QA Lead)' },
  { value: 'developer', label: 'Desarrollador Senior' },
  { value: 'auditor', label: 'Auditor de Seguridad' },
  { value: 'support', label: 'Soporte L2' },
];

const DEPT_OPTIONS = [
  { value: 'qa', label: 'Aseguramiento de Calidad (QA)' },
  { value: 'engineering', label: 'Ingeniería de Software' },
  { value: 'cloud_infra', label: 'Infraestructura Cloud' },
  { value: 'security', label: 'Ciberseguridad' },
];

export default function SupabaseAuthSection() {
  const { isConfigured, session, user, profile, loading, signIn, signUp, signOut, resetPassword, updateProfile, logAudit } =
    useSupabaseAuth();
  const toast = useToast();

  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('qa_lead');
  const [department, setDepartment] = useState('qa');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedToken, setCopiedToken] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  if (!isConfigured) {
    return (
      <div className="rounded-2xl border border-warning-200 bg-warning-50/50 p-6 shadow-soft" data-testid="supabase-not-configured">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning-500 text-white shadow-soft">
            <Database className="h-6 w-6" />
          </div>
          <div className="space-y-3">
            <h3 className="font-display text-lg font-bold text-moss-900">Configura tus credenciales de Supabase</h3>
            <p className="text-sm text-moss-700">
              Para habilitar la autenticación real y la base de datos PostgreSQL en la nube, agrega tus variables de entorno en el archivo{' '}
              <code className="rounded bg-white px-2 py-0.5 font-mono text-xs font-bold text-moss-900 ring-1 ring-moss-300">.env</code>{' '}
              de la raíz del proyecto:
            </p>

            <div className="rounded-xl bg-moss-950 p-4 font-mono text-xs text-moss-200">
              <p className="text-moss-400"># .env</p>
              <p>VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co</p>
              <p>VITE_SUPABASE_ANON_KEY=eyJhbGciOi...</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-moss-600">
              <span className="font-semibold text-moss-900">¿Dónde encontrarlas?</span>
              <span>En tu dashboard de Supabase:</span>
              <span className="badge badge-gray font-mono">Project Settings → API</span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-moss-600 hover:text-moss-900 hover:underline"
              >
                Abrir Supabase <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-moss-600">
        <Spinner className="h-8 w-8 text-moss-600" />
        <p className="text-sm font-medium">Verificando sesión en Supabase Cloud...</p>
      </div>
    );
  }

  // --- VISTA DE USUARIO AUTENTICADO ---
  if (user) {
    const handleLogout = async () => {
      try {
        await logAudit('logout', 'auth.users', { email: user.email });
        await signOut();
        toast.info('Sesión cerrada', 'Has cerrado sesión correctamente de Supabase.');
      } catch (err) {
        toast.error('Error al cerrar sesión', err.message);
      }
    };

    const handleCopyToken = () => {
      if (!session?.access_token) return;
      navigator.clipboard.writeText(session.access_token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
      toast.success('Token copiado', 'JWT copiado al portapapeles');
    };

    const handleSaveProfile = async (e) => {
      e.preventDefault();
      try {
        setSubmitting(true);
        await updateProfile({ full_name: editName });
        await logAudit('update_profile', 'profiles', { full_name: editName });
        toast.success('Perfil actualizado', 'Nombre actualizado con éxito en PostgreSQL.');
        setIsEditing(false);
      } catch (err) {
        toast.error('Error', err.message);
      } finally {
        setSubmitting(false);
      }
    };

    const initials = (profile?.full_name || user.email || 'U')
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <div className="space-y-6 animate-slide-up" data-testid="supabase-authenticated-view">
        {/* Banner de Estado Cloud */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-moss-200 bg-gradient-to-r from-moss-50 via-white to-moss-50 p-5 shadow-soft">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-moss-600 text-white shadow-soft">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-moss-900">Supabase Cloud PostgreSQL</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-moss-100 px-2 py-0.5 text-xs font-semibold text-moss-800">
                  <span className="h-2 w-2 rounded-full bg-moss-500 animate-pulse" /> Conectado en vivo
                </span>
              </div>
              <p className="text-xs text-moss-600">Sesión persistente y autenticación real con JWT</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            data-testid="supabase-logout-btn"
            className="btn btn-secondary btn-sm"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>

        {/* Ficha de Perfil Real */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-moss-200 bg-white p-6 shadow-soft md:col-span-1 text-center">
            <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-moss-500 to-moss-800 text-3xl font-bold text-white shadow-lift ring-4 ring-moss-100">
              {initials}
              <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-moss-500 ring-2 ring-white" title="Activo" />
            </div>

            <h3 className="font-display text-xl font-bold text-moss-900" data-testid="supabase-user-name">
              {profile?.full_name || 'Usuario'}
            </h3>
            <p className="text-xs text-moss-600" data-testid="supabase-user-email">
              {user.email}
            </p>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <span className="badge badge-green" data-testid="supabase-user-role">
                <ShieldCheck className="h-3.5 w-3.5" />
                {ROLE_OPTIONS.find((r) => r.value === profile?.role)?.label || profile?.role || 'QA Lead'}
              </span>
              <span className="badge badge-blue" data-testid="supabase-user-dept">
                <Building className="h-3.5 w-3.5" />
                {DEPT_OPTIONS.find((d) => d.value === profile?.department)?.label || profile?.department || 'QA'}
              </span>
            </div>

            {!isEditing ? (
              <button
                type="button"
                onClick={() => {
                  setEditName(profile?.full_name || '');
                  setIsEditing(true);
                }}
                className="btn btn-secondary btn-sm mt-4 w-full"
                data-testid="supabase-edit-profile-btn"
              >
                Editar Perfil
              </button>
            ) : (
              <form onSubmit={handleSaveProfile} className="mt-4 space-y-2 text-left">
                <Field label="Nombre Completo" id="edit-full-name">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="input input-sm w-full"
                    data-testid="supabase-edit-name-input"
                  />
                </Field>
                <div className="flex gap-2">
                  <button type="submit" disabled={submitting} className="btn btn-primary btn-sm flex-1">
                    {submitting ? <Spinner className="h-4 w-4" /> : 'Guardar'}
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary btn-sm">
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Detalles Técnicos de la Sesión para QA y Pruebas */}
          <div className="space-y-4 md:col-span-2">
            <div className="rounded-2xl border border-moss-200 bg-white p-5 shadow-soft">
              <h4 className="flex items-center gap-2 font-display text-sm font-bold text-moss-900">
                <KeyRound className="h-4 w-4 text-moss-600" />
                Metadatos de Autenticación de Supabase
              </h4>
              <p className="mt-0.5 text-xs text-moss-600">
                Valores reales en base de datos para aserciones de Selenium / Playwright / Cypress.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-xl border border-moss-200/80 bg-moss-50/60 p-3">
                  <span className="font-semibold text-moss-600">Supabase User UID</span>
                  <p className="mt-1 font-mono text-[11px] font-bold text-moss-900 break-all" data-testid="supabase-uid">
                    {user.id}
                  </p>
                </div>

                <div className="rounded-xl border border-moss-200/80 bg-moss-50/60 p-3">
                  <span className="font-semibold text-moss-600">Último Inicio de Sesión</span>
                  <p className="mt-1 font-mono text-[11px] font-bold text-moss-900" data-testid="supabase-last-sign-in">
                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Reciente'}
                  </p>
                </div>
              </div>

              {/* JWT Token */}
              <div className="mt-4 rounded-xl bg-moss-950 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-moss-400">
                    JWT Access Token (Real)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="inline-flex items-center gap-1 text-xs text-moss-300 hover:text-white"
                    title="Copiar token JWT"
                    data-testid="supabase-copy-token-btn"
                  >
                    {copiedToken ? <Check className="h-3.5 w-3.5 text-moss-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedToken ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <code
                  className="mt-2 block max-h-24 overflow-y-auto break-all font-mono text-[11px] text-moss-200 select-all"
                  data-testid="supabase-jwt-token"
                >
                  {session?.access_token || 'Sin token'}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA DE FORMULARIOS (LOGIN / REGISTRO / RESET) ---
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    try {
      await signIn({ email, password });
      toast.success('¡Bienvenido!', 'Sesión iniciada con éxito en Supabase.');
    } catch (err) {
      setErrorMessage(translateAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    try {
      await signUp({
        email,
        password,
        fullName,
        role,
        department,
      });
      toast.success(
        'Cuenta creada',
        'Tu usuario y perfil fueron guardados en Supabase. Si tienes confirmación de correo habilitada, verifica tu inbox.'
      );
      setTab('login');
    } catch (err) {
      setErrorMessage(translateAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    try {
      await resetPassword(email);
      toast.info('Correo enviado', 'Revisa tu bandeja de entrada para restablecer tu contraseña.');
      setTab('login');
    } catch (err) {
      setErrorMessage(translateAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="supabase-auth-section">
      {/* Selector de Pestaña */}
      <div className="flex border-b border-moss-200">
        <button
          type="button"
          onClick={() => {
            setTab('login');
            setErrorMessage('');
          }}
          data-testid="supabase-tab-login"
          className={cn(
            'flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition',
            tab === 'login'
              ? 'border-moss-600 text-moss-900 bg-moss-50/50'
              : 'border-transparent text-moss-600 hover:text-moss-900'
          )}
        >
          <Lock className="h-4 w-4" /> Iniciar Sesión Real
        </button>

        <button
          type="button"
          onClick={() => {
            setTab('register');
            setErrorMessage('');
          }}
          data-testid="supabase-tab-register"
          className={cn(
            'flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition',
            tab === 'register'
              ? 'border-moss-600 text-moss-900 bg-moss-50/50'
              : 'border-transparent text-moss-600 hover:text-moss-900'
          )}
        >
          <UserCheck className="h-4 w-4" /> Crear Cuenta (Sign Up)
        </button>

        <button
          type="button"
          onClick={() => {
            setTab('forgot');
            setErrorMessage('');
          }}
          data-testid="supabase-tab-forgot"
          className={cn(
            'flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition',
            tab === 'forgot'
              ? 'border-moss-600 text-moss-900 bg-moss-50/50'
              : 'border-transparent text-moss-600 hover:text-moss-900'
          )}
        >
          <KeyRound className="h-4 w-4" /> Recuperar Clave
        </button>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="Error de autenticación">
          {errorMessage}
        </Alert>
      )}

      {/* Formulario de Login */}
      {tab === 'login' && (
        <form onSubmit={handleLoginSubmit} className="space-y-4 max-w-lg" data-testid="supabase-login-form">
          <Field label="Correo electrónico" id="supabase-login-email" required>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-400" />
              <input
                id="supabase-login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@empresa.com"
                className="input pl-10"
                data-testid="supabase-login-email-input"
              />
            </div>
          </Field>

          <Field label="Contraseña" id="supabase-login-password" required>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-400" />
              <input
                id="supabase-login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input pl-10"
                data-testid="supabase-login-password-input"
              />
            </div>
          </Field>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full"
              data-testid="supabase-login-submit-btn"
            >
              {submitting ? (
                <>
                  <Spinner className="h-4 w-4" /> Conectando a Supabase...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" /> Iniciar Sesión en la Nube
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Formulario de Registro (Sign Up) */}
      {tab === 'register' && (
        <form onSubmit={handleRegisterSubmit} className="space-y-4 max-w-lg" data-testid="supabase-register-form">
          <Field label="Nombre Completo" id="supabase-reg-fullname" required>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-400" />
              <input
                id="supabase-reg-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Carlos Ruiz"
                className="input pl-10"
                data-testid="supabase-reg-name-input"
              />
            </div>
          </Field>

          <Field label="Correo electrónico" id="supabase-reg-email" required>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-400" />
              <input
                id="supabase-reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="carlos.ruiz@empresa.com"
                className="input pl-10"
                data-testid="supabase-reg-email-input"
              />
            </div>
          </Field>

          <Field label="Contraseña" id="supabase-reg-password" required hint="Mínimo 6 caracteres recomendados">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-400" />
              <input
                id="supabase-reg-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input pl-10"
                data-testid="supabase-reg-password-input"
              />
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="supabase-reg-role" className="mb-1 block text-xs font-semibold text-moss-700">
                Rol
              </label>
              <CustomSelect
                id="supabase-reg-role"
                testId="supabase-reg-role-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                options={ROLE_OPTIONS}
              />
            </div>

            <div>
              <label htmlFor="supabase-reg-dept" className="mb-1 block text-xs font-semibold text-moss-700">
                Departamento
              </label>
              <CustomSelect
                id="supabase-reg-dept"
                testId="supabase-reg-dept-select"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                options={DEPT_OPTIONS}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full"
              data-testid="supabase-register-submit-btn"
            >
              {submitting ? (
                <>
                  <Spinner className="h-4 w-4" /> Registrando en Supabase...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Registrar Cuenta y Perfil
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Formulario de Recuperación */}
      {tab === 'forgot' && (
        <form onSubmit={handleResetSubmit} className="space-y-4 max-w-lg" data-testid="supabase-forgot-form">
          <Field label="Correo para restablecer" id="supabase-reset-email" required>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-400" />
              <input
                id="supabase-reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-correo@empresa.com"
                className="input pl-10"
                data-testid="supabase-reset-email-input"
              />
            </div>
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full"
            data-testid="supabase-reset-submit-btn"
          >
            {submitting ? <Spinner className="h-4 w-4" /> : 'Enviar enlace de restablecimiento'}
          </button>
        </form>
      )}
    </div>
  );
}
