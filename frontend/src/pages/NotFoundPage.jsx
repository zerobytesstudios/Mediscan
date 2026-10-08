import { Link } from 'react-router-dom';
import { Activity, Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <span className="rounded-full bg-brand-100 p-4 text-brand-600">
        <Compass className="h-8 w-8" />
      </span>
      <h1 className="mt-5 text-3xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        <Activity className="h-4 w-4" /> Back to home
      </Link>
    </div>
  );
}
