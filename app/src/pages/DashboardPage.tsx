import { useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ReminderCard } from '@/components/domain/ReminderCard';
import { ConflictCard } from '@/components/domain/ConflictCard';
import { OccupancyBar } from '@/components/domain/OccupancyBar';
import { Button, Avatar, EmptyState } from '@/components/ui';
import { useApp } from '@/state/AppContext';
import { useDerived } from '@/domain/selectors';
import { useLeaveEditor } from '@/state/LeaveEditor';
import { employeeDaysInMonth } from '@/domain/selectors';
import { groupReminders } from '@/domain/reminders';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  eachDay,
  isWeekend,
  formatDisplay,
} from '@/lib/date';
import { LEAVE_TYPES } from '@/domain/constants';

export function DashboardPage() {
  const { data, today, readOnly } = useApp();
  const derived = useDerived(data, today);
  const editor = useLeaveEditor();

  const ym = today.slice(0, 7);
  const onLeaveToday = derived.index.get(today);
  const todayCount = onLeaveToday?.distinct ?? 0;
  const todayNames = (onLeaveToday?.slots ?? [])
    .map((s) => derived.employeeById.get(s.employeeId)?.name ?? '（已移除同事）')
    .filter((v, i, a) => a.indexOf(v) === i);

  const groups = useMemo(() => groupReminders(derived.reminders), [derived.reminders]);

  const ranking = useMemo(() => {
    const rows = derived.employees
      .map((e) => ({
        employee: e,
        days: employeeDaysInMonth(derived.leaves, e.id, ym, data.settings, derived.holidayMap),
      }))
      .filter((r) => r.days > 0)
      .sort((a, b) => b.days - a.days)
      .slice(0, 7);
    const max = rows.length ? rows[0].days : 1;
    return { rows, max };
  }, [derived.employees, derived.leaves, ym, data.settings, derived.holidayMap]);

  const mini = useMemo(() => {
    const start = startOfWeek(startOfMonth(today));
    const end = endOfMonth(today);
    const days = eachDay(start, end);
    return days;
  }, [today]);

  return (
    <div className="page">
      <PageHeader
        title="看板"
        description={formatDisplay(today, 'long')}
        actions={
          !readOnly ? (
            <Button variant="primary" iconLeft="plus" onClick={() => editor.open()}>
              登錄假單
            </Button>
          ) : null
        }
      />

      <section className="today-panel">
        <div className="today-panel__main">
          <span className="today-panel__label">今天放假中</span>
          <span className="today-panel__count tnum">{todayCount}</span>
          <span className="today-panel__unit">人</span>
        </div>
        <div className="today-panel__people">
          {todayCount === 0 ? (
            <span className="today-panel__empty">今天沒有人放假</span>
          ) : (
            <>
              {todayNames.slice(0, 8).map((n, i) => (
                <span key={i} className="today-panel__person">
                  <Avatar name={n} seed={i} size={28} />
                  <span className="today-panel__person-name">{n}</span>
                </span>
              ))}
            </>
          )}
        </div>
      </section>

      <div className="dash-grid">
        <section className="card dash-col-reminders">
          <div className="card__head">
            <h2 className="card__title">未來提醒</h2>
            <span className="card__sub">{data.settings.reminderLeadDays} 天內</span>
          </div>
          {groups.length === 0 ? (
            <EmptyState icon="bell" title="暫無提醒" description="未來一段時間沒有即將開始的假期。" />
          ) : (
            <div className="reminder-list">
              {groups.map((g) => (
                <div key={g.group} className="reminder-group">
                  <div className="reminder-group__label">{g.label}</div>
                  {g.items.map((r) => (
                    <ReminderCard key={r.id} reminder={r} onClick={() => editor.open({ defaultStart: r.date })} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card dash-col-conflicts">
          <div className="card__head">
            <h2 className="card__title">衝突預警</h2>
            <span className="card__sub">超過上限 {data.settings.overlapThreshold} 人</span>
          </div>
          {derived.conflicts.length === 0 ? (
            <EmptyState icon="check" title="沒有衝突" description="目前沒有同日放假超過上限的狀況。" />
          ) : (
            <div className="conflict-list">
              {derived.conflicts.map((s) => (
                <ConflictCard
                  key={`${s.startDate}_${s.endDate}`}
                  segment={s}
                  employeeById={derived.employeeById}
                  settings={data.settings}
                  onView={() => {
                    const hash = `#/calendar?focus=${s.startDate}`;
                    window.location.hash = hash;
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="dash-grid dash-grid--two">
        <section className="card">
          <div className="card__head">
            <h2 className="card__title">本月請假排行</h2>
            <span className="card__sub">{ym.replace('-', ' 年')} 月</span>
          </div>
          {ranking.rows.length === 0 ? (
            <EmptyState icon="leaves" title="本月尚無休假紀錄" />
          ) : (
            <div className="obar-list">
              {ranking.rows.map((r) => (
                <OccupancyBar
                  key={r.employee.id}
                  label={
                    <span className="row-gap-2">
                      <Avatar name={r.employee.name} seed={r.employee.colorSeed} size={20} />
                      {r.employee.name}
                    </span>
                  }
                  value={r.days}
                  max={ranking.max}
                  color={LEAVE_TYPES[0].hex}
                  unit=" 天"
                />
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card__head">
            <h2 className="card__title">本月熱度</h2>
            <span className="card__sub">顏色越深人越多</span>
          </div>
          <div className="mini-cal">
            <div className="mini-cal__weekdays">
              {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
                <span key={w} className="mini-cal__wd">
                  {w}
                </span>
              ))}
            </div>
            <div className="mini-cal__grid">
              {mini.map((d) => {
                const occ = derived.index.get(d);
                const count = occ?.distinct ?? 0;
                const inMonth = d.slice(0, 7) === ym;
                const weekend = isWeekend(d);
                const level = count === 0 ? 0 : count >= 3 ? 3 : count;
                return (
                  <div
                    key={d}
                    className={[
                      'mini-cal__cell',
                      !inMonth && 'mini-cal__cell--adj',
                      weekend && 'mini-cal__cell--we',
                      `mini-cal__cell--l${level}`,
                    ].join(' ')}
                    title={count > 0 ? `${formatDisplay(d, 'md')}：${count} 人` : formatDisplay(d, 'md')}
                  >
                    {Number(d.slice(8, 10))}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
