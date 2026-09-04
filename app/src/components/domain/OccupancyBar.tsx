import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface OccupancyBarProps {
  label: ReactNode;
  value: number;
  max: number;
  color?: string;
  unit?: string;
  onClick?: () => void;
}

export function OccupancyBar({ label, value, max, color = 'var(--primary)', unit = '', onClick }: OccupancyBarProps) {
  const pct = max > 0 ? Math.max(2, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={cn('obar', onClick && 'obar--clickable')} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="obar__label truncate">{label}</div>
      <div className="obar__track">
        <div className="obar__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="obar__value tnum">
        {value}
        {unit ? <span className="obar__unit">{unit}</span> : null}
      </div>
    </div>
  );
}
