import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import { Field, Input } from '../../components/Input';
import { ErrorMessage } from '../../components/Feedback';
import { HOME_BY_ROLE } from '../../components/ProtectedRoute';
import { errorMessage } from '../../services/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.email || !form.password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await login(form.email.trim(), form.password);
      const from = location.state?.from;
      navigate(from && from !== '/' ? from : HOME_BY_ROLE[user.role] || '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="rounded-lg bg-brand-600 p-1.5 text-white">
            <Activity className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold text-slate-900">Mediscan AI</span>
        </Link>

        <div className="card p-7">
          <h1 className="text-xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your Mediscan AI account.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <ErrorMessage message={error} />

            <Field label="Email address" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-10"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Button type="submit" loading={loading} className="w-full">
              <LogIn className="h-4 w-4" /> Sign in
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            No account yet?{' '}
            <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">
              Create one
            </Link>
          </p>
        </div>

        <div className="card mt-4 p-4 text-xs text-slate-500">
          <p className="font-medium text-slate-700">Demo accounts (seeded, fake data)</p>
          <ul className="mt-2 space-y-1">
            <li>Admin · admin@mediscan.local / Admin@123</li>
            <li>Doctor · doctor1.demo@mediscan.local / Demo@123</li>
            <li>Patient · patient1.demo@mediscan.local / Demo@123</li>
            <li>Hospital · hospital.demo@mediscan.local / Demo@123</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
