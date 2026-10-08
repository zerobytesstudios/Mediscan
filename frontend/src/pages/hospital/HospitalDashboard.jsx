import { CalendarDays, Stethoscope, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useFetch from '../../hooks/useFetch';
import { services } from '../../services/api';
import { Card, CardBody, SectionHeader, StatCard } from '../../components/Card';
import { EmptyState, ErrorMessage, PageLoader } from '../../components/Feedback';
import AppointmentCard from '../../components/AppointmentCard';
import Button from '../../components/Button';

export default function HospitalDashboardPage() {
  const { user } = useAuth();
  const { data: stats, loading, error, reload } = useFetch(() => services.dashboard.stats());
  const { data: appointments } = useFetch(() => services.appointments.list(true));
  const { data: doctors } = useFetch(() => services.doctors.list());

  if (loading) return <PageLoader label="Loading dashboard..." />;

  const recent = (appointments || []).slice(0, 5);

  return (
    <div className="space-y-6">
      <ErrorMessage message={error} onRetry={reload} />

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {user?.full_name || 'Hospital dashboard'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          A simple overview of your doctors, patients and appointments.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Doctors" value={stats?.doctors} icon={Stethoscope} tone="blue" />
        <StatCard label="Appointments" value={stats?.appointments} icon={CalendarDays} tone="green" />
        <StatCard label="Patients" value={stats?.patients} icon={Users} tone="purple" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <SectionHeader
              title="Recent appointments"
              subtitle="Across all doctors at your hospital"
              action={
                <Link to="/hospital/appointments">
                  <Button size="sm" variant="secondary">
                    View all
                  </Button>
                </Link>
              }
            />
            {recent.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No appointments yet."
                description="Appointments booked with your doctors will appear here."
              />
            ) : (
              <div className="space-y-3">
                {recent.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <SectionHeader
              title="Your doctors"
              subtitle="Practitioners linked to this hospital"
              action={
                <Link to="/hospital/doctors">
                  <Button size="sm" variant="secondary">
                    View all
                  </Button>
                </Link>
              }
            />
            {(doctors || []).length === 0 ? (
              <EmptyState
                icon={Stethoscope}
                title="No doctors linked yet."
                description="Doctors can select your hospital from their profile page."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {(doctors || []).slice(0, 6).map((doctor) => (
                  <li key={doctor.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {doctor.full_name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {doctor.specialization || 'General Medicine'} ·{' '}
                        {doctor.experience ?? 0} yrs
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        doctor.is_verified
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {doctor.is_verified ? 'Verified' : 'Pending'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
