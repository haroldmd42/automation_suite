import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Crosshair, X } from 'lucide-react';
import { useQA } from '../../context/QAContext';
import { cn, copyToClipboard } from '../../utils/format';

export function buildSelectors(testId) {
  return [
    { key: 'testid', label: 'data-testid', value: testId },
    { key: 'css', label: 'CSS', value: `[data-testid="${testId}"]` },
    { key: 'xpath', label: 'XPath', value: `//*[@data-testid="${testId}"]` },
    { key: 'playwright', label: 'Playwright', value: `page.getByTestId('${testId}')` },
    { key: 'cypress', label: 'Cypress', value: `cy.get('[data-testid="${testId}"]')` },
    { key: 'selenium', label: 'Selenium', value: `By.cssSelector("[data-testid='${testId}']")` },
  ];
}

function SelectorRow({ item }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5">
      <span className="w-[74px] shrink-0 text-[10px] font-semibold uppercase tracking-wider text-moss-400">
        {item.label}
      </span>
      <code className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-moss-100" title={item.value}>
        {item.value}
      </code>
      <button
        type="button"
        data-qa-ignore
        aria-label={`Copiar ${item.label}`}
        onClick={async () => {
          if (await copyToClipboard(item.value)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }
        }}
        className="rounded-md p-1 text-moss-300 transition hover:bg-white/10 hover:text-white"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-moss-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

/**
 * Ícono interactivo que revela el localizador sugerido para un elemento.
 * Se renderiza en un portal con posición fija para no ser recortado por
 * contenedores con overflow (tablas, modales, etc.).
 */
export default function LocatorHint({ testId, className, label }) {
  const { showLocators } = useQA();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'bottom' });
  const btnRef = useRef(null);
  const popRef = useRef(null);

  const place = useCallback(() => {
    const btn = btnRef.current;
    const pop = popRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const w = pop?.offsetWidth || 380;
    const h = pop?.offsetHeight || 240;
    let left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
    let top = r.bottom + 8;
    let placement = 'bottom';
    if (top + h > window.innerHeight - 8) {
      top = Math.max(8, r.top - h - 8);
      placement = 'top';
    }
    setPos({ top, left, placement });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (popRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onScroll = () => place();
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, place]);

  if (!showLocators) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-qa-hint={testId}
        data-qa-ignore
        aria-label={`Ver localizador${label ? ` de ${label}` : ''}: ${testId}`}
        aria-expanded={open}
        title={`Localizador: ${testId}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={cn(
          'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md align-middle text-moss-500 transition',
          'hover:bg-moss-200 hover:text-moss-800',
          open && 'bg-moss-700 text-white hover:bg-moss-700 hover:text-white',
          className,
        )}
      >
        <Crosshair className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            data-qa-ignore
            role="dialog"
            aria-label={`Localizadores para ${testId}`}
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-[10000] w-[380px] max-w-[calc(100vw-16px)] rounded-xl border border-white/10 bg-moss-950/95 p-2 text-left shadow-lift backdrop-blur animate-fade-in"
          >
            <div className="mb-1 flex items-center justify-between px-2 pt-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-moss-200">
                <Crosshair className="h-3.5 w-3.5 text-moss-400" /> Localizador sugerido
              </span>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
                className="rounded p-0.5 text-moss-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {buildSelectors(testId).map((s) => (
              <SelectorRow key={s.key} item={s} />
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
