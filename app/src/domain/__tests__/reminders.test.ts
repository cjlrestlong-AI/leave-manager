import { describe, expect, it } from 'vitest';
import { buildReminders, groupOf } from '@/domain/reminders';
import { detectConflicts } from '@/domain/conflict';
import { buildOccupancyIndex, makeWorkdayPredicate } from '@/domain/occupancy';
import { buildHolidayMap } from '@/domain/holidays';
import { annual, makeEmployee, settings } from './fixtures';

const HOLIDAYS = buildHolidayMap([2026], []);
const OPTS = { excludeWeekends: true, excludeHolidays: true };
const TODAY = '2026-09-03'; // 週四

const employees = [
  makeEmployee({ id: 'e1', name: '陳大明' }),
  makeEmployee({ id: 'e2', name: '李小美' }),
  makeEmployee({ id: 'e3', name: '王大同' }),
];

function remindersFor(records: readonly ReturnType<typeof annual>[], leadDays = 7) {
  const idx = buildOccupancyIndex(records, HOLIDAYS, OPTS);
  const conflicts = detectConflicts(idx, 2, {
    workdaysOnly: true,
    includeAtThreshold: false,
    isWorkday: makeWorkdayPredicate(HOLIDAYS, OPTS),
  });
  return buildReminders({
    records,
    employees,
    holidays: HOLIDAYS,
    settings: settings({ reminderLeadDays: leadDays }),
    conflicts,
    today: TODAY,
  });
}

describe('buildReminders 邊界天數', () => {
  it('今天開始 → 出現在提醒，daysUntil=0', () => {
    const rs = remindersFor([annual('e1', '2026-09-03', '2026-09-04')]);
    expect(rs).toHaveLength(1);
    expect(rs[0].daysUntil).toBe(0);
    expect(rs[0].kind).toBe('on-leave');
    expect(groupOf(rs[0])).toBe('today');
  });

  it('明天開始 → daysUntil=1', () => {
    const rs = remindersFor([annual('e1', '2026-09-04', '2026-09-04')]);
    expect(rs[0].daysUntil).toBe(1);
    expect(rs[0].kind).toBe('starting');
    expect(groupOf(rs[0])).toBe('tomorrow');
  });

  it('剛好第 7 天 → 出現', () => {
    const rs = remindersFor([annual('e1', '2026-09-10', '2026-09-10')]);
    expect(rs).toHaveLength(1);
    expect(rs[0].daysUntil).toBe(7);
  });

  it('第 8 天 → 不出現', () => {
    expect(remindersFor([annual('e1', '2026-09-11', '2026-09-11')])).toEqual([]);
  });

  it('leadDays 改成 14 時第 10 天也出現', () => {
    const rs = remindersFor([annual('e1', '2026-09-13', '2026-09-13')], 14);
    expect(rs).toHaveLength(1);
    expect(rs[0].daysUntil).toBe(10);
  });

  it('過去的假單不出現在提醒', () => {
    expect(remindersFor([annual('e1', '2026-08-20', '2026-08-21')])).toEqual([]);
  });
});

describe('buildReminders 種類', () => {
  it('休假中顯示第幾天', () => {
    const rs = remindersFor([annual('e1', '2026-09-01', '2026-09-05')]);
    const onLeave = rs.find((r) => r.kind === 'on-leave')!;
    expect(onLeave.title).toBe('陳大明 休假中（第 3 天）');
    expect(onLeave.detail).toContain('共 5 天');
  });

  it('今天是最後一天 → 額外產生明天恢復上班', () => {
    const rs = remindersFor([annual('e1', '2026-09-01', '2026-09-03')]);
    const ret = rs.find((r) => r.kind === 'returning')!;
    expect(ret.title).toBe('陳大明 明天恢復上班');
    expect(ret.daysUntil).toBe(1);
  });

  it('衝突即將發生 → warn 等級且排最前', () => {
    const rs = remindersFor([
      annual('e1', '2026-09-07', '2026-09-07'),
      annual('e2', '2026-09-07', '2026-09-07'),
      annual('e3', '2026-09-07', '2026-09-07'),
    ]);
    expect(rs[0].kind).toBe('conflict-soon');
    expect(rs[0].level).toBe('warn');
    expect(rs[0].title).toContain('3 人同時放假');
  });

  it('衝突超過提醒窗口 → 連個別假單都不提醒（起始日也在窗口外）', () => {
    expect(remindersFor([annual('e1', '2026-09-30', '2026-09-30')])).toEqual([]);
  });

  it('加長提醒天數後，同一個衝突會以 warn 等級排最前', () => {
    const rs = remindersFor(
      [
        annual('e1', '2026-09-30', '2026-09-30'),
        annual('e2', '2026-09-30', '2026-09-30'),
        annual('e3', '2026-09-30', '2026-09-30'),
      ],
      30,
    );
    expect(rs[0].kind).toBe('conflict-soon');
    expect(rs[0].daysUntil).toBe(27);
    expect(rs).toHaveLength(4); // 1 則衝突 + 3 則個別假單
  });

  it('已移除的同事不產生提醒', () => {
    const rs = remindersFor([annual('ghost', '2026-09-04', '2026-09-04')]);
    expect(rs).toEqual([]);
  });

  it('軟刪除的假單不產生提醒', () => {
    const r = { ...annual('e1', '2026-09-04', '2026-09-04'), deletedAt: '2026-09-01T00:00:00.000Z' };
    expect(remindersFor([r])).toEqual([]);
  });
});

describe('buildReminders 排序', () => {
  it('依天數升冪排序', () => {
    const rs = remindersFor([
      annual('e1', '2026-09-10', '2026-09-10'),
      annual('e2', '2026-09-04', '2026-09-04'),
      annual('e3', '2026-09-07', '2026-09-07'),
    ]);
    expect(rs.map((r) => r.daysUntil)).toEqual([1, 4, 7]);
  });

  it('同一天多人依中文姓名排序（兩人，未達衝突門檻）', () => {
    const rs = remindersFor([
      annual('e3', '2026-09-04', '2026-09-04'),
      annual('e1', '2026-09-04', '2026-09-04'),
    ]);
    const titles = rs.map((r) => r.title);
    // 排序結果應與 ICU 中文排序一致
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, 'zh-Hant-HK')));
    expect(titles).toHaveLength(2);
  });

  it('警告永遠排在一般提醒之前', () => {
    const rs = remindersFor([
      annual('e1', '2026-09-04', '2026-09-04'), // 明天，1 天後
      annual('e2', '2026-09-07', '2026-09-07'),
      annual('e3', '2026-09-07', '2026-09-07'),
      annual('e1', '2026-09-07', '2026-09-07'), // 3 人 → 衝突，4 天後
    ]);
    expect(rs[0].level).toBe('warn');
    expect(rs[0].daysUntil).toBe(4);
    expect(rs[1].daysUntil).toBe(1);
  });

  it('id 唯一，可直接當 React key', () => {
    const rs = remindersFor([
      annual('e1', '2026-09-04', '2026-09-04'),
      annual('e2', '2026-09-04', '2026-09-04'),
    ]);
    expect(new Set(rs.map((r) => r.id)).size).toBe(rs.length);
  });
});
