import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { services } from '../services/api';
import { LoadingSpinner } from './Feedback';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setItems(await services.notifications.list());
    } catch {
      setError('Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 45000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = items.filter((item) => !item.is_read).length;

  async function markAll() {
    try {
      await services.notifications.markAllRead();
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    } catch {
      setError('Could not update notifications.');
    }
  }

  async function markOne(id) {
    try {
      await services.notifications.markRead(id);
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, is_read: true } : item))
      );
    } catch {
      setError('Could not update notification.');
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && <LoadingSpinner label="Loading notifications..." className="py-6" />}
            {!loading && error && <p className="px-4 py-4 text-sm text-rose-600">{error}</p>}
            {!loading && !error && items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                You have no notifications yet.
              </p>
            )}
            {!loading &&
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => !item.is_read && markOne(item.id)}
                  className={`block w-full border-b border-slate-50 px-4 py-3 text-left transition last:border-0 ${
                    item.is_read ? 'bg-white' : 'bg-brand-50/50 hover:bg-brand-50'
                  }`}
                >
                  <p className="text-sm font-medium text-slate-800">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.message}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
