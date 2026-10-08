import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  CalendarDays,
  ClipboardList,
  FileText,
  HeartPulse,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquareText,
  Search,
  Stethoscope,
  Users,
  UserSquare2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import { DoctorAvatar } from '../components/DoctorCard';
import { HOME_BY_ROLE } from '../components/ProtectedRoute';

const NAV = {
  patient: [
    { to: '/patient/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/patient/profile', label: 'My Profile', icon: UserSquare2 },
    { to: '/patient/documents', label: 'Medical Documents', icon: FileText },
    { to: '/patient/ai-assistant', label: 'AI Assistant', icon: MessageSquareText },
    { to: '/patient/doctors', label: 'Find Doctors', icon: Search },
    { to: '/patient/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/patient/messages', label: 'Messages', icon: MessageCircle },
    { to: '/patient/medical-history', label: 'Medical History', icon: History },
  ],
  doctor: [
    { to: '/doctor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/doctor/profile', label: 'Profile', icon: UserSquare2 },
    { to: '/doctor/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/doctor/patients', label: 'Patients', icon: Users },
    { to: '/doctor/consultations', label: 'Consultations', icon: ClipboardList },
    { to: '/doctor/messages', label: 'Messages', icon: MessageCircle },
    { to: '/doctor/ai-assistant', label: 'AI Assistant', icon: MessageSquareText },
  ],
  hospital: [
    { to: '/hospital/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/hospital/doctors', label: 'Doctors', icon: Stethoscope },
    { to: '/hospital/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/hospital/profile', label: 'Profile', icon: UserSquare2 },
    { to: '/hospital/ai-assistant', label: 'AI Assistant', icon: MessageSquareText },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/doctors', label: 'Doctors', icon: Stethoscope },
    { to: '/admin/hospitals', label: 'Hospitals', icon: HeartPulse },
    { to: '/admin/appointments', label: 'Appointments', icon: CalendarDays },
  ],
};

const ROLE_LABEL = {
  patient: 'Patient',
  doctor: 'Doctor',
  hospital: 'Hospital',
  admin: 'Administrator',
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const items = NAV[user?.role] || [];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Link
            to={HOME_BY_ROLE[user?.role] || '/'}
            className="flex items-center gap-2"
            onClick={() => setMobileOpen(false)}
          >
            <span className="rounded-lg bg-brand-600 p-1.5 text-white">
              <Activity className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">Mediscan AI</span>
          </Link>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-5 w-5" /> Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{user?.full_name}</p>
              <p className="text-xs text-slate-500">{ROLE_LABEL[user?.role]}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
              <DoctorAvatar name={user?.full_name} size="h-7 w-7" />
              <span className="hidden max-w-[10rem] truncate text-xs font-medium text-slate-700 sm:block">
                {user?.email}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-6" key={location.pathname}>
          <Outlet />
        </main>

        <footer className="border-t border-slate-200 bg-white px-6 py-3 text-center text-xs text-slate-400">
          Mediscan AI MVP · Educational information only · Not a substitute for professional
          medical advice
        </footer>
      </div>
    </div>
  );
}
