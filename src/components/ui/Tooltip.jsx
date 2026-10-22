import { cloneElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/format';
import { Spinner } from './Primitives';

/**
 * Tooltip dinámico.
 * - trigger: 'hover' (incluye focus) | 'click'
 * - content: nodo, o función async (() => Promise<node>) que se resuelve al
 *   abrir y se cachea (cacheContent=true) para próximas aperturas.
 * - delay: ms antes de mostrar (hover). autoHideMs: oculta tras N ms.
 * - Se renderiza en portal con role="tooltip" y aria-describedby.
 */
export default function Tooltip({
  children,
  content,
  placement = 'top',
  delay = 300,
  trigger = 'hover',
  testId = 'tooltip',
  autoHideMs = 0,
  cacheContent = true,
  className,
  wrapperClassName,
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [resolved, setResolved] = useState(typeof content === 'function' ? null : content);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState({ top: -9999, left: -9999, actual: placement });
  const anchorRef = useRef(null);
  const tipRef = useRef(null);
  const showTimer = useRef(null);
  const hideTimer = useRef(null);
  const loadedOnce = useRef(false);

  useEffect(() => {
    if (typeof content !== 'function') setResolved(content);
  }, [content]);

  const position = useCallback(() => {
    const a = anchorRef.current;
    const t = tipRef.current;
    if (!a || !t) return;
    const r = a.getBoundingClientRect();
    const w = t.offsetWidth;
    const h = t.offsetHeight;
    const gap = 10;
    let actual = placement;
    const fits = {
      top: r.top - h - gap > 4,
      bottom: r.bottom + h + gap < window.innerHeight - 4,
      left: r.left - w - gap > 4,
      right: r.right + w + gap < window.innerWidth - 4,
    };
    const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
    if (!fits[actual] && fits[opposite[actual]]) actual = opposite[actual];
    let top;
    let left;
    if (actual === 'top') {
      top = r.top - h - gap;
      left = r.left + r.width / 2 - w / 2;
    } else if (actual === 'bottom') {
      top = r.bottom + gap;
      left = r.left + r.width / 2 - w / 2;
    } else if (actual === 'left') {
      top = r.top + r.height / 2 - h / 2;
      left = r.left - w - gap;
    } else {
      top = r.top + r.height / 2 - h / 2;
      left = r.right + gap;
    }
    left = Math.min(Math.max(4, left), window.innerWidth - w - 4);
    top = Math.min(Math.max(4, top), window.innerHeight - h - 4);
    setCoords({ top, left, actual });
  }, [placement]);

  useLayoutEffect(() => {
    if (open) position();
  }, [open, resolved, loading, position]);

  useEffect(() => {
    if (!open) return undefined;
    const onScroll = () => position();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, position]);

  useEffect(() => {
    if (!open || !autoHideMs) return undefined;
    const t = setTimeout(() => setOpen(false), autoHideMs);
    return () => clearTimeout(t);
  }, [open, autoHideMs]);

  useEffect(
    () => () => {
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
    },
    [],
  );

  const loadContent = useCallback(async () => {
    if (typeof content !== 'function') return;
    if (cacheContent && loadedOnce.current) return;
    setLoading(true);
    try {
      const res = await content();
      setResolved(res);
      loadedOnce.current = true;
    } catch (e) {
      setResolved(<span className="text-danger-200">Error: {e.message}</span>);
    } finally {
      setLoading(false);
    }
  }, [content, cacheContent]);

  const show = () => {
    clearTimeout(hideTimer.current);
    showTimer.current = setTimeout(() => {
      setOpen(true);
      loadContent();
    }, delay);
  };
  const hide = () => {
    clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => setOpen(false), 80);
  };

  useEffect(() => {
    if (!open || trigger !== 'click') return undefined;
    const onDown = (e) => {
      if (anchorRef.current?.contains(e.target) || tipRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, trigger]);

  const handlers =
    trigger === 'click'
      ? {
          onClick: () => {
            setOpen((o) => {
              if (!o) loadContent();
              return !o;
            });
          },
        }
      : { onMouseEnter: show, onMouseLeave: hide, onFocus: show, onBlur: hide };

  const arrowCls = {
    top: 'left-1/2 top-full -translate-x-1/2 border-t-moss-950',
    bottom: 'left-1/2 bottom-full -translate-x-1/2 border-b-moss-950',
    left: 'top-1/2 left-full -translate-y-1/2 border-l-moss-950',
    right: 'top-1/2 right-full -translate-y-1/2 border-r-moss-950',
  }[coords.actual];

  return (
    <>
      <span
        ref={anchorRef}
        className={cn('inline-flex', wrapperClassName)}
        aria-describedby={open ? id : undefined}
        data-tooltip-state={open ? 'open' : 'closed'}
        {...handlers}
      >
        {typeof children === 'string' ? <span>{children}</span> : cloneElement(children)}
      </span>
      {open &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            data-testid={testId}
            data-placement={coords.actual}
            style={{ top: coords.top, left: coords.left }}
            className={cn(
              'pointer-events-auto fixed z-[10001] max-w-xs rounded-lg bg-moss-950 px-3 py-2 text-xs leading-relaxed text-moss-100 shadow-lift animate-fade-in',
              className,
            )}
            onMouseEnter={() => trigger === 'hover' && clearTimeout(hideTimer.current)}
            onMouseLeave={() => trigger === 'hover' && hide()}
          >
            {loading ? (
              <span className="flex items-center gap-2" data-testid={`${testId}-loading`}>
                <Spinner className="h-3.5 w-3.5" /> Cargando información...
              </span>
            ) : (
              <span data-testid={`${testId}-content`}>{resolved}</span>
            )}
            <span className={cn('absolute h-0 w-0 border-[6px] border-transparent', arrowCls)} />
          </div>,
          document.body,
        )}
    </>
  );
}
