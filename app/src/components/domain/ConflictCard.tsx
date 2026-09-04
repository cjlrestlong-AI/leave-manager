import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';
import { formatRange } from '@/lib/date';
import type { ConflictSegment } from '@/domain/conflict';
import type { AppSettings, Employee } from '@/domain/types';

interface ConflictCardProps {
  segment: ConflictSegment;
  employeeById: Map<string, Employee>;
  settings: AppSettings;
  onView?: () => void;
}

export function ConflictCard({ segment, employeeById, settings, onView }: ConflictCardProps) {
  const names = segment.employeeIds.map((id) => employeeById.get(id)?.name ?? '（已移除同事）');
  const over = segment.peak > settings.overlapThreshold;
  return (
    <div className={cn('conflict-card', over ? 'conflict-card--over' : 'conflict-card--at')}>
      <div className="conflict-card__head">
        <span className="conflict-card__range tnum">{formatRange(segment.startDate, segment.endDate, 'md')}</span>
        <span className={cn('conflict-card__badge', over ? 'is-over' : 'is-at')}>
          {segment.peak} 人同時放假{over ? `（超過上限 ${settings.overlapThreshold} 人）` : '（已達上限）'}
        </span>
      </div>
      <div className="conflict-card__people">
        {names.map((n, i) => (
          <span key={i} className="conflict-card__person">
            {n}
          </span>
        ))}
      </div>
      <div className="conflict-card__foot">
        <span className="conflict-card__meta">影響 {segment.workdayCount} 個工作天</span>
        {onView ? (
          <Button variant="ghost" size="sm" iconRight="chevronRight" onClick={onView}>
            在月曆查看
          </Button>
        ) : null}
      </div>
    </div>
  );
}
