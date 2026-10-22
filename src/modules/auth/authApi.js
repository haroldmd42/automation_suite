import { NetworkError, simulateRequest } from '../../services/network';
import { USERNAME_RE, passwordRules } from '../../utils/validators';

export const MAX_ATTEMPTS = 3;
export const LOCK_SECONDS = 30;
export const OTP_CODE = '246810';
export const OTP_TTL_SECONDS = 60;
export const OTP_RESEND_COOLDOWN = 20;
export const OTP_MAX_ATTEMPTS = 3;
export const SESSION_SECONDS = 120;
export const SESSION_WARNING_SECONDS = 20;

export const TEST_USERS = [
  {
    username: 'standard_user',
    password: 'Secret@123',
    name: 'Ana Torres',
    role: 'QA Engineer',
    behavior: 'Login exitoso directo',
    tone: 'green',
  },
  {
    username: 'mfa_user',
    password: 'Secret@123',
    name: 'Bruno Díaz',
    role: 'Security Lead',
    behavior: `Requiere OTP (${OTP_CODE}), expira en ${OTP_TTL_SECONDS} s`,
    mfa: true,
    tone: 'blue',
  },
  {
    username: 'expired_user',
    password: 'Expired@123',
    name: 'Carla Méndez',
    role: 'Analyst',
    behavior: 'Contraseña caducada → cambio obligatorio',
    expired: true,
    tone: 'yellow',
  },
  {
    username: 'locked_user',
    password: 'Secret@123',
    name: 'Diego Ruiz',
    role: 'Contractor',
    behavior: 'Cuenta deshabilitada por el administrador',
    disabled: true,
    tone: 'red',
  },
  {
    username: 'unstable_user',
    password: 'Secret@123',
    name: 'Elena Paz',
    role: 'Developer',
    behavior: 'Error 503 en intentos impares (no penaliza)',
    unstable: true,
    tone: 'gray',
  },
];

const ATTEMPTS_KEY = 'qa_auth_attempts';
const OVERRIDES_KEY = 'qa_auth_overrides';

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalize(username) {
  return String(username || '').trim().toLowerCase();
}

function findUser(username) {
  const u = TEST_USERS.find((x) => x.username === normalize(username));
  if (!u) return null;
  const overrides = read(OVERRIDES_KEY)[u.username] || {};
  return { ...u, ...overrides };
}

/** Estado de bloqueo (lectura síncrona; limpia bloqueos vencidos). */
export function getLockState(username) {
  const key = normalize(username);
  if (!key) return { attempts: 0, lockedUntil: null };
  const all = read(ATTEMPTS_KEY);
  const entry = all[key];
  if (!entry) return { attempts: 0, lockedUntil: null };
  if (entry.lockedUntil && entry.lockedUntil <= Date.now()) {
    delete all[key];
    write(ATTEMPTS_KEY, all);
    return { attempts: 0, lockedUntil: null };
  }
  return { attempts: entry.attempts || 0, lockedUntil: entry.lockedUntil || null };
}

export function getAllLockStates() {
  const all = read(ATTEMPTS_KEY);
  return Object.keys(all).map((k) => ({ username: k, ...getLockState(k) })).filter((x) => x.attempts > 0 || x.lockedUntil);
}

function registerFailure(username) {
  const key = normalize(username);
  const all = read(ATTEMPTS_KEY);
  const entry = all[key] || { attempts: 0, lockedUntil: null };
  entry.attempts += 1;
  if (entry.attempts >= MAX_ATTEMPTS) entry.lockedUntil = Date.now() + LOCK_SECONDS * 1000;
  all[key] = entry;
  write(ATTEMPTS_KEY, all);
  return entry;
}

function clearFailures(username) {
  const all = read(ATTEMPTS_KEY);
  delete all[normalize(username)];
  write(ATTEMPTS_KEY, all);
}

export function resetAuthData() {
  localStorage.removeItem(ATTEMPTS_KEY);
  localStorage.removeItem(OVERRIDES_KEY);
  unstableCounter = 0;
  challenges.clear();
}

let unstableCounter = 0;
const challenges = new Map();

function fakeToken(username) {
  const payload = btoa(JSON.stringify({ sub: username, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS }));
  return `eyJhbGciOiJIUzI1NiJ9.${payload.replace(/=+$/, '')}.${Math.random().toString(36).slice(2, 12)}`;
}

function createSession(user) {
  return {
    user: { username: user.username, name: user.name, role: user.role },
    token: fakeToken(user.username),
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_SECONDS * 1000,
  };
}

/**
 * Login. Reglas:
 * - El usuario se normaliza (trim + minúsculas); la contraseña es sensible a mayúsculas.
 * - Usuarios inexistentes también acumulan intentos (evita enumeración).
 * - 3 fallos => bloqueo de 30 s. Errores 503 no cuentan como fallo.
 */
export function login({ username, password }) {
  return simulateRequest(() => {
    const uname = normalize(username);
    if (!uname || !password) throw new NetworkError('Usuario y contraseña son obligatorios', 400, 'VALIDATION');
    if (!USERNAME_RE.test(uname)) throw new NetworkError('Formato de usuario inválido', 400, 'VALIDATION');

    const lock = getLockState(uname);
    if (lock.lockedUntil) {
      throw new NetworkError('Cuenta bloqueada temporalmente por múltiples intentos fallidos', 423, 'ACCOUNT_LOCKED', {
        lockedUntil: lock.lockedUntil,
      });
    }

    const user = findUser(uname);

    if (user?.unstable) {
      unstableCounter += 1;
      if (unstableCounter % 2 === 1) {
        throw new NetworkError('Servicio no disponible. Intenta de nuevo.', 503, 'SERVICE_UNAVAILABLE');
      }
    }

    if (!user || user.password !== password) {
      const entry = registerFailure(uname);
      if (entry.lockedUntil) {
        throw new NetworkError(
          `Demasiados intentos fallidos. Cuenta bloqueada por ${LOCK_SECONDS} segundos.`,
          423,
          'ACCOUNT_LOCKED',
          { lockedUntil: entry.lockedUntil },
        );
      }
      throw new NetworkError('Usuario o contraseña incorrectos', 401, 'INVALID_CREDENTIALS', {
        remaining: MAX_ATTEMPTS - entry.attempts,
      });
    }

    if (user.disabled) {
      throw new NetworkError('Esta cuenta ha sido deshabilitada. Contacta al administrador.', 403, 'ACCOUNT_DISABLED');
    }

    clearFailures(uname);

    if (user.mfa) {
      const challengeId = `ch_${Math.random().toString(36).slice(2, 10)}`;
      challenges.set(challengeId, {
        username: uname,
        expiresAt: Date.now() + OTP_TTL_SECONDS * 1000,
        attemptsLeft: OTP_MAX_ATTEMPTS,
        resendAt: Date.now() + OTP_RESEND_COOLDOWN * 1000,
      });
      return {
        status: 'MFA_REQUIRED',
        challengeId,
        expiresAt: challenges.get(challengeId).expiresAt,
        resendAt: challenges.get(challengeId).resendAt,
        maskedPhone: '+52 ••• ••• 4821',
      };
    }

    if (user.expired) {
      return { status: 'PASSWORD_EXPIRED', username: uname };
    }

    return { status: 'OK', session: createSession(user) };
  });
}

export function verifyOtp({ challengeId, code }) {
  return simulateRequest(() => {
    const ch = challenges.get(challengeId);
    if (!ch) throw new NetworkError('El desafío ya no es válido. Inicia sesión de nuevo.', 410, 'OTP_INVALIDATED');
    if (Date.now() > ch.expiresAt) {
      throw new NetworkError('El código ha expirado. Solicita uno nuevo.', 410, 'OTP_EXPIRED');
    }
    if (!/^\d{6}$/.test(code || '')) throw new NetworkError('El código debe tener 6 dígitos', 400, 'VALIDATION');
    if (code !== OTP_CODE) {
      ch.attemptsLeft -= 1;
      if (ch.attemptsLeft <= 0) {
        challenges.delete(challengeId);
        throw new NetworkError('Demasiados códigos incorrectos. Vuelve a iniciar sesión.', 429, 'OTP_LOCKED');
      }
      throw new NetworkError('Código incorrecto', 401, 'OTP_INVALID', { remaining: ch.attemptsLeft });
    }
    challenges.delete(challengeId);
    return { status: 'OK', session: createSession(findUser(ch.username)) };
  });
}

export function resendOtp({ challengeId }) {
  return simulateRequest(
    () => {
      const ch = challenges.get(challengeId);
      if (!ch) throw new NetworkError('El desafío ya no es válido.', 410, 'OTP_INVALIDATED');
      if (Date.now() < ch.resendAt) {
        throw new NetworkError('Espera antes de solicitar otro código', 429, 'RESEND_COOLDOWN', { resendAt: ch.resendAt });
      }
      ch.expiresAt = Date.now() + OTP_TTL_SECONDS * 1000;
      ch.resendAt = Date.now() + OTP_RESEND_COOLDOWN * 1000;
      ch.attemptsLeft = OTP_MAX_ATTEMPTS;
      return { expiresAt: ch.expiresAt, resendAt: ch.resendAt };
    },
    { canFail: false },
  );
}

export function changePassword({ username, currentPassword, newPassword }) {
  return simulateRequest(() => {
    const user = findUser(username);
    if (!user) throw new NetworkError('Usuario no encontrado', 404, 'NOT_FOUND');
    if (user.password !== currentPassword) {
      throw new NetworkError('La contraseña actual es incorrecta', 401, 'INVALID_CURRENT_PASSWORD');
    }
    if (newPassword === currentPassword) {
      throw new NetworkError('La nueva contraseña no puede ser igual a la anterior', 422, 'PASSWORD_REUSED');
    }
    if (newPassword.toLowerCase().includes(user.username.split('_')[0])) {
      throw new NetworkError('La contraseña no puede contener tu nombre de usuario', 422, 'PASSWORD_CONTAINS_USERNAME');
    }
    if (!passwordRules(newPassword).every((r) => r.ok)) {
      throw new NetworkError('La contraseña no cumple la política de seguridad', 422, 'WEAK_PASSWORD');
    }
    const overrides = read(OVERRIDES_KEY);
    overrides[user.username] = { password: newPassword, expired: false };
    write(OVERRIDES_KEY, overrides);
    return { status: 'OK', session: createSession({ ...user, password: newPassword }) };
  });
}

export function requestPasswordReset(email) {
  // Respuesta genérica (no revela si el correo existe).
  return simulateRequest(() => ({ status: 'SENT', email }));
}
