import { useMemo } from 'react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui';
import { eachDay, compareISO, type ISODate } from '@/lib/date';
import { leaveTypeMeta } from '@/domain/constants';
import { formatRange } from '@/lib/date';
import type { Employee, HalfDay, LeaveRecord } from '@/domain/types';

interface TimelineRowProps {
  employee: Employee;
  records: LeaveRecord[];
  rangeStart: ISODate;
  rangeEnd: ISODate;
  dayWidth: number;
  onOpenRecord: (id: string) => void;
}

interface Seg {
  recordId: string;
  type: LeaveRecord['type'];
  startIdx: number;
  endIdx: number;
  startHalf: HalfDay;
  endHalf: HalfDay;
}

function halfForDay(r: LeaveRecord, day: ISODate): HalfDay {
  if (r.startDate === r.endDate) return r.startHalf;
  if (compareISO(day, r.startDate) === 0) return r.startHalf;
  if (compareISO(day, r.endDate) === 0) return r.endHalf;
  return 'full';
}

export function TimelineRow({ employee, records, rangeStart, rangeEnd, dayWidth, onOpenRecord }: TimelineRowProps) {
  const total = eachDay(rangeStart, rangeEnd).length;

  const segments = useMemo<Seg[]>(() => {
    const days = eachDay(rangeStart, rangeEnd);
    const out: Seg[] = [];
    let cur: Seg | null = null;
    days.forEach((d, i) => {
      const rec = records.find((r) => compareISO(d, r.startDate) >= 0 && compareISO(d, r.endDate) <= 0);
      const half = rec ? halfForDay(rec, d) : 'full';
      if (!rec) {
        if (cur) {
          out.push(cur);
          cur = null;
        }
        return;
      }
      if (cur && cur.recordId === rec.id) {
        cur.endIdx = i;
        cur.endHalf = half;
      } else {
        if (cur) out.push(cur);
        cur = { recordId: rec.id, type: rec.type, startIdx: i, endIdx: i, startHalf: half, endHalf: half };
      }
    });
    if (cur) out.push(cur);
    return out;
  }, [records, rangeStart, rangeEnd]);

  return (
    <div className="tl-row">
      <div className="tl-row__name">
        <Avatar name={employee.name} seed={employee.colorSeed} size={24} />
        <span className="tl-row__label truncate">{employee.name}</span>
      </div>
      <div className="tl-row__track" style={{ width: total * dayWidth }}>
        {segments.map((s) => {
          const meta = leaveTypeMeta(s.type);
          const leftPad = s.startHalf === 'pm' ? dayWidth / 2 : 0;
          const rightPad = s.endHalf === 'am' ? dayWidth / 2 : 0;
          const left = s.startIdx * dayWidth + leftPad;
          const width = (s.endIdx - s.startIdx + 1) * dayWidth - leftPad - rightPad - 3;
          return (
            <button
              key={s.recordId}
              type="button"
              className={cn('tl-bar', `tl-bar--${s.startHalf}`, `tl-bar--end-${s.endHalf}`)}
              style={{ left, width, background: meta.hex }}
              title={`${meta.label} · ${formatRange(rangeStart, rangeEnd, 'short')}`}
              onClick={() => onOpenRecord(s.recordId)}
            >
              {width > 42 ? <span className="tl-bar__label truncate">{meta.label}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
