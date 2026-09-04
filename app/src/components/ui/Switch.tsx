import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  const id = useId();
  return (
    <label className={cn('switch', disabled && 'switch--disabled')} htmlFor={id}>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={cn('switch__track', checked && 'switch__track--on')}
        onClick={() => onChange(!checked)}
      >
        <span className="switch__thumb" />
      </button>
      {(label || description) && (
        <span className="switch__text">
          {label ? <span className="switch__label">{label}</span> : null}
          {description ? <span className="switch__desc">{description}</span> : null}
        </span>
      )}
    </label>
  );
}
