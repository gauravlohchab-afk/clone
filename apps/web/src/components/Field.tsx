import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  trailing?: ReactNode;
}

const inputClass =
  'w-full min-h-11 rounded-md border bg-surface px-3 text-base text-fg placeholder:text-muted outline-none transition focus:border-focus aria-[invalid=true]:border-danger';

export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField(
  { label, error, hint, trailing, className = '', id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = [error && `${inputId}-err`, hint && `${inputId}-hint`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">{label}</label>
      <div className="relative">
        <input ref={ref} id={inputId} aria-invalid={!!error} aria-describedby={describedBy} className={`${inputClass} border-line ${trailing ? 'pr-11' : ''}`} {...rest} />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center">{trailing}</div>}
      </div>
      {hint && !error && <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && <p id={`${inputId}-err`} role="alert" className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
});

export const PasswordField = forwardRef<HTMLInputElement, Omit<FieldProps, 'type' | 'trailing'>>(function PasswordField(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      ref={ref}
      type={show ? 'text' : 'password'}
      trailing={
        <button type="button" onClick={() => setShow((s) => !s)} className="flex size-11 items-center justify-center text-muted hover:text-fg" aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
      {...props}
    />
  );
});

interface AreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  counter?: number;
  value?: string;
}
export const TextArea = forwardRef<HTMLTextAreaElement, AreaProps>(function TextArea({ label, error, counter, id, value, ...rest }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <label htmlFor={inputId} className="font-medium">{label}</label>
        {counter !== undefined && <span className="text-xs text-muted" aria-live="polite">{(value ?? '').length}/{counter}</span>}
      </div>
      <textarea ref={ref} id={inputId} value={value} aria-invalid={!!error} rows={3} className={`${inputClass} border-line py-2.5`} {...rest} />
      {error && <p role="alert" className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
});
