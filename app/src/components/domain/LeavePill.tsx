import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { leaveTypeMeta } from '@/domain/constants';
import type { Employee, HalfDay, LeaveTypeId } from '@/domain/types';

interface LeavePillProps {
  type: LeaveTypeId;
  employee?: Employee;
  half?: HalfDay;
  onClick?: () => void;
  muted?: boolean;
}

/**
 * 半日「雙重編碼」：除了顏色外，左上/右下角斜切缺口 + 日(上午)/月(下午)圖示，
 * 讓色盲也能分辨上午／下午。
 */
export function LeavePill({ type, employee, half, onClick, muted }: LeavePillProps) {
  const meta = leaveTypeMeta(type);
  const h = half ?? 'full';
  return (
    <button
      type="button"
      className={cn('pill', `pill--${h}`, muted && 'pill--muted', onClick && 'pill--clickable')}
      style={{ ['--pill-color' as string]: meta.hex }}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
      title={`${employee?.name ?? ''} · ${meta.label}`}
    >
      {h !== 'full' ? (
        <span className="pill__half">
          <Icon name={h === 'am' ? 'sun' : 'moon'} size={11} />
        </span>
      ) : null}
      <span className="pill__name truncate">{employee?.name ?? '（已移除同事）'}</span>
    </button>
  );
}
