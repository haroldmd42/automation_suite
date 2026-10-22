import { LoaderCircle, Inbox } from 'lucide-react';
import { cn } from '../../utils/format';
import LocatorHint from '../qa/LocatorHint';

export function Spinner({ className, label = 'Cargando', testId }) {
  return (
    <LoaderCircle
      className={cn('h-4 w-4 animate-spin', className)}
      aria-label={label}
      role="status"
      data-testid={testId}
    />
  );
}

export function PageHeader({ icon: Icon, title, description, eyebrow, actions, testId = 'page-header', children }) {
  return (
    <header className="relative mb-8 overflow-hidden rounded-3xl card-dark p-6 sm:p-8" data-testid={testId}>
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-moss-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-moss-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-moss-400 to-moss-600 text-white shadow-lift ring-1 ring-white/20">
              <Icon className="h-7 w-7" aria-hidden />
            </div>
          )}
          <div>
            {eyebrow && (
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-moss-400">{eyebrow}</p>
            )}
            <h1 className="text-2xl font-bold text-white sm:text-3xl" data-testid={`${testId}-title`}>
              {title}
            </h1>
            {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-moss-300">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="relative mt-6">{children}</div>}
    </header>
  );
}

export function Panel({ icon: Icon, title, description, actions, testId, children, className, bodyClassName }) {
  return (
    <section className={cn('card animate-slide-up', className)} data-testid={testId}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-moss-200/80 px-5 py-4">
          <div className="flex items-start gap-3">
            {Icon && (
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moss-100 text-moss-700 ring-1 ring-moss-200">
                <Icon className="h-[18px] w-[18px]" aria-hidden />
              </div>
            )}
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold">
                {title}
                {testId && <LocatorHint testId={testId} label={title} />}
              </h2>
              {description && <p className="mt-0.5 text-sm text-moss-600">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, testId = 'empty-state' }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center" data-testid={testId}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-moss-100 text-moss-500 ring-1 ring-moss-200">
        <Icon className="h-7 w-7" aria-hidden />
      </div>
      <p className="font-display text-lg font-semibold text-moss-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-moss-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function Alert({ tone = 'info', icon: Icon, title, children, testId, className, action }) {
  const tones = {
    info: 'bg-info-50 text-info-700 ring-info-500/20',
    success: 'bg-moss-600/10 text-moss-800 ring-moss-600/25',
    warning: 'bg-warning-50 text-warning-700 ring-warning-500/30',
    error: 'bg-danger-50 text-danger-700 ring-danger-500/25',
  };
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      data-testid={testId}
      className={cn('flex items-start gap-3 rounded-xl p-3.5 text-sm ring-1 ring-inset', tones[tone], className)}
    >
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function Kbd({ children }) {
  return <kbd className="kbd">{children}</kbd>;
}
