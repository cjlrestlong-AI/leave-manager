import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/ui';
import { relativeDayLabel } from '@/lib/hkt';
import type { Reminder } from '@/domain/reminders';

const KIND_ICON: Record<Reminder['kind'], IconName> = {
  'conflict-soon': 'warning',
  'on-leave': 'user',
  starting: 'flag',
  returning: 'restore',
};

const PILL_TONE: Record<string, string> = {
  today: 'is-today',
  tomorrow: 'is-tomorrow',
  thisWeek: 'is-week',
  later: 'is-later',
};

function toneFor(reminder: Reminder): string {
  if (reminder.daysUntil <= 0) return PILL_TONE.today;
  if (reminder.daysUntil === 1) return PILL_TONE.tomorrow;
  if (reminder.daysUntil <= 7) return PILL_TONE.thisWeek;
  return PILL_TONE.later;
}

interface ReminderCardProps {
  reminder: Reminder;
  onClick?: () => void;
}

export function ReminderCard({ reminder, onClick }: ReminderCardProps) {
  return (
    <button
      type="button"
      className={cn('reminder', reminder.level === 'warn' && 'reminder--warn', onClick && 'reminder--clickable')}
      onClick={onClick}
    >
      <span className={cn('reminder__icon', reminder.level === 'warn' && 'reminder__icon--warn')}>
        <Icon name={KIND_ICON[reminder.kind]} size={16} />
      </span>
      <span className="reminder__body">
        <span className="reminder__title">{reminder.title}</span>
        <span className="reminder__detail">{reminder.detail}</span>
      </span>
      <span className={cn('reminder__pill tnum', toneFor(reminder))}>{relativeDayLabel(reminder.daysUntil)}</span>
    </button>
  );
}
