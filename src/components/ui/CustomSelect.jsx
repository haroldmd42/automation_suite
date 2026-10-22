import { useEffect, useRef, useState, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/format';
import LocatorHint from '../qa/LocatorHint';

/**
 * CustomSelect
 * 
 * Reemplazo estilizado y accesible para el elemento <select> nativo.
 * Utiliza la paleta Moss (#344E41, #588157, #A3B18A, #DAD7CD) evitando
 * los menús azules toscos nativos del navegador.
 *
 * Mantiene un <select> oculto sincronizado con el mismo `data-testid`
 * para compatibilidad total con herramientas de automatización
 * (Playwright .selectOption(), Cypress .select()).
 */
export default function CustomSelect({
  id,
  value,
  onChange,
  options = [],
  placeholder = '-- Seleccionar --',
  disabled = false,
  error = false,
  testId,
  className,
  ariaLabel,
  prefixIcon: PrefixIcon,
  size = 'md', // 'sm' | 'md'
}) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, placement: 'bottom' });

  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const hiddenSelectRef = useRef(null);

  // Normalizar opciones: soporta strings o { value, label, disabled?, badge? }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: String(opt.value),
        label: opt.label ?? String(opt.value),
        disabled: !!opt.disabled,
        badge: opt.badge,
      };
    }
    return { value: String(opt), label: String(opt), disabled: false };
  });

  const selectedOption = normalizedOptions.find((o) => o.value === String(value));

  // Posicionamiento dinámico (con portal para evitar clipping en overflow de modales/tablas)
  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    // Si el elemento disparador queda fuera de la pantalla durante el scroll, cerrar el menú
    if (rect.bottom < -40 || rect.top > window.innerHeight + 40) {
      setOpen(false);
      return;
    }

    const dropdownHeight = Math.min(260, normalizedOptions.length * 40 + 16);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let placement = 'bottom';
    let top = rect.bottom + 6;

    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      placement = 'top';
      top = Math.max(8, rect.top - dropdownHeight - 6);
    }

    // Coordenadas fijas relativas al Viewport (sin window.scrollY ni window.scrollX)
    setCoords({
      top,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
      width: rect.width,
      placement,
    });
  }, [normalizedOptions.length]);

  useEffect(() => {
    if (open) {
      updatePosition();
      const onScrollOrResize = () => updatePosition();
      window.addEventListener('resize', onScrollOrResize);
      window.addEventListener('scroll', onScrollOrResize, true);
      return () => {
        window.removeEventListener('resize', onScrollOrResize);
        window.removeEventListener('scroll', onScrollOrResize, true);
      };
    }
  }, [open, updatePosition]);

  // Click outside listener
  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        dropdownRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  // Manejo de teclado accesible
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        const currIdx = normalizedOptions.findIndex((o) => o.value === String(value));
        setHighlightedIndex(currIdx >= 0 ? currIdx : 0);
        return;
      }
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      let nextIdx = highlightedIndex + dir;
      if (nextIdx < 0) nextIdx = normalizedOptions.length - 1;
      if (nextIdx >= normalizedOptions.length) nextIdx = 0;
      setHighlightedIndex(nextIdx);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open && highlightedIndex >= 0 && highlightedIndex < normalizedOptions.length) {
        const target = normalizedOptions[highlightedIndex];
        if (!target.disabled) {
          handleSelect(target.value);
        }
      } else {
        setOpen((o) => !o);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    } else if (e.key === 'Tab') {
      if (open) setOpen(false);
    }
  };

  const handleSelect = (val) => {
    setOpen(false);
    if (onChange) {
      // Disparar evento sintético compatible con handlers normales de select
      const syntheticEvent = {
        target: { id: selectId, value: val, name: selectId },
        currentTarget: { id: selectId, value: val },
      };
      onChange(syntheticEvent);
    }
    // Sincronizar select oculto
    if (hiddenSelectRef.current) {
      hiddenSelectRef.current.value = val;
      hiddenSelectRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
    triggerRef.current?.focus();
  };

  return (
    <div className={cn('relative inline-block w-full', className)}>
      {/* Botón Disparador Estilizado */}
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-invalid={!!error}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((o) => !o);
            const currIdx = normalizedOptions.findIndex((o) => o.value === String(value));
            setHighlightedIndex(currIdx >= 0 ? currIdx : 0);
          }
        }}
        onKeyDown={handleKeyDown}
        data-testid={testId}
        className={cn(
          'flex w-full items-center justify-between rounded-xl border bg-white/90 text-left text-sm font-medium transition-all duration-200',
          'focus:outline-none focus:ring-4 focus:ring-moss-600/15 focus:border-moss-600',
          size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2.5 text-sm',
          error ? 'border-danger-500 bg-danger-50/50' : 'border-moss-300 hover:border-moss-400',
          disabled
            ? 'cursor-not-allowed bg-moss-100/70 text-moss-400 border-moss-200 opacity-60'
            : 'text-moss-900 cursor-pointer shadow-sm',
          open && 'border-moss-600 ring-4 ring-moss-600/15',
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {PrefixIcon && <PrefixIcon className="h-4 w-4 shrink-0 text-moss-600" />}
          <span className={cn(!selectedOption && 'text-moss-400 font-normal')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-moss-500 transition-transform duration-200',
            open && 'rotate-180 text-moss-700',
          )}
        />
      </button>

      {/* Menú Desplegable con Paleta Moss Flotante */}
      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            data-testid={testId ? `${testId}-dropdown` : 'custom-select-dropdown'}
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
            }}
            className="fixed z-[9999] max-h-60 overflow-y-auto rounded-xl border border-moss-200 bg-white/95 p-1.5 shadow-lift backdrop-blur-md animate-slide-up focus:outline-none"
          >
            {normalizedOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-moss-400 italic">No hay opciones disponibles</div>
            ) : (
              normalizedOptions.map((opt, idx) => {
                const isSelected = opt.value === String(value);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    data-testid={testId ? `${testId}-option-${opt.value}` : `select-option-${opt.value}`}
                    data-value={opt.value}
                    data-selected={isSelected}
                    onClick={() => {
                      if (!opt.disabled) handleSelect(opt.value);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors select-none',
                      opt.disabled && 'cursor-not-allowed opacity-40',
                      isSelected
                        ? 'bg-moss-700 font-semibold text-white'
                        : isHighlighted
                        ? 'bg-moss-100 text-moss-900 font-medium'
                        : 'text-moss-800 hover:bg-moss-50',
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-white ml-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>,
          document.body,
        )}

      {/* Select nativo oculto accesible para scripts de prueba (Playwright selectOption) */}
      <select
        ref={hiddenSelectRef}
        value={value}
        onChange={onChange}
        tabIndex={-1}
        aria-hidden="true"
        data-testid={testId ? `${testId}-native` : undefined}
        className="sr-only pointer-events-none"
      >
        {normalizedOptions.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
