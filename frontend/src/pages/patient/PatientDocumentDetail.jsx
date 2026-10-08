import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BrainCircuit,
  CalendarDays,
  Download,
  FileText,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { services, errorMessage } from '../../services/api';
import Button from '../../components/Button';
import { Badge, Card, CardBody, SectionHeader } from '../../components/Card';
import { ErrorMessage, LoadingSpinner, PageLoader } from '../../components/Feedback';
import Markdown from '../../components/Markdown';
import { formatBytes } from '../../components/DocumentCard';

export default function PatientDocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const started = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDocument(await services.documents.get(id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const analyze = useCallback(async () => {
    setAnalyzing(true);
    setAnalysisError('');
    try {
      setDocument(await services.ai.analyze(id));
    } catch (err) {
      setAnalysisError(errorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (params.get('analyze') === '1' && document && !document.ai_summary && !started.current) {
      started.current = true;
      analyze();
    }
  }, [params, document, analyze]);

  if (loading) return <PageLoader label="Loading document..." />;
  if (error) {
    return (
      <div className="space-y-4">
        <ErrorMessage message={error} onRetry={load} />
        <Button variant="secondary" onClick={() => navigate('/patient/documents')}>
          <ArrowLeft className="h-4 w-4" /> Back to documents
        </Button>
      </div>
    );
  }
  if (!document) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-brand-50 p-2.5 text-brand-600">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <button
              type="button"
              onClick={() => navigate('/patient/documents')}
              className="mb-1 flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> All documents
            </button>
            <h1 className="text-xl font-semibold text-slate-900">{document.filename}</h1>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <Badge tone="blue">{document.document_type || 'Document'}</Badge>
              <Badge tone="slate">{document.file_type}</Badge>
              <Badge tone="slate">{formatBytes(document.file_size)}</Badge>
              <Badge tone="slate">
                Uploaded {new Date(document.created_at).toLocaleDateString()}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => services.documents.download(document.id, document.filename)}
          >
            <Download className="h-4 w-4" /> View / Download
          </Button>
          <Button onClick={analyze} loading={analyzing} disabled={analyzing}>
            <BrainCircuit className="h-4 w-4" />
            {analyzing ? 'Analyzing report...' : 'Analyze with AI'}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!window.confirm(`Delete "${document.filename}"?`)) return;
              try {
                await services.documents.remove(document.id);
                navigate('/patient/documents');
              } catch (err) {
                window.alert(errorMessage(err));
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ErrorMessage message={analysisError} onRetry={analyze} />

      {analyzing && (
        <Card>
          <CardBody>
            <LoadingSpinner label="Analyzing your report with AI... this can take a few seconds." />
          </CardBody>
        </Card>
      )}

      {document.ai_summary && !analyzing && (
        <Card className="border-brand-200">
          <CardBody>
            <SectionHeader
              title="AI Summary"
              subtitle="Educational explanation generated from the text in this document"
              action={<Badge tone="blue">AI generated</Badge>}
            />
            <Markdown content={document.ai_summary} />
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-xs leading-relaxed text-amber-800">
                This AI explanation is for educational purposes only and does not replace
                professional medical advice, diagnosis or treatment. If you are experiencing a
                medical emergency, contact local emergency services or seek immediate professional
                medical care.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <SectionHeader
            title="Extracted text"
            subtitle={
              document.extraction_status === 'extracted'
                ? 'Text read from the uploaded file'
                : `Extraction status: ${document.extraction_status}`
            }
          />
          {document.extracted_text ? (
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              {document.extracted_text}
            </pre>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              {document.extraction_status === 'ocr_required'
                ? 'Image OCR requires the optional pytesseract/Pillow packages. Upload a text-based PDF or TXT report for AI analysis.'
                : 'No readable text could be extracted from this file, so AI analysis is unavailable for it.'}
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <SectionHeader title="What next" subtitle="Turn information into action" />
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => navigate('/patient/doctors')}>
              <CalendarDays className="h-4 w-4" /> Find a doctor
            </Button>
            <Button variant="secondary" onClick={() => navigate('/patient/ai-assistant')}>
              Ask the AI assistant
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
