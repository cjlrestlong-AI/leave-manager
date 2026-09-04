import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function EmptyState({ icon = 'note', title, description, actions, className }: EmptyStateProps) {
  return (
    <div className={cn('empty', className)}>
      <span className="empty__icon">
        <Icon name={icon} size={28} />
      </span>
      <p className="empty__title">{title}</p>
      {description ? <p className="empty__desc">{description}</p> : null}
      {actions ? <div className="empty__actions">{actions}</div> : null}
    </div>
  );
}
