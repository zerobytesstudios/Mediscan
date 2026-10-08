export function Label({ children, htmlFor, hint }) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {children}
      </label>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </div>
  );
}

export function Field({ label, htmlFor, hint, error, children }) {
  return (
    <div>
      <Label htmlFor={htmlFor} hint={hint}>
        {label}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export function Input({ className = '', ...props }) {
  return <input className={`input-base ${className}`} {...props} />;
}

export function TextArea({ className = '', rows = 4, ...props }) {
  return <textarea rows={rows} className={`input-base resize-y ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={`input-base ${className}`} {...props}>
      {children}
    </select>
  );
}
