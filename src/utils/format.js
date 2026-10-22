const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Formatea centavos (enteros) a moneda. Trabajar en centavos evita errores de punto flotante. */
export function formatCents(cents) {
  return currencyFmt.format((cents || 0) / 100);
}

export function formatMoney(amount) {
  return currencyFmt.format(amount || 0);
}

export function cn(...classes) {
  return classes.flat().filter(Boolean).join(' ');
}

export function pad(n, len = 2) {
  return String(n).padStart(len, '0');
}

export function toISODate(date) {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromISODate(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || '');
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function formatDateES(date) {
  if (!date) return '';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatTime(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isSameDay(a, b) {
  return (
    !!a &&
    !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function diffDays(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
}

/** PRNG determinista (mulberry32) para generar datasets reproducibles. */
export function seededRandom(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
