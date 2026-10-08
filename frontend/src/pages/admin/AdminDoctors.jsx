import { Stethoscope } from 'lucide-react';
import { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import { services, errorMessage } from '../../services/api';
import { Badge, Card, SectionHeader } from '../../components/Card';
import { EmptyState, ErrorMessage, PageLoader } from '../../components/Feedback';
import Button from '../../components/Button';
import { DoctorAvatar } from '../../components/DoctorCard';

export default function AdminDoctorsPage() {
  const { data, loading, error, reload, setData } = useFetch(() => services.admin.doctors());
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  async function toggle(doctor) {
    setBusyId(doctor.id);
    setActionError('');
    try {
      const updated = await services.admin.verifyDoctor(doctor.id, !doctor.is_verified);
      setData((current) =>
        (current || []).map((item) => (item.id === doctor.id ? { ...item, ...updated } : item))
      );
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <PageLoader label="Loading doctors..." />;

  const doctors = data || [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Doctors"
        subtitle="Approve or revoke doctor verification"
        action={<Badge tone="amber">{doctors.filter((d) => !d.is_verified).length} pending</Badge>}
      />

      <ErrorMessage message={error || actionError} onRetry={error ? reload : undefined} />

      {doctors.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No doctors registered."
          description="Doctors appear here when they register on the platform."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {doctors.map((doctor) => (
            <Card key={doctor.id} className="p-5">
              <div className="flex items-start gap-3">
                <DoctorAvatar name={doctor.full_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {doctor.full_name}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {doctor.specialization || 'General Medicine'}
                  </p>
                  <p className="truncate text-xs text-slate-400">{doctor.email}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={doctor.is_verified ? 'green' : 'amber'}>
                  {doctor.is_verified ? 'Verified' : 'Pending'}
                </Badge>
                <Badge tone="blue">{doctor.experience ?? 0} yrs</Badge>
                <Badge tone="slate">Fee {doctor.consultation_fee ?? 0}</Badge>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                {doctor.qualification || 'Qualification not provided'}
                {doctor.hospital ? ` · ${doctor.hospital.name}` : ''}
              </p>

              <Button
                size="sm"
                variant={doctor.is_verified ? 'secondary' : 'primary'}
                className="mt-4 w-full"
                loading={busyId === doctor.id}
                onClick={() => toggle(doctor)}
              >
                {doctor.is_verified ? 'Revoke verification' : 'Approve doctor'}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
