import { Link } from 'react-router-dom';
import {
  BrainCircuit,
  CalendarDays,
  ClipboardList,
  FileText,
  Search,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useFetch from '../../hooks/useFetch';
import { services } from '../../services/api';
import { StatCard, Card, CardBody, SectionHeader, Badge } from '../../components/Card';
import { EmptyState, ErrorMessage, PageLoader } from '../../components/Feedback';
import Button from '../../components/Button';
import { statusLabel } from '../../components/AppointmentCard';

export default function PatientDashboard() {
  const { user } = useAuth();
  const { data: stats, loading, error, reload } = useFetch(() => services.dashboard.stats());
  const { data: documents } = useFetch(() => services.documents.list());
  const { data: appointments } = useFetch(() => services.appointments.list(true));

  if (loading) return <PageLoader label="Loading your dashboard..." />;

  const upcoming = (appointments || [])
    .filter((item) => ['pending', 'confirmed'].includes(item.status))
    .slice(0, 3);
  const recentDocuments = (documents || []).slice(0, 4);

  const quickActions = [
    { to: '/patient/documents', label: 'Upload Report', icon: Upload },
    { to: '/patient/doctors', label: 'Find Doctor', icon: Search },
    { to: '/patient/appointments', label: 'Book Appointment', icon: CalendarDays },
    { to: '/patient/ai-assistant', label: 'Ask AI', icon: BrainCircuit },
  ];

  return (
    <div className="space-y-6">
      <ErrorMessage message={error} onRetry={reload} />

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome back, {user?.full_name?.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here is a quick overview of your health information.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Documents" value={stats?.documents} icon={FileText} tone="blue" />
        <StatCard
          label="Upcoming Appointments"
          value={stats?.upcoming_appointments}
          icon={CalendarDays}
          tone="green"
        />
        <StatCard
          label="Medical Records"
          value={stats?.medical_records}
          icon={ClipboardList}
          tone="purple"
        />
        <StatCard label="AI Analyses" value={stats?.ai_analyses} icon={Sparkles} tone="amber" />
      </div>

      <Card>
        <CardBody>
          <SectionHeader title="Quick actions" subtitle="Jump straight into a task" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                <action.icon className="h-5 w-5" />
                {action.label}
              </Link>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <SectionHeader
              title="Recent documents"
              subtitle="Your latest uploaded reports"
              action={
                <Link to="/patient/documents">
                  <Button size="sm" variant="secondary">
                    View all
                  </Button>
                </Link>
              }
            />
            {recentDocuments.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No medical documents yet."
                description="Upload your first report to see it here and analyse it with AI."
                actionLabel="Upload Your First Report"
                actionTo="/patient/documents"
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentDocuments.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link
                        to={`/patient/documents/${doc.id}`}
                        className="block truncate text-sm font-medium text-slate-800 hover:text-brand-600"
                      >
                        {doc.filename}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {doc.document_type || 'Document'} ·{' '}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge tone={doc.ai_summary ? 'blue' : 'slate'}>
                      {doc.ai_summary ? 'Analysed' : 'Not analysed'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <SectionHeader
              title="Upcoming appointments"
              subtitle="Your next confirmed and pending visits"
              action={
                <Link to="/patient/appointments">
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
                description="Find a doctor and book a visit when you are ready."
                actionLabel="Find a Doctor"
                actionTo="/patient/doctors"
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.map((appt) => (
                  <li key={appt.id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {appt.doctor?.full_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(appt.appointment_date).toLocaleDateString()} at{' '}
                          {appt.appointment_time} ·{' '}
                          {appt.consultation_mode === 'online' ? 'Online' : 'In-person'}
                        </p>
                      </div>
                      <Badge
                        tone={
                          appt.status === 'confirmed'
                            ? 'blue'
                            : appt.status === 'completed'
                              ? 'green'
                              : appt.status === 'cancelled'
                                ? 'red'
                                : 'amber'
                        }
                      >
                        {statusLabel(appt.status)}
                      </Badge>
                    </div>
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
