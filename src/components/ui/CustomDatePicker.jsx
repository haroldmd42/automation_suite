import { useEffect, useRef, useState, useId, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  X,
} from 'lucide-react';
import {
  toISODate,
  fromISODate,
  formatDateES,
  startOfDay,
  cn,
} from '../../utils/format';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

/**
 * CustomDatePicker
 * 
 * Reemplazo integral para <input type="date">.
 * Diseñado con la paleta de estilo Moss (#344E41, #588157, #A3B18A, #DAD7CD)
 * evitando el menú azul tosco nativo de Chrome/Windows.
 * 
 * Genera eventos onChange estándar con target.value = 'YYYY-MM-DD'
 * y mantiene un input oculto para compatibilidad total con pruebas automatizadas.
 */
export default function CustomDatePicker({
  id,
  value = '',
  onChange,
  min,
  max,
  disabled = false,
  error = false,
  placeholder = 'dd/mm/aaaa',
  testId,
  className,
  ariaLabel,
}) {
  const generatedId = useId();
  const inputId = id || generatedId;

  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const hiddenInputRef = useRef(null);

  // Fecha seleccionada actual
  const selectedDateObj = useMemo(() => (value ? fromISODate(value) : null), [value]);

  // Mes y Año visualizados en el calendario
  const [viewYear, setViewYear] = useState(() => (selectedDateObj ? selectedDateObj.getFullYear() : new Date().getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (selectedDateObj ? selectedDateObj.getMonth() : new Date().getMonth()));

  // Coordenadas flotantes del portal
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 280 });

  // Cuando cambie el valor externo, sincronizar la vista del calendario
  useEffect(() => {
    if (selectedDateObj) {
      setViewYear(selectedDateObj.getFullYear());
      setViewMonth(selectedDateObj.getMonth());
    }
  }, [selectedDateObj]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    // Si el elemento disparador queda fuera de la pantalla durante el scroll, cerrar el calendario
    if (rect.bottom < -40 || rect.top > window.innerHeight + 40) {
      setOpen(false);
      return;
    }

    const calendarHeight = 350;
    const calendarWidth = 290;
    const spaceBelow = window.innerHeight - rect.bottom;

    let top = rect.bottom + 6;
    if (spaceBelow < calendarHeight && rect.top > calendarHeight) {
      top = Math.max(8, rect.top - calendarHeight - 6);
    }

    // Coordenadas fijas relativas al Viewport (sin window.scrollY ni window.scrollX)
    let left = rect.left;
    if (left + calendarWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - calendarWidth - 8);
    }
    if (left < 8) left = 8;

    setCoords({
      top,
      left,
      width: calendarWidth,
    });
  }, []);

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

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        popoverRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  // Cuadrícula de días para el mes visible
  const daysGrid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startDayOfWeek = firstDay.getDay(); // 0 = Domingo
    if (startDayOfWeek === 0) startDayOfWeek = 7; // Convertir a 1 = Lunes ... 7 = Domingo

    const days = [];
    // Espacios antes del primer día
    for (let i = 1; i < startDayOfWeek; i++) {
      days.push({ empty: true, key: `empty-${i}` });
    }

    const minDateObj = min ? fromISODate(min) : null;
    const maxDateObj = max ? fromISODate(max) : null;
    const today = startOfDay(new Date());

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(viewYear, viewMonth, d);
      const iso = toISODate(dateObj);
      const isSelected = value === iso;
      const isToday = toISODate(today) === iso;

      let isDisabled = false;
      if (minDateObj && dateObj < minDateObj) isDisabled = true;
      if (maxDateObj && dateObj > maxDateObj) isDisabled = true;

      days.push({
        day: d,
        iso,
        dateObj,
        isSelected,
        isToday,
        isDisabled,
        key: iso,
      });
    }

    return days;
  }, [viewYear, viewMonth, min, max, value]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const emitChange = (newIso) => {
    if (onChange) {
      const syntheticEvent = {
        target: { id: inputId, value: newIso, name: inputId },
        currentTarget: { id: inputId, value: newIso },
      };
      onChange(syntheticEvent);
    }
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = newIso;
      hiddenInputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
      hiddenInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  const handleSelectDay = (iso) => {
    emitChange(iso);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleSelectToday = () => {
    const todayIso = toISODate(new Date());
    emitChange(todayIso);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleClear = () => {
    emitChange('');
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={cn('relative inline-block w-full', className)}>
      {/* Botón Disparador del Selector de Fecha */}
      <button
        ref={triggerRef}
        id={inputId}
        type="button"
        role="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel || 'Seleccionar fecha'}
        aria-invalid={!!error}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        data-testid={testId}
        className={cn(
          'flex w-full items-center justify-between rounded-xl border bg-white/90 px-3.5 py-2.5 text-left text-sm transition-all duration-200',
          'focus:outline-none focus:ring-4 focus:ring-moss-600/15 focus:border-moss-600',
          error ? 'border-danger-500 bg-danger-50/50' : 'border-moss-300 hover:border-moss-400',
          disabled
            ? 'cursor-not-allowed bg-moss-100/70 text-moss-400 border-moss-200 opacity-60'
            : 'text-moss-900 cursor-pointer shadow-sm',
          open && 'border-moss-600 ring-4 ring-moss-600/15',
        )}
      >
        <span className={cn('font-mono', !value && 'text-moss-400 font-sans')}>
          {value ? formatDateES(fromISODate(value)) : placeholder}
        </span>
        <CalendarIcon
          className={cn(
            'h-4 w-4 shrink-0 transition-colors',
            open ? 'text-moss-700' : 'text-moss-500',
          )}
        />
      </button>

      {/* Popover de Calendario con Paleta Moss */}
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Calendario desplegable"
            data-testid={testId ? `${testId}-calendar` : 'custom-datepicker-popover'}
            style={{
              top: coords.top,
              left: coords.left,
              width: 290,
            }}
            className="fixed z-[9999] rounded-2xl border border-moss-200 bg-white p-3.5 shadow-lift backdrop-blur-md animate-slide-up focus:outline-none"
          >
            {/* Cabecera del Mes / Año con selectores rápidos */}
            <div className="flex items-center justify-between pb-3 border-b border-moss-100 gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                data-testid={testId ? `${testId}-prev-month` : undefined}
                className="btn btn-ghost btn-sm btn-icon text-moss-700 hover:bg-moss-100 h-8 w-8 shrink-0"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1.5">
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  aria-label="Seleccionar mes"
                  className="rounded-lg border border-moss-200 bg-moss-50/70 px-2 py-1 text-xs font-semibold text-moss-800 cursor-pointer focus:border-moss-600 focus:outline-none focus:ring-2 focus:ring-moss-600/15"
                >
                  {MONTH_NAMES.map((mName, mIdx) => (
                    <option key={mName} value={mIdx}>
                      {mName}
                    </option>
                  ))}
                </select>

                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  aria-label="Seleccionar año"
                  className="rounded-lg border border-moss-200 bg-moss-50/70 px-2 py-1 text-xs font-semibold text-moss-800 cursor-pointer focus:border-moss-600 focus:outline-none focus:ring-2 focus:ring-moss-600/15"
                >
                  {Array.from({ length: 120 }, (_, i) => 1930 + i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                data-testid={testId ? `${testId}-next-month` : undefined}
                className="btn btn-ghost btn-sm btn-icon text-moss-700 hover:bg-moss-100 h-8 w-8 shrink-0"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-[11px] text-moss-500 py-2">
              {DAY_NAMES.map((dn, i) => (
                <div key={dn} className={cn(i >= 5 && 'text-moss-400')}>
                  {dn}
                </div>
              ))}
            </div>

            {/* Cuadrícula de Días */}
            <div className="grid grid-cols-7 gap-1 text-center" role="grid">
              {daysGrid.map((item) => {
                if (item.empty) {
                  return <div key={item.key} className="h-8 w-8" />;
                }

                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={item.isDisabled}
                    onClick={() => handleSelectDay(item.iso)}
                    data-testid={testId ? `${testId}-day-${item.iso}` : `calendar-day-${item.iso}`}
                    data-date={item.iso}
                    data-selected={item.isSelected}
                    className={cn(
                      'h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-xs font-semibold transition-all',
                      item.isSelected
                        ? 'bg-moss-700 text-white shadow-soft font-bold'
                        : item.isDisabled
                        ? 'text-moss-300 cursor-not-allowed opacity-40'
                        : item.isToday
                        ? 'border border-moss-500 text-moss-900 font-bold bg-moss-50 hover:bg-moss-100'
                        : 'text-moss-800 hover:bg-moss-100 cursor-pointer',
                    )}
                  >
                    {item.day}
                  </button>
                );
              })}
            </div>

            {/* Botones de acción inferior: Hoy y Limpiar */}
            <div className="mt-3 flex items-center justify-between border-t border-moss-100 pt-2.5 text-xs">
              <button
                type="button"
                onClick={handleClear}
                data-testid={testId ? `${testId}-clear-btn` : undefined}
                className="text-moss-500 hover:text-danger-600 font-medium px-2 py-1 rounded transition-colors"
              >
                Borrar
              </button>
              <button
                type="button"
                onClick={handleSelectToday}
                data-testid={testId ? `${testId}-today-btn` : undefined}
                className="text-moss-700 hover:text-moss-900 font-bold px-2 py-1 rounded bg-moss-100 hover:bg-moss-200 transition-colors"
              >
                Hoy
              </button>
            </div>
          </div>,
          document.body,
        )}

      {/* Input nativo oculto accesible para scripts de prueba (ej. Playwright .fill('2026-10-22')) */}
      <input
        ref={hiddenInputRef}
        type="date"
        id={inputId ? `${inputId}-native` : undefined}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        tabIndex={-1}
        aria-hidden="true"
        data-testid={testId ? `${testId}-native` : undefined}
        className="sr-only pointer-events-none"
      />
    </div>
  );
}
