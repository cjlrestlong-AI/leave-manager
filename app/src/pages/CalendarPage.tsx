import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { DayCell } from '@/components/domain/DayCell';
import { Button, Icon, SegmentedControl, Badge, Avatar, EmptyState } from '@/components/ui';
import { useApp } from '@/state/AppContext';
import { useDerived } from '@/domain/selectors';
import { useLeaveEditor } from '@/state/LeaveEditor';
import { leaveTypeMeta } from '@/domain/constants';
import { calculateDuration } from '@/domain/duration';
import { formatRange, startOfMonth, endOfMonth, startOfWeek, eachDay, addMonths, addDays, compareISO, type ISODate } from '@/lib/date';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function CalendarPage() {
  const { data, today, readOnly } = useApp();
  const derived = useDerived(data, today);
  const editor = useLeaveEditor();
  const [cursor, setCursor] = useState<ISODate>(startOfMonth(today));
  const [mobileView, setMobileView] = useState<'grid' | 'list'>('grid');

  const conflictDates = useMemo(() => {
    const s = new Set<string>();
    for (const seg of derived.conflicts) for (const d of seg.dates) s.add(d);
    return s;
  }, [derived.conflicts]);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart);
  // 6 週 = 42 格
  const cells = useMemo(() => eachDay(gridStart, addDays(gridStart, 41)), [gridStart]);

  const monthLeaves = useMemo(
    () =>
      derived.leaves
        .filter((r) => compareISO(r.endDate, monthStart) >= 0 && compareISO(r.startDate, monthEnd) <= 0)
        .sort((a, b) => compareISO(a.startDate, b.startDate)),
    [derived.leaves, monthStart, monthEnd],
  );

  function onPick(date: ISODate) {
    if (readOnly) return;
    editor.open({ defaultStart: date });
  }
  function onOpen(id: string) {
    const rec = derived.leaves.find((r) => r.id === id);
    if (rec) editor.open({ draft: rec });
  }

  return (
    <div className={`page cal-page cal-page--${mobileView}`}>
      <PageHeader
        title="月曆"
        description={`${cursor.slice(0, 4)} 年 ${Number(cursor.slice(5, 7))} 月`}
        actions={
          !readOnly ? (
            <Button variant="primary" iconLeft="plus" onClick={() => editor.open()}>
              登錄假單
            </Button>
          ) : null
        }
      />

      <div className="cal-toolbar">
        <div className="cal-nav">
          <button type="button" className="icon-btn" aria-label="上個月" onClick={() => setCursor((c) => addMonths(c, -1))}>
            <Icon name="chevronLeft" size={18} />
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCursor(startOfMonth(today))}>
            今天
          </button>
          <button type="button" className="icon-btn" aria-label="下個月" onClick={() => setCursor((c) => addMonths(c, 1))}>
            <Icon name="chevronRight" size={18} />
          </button>
        </div>
        <div className="cal-mobile-toggle">
          <SegmentedControl
            size="sm"
            value={mobileView}
            onChange={(v) => setMobileView(v as 'grid' | 'list')}
            options={[
              { value: 'grid', label: '月曆' },
              { value: 'list', label: '本月清單' },
            ]}
          />
        </div>
      </div>

      <div className="cal-view cal-view--grid">
        <div className="cal-weekdays">
          {WEEKDAYS.map((w) => (
            <span key={w} className="cal-weekday">
              {w}
            </span>
          ))}
        </div>
        <div className="cal-grid">
          {cells.map((d) => (
            <DayCell
              key={d}
              date={d}
              occupancy={derived.index.get(d) ?? null}
              holiday={derived.holidayMap.get(d) ?? null}
              isToday={d === today}
              inMonth={d.slice(0, 7) === cursor.slice(0, 7)}
              conflict={conflictDates.has(d)}
              employeeById={derived.employeeById}
              onPickDate={onPick}
              onOpenRecord={onOpen}
            />
          ))}
        </div>
      </div>

      <div className="cal-view cal-view--list">
        {monthLeaves.length === 0 ? (
          <EmptyState icon="leaves" title="本月沒有休假紀錄" />
        ) : (
          <ul className="month-list">
            {monthLeaves.map((r) => {
              const meta = leaveTypeMeta(r.type);
              const emp = derived.employeeById.get(r.employeeId);
              const days = calculateDuration(r, data.settings, derived.holidayMap);
              return (
                <li key={r.id} className="month-list__item" onClick={() => !readOnly && onOpen(r.id)}>
                  <span className="month-list__bar" style={{ background: meta.hex }} />
                  <Avatar name={emp?.name ?? ''} seed={emp?.colorSeed ?? 0} size={28} />
                  <span className="month-list__name truncate">{emp?.name ?? '（已移除同事）'}</span>
                  <Badge tone="neutral">{meta.label}</Badge>
                  <span className="month-list__range tnum">{formatRange(r.startDate, r.endDate, 'short')}</span>
                  <span className="month-list__days tnum">{days} 天</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
