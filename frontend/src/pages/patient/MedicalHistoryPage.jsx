import { ClipboardList, FileText, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import { services } from '../../services/api';
import { Badge, Card, CardBody, SectionHeader } from '../../components/Card';
import { EmptyState, ErrorMessage, PageLoader } from '../../components/Feedback';
import Markdown from '../../components/Markdown';

export default function MedicalHistoryPage() {
  const { data: records, loading, error, reload } = useFetch(() => services.medicalRecords.list());
  const { data: consultations } = useFetch(() => services.consultations.list());
  const { data: documents } = useFetch(() => services.documents.list());

  if (loading) return <PageLoader label="Loading your medical history..." />;

  const analysed = (documents || []).filter((doc) => doc.ai_summary);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Medical History"
        subtitle="Consultation notes, records and analysed reports in one place"
      />

      <ErrorMessage message={error} onRetry={reload} />

      <Card>
        <CardBody>
          <SectionHeader
            title="Consultation notes"
            subtitle="Notes written by doctors after your appointments"
            action={<ClipboardList className="h-5 w-5 text-slate-400" />}
          />
          {(consultations || []).length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No consultation notes yet. Notes appear here after a doctor records them.
            </p>
          ) : (
            <ul className="space-y-3">
              {(consultations || []).map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">
                      {item.doctor_name || 'Doctor'} · {item.patient_name || ''}
                    </p>
                    <Badge tone="slate">
                      {item.appointment_date
                        ? new Date(item.appointment_date).toLocaleDateString()
                        : new Date(item.created_at).toLocaleDateString()}
                      {item.appointment_time ? ` · ${item.appointment_time}` : ''}
                    </Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{item.notes}</p>
                  {item.follow_up_date && (
                    <p className="mt-2 text-xs text-brand-600">
                      Follow up suggested: {new Date(item.follow_up_date).toLocaleDateString()}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <SectionHeader
            title="Medical records"
            subtitle="Records added by your care team"
            action={<FileText className="h-5 w-5 text-slate-400" />}
          />
          {(records || []).length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No medical records yet."
              description="Records added by doctors after a consultation will appear here."
              actionLabel="Find a Doctor"
              actionTo="/patient/doctors"
            />
          ) : (
            <div className="space-y-3">
              {(records || []).map((record) => (
                <div key={record.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{record.title}</p>
                    <span className="text-xs text-slate-400">
                      {new Date(record.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {record.doctor?.full_name && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      Added by {record.doctor.full_name}
                      {record.doctor.specialization ? ` · ${record.doctor.specialization}` : ''}
                    </p>
                  )}
                  {record.notes && (
                    <p className="mt-2 text-sm text-slate-600">{record.notes}</p>
                  )}
                  {record.diagnosis_notes && (
                    <p className="mt-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Clinical notes: </span>
                      {record.diagnosis_notes}
                    </p>
                  )}
                  {record.prescription && (
                    <p className="mt-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Advice: </span>
                      {record.prescription}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <SectionHeader
            title="AI analysed reports"
            subtitle="Reports you have asked the AI to explain"
            action={<Sparkles className="h-5 w-5 text-slate-400" />}
          />
          {analysed.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No analysed reports yet. Open a document and click{' '}
              <span className="font-medium">Analyze with AI</span>.
            </p>
          ) : (
            <div className="space-y-4">
              {analysed.map((doc) => (
                <div key={doc.id} className="rounded-lg border border-brand-100 bg-brand-50/40 p-4">
                  <Link
                    to={`/patient/documents/${doc.id}`}
                    className="text-sm font-semibold text-brand-700 hover:underline"
                  >
                    {doc.filename}
                  </Link>
                  <div className="mt-1 max-h-40 overflow-y-auto">
                    <Markdown content={doc.ai_summary} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
