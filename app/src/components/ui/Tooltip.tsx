import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: 'top' | 'bottom';
}

export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="tooltip-wrap"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show ? (
        <span className={cn('tooltip', `tooltip--${placement}`)} role="tooltip">
          {content}
        </span>
      ) : null}
    </span>
  );
}
