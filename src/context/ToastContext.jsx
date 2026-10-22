import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '../utils/format';

const ToastContext = createContext(null);
export const MAX_TOASTS = 5;

const TONES = {
  success: { icon: CircleCheck, bar: 'bg-moss-600', iconCls: 'text-moss-600', ring: 'ring-moss-600/25' },
  error: { icon: CircleX, bar: 'bg-danger-500', iconCls: 'text-danger-500', ring: 'ring-danger-500/25' },
  warning: { icon: TriangleAlert, bar: 'bg-warning-500', iconCls: 'text-warning-600', ring: 'ring-warning-500/30' },
  info: { icon: Info, bar: 'bg-info-500', iconCls: 'text-info-600', ring: 'ring-info-500/25' },
};

let counter = 0;

/**
 * Toast efímero con barra de progreso. Se pausa al pasar el cursor (o enfocar).
 * duration = 0 => persistente hasta cerrarse manualmente.
 */
function ToastItem({ toast, onDismiss }) {
  const { id, type, title, message, duration, action } = toast;
  const tone = TONES[type] || TONES.info;
  const Icon = tone.icon;
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const remaining = useRef(duration);
  const last = useRef(Date.now());

  useEffect(() => {
    if (!duration) return undefined;
    last.current = Date.now();
    const iv = setInterval(() => {
      const now = Date.now();
      if (!paused) {
        remaining.current -= now - last.current;
        setProgress(Math.max(0, (remaining.current / duration) * 100));
        if (remaining.current <= 0) {
          clearInterval(iv);
          onDismiss(id, 'timeout');
        }
      }
      last.current = now;
    }, 50);
    return () => clearInterval(iv);
  }, [paused, duration, id, onDismiss]);

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      data-testid={`toast-${type}`}
      data-toast-id={id}
      data-paused={paused}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        'pointer-events-auto relative w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white/95 shadow-lift ring-1 backdrop-blur animate-slide-in-right',
        tone.ring,
      )}
    >
      <div className="flex items-start gap-3 p-4 pr-10">
        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', tone.iconCls)} aria-hidden />
        <div className="min-w-0 flex-1">
          {title && (
            <p className="text-sm font-semibold text-moss-950" data-testid="toast-title">
              {title}
            </p>
          )}
          {message && (
            <p className="mt-0.5 text-sm text-moss-700" data-testid="toast-message">
              {message}
            </p>
          )}
          {action && (
            <button
              type="button"
              data-testid="toast-action-btn"
              className="mt-2 text-sm font-semibold text-moss-700 underline decoration-moss-400 underline-offset-4 hover:text-moss-900"
              onClick={() => {
                action.onClick();
                onDismiss(id, 'action');
              }}
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        aria-label="Cerrar notificación"
        data-testid="toast-close-btn"
        onClick={() => onDismiss(id, 'manual')}
        className="absolute right-2.5 top-2.5 rounded-lg p-1 text-moss-500 transition hover:bg-moss-100 hover:text-moss-800"
      >
        <X className="h-4 w-4" />
      </button>
      {duration > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-moss-100">
          <div
            className={cn('h-full transition-[width] duration-75 ease-linear', tone.bar)}
            style={{ width: `${progress}%` }}
            data-testid="toast-progress"
          />
        </div>
      )}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts) => {
    counter += 1;
    const id = `t${counter}`;
    const t = { id, type: 'info', duration: 4000, ...opts };
    setToasts((list) => {
      const next = [...list, t];
      // Límite de pila: se descartan los más antiguos.
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
    return id;
  }, []);

  const clearAll = useCallback(() => setToasts([]), []);

  const api = useMemo(() => {
    const fn = (opts) => toast(opts);
    fn.success = (title, message, o) => toast({ type: 'success', title, message, ...o });
    fn.error = (title, message, o) => toast({ type: 'error', title, message, duration: 6000, ...o });
    fn.warning = (title, message, o) => toast({ type: 'warning', title, message, ...o });
    fn.info = (title, message, o) => toast({ type: 'info', title, message, ...o });
    fn.dismiss = dismiss;
    fn.clearAll = clearAll;
    return fn;
  }, [toast, dismiss, clearAll]);

  return (
    <ToastContext.Provider value={{ toast: api, toasts }}>
      {children}
      {createPortal(
        <div
          data-testid="toast-container"
          data-count={toasts.length}
          className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2.5"
        >
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx.toast;
}

export function useToastList() {
  return useContext(ToastContext).toasts;
}
