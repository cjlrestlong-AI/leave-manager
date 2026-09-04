import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'primary' | 'ok' | 'warn' | 'danger' | 'info';

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('badge', `badge--${tone}`, className)}>{children}</span>;
}
