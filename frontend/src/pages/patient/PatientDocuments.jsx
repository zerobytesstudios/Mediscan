import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload } from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import { services, errorMessage } from '../../services/api';
import Button from '../../components/Button';
import DocumentCard from '../../components/DocumentCard';
import Modal from '../../components/Modal';
import { Field, Input, Select } from '../../components/Input';
import FileUpload from '../../components/FileUpload';
import { EmptyState, ErrorMessage, PageLoader } from '../../components/Feedback';
import { SectionHeader } from '../../components/Card';

const TYPES = [
  'Lab Report',
  'Prescription',
  'Radiology',
  'Discharge Summary',
  'Vaccination',
  'Other',
];

export default function PatientDocumentsPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload, setData } = useFetch(() => services.documents.list());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState(TYPES[0]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  async function handleUpload(event) {
    event.preventDefault();
    if (!file) {
      setUploadError('Choose a file first.');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const created = await services.documents.upload(file, docType, setProgress);
      setData((current) => [created, ...(current || [])]);
      setUploadOpen(false);
      setFile(null);
      setProgress(0);
      navigate(`/patient/documents/${created.id}`);
    } catch (err) {
      setUploadError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <PageLoader label="Loading your documents..." />;

  const documents = data || [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Medical Documents"
        subtitle="Upload, review and analyse your reports"
        action={
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" /> Upload document
          </Button>
        }
      />

      <ErrorMessage message={error} onRetry={reload} />

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No medical documents yet."
          description="Upload a PDF, TXT or image report to store it securely and analyse it with AI."
          actionLabel="Upload Your First Report"
          onAction={() => setUploadOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onView={() => navigate(`/patient/documents/${doc.id}`)}
              onAnalyze={() => navigate(`/patient/documents/${doc.id}?analyze=1`)}
              onDownload={() => services.documents.download(doc.id, doc.filename)}
              onDelete={async () => {
                if (!window.confirm(`Delete "${doc.filename}"? This cannot be undone.`)) return;
                try {
                  await services.documents.remove(doc.id);
                  setData((current) => (current || []).filter((item) => item.id !== doc.id));
                } catch (err) {
                  window.alert(errorMessage(err));
                }
              }}
            />
          ))}
        </div>
      )}

      <Modal
        open={uploadOpen}
        onClose={() => !uploading && setUploadOpen(false)}
        title="Upload medical document"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUploadOpen(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} loading={uploading}>
              {uploading ? `Uploading ${progress}%` : 'Upload'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ErrorMessage message={uploadError} />
          <Field label="Document type" htmlFor="docType">
            <Select
              id="docType"
              value={docType}
              onChange={(event) => setDocType(event.target.value)}
            >
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="File">
            <FileUpload file={file} onFile={setFile} disabled={uploading} />
          </Field>
          <p className="text-xs text-slate-500">
            Supported: PDF, TXT, JPG, JPEG, PNG · max 10 MB. Files are stored privately and only
            accessible to you and your care team.
          </p>
        </div>
      </Modal>
    </div>
  );
}
