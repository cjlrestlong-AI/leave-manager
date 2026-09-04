import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  as?: 'div' | 'section' | 'article' | 'li';
}

export function Card({ children, className, padded = true, interactive, onClick, as: As = 'div' }: CardProps) {
  return (
    <As
      className={cn('card', padded && 'card--padded', interactive && 'card--interactive', className)}
      onClick={interactive ? onClick : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {children}
    </As>
  );
}
