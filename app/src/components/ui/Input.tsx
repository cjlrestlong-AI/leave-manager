import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'prefix'> {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  prefix?: ReactNode;
  required?: boolean;
}

export function Input({ label, value, onChange, error, hint, prefix, className, id, required, ...rest }: InputProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={cn('field', error && 'field--error', className)}>
      {label ? (
        <label className="field__label" htmlFor={fieldId}>
          {label}
          {required ? <span className="field__req">*</span> : null}
        </label>
      ) : null}
      <div className={cn('field__control', Boolean(prefix) && 'field__control--prefixed')}>
        {prefix ? <span className="field__prefix">{prefix}</span> : null}
        <input
          id={fieldId}
          className="field__input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          required={required}
          {...rest}
        />
      </div>
      {error ? (
        <p className="field__msg field__msg--error">{error}</p>
      ) : hint ? (
        <p className="field__msg">{hint}</p>
      ) : null}
    </div>
  );
}

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
}

export function Textarea({ label, value, onChange, error, hint, className, id, required, ...rest }: TextareaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={cn('field', error && 'field--error', className)}>
      {label ? (
        <label className="field__label" htmlFor={fieldId}>
          {label}
          {required ? <span className="field__req">*</span> : null}
        </label>
      ) : null}
      <textarea
        id={fieldId}
        className="field__input field__textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        required={required}
        {...rest}
      />
      {error ? (
        <p className="field__msg field__msg--error">{error}</p>
      ) : hint ? (
        <p className="field__msg">{hint}</p>
      ) : null}
    </div>
  );
}
