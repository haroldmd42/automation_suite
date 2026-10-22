import { CircleAlert } from 'lucide-react';
import { cn } from '../../utils/format';
import LocatorHint from '../qa/LocatorHint';

/**
 * Envoltorio de campo de formulario: etiqueta + control + error + ayuda +
 * ícono de localizador. El `testId` corresponde al control (input/select).
 * El mensaje de error expone `${testId}-error`.
 */
export function Field({ label, htmlFor, testId, error, hint, required, optional, children, className, labelExtra }) {
  return (
    <div className={cn('min-w-0', className)} data-field={testId}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          <span>
            {label}
            {required && (
              <span className="ml-0.5 text-danger-600" aria-hidden>
                *
              </span>
            )}
            {optional && <span className="ml-1 text-xs font-normal text-moss-500">(opcional)</span>}
          </span>
          {testId && <LocatorHint testId={testId} label={typeof label === 'string' ? label : undefined} />}
          {labelExtra && <span className="ml-auto">{labelExtra}</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="field-error" role="alert" id={htmlFor ? `${htmlFor}-error` : undefined} data-testid={testId ? `${testId}-error` : undefined}>
          <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="field-hint" id={htmlFor ? `${htmlFor}-hint` : undefined}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function inputCls(error, extra) {
  return cn('input', error && 'input-error', extra);
}

export function Checkbox({ id, checked, onChange, label, testId, disabled, indeterminate, description, error }) {
  return (
    <div>
      <label
        htmlFor={id}
        className={cn(
          'flex cursor-pointer items-start gap-2.5 text-sm text-moss-800',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <input
          id={id}
          type="checkbox"
          className="checkbox mt-0.5"
          checked={!!checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked, e)}
          data-testid={testId}
          aria-invalid={!!error}
          ref={(el) => {
            if (el) el.indeterminate = !!indeterminate;
          }}
        />
        <span>
          <span className="flex items-center gap-1.5">
            {label}
            {testId && <LocatorHint testId={testId} />}
          </span>
          {description && <span className="mt-0.5 block text-xs text-moss-600">{description}</span>}
        </span>
      </label>
      {error && (
        <p className="field-error" role="alert" data-testid={testId ? `${testId}-error` : undefined}>
          <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

export function Toggle({ id, checked, onChange, label, testId, disabled, description }) {
  return (
    <div className={cn('flex items-start justify-between gap-4', disabled && 'opacity-55')}>
      <div>
        <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-medium text-moss-900">
          {label}
          {testId && <LocatorHint testId={testId} />}
        </label>
        {description && <p className="text-xs text-moss-600">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={!!checked}
        disabled={disabled}
        data-testid={testId}
        data-state={checked ? 'on' : 'off'}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed',
          checked ? 'bg-moss-600' : 'bg-moss-300',
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
