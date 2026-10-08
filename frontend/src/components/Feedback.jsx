import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LoadingSpinner({ label = 'Loading...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-10 text-slate-500 ${className}`}>
      <Loader2 className="h-7 w-7 animate-spin text-brand-600" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function PageLoader({ label = 'Loading...' }) {
  return (
    <div className="card p-6">
      <LoadingSpinner label={label} />
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

export function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <p>{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 font-medium underline underline-offset-2"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title, description, actionLabel, actionTo, onAction, icon: Icon }) {
  const Body = (
    <>
      {Icon && (
        <span className="rounded-full bg-slate-100 p-3 text-slate-400">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {(actionTo || onAction) && (
        <span className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition group-hover:bg-brand-700">
          {actionLabel}
        </span>
      )}
    </>
  );

  const classes =
    'group flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center';

  if (actionTo) {
    return (
      <Link to={actionTo} className={classes}>
        {Body}
      </Link>
    );
  }
  if (onAction) {
    return (
      <button type="button" onClick={onAction} className={classes}>
        {Body}
      </button>
    );
  }
  return <div className={classes}>{Body}</div>;
}
