import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ChipProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  color?: string;
  className?: string;
  title?: string;
}

export function Chip({ children, active, onClick, color, className, title }: ChipProps) {
  const Comp = onClick ? 'button' : 'span';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      className={cn('chip', active && 'chip--active', onClick && 'chip--clickable', className)}
      onClick={onClick}
      title={title}
      style={color ? ({ '--chip-color': color } as React.CSSProperties) : undefined}
    >
      {color ? <span className="chip__bar" /> : null}
      <span className="chip__label">{children}</span>
    </Comp>
  );
}
