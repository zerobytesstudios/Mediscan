import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import { Field, Input, Select } from '../../components/Input';
import { ErrorMessage } from '../../components/Feedback';
import { HOME_BY_ROLE } from '../../components/ProtectedRoute';
import { errorMessage } from '../../services/api';

const ROLES = [
  { value: 'patient', label: 'Patient - manage my reports and appointments' },
  { value: 'doctor', label: 'Doctor - manage appointments and consultations' },
  { value: 'hospital', label: 'Hospital - manage doctors and overview' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    role: 'patient',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.full_name || !form.email || !form.password) {
      setError('Please fill in your name, email and password.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const user = await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || null,
        role: form.role,
      });
      navigate(HOME_BY_ROLE[user.role] || '/', { replace: true });
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
          <h1 className="text-xl font-semibold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Admin accounts cannot be self-registered.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <ErrorMessage message={error} />

            <Field label="Full name" htmlFor="full_name">
              <Input
                id="full_name"
                autoComplete="name"
                placeholder="Jane Doe"
                value={form.full_name}
                onChange={(event) => update('full_name', event.target.value)}
              />
            </Field>

            <Field label="Email address" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
              />
            </Field>

            <Field label="Phone (optional)" htmlFor="phone">
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+91-9876543210"
                value={form.phone}
                onChange={(event) => update('phone', event.target.value)}
              />
            </Field>

            <Field label="I am registering as" htmlFor="role">
              <Select
                id="role"
                value={form.role}
                onChange={(event) => update('role', event.target.value)}
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Password" htmlFor="password" hint="Min. 6 characters">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="pr-10"
                  value={form.password}
                  onChange={(event) => update('password', event.target.value)}
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

            <Field label="Confirm password" htmlFor="confirm">
              <Input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={form.confirm}
                onChange={(event) => update('confirm', event.target.value)}
              />
            </Field>

            <Button type="submit" loading={loading} className="w-full">
              <UserPlus className="h-4 w-4" /> Create account
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
