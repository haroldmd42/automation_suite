import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  Mail,
  ArrowRight,
  Database,
  CheckCircle2,
  Eye,
  EyeOff,
  LogOut,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';
import { useToast } from '../../context/ToastContext';
import { translateAuthError } from '../../services/supabaseClient';
import { Spinner, Alert } from '../../components/ui/Primitives';
import { Field } from '../../components/ui/Field';

import { getRoleHomeRoute } from '../../components/layout/Layout';

export default function RealLoginPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, profile, signIn, signOut, resetPassword, logAudit } = useSupabaseAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Si ya está logueado, permitir ir al portal directo
  if (user) {
    const homeRoute = getRoleHomeRoute(profile?.role);
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12" data-testid="already-logged-in-view">
        <div className="card w-full max-w-md p-8 text-center shadow-lift">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-moss-500 to-moss-800 text-3xl font-bold text-white shadow-lift ring-4 ring-moss-100">
            {(profile?.full_name || user.email || 'U')[0].toUpperCase()}
          </div>
          <span className="badge badge-green mb-2 inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Sesión Activa en Supabase
          </span>
          <h2 className="font-display text-2xl font-bold text-moss-900" data-testid="logged-in-user-title">
            ¡Hola, {profile?.full_name || user.email}!
          </h2>
          <p className="mt-1 text-xs text-moss-600">
            Tu cuenta tiene rol de <strong className="text-moss-900 capitalize">{profile?.role || 'Usuario'}</strong>.
          </p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => navigate(homeRoute)}
              className="btn btn-primary w-full"
              data-testid="go-to-portal-btn"
            >
              <Layers className="h-4 w-4" /> Ir a mi Módulo Principal ({profile?.role?.toUpperCase() || 'PORTAL'})
            </button>
            <button
              type="button"
              onClick={async () => {
                if (logAudit && user) {
                  await logAudit('logout', 'auth.users', { email: user.email, role: profile?.role });
                }
                await signOut();
                toast.info('Sesión cerrada', 'Has cerrado tu sesión.');
              }}
              className="btn btn-secondary w-full"
              data-testid="logout-and-switch-btn"
            >
              <LogOut className="h-4 w-4" /> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    try {
      const authData = await signIn({ email, password });
      await logAudit('login', 'auth.users', { email });
      toast.success('¡Bienvenido!', 'Has iniciado sesión correctamente.');
      const userRole = profile?.role || authData?.user?.user_metadata?.role || 'admin';
      navigate(getRoleHomeRoute(userRole));
    } catch (err) {
      setErrorMessage(translateAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    try {
      await resetPassword(email);
      toast.info('Correo enviado', 'Si el correo existe, recibirás un enlace de recuperación.');
      setMode('login');
    } catch (err) {
      setErrorMessage(translateAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-8 animate-slide-up" data-testid="real-login-page">
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-moss-500 to-moss-800 text-white shadow-lift ring-4 ring-white">
          <Database className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-moss-900 sm:text-3xl">
          Portal Cloud Supabase
        </h1>
        <p className="mt-1 text-sm text-moss-600">
          Autenticación y administración centralizada con PostgreSQL
        </p>
      </div>

      <div className="card relative overflow-hidden p-6 sm:p-8 shadow-lift ring-1 border border-moss-200">
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-moss-200/50 blur-3xl" />

        {/* Tabs de Selección (Solo Login y Recuperar) */}
        <div className="relative mb-6 flex rounded-xl border border-moss-200 bg-moss-100/60 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
            }}
            data-testid="login-tab-btn"
            className={`flex-1 rounded-lg py-2 text-xs sm:text-sm font-semibold transition ${
              mode === 'login' ? 'bg-white text-moss-900 shadow-sm' : 'text-moss-600 hover:text-moss-900'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('forgot');
              setErrorMessage('');
            }}
            data-testid="forgot-tab-btn"
            className={`flex-1 rounded-lg py-2 text-xs sm:text-sm font-semibold transition ${
              mode === 'forgot' ? 'bg-white text-moss-900 shadow-sm' : 'text-moss-600 hover:text-moss-900'
            }`}
          >
            Recuperar Clave
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4">
            <Alert variant="danger" title="Atención">
              {errorMessage}
            </Alert>
          </div>
        )}

        {/* FORMULARIO LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4" data-testid="real-login-form">
            <Field label="Correo Electrónico" id="real-login-email" required>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-400" />
                <input
                  id="real-login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="input pl-10"
                  data-testid="real-login-email-input"
                  autoFocus
                />
              </div>
            </Field>

            <Field label="Contraseña" id="real-login-password" required>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-400" />
                <input
                  id="real-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10 pr-10"
                  data-testid="real-login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-moss-400 hover:text-moss-700"
                  aria-label="Ver u ocultar contraseña"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setErrorMessage('');
                }}
                className="text-xs font-medium text-moss-600 hover:text-moss-900 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary w-full shadow-lift py-3"
                data-testid="real-login-submit-btn"
              >
                {submitting ? (
                  <>
                    <Spinner className="h-4 w-4" /> Conectando a Supabase...
                  </>
                ) : (
                  <>
                    <span>Ingresar al Portal Cloud</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {/* Aviso de Registro Privado */}
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-moss-200 bg-moss-50/70 p-3 text-xs text-moss-700">
              <ShieldAlert className="h-4 w-4 shrink-0 text-moss-600" />
              <span>
                <strong>Acceso controlado:</strong> Las nuevas cuentas solo pueden ser creadas por un Administrador desde el módulo interno de Usuarios.
              </span>
            </div>
          </form>
        )}

        {/* FORMULARIO RECUPERACIÓN */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4" data-testid="real-forgot-form">
            <Field label="Correo registrado" id="real-forgot-email" required>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-400" />
                <input
                  id="real-forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="input pl-10"
                  data-testid="real-forgot-email-input"
                  autoFocus
                />
              </div>
            </Field>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary w-full py-3"
                data-testid="real-forgot-submit-btn"
              >
                {submitting ? <Spinner className="h-4 w-4" /> : 'Enviar Correo de Restablecimiento'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                }}
                className="btn btn-ghost w-full text-xs text-moss-600"
              >
                ← Volver a Iniciar Sesión
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-6 text-center">
        <Link to="/" className="text-xs font-semibold text-moss-600 hover:text-moss-900 hover:underline">
          ← Volver a la Suite Principal
        </Link>
      </div>
    </div>
  );
}
