import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui';
import { dayOfWeek } from '@/lib/date';
import { LeavePill } from './LeavePill';
import type { DayOccupancy } from '@/domain/occupancy';
import type { Employee, Holiday, HalfDay, LeaveTypeId } from '@/domain/types';

interface DayCellProps {
  date: string;
  occupancy: DayOccupancy | null;
  holiday: Holiday | null;
  isToday: boolean;
  inMonth: boolean;
  conflict: boolean;
  employeeById: Map<string, Employee>;
  onPickDate: (date: string) => void;
  onOpenRecord: (id: string) => void;
  maxPills?: number;
}

interface CellPill {
  recordId: string;
  employeeId: string;
  type: LeaveTypeId;
  half: HalfDay;
}

export function DayCell({
  date,
  occupancy,
  holiday,
  isToday,
  inMonth,
  conflict,
  employeeById,
  onPickDate,
  onOpenRecord,
  maxPills = 3,
}: DayCellProps) {
  const [expanded, setExpanded] = useState(false);

  const pills = useMemo<CellPill[]>(() => {
    if (!occupancy) return [];
    const byRec = new Map<string, { recordId: string; employeeId: string; type: LeaveTypeId; halves: Set<HalfDay> }>();
    for (const s of occupancy.slots) {
      const cur =
        byRec.get(s.recordId) ??
        { recordId: s.recordId, employeeId: s.employeeId, type: s.type, halves: new Set<HalfDay>() };
      cur.halves.add(s.half);
      byRec.set(s.recordId, cur);
    }
    return [...byRec.values()].map((r) => {
      let half: HalfDay = 'full';
      if (r.halves.has('am') && r.halves.has('pm')) half = 'full';
      else if (r.halves.has('am')) half = 'am';
      else if (r.halves.has('pm')) half = 'pm';
      return { recordId: r.recordId, employeeId: r.employeeId, type: r.type, half };
    });
  }, [occupancy]);

  const dayNum = Number(date.slice(8, 10));
  const isWeekend = dayOfWeek(date) === 0 || dayOfWeek(date) === 6;

  const visible = expanded || pills.length <= maxPills ? pills : pills.slice(0, maxPills);
  const hiddenCount = expanded ? 0 : Math.max(0, pills.length - maxPills);

  return (
    <div
      className={cn(
        'cell',
        !inMonth && 'cell--adjacent',
        isToday && 'cell--today',
        conflict && 'cell--conflict',
        holiday && 'cell--holiday',
      )}
      onClick={() => onPickDate(date)}
      role="button"
      tabIndex={-1}
    >
      <div className="cell__head">
        <span className={cn('cell__num tnum', isWeekend && !holiday && 'cell__num--weekend', holiday && 'cell__num--holiday')}>
          {dayNum}
        </span>
        {conflict ? (
          <span className="cell__flag" title="這天放假人數超過上限">
            <Icon name="warning" size={14} />
          </span>
        ) : null}
      </div>
      {holiday ? <div className="cell__holiday truncate">{holiday.name}</div> : null}

      <div className="cell__pills">
        {visible.map((p) => (
          <LeavePill
            key={p.recordId}
            type={p.type}
            employee={employeeById.get(p.employeeId)}
            half={p.half}
            onClick={() => onOpenRecord(p.recordId)}
          />
        ))}
        {hiddenCount > 0 ? (
          <button type="button" className="cell__more" onClick={(e) => { e.stopPropagation(); setExpanded(true); }}>
            +{hiddenCount}
          </button>
        ) : null}
      </div>
    </div>
  );
}
