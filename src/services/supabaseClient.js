import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://uhlxutrepaoaauipainz.supabase.co';
const defaultKey = 'sb_publishable_XebZONLtJJfbkFRIgIoTXw_oI7Q3PN4';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultKey;

const supabaseUrl = rawUrl.trim();
const supabaseAnonKey = rawKey.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('tu-proyecto') &&
  supabaseUrl.startsWith('https://')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Crea un cliente aislado y efímero de Supabase sin persistencia en localStorage ni listeners.
 * Permite que un usuario con privilegios (como Administrador) registre nuevos usuarios con `signUp`
 * sin que la sesión activa del administrador sea reemplazada por la del nuevo usuario.
 */
export function createIsolatedSupabaseClient() {
  if (!isSupabaseConfigured) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    },
  });
}

/**
 * Traduce mensajes de error técnicos de Supabase Auth y PostgreSQL a español claro y amigable
 */
export function translateAuthError(err) {
  if (!err) return 'Ha ocurrido un error inesperado. Por favor intenta de nuevo.';
  const message = typeof err === 'string' ? err : err.message || '';
  const lower = message.toLowerCase().trim();

  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Credenciales de acceso inválidas. Por favor verifica tu correo y contraseña.';
  }
  if (lower.includes('email not confirmed')) {
    return 'El correo electrónico no ha sido confirmado aún. Por favor revisa tu bandeja de entrada o desactiva la confirmación obligatoria en Supabase.';
  }
  if (lower.includes('user already registered') || lower.includes('already registered') || lower.includes('user already exists')) {
    return 'El correo electrónico ya se encuentra registrado en el sistema.';
  }
  if (lower.includes('password should be at least')) {
    return 'La contraseña debe contener al menos 6 caracteres.';
  }
  if (lower.includes('user not found')) {
    return 'No se encontró ninguna cuenta asociada a este correo electrónico.';
  }
  if (lower.includes('email rate limit exceeded') || lower.includes('rate limit')) {
    return 'Has superado el límite de intentos. Por favor espera unos minutos antes de volver a intentar.';
  }
  if (lower.includes('for security purposes, you can only request this once') || lower.includes('seconds')) {
    return 'Por motivos de seguridad, solo puedes realizar esta solicitud una vez cada 60 segundos.';
  }
  if (lower.includes('token has expired') || lower.includes('token is invalid') || lower.includes('otp expired')) {
    return 'El enlace o código de acceso ha expirado o no es válido.';
  }
  if (lower.includes('signup requires a valid password')) {
    return 'Debes ingresar una contraseña válida para el registro.';
  }
  if (lower.includes('to signup, please provide your email') || lower.includes('valid email')) {
    return 'Por favor ingresa un correo electrónico válido.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network request failed')) {
    return 'Error de conexión con el servidor. Verifica tu conexión a internet o la configuración del proyecto.';
  }
  if (lower.includes('duplicate key value violates unique constraint') || lower.includes('profiles_pkey')) {
    return 'Ya existe un usuario con esa identificación o correo en el sistema.';
  }
  if (lower.includes('new password should be different')) {
    return 'La nueva contraseña debe ser diferente a la contraseña anterior.';
  }
  if (lower.includes('database error saving new user')) {
    return 'Error de base de datos al guardar el usuario en Supabase.';
  }

  return message || 'Error al procesar la solicitud.';
}

