import { useEffect, useRef, useState } from 'react';
import { Bot, FileText, Paperclip, Send, ShieldAlert, Sparkles, User, X } from 'lucide-react';
import { errorMessage, services } from '../services/api';
import Button from './Button';
import { Card } from './Card';
import { ErrorMessage } from './Feedback';
import Markdown from './Markdown';

const SUGGESTIONS = [
  'What does high creatinine mean?',
  'What is HbA1c?',
  'What does a CBC test mean?',
  'Why is my haemoglobin low?',
];

const WELCOME = {
  role: 'assistant',
  content:
    'Hello! I am the Mediscan AI healthcare education assistant. Ask me about medical terms, common tests or general health topics. You can also attach a report (JPG, PNG, PDF or TXT) and I will try to help you understand it.\n\nI only provide educational information - I do not diagnose, prescribe or replace a qualified healthcare professional.',
};

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf', 'text/plain'];
const MAX_ATTACH_BYTES = 10 * 1024 * 1024;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AIChatPanel() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachError, setAttachError] = useState('');
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function handleFile(file) {
    setAttachError('');
    if (!file) return;

    const allowed =
      ALLOWED_TYPES.includes(file.type) || /\.(jpg|jpeg|png|pdf|txt)$/i.test(file.name);
    if (!allowed) {
      setAttachError('Only JPG, PNG, PDF or TXT files can be attached.');
      return;
    }
    if (file.size > MAX_ATTACH_BYTES) {
      setAttachError('Attachments must be 10 MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      const dataBase64 = comma >= 0 ? result.slice(comma + 1) : result;
      setAttachment({
        filename: file.name,
        size: file.size,
        content_type: file.type || 'application/octet-stream',
        data_base64: dataBase64,
      });
    };
    reader.onerror = () => setAttachError('The file could not be read.');
    reader.readAsDataURL(file);
  }

  async function send(text) {
    const message = (text ?? input).trim();
    if (loading || (!message && !attachment)) return;

    const attachPayload = attachment
      ? {
          filename: attachment.filename,
          content_type: attachment.content_type,
          data_base64: attachment.data_base64,
        }
      : null;

    const displayContent =
      message + (attachPayload ? `\n[Attached: ${attachPayload.filename}]` : '');

    const history = messages.slice(0, -1).map((item) => ({
      role: item.role,
      content: item.content,
    }));
    const next = [...messages, { role: 'user', content: displayContent }];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const { reply } = await services.ai.chat(message, history, attachPayload);
      setMessages([...next, { role: 'assistant', content: reply }]);
      setAttachment(null);
    } catch (err) {
      setError(errorMessage(err));
      setMessages(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
          >
            {message.role === 'assistant' && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <Bot className="h-4 w-4" />
              </span>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                message.role === 'user'
                  ? 'whitespace-pre-wrap bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {message.role === 'assistant' ? (
                <Markdown content={message.content} />
              ) : (
                message.content
              )}
            </div>
            {message.role === 'user' && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                <User className="h-4 w-4" />
              </span>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <Bot className="h-4 w-4" />
            </span>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Try asking
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => send(suggestion)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 bg-slate-50 p-3">
        <ErrorMessage message={error} />

        {attachment && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-brand-600" />
            <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
              {attachment.filename}
            </span>
            <span className="text-xs text-slate-400">{formatBytes(attachment.size)}</span>
            <button
              type="button"
              aria-label="Remove attachment"
              onClick={() => setAttachment(null)}
              className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {attachError && <p className="mt-2 text-xs text-rose-500">{attachError}</p>}

        <div className="mt-2 flex gap-2">
          <input
            ref={fileRef}
            type="file"
            hidden
            accept="image/png,image/jpeg,application/pdf,.jpg,.jpeg,.png,.pdf,.txt"
            onChange={(event) => {
              handleFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Attach a file"
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white p-2.5 text-slate-500 transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            className="input-base flex-1"
            placeholder="Ask a health education question..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            disabled={loading}
          />
          <Button
            onClick={() => send()}
            loading={loading}
            disabled={loading || (!input.trim() && !attachment)}
          >
            <Send className="h-4 w-4" /> <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-2 border-t border-slate-100 bg-white px-4 py-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p className="text-xs text-slate-500">
          <Sparkles className="mr-1 inline h-3 w-3" />
          Educational information only. This assistant does not diagnose or prescribe. For
          emergencies, contact local emergency services immediately.
        </p>
      </div>
    </Card>
  );
}