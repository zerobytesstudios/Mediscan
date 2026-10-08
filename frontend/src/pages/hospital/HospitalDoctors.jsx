import { Stethoscope } from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import { services } from '../../services/api';
import { EmptyState, ErrorMessage, PageLoader } from '../../components/Feedback';
import { Badge, SectionHeader } from '../../components/Card';
import { DoctorAvatar } from '../../components/DoctorCard';

export default function HospitalDoctorsPage() {
  const { data, loading, error, reload } = useFetch(() => services.doctors.list());
  if (loading) return <PageLoader label="Loading doctors..." />;

  const doctors = data || [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Doctors"
        subtitle="All doctors in the Mediscan AI directory"
      />

      <ErrorMessage message={error} onRetry={reload} />

      {doctors.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No doctors found."
          description="Doctors appear here once they register and complete their profile."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {doctors.map((doctor) => (
            <div key={doctor.id} className="card p-5">
              <div className="flex items-start gap-3">
                <DoctorAvatar name={doctor.full_name} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {doctor.full_name}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {doctor.specialization || 'General Medicine'}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {doctor.qualification || 'Qualification not provided'}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={doctor.is_verified ? 'green' : 'amber'}>
                  {doctor.is_verified ? 'Verified' : 'Pending verification'}
                </Badge>
                <Badge tone="blue">{doctor.experience ?? 0} yrs</Badge>
                <Badge tone="slate">Fee {doctor.consultation_fee ?? 0}</Badge>
              </div>

              {doctor.hospital && (
                <p className="mt-3 text-xs text-slate-500">Hospital: {doctor.hospital.name}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
