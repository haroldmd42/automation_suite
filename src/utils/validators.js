// Validadores reutilizables. Todos son funciones puras para facilitar
// pruebas unitarias y reutilización entre módulos.

export const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
export const NAME_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/;

export function isValidEmail(v) {
  return EMAIL_RE.test(String(v).trim());
}

export function onlyDigits(v) {
  return String(v ?? '').replace(/\D/g, '');
}

/** Algoritmo de Luhn para números de tarjeta. */
export function luhnCheck(number) {
  const digits = onlyDigits(number);
  if (digits.length < 12) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function detectCardType(number) {
  const d = onlyDigits(number);
  if (/^3[47]/.test(d)) return { type: 'amex', label: 'American Express', length: 15, cvv: 4, groups: [4, 6, 5] };
  if (/^4/.test(d)) return { type: 'visa', label: 'Visa', length: 16, cvv: 3, groups: [4, 4, 4, 4] };
  if (/^(5[1-5]|2(2[2-9][1-9]|2[3-9]\d|[3-6]\d\d|7[01]\d|720))/.test(d))
    return { type: 'mastercard', label: 'Mastercard', length: 16, cvv: 3, groups: [4, 4, 4, 4] };
  if (/^6(011|5)/.test(d)) return { type: 'discover', label: 'Discover', length: 16, cvv: 3, groups: [4, 4, 4, 4] };
  return { type: 'unknown', label: 'Desconocida', length: 16, cvv: 3, groups: [4, 4, 4, 4] };
}

export function formatCardNumber(value) {
  const info = detectCardType(value);
  const d = onlyDigits(value).slice(0, info.length);
  const parts = [];
  let i = 0;
  for (const g of info.groups) {
    if (i >= d.length) break;
    parts.push(d.slice(i, i + g));
    i += g;
  }
  return parts.join(' ');
}

export function formatExpiry(value) {
  const d = onlyDigits(value).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

/** Valida MM/YY: mes 01-12, no expirada y no más de 10 años en el futuro. */
export function validateExpiry(value, now = new Date()) {
  const m = /^(\d{2})\/(\d{2})$/.exec(value || '');
  if (!m) return 'Formato inválido (MM/AA)';
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return 'Mes inválido (01-12)';
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;
  if (year < curY || (year === curY && month < curM)) return 'La tarjeta está expirada';
  if (year > curY + 10) return 'Fecha demasiado lejana (máx. 10 años)';
  return null;
}

export const POSTAL_RULES = {
  US: { re: /^\d{5}(-\d{4})?$/, hint: '12345 o 12345-6789' },
  MX: { re: /^\d{5}$/, hint: '5 dígitos' },
  ES: { re: /^(0[1-9]|[1-4]\d|5[0-2])\d{3}$/, hint: '5 dígitos (01000-52999)' },
  CO: { re: /^\d{6}$/, hint: '6 dígitos' },
};

export const PHONE_RULES = {
  US: { digits: 10, prefix: '+1' },
  MX: { digits: 10, prefix: '+52' },
  ES: { digits: 9, prefix: '+34' },
  CO: { digits: 10, prefix: '+57' },
};

/** Reglas de contraseña segura. Devuelve lista de reglas con su estado. */
export function passwordRules(pw = '') {
  return [
    { id: 'length', label: 'Mínimo 8 caracteres', ok: pw.length >= 8 },
    { id: 'upper', label: 'Una letra mayúscula', ok: /[A-Z]/.test(pw) },
    { id: 'lower', label: 'Una letra minúscula', ok: /[a-z]/.test(pw) },
    { id: 'number', label: 'Un número', ok: /\d/.test(pw) },
    { id: 'special', label: 'Un carácter especial (!@#$%...)', ok: /[^A-Za-z0-9]/.test(pw) },
    { id: 'spaces', label: 'Sin espacios', ok: pw.length > 0 && !/\s/.test(pw) },
  ];
}

export function passwordStrength(pw = '') {
  const passed = passwordRules(pw).filter((r) => r.ok).length;
  if (!pw) return { score: 0, label: 'Vacía', tone: 'gray' };
  if (passed <= 2) return { score: 1, label: 'Débil', tone: 'red' };
  if (passed <= 4) return { score: 2, label: 'Media', tone: 'yellow' };
  if (passed === 5) return { score: 3, label: 'Buena', tone: 'blue' };
  return { score: 4, label: 'Fuerte', tone: 'green' };
}

/** Edad en años completos a partir de una fecha. */
export function ageFrom(date, now = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  let age = now.getFullYear() - date.getFullYear();
  const m = now.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < date.getDate())) age -= 1;
  return age;
}

/** Parsea DD/MM/AAAA estricto (rechaza 31/02, 29/02 en años no bisiestos, etc.). */
export function parseStrictDate(str) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str || '');
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}
