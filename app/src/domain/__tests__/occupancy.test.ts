import { describe, expect, it } from 'vitest';
import { buildOccupancyIndex, expandRecordToDays } from '@/domain/occupancy';
import { buildHolidayMap } from '@/domain/holidays';
import { annual, half, makeLeave, settings } from './fixtures';

const NO_HOLIDAYS = buildHolidayMap([]);
const opts = { excludeWeekends: true, excludeHolidays: true };

describe('expandRecordToDays', () => {
  it('單日整天 → 1 天', () => {
    const r = makeLeave({ startDate: '2026-09-03', endDate: '2026-09-03', ...half('full', 'full') });
    expect(expandRecordToDays(r)).toEqual([{ date: '2026-09-03', portion: 1, half: 'full' }]);
  });

  it('單日上午 → 0.5 天', () => {
    const r = makeLeave({ startDate: '2026-09-03', endDate: '2026-09-03', ...half('am', 'am') });
    expect(expandRecordToDays(r)).toEqual([{ date: '2026-09-03', portion: 0.5, half: 'am' }]);
  });

  it('單日下午 → 0.5 天', () => {
    const r = makeLeave({ startDate: '2026-09-03', endDate: '2026-09-03', ...half('pm', 'pm') });
    expect(expandRecordToDays(r)).toEqual([{ date: '2026-09-03', portion: 0.5, half: 'pm' }]);
  });

  it('多日全程 → 每天都 1', () => {
    const r = makeLeave({ startDate: '2026-09-03', endDate: '2026-09-05', ...half('full', 'full') });
    expect(expandRecordToDays(r)).toEqual([
      { date: '2026-09-03', portion: 1, half: 'full' },
      { date: '2026-09-04', portion: 1, half: 'full' },
      { date: '2026-09-05', portion: 1, half: 'full' },
    ]);
  });

  it('多日下午開始 → 首日 0.5', () => {
    const r = makeLeave({ startDate: '2026-09-03', endDate: '2026-09-05', ...half('pm', 'full') });
    const days = expandRecordToDays(r);
    expect(days[0]).toEqual({ date: '2026-09-03', portion: 0.5, half: 'pm' });
    expect(days).toHaveLength(3);
  });

  it('多日上午結束 → 末日 0.5', () => {
    const r = makeLeave({ startDate: '2026-09-03', endDate: '2026-09-05', ...half('full', 'am') });
    const days = expandRecordToDays(r);
    expect(days[days.length - 1]).toEqual({ date: '2026-09-05', portion: 0.5, half: 'am' });
  });

  it('相鄰兩日 pm → am → 兩筆 0.5，共 1.0 天', () => {
    const r = makeLeave({ startDate: '2026-09-03', endDate: '2026-09-04', ...half('pm', 'am') });
    const days = expandRecordToDays(r);
    expect(days).toEqual([
      { date: '2026-09-03', portion: 0.5, half: 'pm' },
      { date: '2026-09-04', portion: 0.5, half: 'am' },
    ]);
    expect(days.reduce((s, d) => s + d.portion, 0)).toBe(1);
  });

  it('結束日早於開始日 → 空陣列', () => {
    const r = makeLeave({ startDate: '2026-09-05', endDate: '2026-09-03' });
    expect(expandRecordToDays(r)).toEqual([]);
  });

  it('跨月與跨年', () => {
    const r = makeLeave({ startDate: '2026-09-30', endDate: '2026-10-02' });
    expect(expandRecordToDays(r).map((d) => d.date)).toEqual([
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
    const y = makeLeave({ startDate: '2026-12-31', endDate: '2027-01-01' });
    expect(expandRecordToDays(y).map((d) => d.date)).toEqual(['2026-12-31', '2027-01-01']);
  });

  it('閏年 2028-02-28 → 03-01 共 3 天', () => {
    const r = makeLeave({ startDate: '2028-02-28', endDate: '2028-03-01' });
    expect(expandRecordToDays(r).map((d) => d.date)).toEqual([
      '2028-02-28',
      '2028-02-29',
      '2028-03-01',
    ]);
  });
});

describe('buildOccupancyIndex', () => {
  it('distinct 與 weighted 的差異：兩人各放半天 → distinct=2, weighted=1', () => {
    const records = [
      makeLeave({ id: 'a', employeeId: 'e1', startDate: '2026-09-07', endDate: '2026-09-07', ...half('am', 'am') }),
      makeLeave({ id: 'b', employeeId: 'e2', startDate: '2026-09-07', endDate: '2026-09-07', ...half('pm', 'pm') }),
    ];
    const idx = buildOccupancyIndex(records, NO_HOLIDAYS, opts);
    const occ = idx.get('2026-09-07')!;
    expect(occ.distinct).toBe(2);
    expect(occ.weighted).toBe(1);
  });

  it('同一人當天 am + pm 兩筆 → distinct 仍為 1', () => {
    const records = [
      makeLeave({ id: 'a', employeeId: 'e1', startDate: '2026-09-07', endDate: '2026-09-07', ...half('am', 'am') }),
      makeLeave({ id: 'b', employeeId: 'e1', startDate: '2026-09-07', endDate: '2026-09-07', ...half('pm', 'pm') }),
    ];
    const idx = buildOccupancyIndex(records, NO_HOLIDAYS, opts);
    const occ = idx.get('2026-09-07')!;
    expect(occ.distinct).toBe(1);
    expect(occ.weighted).toBe(1);
    expect(occ.slots).toHaveLength(2);
  });

  it('軟刪除的紀錄不計入', () => {
    const records = [
      makeLeave({ id: 'a', employeeId: 'e1', startDate: '2026-09-07', endDate: '2026-09-07' }),
      makeLeave({ id: 'b', employeeId: 'e2', startDate: '2026-09-07', endDate: '2026-09-07', deletedAt: '2026-09-08T00:00:00.000Z' }),
    ];
    const idx = buildOccupancyIndex(records, NO_HOLIDAYS, opts);
    expect(idx.get('2026-09-07')!.distinct).toBe(1);
  });

  it('isWorkday 依設定排除週末與假期', () => {
    const records = [makeLeave({ id: 'a', employeeId: 'e1', startDate: '2026-09-05', endDate: '2026-09-07' })];
    const holidayMap = buildHolidayMap([2026], []);
    const idx = buildOccupancyIndex(records, holidayMap, opts);
    // 2026-09-05 週六、09-06 週日、09-07 週一
    expect(idx.get('2026-09-05')!.isWorkday).toBe(false);
    expect(idx.get('2026-09-06')!.isWorkday).toBe(false);
    expect(idx.get('2026-09-07')!.isWorkday).toBe(true);
  });

  it('公眾假期被標記且 isWorkday=false', () => {
    // 2026-10-01 國慶日
    const records = [makeLeave({ id: 'a', employeeId: 'e1', startDate: '2026-10-01', endDate: '2026-10-01' })];
    const holidayMap = buildHolidayMap([2026], []);
    const idx = buildOccupancyIndex(records, holidayMap, opts);
    expect(idx.get('2026-10-01')!.holiday?.name).toBe('國慶日');
    expect(idx.get('2026-10-01')!.isWorkday).toBe(false);
  });

  it('關掉週末排除後週末也算工作日', () => {
    const records = [makeLeave({ id: 'a', employeeId: 'e1', startDate: '2026-09-05', endDate: '2026-09-05' })];
    const idx = buildOccupancyIndex(records, NO_HOLIDAYS, {
      excludeWeekends: false,
      excludeHolidays: true,
    });
    expect(idx.get('2026-09-05')!.isWorkday).toBe(true);
  });

  it('三人同日 → distinct=3', () => {
    const records = [
      annual('e1', '2026-09-07', '2026-09-07'),
      annual('e2', '2026-09-07', '2026-09-07'),
      annual('e3', '2026-09-07', '2026-09-07'),
    ];
    const idx = buildOccupancyIndex(records, NO_HOLIDAYS, opts);
    expect(idx.get('2026-09-07')!.distinct).toBe(3);
    expect(idx.get('2026-09-07')!.employeeIds.sort()).toEqual(['e1', 'e2', 'e3']);
  });

  it('設定物件可直接由 settings 取值', () => {
    const s = settings();
    expect(s.overlapThreshold).toBe(2);
    expect(s.excludeWeekends).toBe(true);
  });
});
