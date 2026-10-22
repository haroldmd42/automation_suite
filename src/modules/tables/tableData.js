import { seededRandom, pad } from '../../utils/format';

/**
 * Genera un conjunto determinista de 120 transacciones para pruebas avanzadas de Data Tables.
 */
const FIRST_NAMES = [
  'Carlos', 'Sofía', 'Alejandro', 'Valentina', 'Mateo', 'Camila', 'Santiago', 'Lucía',
  'Daniel', 'Mariana', 'Leonardo', 'Gabriela', 'Sebastián', 'Isabella', 'Nicolás', 'Elena',
];

const LAST_NAMES = [
  'Hernández', 'García', 'Martínez', 'López', 'González', 'Rodríguez', 'Pérez', 'Sánchez',
  'Ramírez', 'Flores', 'Gómez', 'Díaz', 'Morales', 'Vásquez', 'Castillo', 'Torres',
];

const DOMAINS = ['gmail.com', 'empresa.io', 'techcorp.net', 'consulting.org', 'fintech.co'];
const STATUSES = ['completed', 'pending', 'cancelled', 'review'];
const METHODS = ['Tarjeta Visa', 'Mastercard', 'SPEI / Transferencia', 'PayPal', 'Cripto / USDT'];

export function generateTransactions(count = 120) {
  const rand = seededRandom(42891);
  const items = [];

  for (let i = 1; i <= count; i++) {
    const fn = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
    const ln = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
    const domain = DOMAINS[Math.floor(rand() * DOMAINS.length)];
    const customer = `${fn} ${ln}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@${domain}`;

    // Fecha en 2026 (entre enero y octubre)
    const month = Math.floor(rand() * 10) + 1;
    const day = Math.floor(rand() * 28) + 1;
    const hour = Math.floor(rand() * 24);
    const min = Math.floor(rand() * 60);
    const dateStr = `2026-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(min)}:00Z`;

    const status = STATUSES[Math.floor(rand() * STATUSES.length)];
    const paymentMethod = METHODS[Math.floor(rand() * METHODS.length)];

    // Monto entre $15.00 y $3,500.00 en centavos
    const amountCents = Math.floor(rand() * 348500) + 1500;

    items.push({
      id: `TXN-${10000 + i}`,
      customer,
      email,
      date: dateStr,
      status,
      paymentMethod,
      amountCents,
    });
  }

  return items;
}

export const INITIAL_TRANSACTIONS = generateTransactions(120);

export const STATUS_LABELS = {
  completed: { label: 'Completado', tone: 'badge-green' },
  pending: { label: 'Pendiente', tone: 'badge-yellow' },
  cancelled: { label: 'Cancelado', tone: 'badge-red' },
  review: { label: 'En Revisión', tone: 'badge-blue' },
};
