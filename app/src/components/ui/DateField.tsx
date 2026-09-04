import { useId } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';
import type { ISODate } from '@/lib/date';

interface DateFieldProps {
  label?: string;
  value: ISODate;
  onChange: (v: ISODate) => void;
  error?: string;
  hint?: string;
  min?: ISODate;
  max?: ISODate;
  required?: boolean;
  id?: string;
}

export function DateField({ label, value, onChange, error, hint, min, max, required, id }: DateFieldProps) {
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
      <div className="field__control field__control--date">
        <Icon name="calendar" size={16} className="field__date-icon" />
        <input
          id={fieldId}
          type="date"
          className="field__input"
          value={value}
          min={min}
          max={max}
          required={required}
          onChange={(e) => onChange(e.target.value as ISODate)}
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
