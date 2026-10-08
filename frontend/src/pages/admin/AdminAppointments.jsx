import { CalendarDays } from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import { services } from '../../services/api';
import AppointmentCard from '../../components/AppointmentCard';
import { EmptyState, ErrorMessage, PageLoader } from '../../components/Feedback';
import { SectionHeader } from '../../components/Card';

export default function AdminAppointmentsPage() {
  const { data, loading, error, reload } = useFetch(() => services.admin.appointments());

  if (loading) return <PageLoader label="Loading appointments..." />;

  const appointments = data || [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Appointments"
        subtitle="Every appointment booked on the platform"
        action={<CountBadge count={appointments.length} />}
      />

      <ErrorMessage message={error} onRetry={reload} />

      {appointments.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No appointments yet."
          description="Bookings made by patients will appear here."
        />
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </div>
      )}
    </div>
  );
}

function CountBadge({ count }) {
  return (
    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
      {count} total
    </span>
  );
}
