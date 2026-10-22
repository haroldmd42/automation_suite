import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn, uid } from '../../utils/format';
import LocatorHint from '../qa/LocatorHint';

// Pila global de modales: solo el modal superior responde a ESC / Tab trap.
const modalStack = [];
let scrollLocks = 0;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

function ModalInner({
  onClose,
  title,
  description,
  testId,
  size,
  children,
  footer,
  dismissible,
  closeOnBackdrop,
  icon: Icon,
  hideClose,
}) {
  const idRef = useRef(uid('modal'));
  const panelRef = useRef(null);
  const [level, setLevel] = useState(1);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const id = idRef.current;
    modalStack.push(id);
    setLevel(modalStack.length);
    scrollLocks += 1;
    document.body.style.overflow = 'hidden';
    const prevFocus = document.activeElement;
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const auto = panel.querySelector('[data-autofocus]');
      (auto || panel).focus();
    });
    return () => {
      cancelAnimationFrame(raf);
      const i = modalStack.indexOf(id);
      if (i >= 0) modalStack.splice(i, 1);
      scrollLocks = Math.max(0, scrollLocks - 1);
      if (scrollLocks === 0) document.body.style.overflow = '';
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (modalStack[modalStack.length - 1] !== idRef.current) return;
      if (e.key === 'Escape') {
        if (dismissible) {
          e.stopPropagation();
          onCloseRef.current?.('escape');
        }
        return;
      }
      if (e.key === 'Tab') {
        const nodes = Array.from(panelRef.current?.querySelectorAll(FOCUSABLE) || []).filter(
          (n) => n.offsetParent !== null || n === document.activeElement,
        );
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dismissible]);

  const z = 1000 + level * 10;
  const titleId = `${idRef.current}-title`;

  return createPortal(
    <div className="fixed inset-0 flex items-end justify-center p-4 sm:items-center" style={{ zIndex: z }}>
      <div
        className="absolute inset-0 bg-moss-950/55 backdrop-blur-[3px] animate-fade-in"
        data-testid={`${testId}-backdrop`}
        onClick={() => dismissible && closeOnBackdrop && onCloseRef.current?.('backdrop')}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid={testId}
        data-modal-level={level}
        className={cn(
          'relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-moss-200 animate-slide-up focus:outline-none',
          SIZES[size] || SIZES.md,
        )}
      >
        <div className="flex items-start gap-3 border-b border-moss-100 px-6 py-4">
          {Icon && (
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moss-100 text-moss-700">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="flex items-center gap-2 text-lg font-semibold" data-testid={`${testId}-title`}>
              {title}
              <LocatorHint testId={testId} label="modal" />
            </h2>
            {description && <p className="mt-0.5 text-sm text-moss-600">{description}</p>}
          </div>
          {!hideClose && dismissible && (
            <button
              type="button"
              aria-label="Cerrar modal"
              data-testid={`${testId}-close-btn`}
              onClick={() => onCloseRef.current?.('close-button')}
              className="rounded-lg p-1.5 text-moss-500 transition hover:bg-moss-100 hover:text-moss-900"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5" data-testid={`${testId}-body`}>
          {children}
        </div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-moss-100 bg-moss-50/60 px-6 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Modal accesible con soporte de apilamiento (modales superpuestos).
 * - ESC y clic en backdrop cierran SOLO el modal superior.
 * - Focus trap y restauración del foco al cerrar.
 * - dismissible=false => ni ESC ni backdrop ni botón X lo cierran.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  testId = 'modal',
  size = 'md',
  children,
  footer,
  dismissible = true,
  closeOnBackdrop = true,
  icon,
  hideClose = false,
}) {
  if (!open) return null;
  return (
    <ModalInner
      onClose={onClose}
      title={title}
      description={description}
      testId={testId}
      size={size}
      footer={footer}
      dismissible={dismissible}
      closeOnBackdrop={closeOnBackdrop}
      icon={icon}
      hideClose={hideClose}
    >
      {children}
    </ModalInner>
  );
}

export function getOpenModalCount() {
  return modalStack.length;
}
