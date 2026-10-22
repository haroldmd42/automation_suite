import { useRef } from 'react';
import { cn } from '../../utils/format';
import LocatorHint from '../qa/LocatorHint';

/**
 * Tabs accesibles (role=tablist) con navegación por flechas, Home y End.
 * data-testid: `${prefix}-tab-${key}` y `${prefix}-panel`.
 */
export function Tabs({ tabs, active, onChange, prefix = 'tabs', className }) {
  const refs = useRef({});
  const onKeyDown = (e, idx) => {
    let next = null;
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;
    if (next !== null) {
      e.preventDefault();
      const key = tabs[next].key;
      onChange(key);
      refs.current[key]?.focus();
    }
  };
  return (
    <div className={cn('mb-6 flex items-center gap-2', className)}>
      <div
        role="tablist"
        aria-label="Secciones"
        data-testid={`${prefix}-tablist`}
        className="flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-moss-200 bg-white/70 p-1.5 shadow-soft backdrop-blur"
      >
        {tabs.map((t, i) => {
          const selected = t.key === active;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              ref={(el) => {
                refs.current[t.key] = el;
              }}
              role="tab"
              type="button"
              id={`${prefix}-tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`${prefix}-panel`}
              tabIndex={selected ? 0 : -1}
              data-testid={`${prefix}-tab-${t.key}`}
              onClick={() => onChange(t.key)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200',
                selected
                  ? 'bg-gradient-to-b from-moss-600 to-moss-700 text-white shadow-soft'
                  : 'text-moss-700 hover:bg-moss-100 hover:text-moss-900',
              )}
            >
              {Icon && <Icon className="h-4 w-4" aria-hidden />}
              {t.label}
              {t.badge != null && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[10px] font-bold',
                    selected ? 'bg-white/20 text-white' : 'bg-moss-200 text-moss-700',
                  )}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <LocatorHint testId={`${prefix}-tab-${active}`} label="pestaña activa" />
    </div>
  );
}
