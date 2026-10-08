import { HeartPulse } from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import { services } from '../../services/api';
import { Badge, Card, SectionHeader } from '../../components/Card';
import { EmptyState, ErrorMessage, PageLoader } from '../../components/Feedback';

export default function AdminHospitalsPage() {
  const { data, loading, error, reload } = useFetch(() => services.admin.hospitals());

  if (loading) return <PageLoader label="Loading hospitals..." />;

  const hospitals = data || [];

  return (
    <div className="space-y-6">
      <SectionHeader title="Hospitals" subtitle="Registered healthcare facilities" />

      <ErrorMessage message={error} onRetry={reload} />

      {hospitals.length === 0 ? (
        <EmptyState
          icon={HeartPulse}
          title="No hospitals registered."
          description="Hospital accounts appear here once they sign up."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {hospitals.map((hospital) => (
            <Card key={hospital.id} className="p-5">
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-brand-50 p-2.5 text-brand-600">
                  <HeartPulse className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{hospital.name}</p>
                  <p className="truncate text-xs text-slate-500">{hospital.phone || 'No phone'}</p>
                </div>
              </div>
              {hospital.address && (
                <p className="mt-3 text-xs text-slate-500">{hospital.address}</p>
              )}
              {hospital.description && (
                <p className="mt-2 text-sm text-slate-600">{hospital.description}</p>
              )}
              <div className="mt-4">
                <Badge tone="blue">
                  Added {new Date(hospital.created_at).toLocaleDateString()}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
