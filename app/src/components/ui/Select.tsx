import { useId } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  error?: string;
  hint?: string;
  required?: boolean;
  id?: string;
}

export function Select({ label, value, onChange, options, error, hint, required, id }: SelectProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={cn('field', error && 'field--error')}>
      {label ? (
        <label className="field__label" htmlFor={fieldId}>
          {label}
          {required ? <span className="field__req">*</span> : null}
        </label>
      ) : null}
      <div className="field__control field__control--select">
        <select
          id={fieldId}
          className="field__input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={16} className="field__select-icon" />
      </div>
      {error ? (
        <p className="field__msg field__msg--error">{error}</p>
      ) : hint ? (
        <p className="field__msg">{hint}</p>
      ) : null}
    </div>
  );
}
