import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { TimelineRow } from '@/components/domain/TimelineRow';
import { Button, SegmentedControl, DateField, EmptyState } from '@/components/ui';
import { useApp } from '@/state/AppContext';
import { useDerived } from '@/domain/selectors';
import { useLeaveEditor } from '@/state/LeaveEditor';
import { eachDay, addMonths, startOfMonth, endOfMonth, isWeekend, formatDisplay, type ISODate } from '@/lib/date';

const DAY_W = 40;
const NAME_W = 168;

type RangeMode = 'month' | 'quarter' | 'custom';

export function TimelinePage() {
  const { data, today, readOnly } = useApp();
  const derived = useDerived(data, today);
  const editor = useLeaveEditor();
  const [mode, setMode] = useState<RangeMode>('quarter');
  const [customStart, setCustomStart] = useState<ISODate>(startOfMonth(today));
  const [customEnd, setCustomEnd] = useState<ISODate>(endOfMonth(addMonths(today, 3)));

  const rangeStart = mode === 'month' ? startOfMonth(today) : mode === 'quarter' ? startOfMonth(today) : customStart;
  const rangeEnd = mode === 'month' ? endOfMonth(today) : mode === 'quarter' ? endOfMonth(addMonths(today, 2)) : customEnd;

  const days = useMemo(() => eachDay(rangeStart, rangeEnd), [rangeStart, rangeEnd]);
  const total = days.length;

  const conflictDates = useMemo(() => {
    const s = new Set<string>();
    for (const seg of derived.conflicts) for (const d of seg.dates) s.add(d);
    return s;
  }, [derived.conflicts]);

  const todayIdx = days.findIndex((d) => d === today);

  function onOpen(id: string) {
    const rec = derived.leaves.find((r) => r.id === id);
    if (rec) editor.open({ draft: rec });
  }

  return (
    <div className="page">
      <PageHeader
        title="時間軸"
        description="團隊休假甘特圖，一眼看出哪幾天爆量"
        actions={
          !readOnly ? (
            <Button variant="primary" iconLeft="plus" onClick={() => editor.open()}>
              登錄假單
            </Button>
          ) : null
        }
      />

      <div className="cal-toolbar">
        <SegmentedControl
          value={mode}
          onChange={(v) => setMode(v as RangeMode)}
          options={[
            { value: 'month', label: '本月' },
            { value: 'quarter', label: '未來 3 個月' },
            { value: 'custom', label: '自訂' },
          ]}
        />
        {mode === 'custom' ? (
          <div className="tl-custom">
            <DateField label="" value={customStart} onChange={setCustomStart} />
            <span className="tl-custom__sep">至</span>
            <DateField label="" value={customEnd} onChange={setCustomEnd} />
          </div>
        ) : null}
      </div>

      <div className="tl">
        <div className="tl__scroll">
          <div className="tl__inner" style={{ width: NAME_W + total * DAY_W }}>
            <div className="tl__head" style={{ left: 0 }}>
              <div className="tl__head-name">同事</div>
              <div className="tl__head-track" style={{ width: total * DAY_W }}>
                {days.map((d, i) => {
                  const weekend = isWeekend(d);
                  const isMonthStart = d.slice(8, 10) === '01';
                  const holiday = derived.holidayMap.get(d);
                  return (
                    <div
                      key={d}
                      className={[
                        'tl__day',
                        weekend && 'tl__day--we',
                        d === today && 'tl__day--today',
                        holiday && 'tl__day--holiday',
                        i > 0 && days[i - 1].slice(0, 7) !== d.slice(0, 7) && 'tl__day--monthstart',
                      ].join(' ')}
                      style={{ width: DAY_W }}
                      title={holiday ? `${formatDisplay(d, 'md')} · ${holiday.name}` : formatDisplay(d, 'md')}
                    >
                      {isMonthStart ? <span className="tl__month">{Number(d.slice(5, 7))}月</span> : null}
                      <span className="tl__daynum tnum">{Number(d.slice(8, 10))}</span>
                      {holiday ? <span className="tl__holi" /> : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="tl__bg" style={{ left: NAME_W, width: total * DAY_W }}>
              {days.map((d) => (
                <div
                  key={d}
                  className={[
                    'tl__col',
                    isWeekend(d) && 'tl__col--we',
                    derived.holidayMap.get(d) && 'tl__col--holiday',
                    conflictDates.has(d) && 'tl__col--conflict',
                    d === today && 'tl__col--today',
                  ].join(' ')}
                  style={{ width: DAY_W }}
                />
              ))}
              {todayIdx >= 0 ? <div className="tl__today-line" style={{ left: todayIdx * DAY_W + DAY_W / 2 }} /> : null}
            </div>

            <div className="tl__rows">
              {derived.employees.length === 0 ? (
                <div className="tl__empty">
                  <EmptyState icon="employees" title="尚未建立同事名單" description="先在「同事」頁新增同事，時間軸才會有內容。" />
                </div>
              ) : (
                derived.employees.map((e) => (
                  <TimelineRow
                    key={e.id}
                    employee={e}
                    records={derived.leaves.filter((r) => r.employeeId === e.id)}
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    dayWidth={DAY_W}
                    onOpenRecord={onOpen}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
