import { CalendarDays } from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import { services } from '../../services/api';
import AppointmentCard from '../../components/AppointmentCard';
import { EmptyState, ErrorMessage, PageLoader } from '../../components/Feedback';
import { SectionHeader } from '../../components/Card';

export default function HospitalAppointmentsPage() {
  const { data, loading, error, reload } = useFetch(() => services.appointments.list(true));

  if (loading) return <PageLoader label="Loading appointments..." />;

  const appointments = data || [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Appointments"
        subtitle="All appointments across doctors at this hospital"
      />

      <ErrorMessage message={error} onRetry={reload} />

      {appointments.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No appointments yet."
          description="Bookings made with your doctors will show up here."
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
