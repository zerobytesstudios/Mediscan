import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import { services } from '../../services/api';
import { Badge, Card, CardBody, SectionHeader } from '../../components/Card';
import { EmptyState, ErrorMessage, PageLoader } from '../../components/Feedback';

export default function DoctorConsultationsPage() {
  const { data, loading, error, reload } = useFetch(() => services.consultations.list());

  if (loading) return <PageLoader label="Loading consultations..." />;

  const consultations = data || [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Consultations"
        subtitle="Notes you have written after appointments"
        action={
          <Link to="/doctor/appointments">
            <span className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
              Go to appointments
            </span>
          </Link>
        }
      />

      <ErrorMessage message={error} onRetry={reload} />

      {consultations.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No consultation notes yet."
          description="Open an appointment and click Notes to write your first consultation record."
          actionLabel="Open Appointments"
          actionTo="/doctor/appointments"
        />
      ) : (
        <div className="space-y-4">
          {consultations.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.patient_name || `Patient #${item.patient_id}`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Appointment{' '}
                    {item.appointment_date
                      ? new Date(item.appointment_date).toLocaleDateString()
                      : ''}{' '}
                    {item.appointment_time ? `at ${item.appointment_time}` : ''} · recorded{' '}
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                {item.follow_up_date && (
                  <Badge tone="amber">
                    Follow-up {new Date(item.follow_up_date).toLocaleDateString()}
                  </Badge>
                )}
              </div>
              <CardBody className="p-0 pt-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {item.notes}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
