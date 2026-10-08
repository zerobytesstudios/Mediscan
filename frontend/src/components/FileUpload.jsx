import { useRef, useState } from 'react';
import { FileText, UploadCloud } from 'lucide-react';

const ACCEPTED = '.pdf,.txt,.jpg,.jpeg,.png';
const MAX_BYTES = 10 * 1024 * 1024;

export default function FileUpload({ file, onFile, hint, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState('');

  function accept(chosen) {
    if (!chosen) return;
    const extension = `.${chosen.name.split('.').pop().toLowerCase()}`.toLowerCase();
    if (!ACCEPTED.includes(extension)) {
      setLocalError('Only PDF, TXT, JPG, JPEG and PNG files are supported.');
      return;
    }
    if (chosen.size > MAX_BYTES) {
      setLocalError('File is larger than the 10 MB limit.');
      return;
    }
    setLocalError('');
    onFile(chosen);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) accept(event.dataTransfer.files?.[0]);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
          dragging
            ? 'border-brand-500 bg-brand-50'
            : 'border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/50'
        } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(event) => accept(event.target.files?.[0])}
          disabled={disabled}
        />
        {file ? (
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <FileText className="h-5 w-5 text-brand-600" />
            <span className="max-w-xs truncate font-medium">{file.name}</span>
            <span className="text-slate-400">({(file.size / 1024).toFixed(0)} KB)</span>
          </div>
        ) : (
          <>
            <UploadCloud className="h-8 w-8 text-brand-500" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-slate-700">
              Drag and drop or click to browse
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {hint || 'PDF, TXT, JPG, JPEG or PNG - max 10 MB'}
            </p>
          </>
        )}
      </div>
      {localError && <p className="mt-2 text-xs text-rose-600">{localError}</p>}
    </div>
  );
}
