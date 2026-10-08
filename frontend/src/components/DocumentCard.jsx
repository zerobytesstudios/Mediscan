import { BrainCircuit, Download, Eye, FileText, Sparkles, Trash2 } from 'lucide-react';
import { Badge, Card } from './Card';
import Button from './Button';

export function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

const extractionTone = {
  extracted: 'green',
  pending: 'amber',
  empty: 'amber',
  unsupported: 'red',
  ocr_required: 'amber',
  error: 'red',
};

export default function DocumentCard({ document, onView, onAnalyze, onDownload, onDelete, busy }) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-brand-50 p-2.5 text-brand-600">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-900" title={document.filename}>
            {document.filename}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {document.document_type || 'Document'} · {document.file_type} ·{' '}
            {formatBytes(document.file_size)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Uploaded {new Date(document.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone={extractionTone[document.extraction_status] || 'slate'}>
          {document.extraction_status === 'extracted'
            ? 'Text extracted'
            : document.extraction_status === 'ocr_required'
              ? 'OCR not configured'
              : document.extraction_status === 'empty'
                ? 'No readable text'
                : document.extraction_status || 'Pending'}
        </Badge>
        {document.ai_summary && (
          <Badge tone="blue">
            <Sparkles className="h-3 w-3" /> Analysed
          </Badge>
        )}
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Button size="sm" variant="secondary" onClick={onView}>
          <Eye className="h-4 w-4" /> View
        </Button>
        <Button size="sm" onClick={onAnalyze} loading={busy} disabled={busy}>
          <BrainCircuit className="h-4 w-4" />
          {document.ai_summary ? 'Re-analyse' : 'Analyze with AI'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDownload} title="Download original file">
          <Download className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} title="Delete document">
          <Trash2 className="h-4 w-4 text-rose-500" />
        </Button>
      </div>
    </Card>
  );
}
