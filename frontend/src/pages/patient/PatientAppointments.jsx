import { useLocation } from 'react-router-dom';
import { CalendarDays, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import useFetch from '../../hooks/useFetch';
import { services, errorMessage } from '../../services/api';
import AppointmentCard, { AppointmentAction } from '../../components/AppointmentCard';
import { EmptyState, ErrorMessage, PageLoader } from '../../components/Feedback';
import { SectionHeader } from '../../components/Card';

export default function PatientAppointmentsPage() {
  const location = useLocation();
  const { data, loading, error, reload, setData } = useFetch(() =>
    services.appointments.list(true)
  );
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (location.state?.booked) reload();
  }, [location.state, reload]);

  async function cancel(id) {
    if (!window.confirm('Cancel this appointment?')) return;
    setBusyId(id);
    setActionError('');
    try {
      const updated = await services.appointments.updateStatus(id, 'cancelled');
      setData((current) =>
        (current || []).map((item) => (item.id === id ? { ...item, ...updated } : item))
      );
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <PageLoader label="Loading appointments..." />;

  const appointments = data || [];
  const upcoming = appointments.filter((item) => ['pending', 'confirmed'].includes(item.status));
  const past = appointments.filter((item) => !['pending', 'confirmed'].includes(item.status));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Appointments"
        subtitle="Track and manage your bookings"
      />

      <ErrorMessage message={error || actionError} onRetry={error ? reload : undefined} />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No upcoming appointments."
            description="Find a doctor and book a visit when you are ready."
            actionLabel="Find a Doctor"
            actionTo="/patient/doctors"
          />
        ) : (
          <div className="space-y-3">
            {upcoming.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                showPerson={false}
                actions={[
                  <AppointmentAction
                    key="cancel"
                    onClick={() => cancel(appointment.id)}
                    loading={busyId === appointment.id}
                    disabled={busyId === appointment.id}
                  >
                    <XCircle className="h-4 w-4" /> Cancel
                  </AppointmentAction>,
                ]}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Past and cancelled
        </h2>
        {past.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
            No past appointments yet.
          </p>
        ) : (
          <div className="space-y-3">
            {past.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} showPerson={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
