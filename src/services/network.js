/**
 * Capa de red simulada.
 *
 * Todas las "peticiones" de la app pasan por `simulateRequest`, que añade un
 * retraso aleatorio y, opcionalmente, fallos aleatorios. Se puede configurar:
 *  - Desde la UI (barra superior).
 *  - Por query string ANTES del hash: `?network=instant&failRate=0.3#/tables`
 *  - Por localStorage: `qa_network_config = {"mode":"instant","failureRate":0}`
 *  - Por consola / test runner: `window.__QA_SUITE__.setNetwork({ mode: 'fast' })`
 */

const STORAGE_KEY = 'qa_network_config';

export const NETWORK_MODES = {
  realistic: { label: 'Realista (2-4 s)', min: 2000, max: 4000 },
  fast: { label: 'Rápida (0.3-0.6 s)', min: 300, max: 600 },
  instant: { label: 'Instantánea (0 s)', min: 0, max: 0 },
};

export const FAILURE_RATES = [
  { value: 0, label: 'Sin fallos' },
  { value: 0.1, label: '10% fallos' },
  { value: 0.3, label: '30% fallos' },
  { value: 0.5, label: '50% fallos' },
];

const DEFAULT_CONFIG = { mode: 'realistic', failureRate: 0 };

function sanitize(cfg) {
  const mode = NETWORK_MODES[cfg?.mode] ? cfg.mode : DEFAULT_CONFIG.mode;
  let failureRate = Number(cfg?.failureRate);
  if (!Number.isFinite(failureRate) || failureRate < 0 || failureRate > 1) failureRate = 0;
  return { mode, failureRate };
}

function loadInitial() {
  let cfg = { ...DEFAULT_CONFIG };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) cfg = { ...cfg, ...JSON.parse(stored) };
  } catch {
    /* ignore */
  }
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('network')) cfg.mode = params.get('network');
    if (params.get('failRate') !== null) cfg.failureRate = params.get('failRate');
  } catch {
    /* ignore */
  }
  return sanitize(cfg);
}

let config = loadInitial();
const listeners = new Set();

export function getNetworkConfig() {
  return config;
}

export function setNetworkConfig(partial) {
  config = sanitize({ ...config, ...partial });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function subscribeNetwork(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export class NetworkError extends Error {
  constructor(message, status = 500, code = 'NETWORK_ERROR', extra = {}) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
    this.code = code;
    Object.assign(this, extra);
  }
}

export function getRandomDelay(overrideMin, overrideMax) {
  const mode = NETWORK_MODES[config.mode];
  if (config.mode === 'instant') return 0;
  const min = overrideMin ?? mode.min;
  const max = overrideMax ?? mode.max;
  // En modo rápido escalamos los overrides para mantener la proporción.
  if (config.mode === 'fast' && overrideMin !== undefined) {
    return Math.round((min + Math.random() * (max - min)) * 0.15);
  }
  return Math.round(min + Math.random() * (max - min));
}

export function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

/**
 * Simula una petición HTTP.
 * @param {() => any} handler  Función que produce la respuesta (puede lanzar NetworkError).
 * @param {{minDelay?:number,maxDelay?:number,canFail?:boolean,signal?:AbortSignal}} opts
 */
export async function simulateRequest(handler, opts = {}) {
  const { minDelay, maxDelay, canFail = true, signal } = opts;
  await wait(getRandomDelay(minDelay, maxDelay), signal);
  if (canFail && config.failureRate > 0 && Math.random() < config.failureRate) {
    throw new NetworkError('503 Service Unavailable · Fallo de red simulado', 503, 'SIMULATED_FAILURE');
  }
  return handler();
}

export function isAbortError(err) {
  return err?.name === 'AbortError';
}
