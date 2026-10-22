import { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { BLOCKED_HOLIDAYS, BLACKOUT_RANGES } from './controlsData';
import {
  toISODate,
  fromISODate,
  formatDateES,
  startOfDay,
  addDays,
  diffDays,
  cn,
} from '../../utils/format';
import LocatorHint from '../../components/qa/LocatorHint';
import { Alert } from '../../components/ui/Primitives';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

export default function AdvancedDatePicker() {
  const today = useMemo(() => startOfDay(new Date()), []);

  // 1. Calendario Simple: Navegación de mes y fecha elegida
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  // 2. Rango de Fechas
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  // Generar cuadrícula de días para el mes visible
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Días del mes (1 - 31)
    const daysInMonth = lastDayOfMonth.getDate();

    // Día de inicio (0 = Domingo -> ajustado a 1 = Lunes ... 7 = Domingo)
    let startDayOfWeek = firstDayOfMonth.getDay();
    if (startDayOfWeek === 0) startDayOfWeek = 7; // Domingo al final

    const days = [];

    // Celdas vacías antes del primer día
    for (let i = 1; i < startDayOfWeek; i++) {
      days.push({ empty: true, key: `empty-${i}` });
    }

    // Días reales
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const iso = toISODate(dateObj);
      const dayOfWeek = dateObj.getDay(); // 0 = Dom, 6 = Sáb
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isPast = dateObj < today;
      const isHoliday = BLOCKED_HOLIDAYS.includes(iso);

      let disabledReason = null;
      if (isPast) disabledReason = 'Fecha pasada';
      else if (isWeekend) disabledReason = 'Fin de semana inhabilitado';
      else if (isHoliday) disabledReason = 'Feriado oficial no laborable';

      days.push({
        day: d,
        date: dateObj,
        iso,
        isWeekend,
        isPast,
        isHoliday,
        isDisabled: !!disabledReason,
        disabledReason,
        key: iso,
      });
    }

    return days;
  }, [currentYear, currentMonth, today]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Validación de Rango de Fechas
  const rangeValidation = useMemo(() => {
    if (!rangeStart || !rangeEnd) return { valid: false, error: null, days: 0 };
    const dStart = fromISODate(rangeStart);
    const dEnd = fromISODate(rangeEnd);
    if (!dStart || !dEnd) return { valid: false, error: 'Formato de fecha inválido', days: 0 };

    if (dEnd <= dStart) {
      return {
        valid: false,
        error: 'La fecha de fin debe ser posterior a la fecha de inicio.',
        days: 0,
      };
    }

    const daysCount = diffDays(dStart, dEnd);
    if (daysCount > 30) {
      return {
        valid: false,
        error: 'El período no puede exceder los 30 días naturales.',
        days: daysCount,
      };
    }

    // Comprobar conflicto con BLACKOUT_RANGES
    for (const b of BLACKOUT_RANGES) {
      const bStart = fromISODate(b.start);
      const bEnd = fromISODate(b.end);
      // Condición de solapamiento: (StartA <= EndB) and (EndA >= StartB)
      if (dStart <= bEnd && dEnd >= bStart) {
        return {
          valid: false,
          error: `El rango se solapa con un período bloqueado: "${b.reason}" (${formatDateES(bStart)} - ${formatDateES(bEnd)}).`,
          days: daysCount,
          blackoutConflict: b,
        };
      }
    }

    return { valid: true, error: null, days: daysCount };
  }, [rangeStart, rangeEnd]);

  return (
    <div data-testid="advanced-datepicker-root" className="space-y-8">
      {/* SECCIÓN 1: CALENDARIO PERSONALIZADO CON REGLAS DE NEGOCIO */}
      <section className="card p-6 space-y-5" data-testid="custom-calendar-section">
        <div className="flex items-center justify-between border-b border-moss-200/80 pb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-moss-600" />
            <h3 className="text-lg font-bold text-moss-900">
              1. Selector de Fecha con Reglas Estrictas
            </h3>
          </div>
          <LocatorHint testId="datepicker-selected-date" label="fecha seleccionada" />
        </div>

        <p className="text-sm text-moss-600">
          Reglas: Fines de semana bloqueados, fechas pasadas inhabilitadas y feriados nacionales
          restringidos.
        </p>

        {/* Contenedor del Calendario */}
        <div className="max-w-md mx-auto rounded-2xl border border-moss-300 bg-white p-4 shadow-soft">
          {/* Cabecera del Mes y Controles */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              data-testid="datepicker-prev-month-btn"
              className="btn btn-secondary btn-sm btn-icon"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h4
              data-testid="datepicker-month-heading"
              className="font-display font-bold text-base text-moss-900"
            >
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h4>
            <button
              type="button"
              onClick={handleNextMonth}
              data-testid="datepicker-next-month-btn"
              className="btn btn-secondary btn-sm btn-icon"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-moss-500 mb-2">
            {DAY_NAMES.map((dn, i) => (
              <div key={dn} className={cn(i >= 5 && 'text-moss-400')}>
                {dn}
              </div>
            ))}
          </div>

          {/* Celdas de días */}
          <div className="grid grid-cols-7 gap-1 text-center" role="grid">
            {calendarDays.map((item) => {
              if (item.empty) {
                return <div key={item.key} className="h-9 w-9" />;
              }

              const isSelected = selectedDate === item.iso;

              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={item.isDisabled}
                  onClick={() => setSelectedDate(item.iso)}
                  data-testid={`date-cell-${item.iso}`}
                  data-disabled={item.isDisabled}
                  data-reason={item.disabledReason || 'available'}
                  title={item.disabledReason || `Seleccionar ${item.iso}`}
                  className={cn(
                    'h-9 w-9 mx-auto flex items-center justify-center rounded-xl text-xs font-semibold transition-all',
                    isSelected
                      ? 'bg-moss-700 text-white shadow-soft ring-2 ring-moss-500'
                      : item.isDisabled
                      ? item.isHoliday
                        ? 'bg-danger-50 text-danger-400 line-through cursor-not-allowed'
                        : item.isWeekend
                        ? 'bg-moss-100/60 text-moss-400 cursor-not-allowed'
                        : 'text-moss-400 cursor-not-allowed opacity-50'
                      : 'text-moss-900 hover:bg-moss-200 hover:text-moss-900 cursor-pointer',
                  )}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* Leyenda explicativa */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-moss-100 pt-3 text-[11px] text-moss-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-moss-600" /> Disponible
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-moss-300" /> Fin de semana
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-danger-400" /> Feriado oficial
            </span>
          </div>
        </div>

        {/* Salida de la fecha seleccionada */}
        <div className="rounded-xl bg-moss-50 p-3 flex items-center justify-between text-sm">
          <span className="text-moss-700 font-medium">Fecha elegida:</span>
          {selectedDate ? (
            <span
              data-testid="datepicker-selected-date"
              className="font-mono font-bold text-moss-900"
            >
              {selectedDate} ({formatDateES(fromISODate(selectedDate))})
            </span>
          ) : (
            <span className="text-moss-500 italic">Ninguna fecha seleccionada</span>
          )}
        </div>
      </section>

      {/* SECCIÓN 2: SELECTOR DE RANGO CON DETECCIÓN DE FECHAS BLOQUEADAS */}
      <section className="card p-6 space-y-5" data-testid="range-picker-section">
        <div className="flex items-center justify-between border-b border-moss-200/80 pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-moss-600" />
            <h3 className="text-lg font-bold text-moss-900">
              2. Rango de Fechas (Inicio y Término)
            </h3>
          </div>
          <LocatorHint testId="range-days-count" />
        </div>

        <p className="text-sm text-moss-600">
          Valida que la fecha final sea estrictamente mayor, no exceda 30 días y no cruce períodos
          en mantenimiento o cierre fiscal.
        </p>

        {/* Períodos bloqueados visibles para el tester */}
        <div className="rounded-xl border border-warning-200 bg-warning-50/70 p-3 text-xs text-warning-800 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-warning-600" /> Períodos restringidos del sistema:
          </p>
          <ul className="list-disc list-inside space-y-0.5 ml-1">
            {BLACKOUT_RANGES.map((b) => (
              <li key={b.reason}>
                <strong>{b.reason}:</strong> del {b.start} al {b.end}
              </li>
            ))}
          </ul>
        </div>

        {/* Entradas de Rango */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="range-start-input" className="label">
              <span>Fecha de Inicio</span>
              <LocatorHint testId="range-start-input" />
            </label>
            <input
              id="range-start-input"
              type="date"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              data-testid="range-start-input"
              className="input font-mono"
            />
          </div>

          <div>
            <label htmlFor="range-end-input" className="label">
              <span>Fecha de Finalización</span>
              <LocatorHint testId="range-end-input" />
            </label>
            <input
              id="range-end-input"
              type="date"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              data-testid="range-end-input"
              className="input font-mono"
            />
          </div>
        </div>

        {/* Alerta de Error en Rango */}
        {rangeValidation.error && (
          <Alert
            tone="error"
            icon={AlertTriangle}
            title="Validación de Rango Fallida"
            testId="range-error-alert"
          >
            <span>{rangeValidation.error}</span>
          </Alert>
        )}

        {/* Resultado Exitoso */}
        {rangeValidation.valid && (
          <div
            data-testid="range-success-box"
            className="rounded-xl bg-moss-600/10 border border-moss-600/30 p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-moss-600" />
              <div>
                <p className="text-xs font-semibold uppercase text-moss-600">Rango Aceptado</p>
                <p className="text-sm font-bold text-moss-900">
                  {rangeStart} → {rangeEnd}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-moss-600">Duración:</span>
              <strong
                data-testid="range-days-count"
                className="ml-1.5 font-mono text-base font-extrabold text-moss-900"
              >
                {rangeValidation.days} días
              </strong>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
