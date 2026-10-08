import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, ClipboardList, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useFetch from '../../hooks/useFetch';
import { services } from '../../services/api';
import { Card, CardBody, SectionHeader, StatCard } from '../../components/Card';
import { EmptyState, ErrorMessage, PageLoader } from '../../components/Feedback';
import Button from '../../components/Button';
import AppointmentCard from '../../components/AppointmentCard';

export default function DoctorDashboardPage() {
  const { user } = useAuth();
  const { data: stats, loading, error, reload } = useFetch(() => services.dashboard.stats());
  const { data: appointments } = useFetch(() => services.appointments.list(true));

  if (loading) return <PageLoader label="Loading your dashboard..." />;

  const upcoming = (appointments || [])
    .filter((item) => ['pending', 'confirmed'].includes(item.status))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <ErrorMessage message={error} onRetry={reload} />

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome back, {user?.full_name?.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {stats?.is_verified
            ? 'Your profile is verified and visible to patients.'
            : 'Your profile is pending verification by the admin team.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Appointments" value={stats?.appointments} icon={CalendarDays} tone="blue" />
        <StatCard
          label="Upcoming Appointments"
          value={stats?.upcoming_appointments}
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard label="Patients" value={stats?.patients} icon={Users} tone="purple" />
        <StatCard
          label="Recent Consultations"
          value={stats?.consultations}
          icon={ClipboardList}
          tone="amber"
        />
      </div>

      <Card>
        <CardBody>
          <SectionHeader
            title="Upcoming appointments"
            subtitle="Confirm, complete or review your scheduled visits"
            action={
              <Link to="/doctor/appointments">
                <Button size="sm" variant="secondary">
                  View all
                </Button>
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming appointments."
              description="New booking requests will appear here."
            />
          ) : (
            <div className="space-y-3">
              {upcoming.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
