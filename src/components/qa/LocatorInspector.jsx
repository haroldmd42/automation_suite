import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQA } from '../../context/QAContext';
import { useToast } from '../../context/ToastContext';
import { copyToClipboard } from '../../utils/format';

/**
 * Modo inspector: al pasar el cursor resalta el elemento con data-testid más
 * cercano. Un clic (en fase de captura, sin disparar la acción del elemento)
 * copia el selector CSS al portapapeles. ESC para salir.
 */
export default function LocatorInspector() {
  const { inspector, setInspector } = useQA();
  const toast = useToast();
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (!inspector) {
      setTarget(null);
      document.documentElement.classList.remove('qa-inspector-active');
      return undefined;
    }
    document.documentElement.classList.add('qa-inspector-active');

    const resolve = (el) => {
      if (!el || el.closest?.('[data-qa-ignore]')) return null;
      return el.closest?.('[data-testid]') || null;
    };

    const onMove = (e) => {
      const el = resolve(e.target);
      if (!el) return setTarget(null);
      const r = el.getBoundingClientRect();
      setTarget({ id: el.getAttribute('data-testid'), tag: el.tagName.toLowerCase(), rect: r });
    };

    const onClick = async (e) => {
      const el = resolve(e.target);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      const sel = `[data-testid="${el.getAttribute('data-testid')}"]`;
      if (await copyToClipboard(sel)) {
        toast.success('Selector copiado', sel, { duration: 2500 });
      }
    };

    const onKey = (e) => {
      if (e.key === 'Escape') setInspector(false);
    };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('qa-inspector-active');
    };
  }, [inspector, setInspector, toast]);

  if (!inspector) return null;

  return createPortal(
    <div data-qa-ignore className="pointer-events-none fixed inset-0 z-[9998]">
      <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-moss-950/90 px-4 py-1.5 text-xs font-medium text-moss-100 shadow-lift">
        Modo inspector · clic para copiar selector · <span className="kbd !bg-moss-800 !text-moss-100">Esc</span> para salir
      </div>
      {target && (
        <>
          <div
            className="absolute rounded-md border-2 border-moss-500 bg-moss-500/10 transition-all duration-75"
            style={{
              top: target.rect.top - 2,
              left: target.rect.left - 2,
              width: target.rect.width + 4,
              height: target.rect.height + 4,
            }}
          />
          <div
            className="absolute max-w-[90vw] truncate rounded-md bg-moss-800 px-2 py-1 font-mono text-[11px] text-white shadow-lift"
            style={{
              top: target.rect.top > 30 ? target.rect.top - 28 : target.rect.bottom + 6,
              left: Math.max(4, target.rect.left - 2),
            }}
          >
            <span className="text-moss-300">{target.tag}</span> [data-testid="{target.id}"]
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
