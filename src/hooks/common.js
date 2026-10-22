import { useEffect, useRef, useState, useCallback } from 'react';

export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);
  return [value, setValue];
}

/** Devuelve true mientras el componente esté montado (evita setState tras desmontar). */
export function useMountedRef() {
  const ref = useRef(false);
  useEffect(() => {
    ref.current = true;
    return () => {
      ref.current = false;
    };
  }, []);
  return ref;
}

/**
 * Cuenta regresiva en segundos hasta un timestamp. El valor se deriva en cada
 * render (no se guarda en estado) para que nunca quede desfasado cuando
 * cambia el objetivo.
 */
export function useCountdown(targetTs) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!targetTs) return undefined;
    const id = setInterval(() => {
      setTick((t) => t + 1);
      if (Date.now() >= targetTs) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [targetTs]);
  return targetTs ? Math.max(0, Math.ceil((targetTs - Date.now()) / 1000)) : 0;
}

export function useOnClickOutside(refs, handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const list = Array.isArray(refs) ? refs : [refs];
    const onDown = (e) => {
      if (list.some((r) => r.current && r.current.contains(e.target))) return;
      handler(e);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [refs, handler, enabled]);
}
