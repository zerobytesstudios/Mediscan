import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Phone, Users } from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import { services } from '../../services/api';
import { Badge, Card, CardBody, SectionHeader } from '../../components/Card';
import { EmptyState, ErrorMessage, PageLoader } from '../../components/Feedback';
import { DoctorAvatar } from '../../components/DoctorCard';

export default function DoctorPatientsPage() {
  const navigate = useNavigate();
  const { data: appointments, loading, error, reload } = useFetch(() =>
    services.appointments.list(true)
  );
  const { data: records } = useFetch(() => services.medicalRecords.list());
  const { data: documents } = useFetch(() => services.documents.list());

  if (loading) return <PageLoader label="Loading patients..." />;

  const map = new Map();
  (appointments || []).forEach((appointment) => {
    if (!appointment.patient) return;
    const existing = map.get(appointment.patient.id);
    if (existing) {
      existing.appointments += 1;
      const date = new Date(appointment.appointment_date);
      if (!existing.lastVisit || date > existing.lastVisit) existing.lastVisit = date;
    } else {
      map.set(appointment.patient.id, {
        ...appointment.patient,
        appointments: 1,
        lastVisit: new Date(appointment.appointment_date),
      });
    }
  });

  const patients = [...map.values()];
  const recordCount = (id) => (records || []).filter((item) => item.patient_id === id).length;
  const documentCount = (id) => (documents || []).filter((item) => item.patient_id === id).length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Patients"
        subtitle="Patients who have booked an appointment with you"
      />

      <ErrorMessage message={error} onRetry={reload} />

      {patients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No patients yet."
          description="Patients appear here once they book an appointment with you."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {patients.map((patient) => (
            <Card key={patient.id} className="p-5">
              <div className="flex items-center gap-3">
                <DoctorAvatar name={patient.full_name} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {patient.full_name}
                  </p>
                  <p className="truncate text-xs text-slate-500">{patient.email}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="blue">{patient.appointments} appointments</Badge>
                <Badge tone="slate">{recordCount(patient.id)} records</Badge>
                <Badge tone="slate">{documentCount(patient.id)} documents</Badge>
              </div>

              <dl className="mt-4 space-y-1.5 text-xs text-slate-500">
                <div className="flex justify-between">
                  <dt>Gender</dt>
                  <dd className="font-medium text-slate-700">{patient.gender || 'Not set'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Blood group</dt>
                  <dd className="font-medium text-slate-700">{patient.blood_group || 'Not set'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Allergies</dt>
                  <dd className="max-w-[60%] truncate font-medium text-slate-700">
                    {patient.allergies || 'None recorded'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Last appointment</dt>
                  <dd className="font-medium text-slate-700">
                    {patient.lastVisit.toLocaleDateString()}
                  </dd>
                </div>
              </dl>

              <Link
                to="/doctor/consultations"
                className="mt-4 block rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                View consultation history
              </Link>

              {patient.user_id && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/doctor/messages?peer=${patient.user_id}&name=${encodeURIComponent(patient.full_name)}`
                      )
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Message
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/doctor/messages?peer=${patient.user_id}&name=${encodeURIComponent(patient.full_name)}&call=1`
                      )
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <Phone className="h-3.5 w-3.5" /> Call
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
