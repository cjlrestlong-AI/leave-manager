import { describe, expect, it } from 'vitest';
import { calculateBreakdown, calculateDuration, formatDays, roundHalf, summarizeBreakdown } from '@/domain/duration';
import { buildHolidayMap } from '@/domain/holidays';
import { half, makeHoliday, makeLeave, settings } from './fixtures';

const HOLIDAYS = buildHolidayMap([2026], []);

describe('calculateBreakdown 基本', () => {
  it('單日整天 → 1 天', () => {
    const r = makeLeave({ startDate: '2026-09-07', endDate: '2026-09-07', ...half('full', 'full') });
    expect(calculateDuration(r, settings(), HOLIDAYS)).toBe(1);
  });

  it('單日半天（as-is）→ 0.5 天', () => {
    const r = makeLeave({ startDate: '2026-09-07', endDate: '2026-09-07', ...half('am', 'am') });
    expect(calculateDuration(r, settings(), HOLIDAYS)).toBe(0.5);
  });

  it('單日半天（round-up）→ 1 天', () => {
    const r = makeLeave({ startDate: '2026-09-07', endDate: '2026-09-07', ...half('pm', 'pm') });
    expect(calculateDuration(r, settings({ halfDayRounding: 'round-up' }), HOLIDAYS)).toBe(1);
  });

  it('週一至週五 → 5 天', () => {
    const r = makeLeave({ startDate: '2026-09-07', endDate: '2026-09-11' });
    expect(calculateDuration(r, settings(), HOLIDAYS)).toBe(5);
  });

  it('含週末：週一至週日 → 扣掉週六週日，得 5 天', () => {
    const r = makeLeave({ startDate: '2026-09-07', endDate: '2026-09-13' });
    const b = calculateBreakdown(r, settings(), HOLIDAYS);
    expect(b.calendarDays).toBe(7);
    expect(b.total).toBe(5);
    expect(b.weekendDays).toBe(2);
  });

  it('關掉週末排除：週一至週日 → 7 天', () => {
    const r = makeLeave({ startDate: '2026-09-07', endDate: '2026-09-13' });
    expect(calculateDuration(r, settings({ excludeWeekends: false }), HOLIDAYS)).toBe(7);
  });

  it('含公眾假期：2026-09-28(一) 至 10-02(五)，10/1 國慶日為週四假期', () => {
    // 9/28 一、9/29 二、9/30 三、10/1 四（國慶日）、10/2 五 → 扣掉 1 天假期
    const r = makeLeave({ startDate: '2026-09-28', endDate: '2026-10-02' });
    const b = calculateBreakdown(r, settings(), HOLIDAYS);
    expect(b.calendarDays).toBe(5);
    expect(b.total).toBe(4);
    expect(b.weekendDays).toBe(0);
    expect(b.holidayDays).toBe(1);
    expect(b.holidayDates).toEqual(['2026-10-01']);
  });

  it('關掉假期排除後同一段變成 5 天', () => {
    const r = makeLeave({ startDate: '2026-09-28', endDate: '2026-10-02' });
    expect(calculateDuration(r, settings({ excludeHolidays: false }), HOLIDAYS)).toBe(5);
  });

  it('同時是週末又是假期的日子只歸類為週末，不重複扣除', () => {
    // 2026-09-26 中秋節翌日，同時是週六
    const r = makeLeave({ startDate: '2026-09-26', endDate: '2026-09-27' });
    const b = calculateBreakdown(r, settings(), HOLIDAYS);
    expect(b.total).toBe(0);
    expect(b.weekendDays).toBe(2);
    expect(b.holidayDays).toBe(0);
    expect(b.weekendDates).toEqual(['2026-09-26', '2026-09-27']);
    expect(b.holidayDates).toEqual([]);
  });
});

describe('calculateBreakdown 半天與排除的交互', () => {
  it('週五下午 + 下週一整天（as-is）→ 1.5 天', () => {
    const r = makeLeave({ startDate: '2026-09-18', endDate: '2026-09-21', ...half('pm', 'full') });
    expect(calculateDuration(r, settings(), HOLIDAYS)).toBe(1.5);
  });

  it('週五下午 + 下週一整天（round-up）→ 2 天', () => {
    const r = makeLeave({ startDate: '2026-09-18', endDate: '2026-09-21', ...half('pm', 'full') });
    expect(calculateDuration(r, settings({ halfDayRounding: 'round-up' }), HOLIDAYS)).toBe(2);
  });

  it('週五若本身是公眾假期，那個半天被整個扣掉 → 1 天', () => {
    // 2026-12-25 是聖誕節（週五）
    const r = makeLeave({ startDate: '2026-12-25', endDate: '2026-12-28', ...half('pm', 'full') });
    const b = calculateBreakdown(r, settings(), HOLIDAYS);
    expect(b.holidayDays).toBe(0.5);
    expect(b.total).toBe(1);
    expect(calculateDuration(r, settings({ halfDayRounding: 'round-up' }), HOLIDAYS)).toBe(1);
  });

  it('相鄰兩日 pm→am 跨週五到下週一 → 1 天', () => {
    const r = makeLeave({ startDate: '2026-09-18', endDate: '2026-09-21', ...half('pm', 'am') });
    expect(calculateDuration(r, settings(), HOLIDAYS)).toBe(1);
  });

  it('假單整段落在週末 → 0 天', () => {
    const r = makeLeave({ startDate: '2026-09-12', endDate: '2026-09-13' });
    expect(calculateDuration(r, settings(), HOLIDAYS)).toBe(0);
  });

  it('八種設定組合：週末 × 假期 × 半天進位', () => {
    const r = makeLeave({ startDate: '2026-09-25', endDate: '2026-10-02', ...half('pm', 'am') });
    // 9/25 五 pm(0.5)、9/26 六（中秋節翌日，兼具週末與假期）、9/27 日 1、
    // 9/28 一 1、9/29 二 1、9/30 三 1、10/1 四（國慶日）1、10/2 五 am(0.5)
    const combos = [
      { excludeWeekends: true, excludeHolidays: true, halfDayRounding: 'as-is' as const, expect: 4 },
      { excludeWeekends: true, excludeHolidays: true, halfDayRounding: 'round-up' as const, expect: 5 },
      { excludeWeekends: true, excludeHolidays: false, halfDayRounding: 'as-is' as const, expect: 5 },
      { excludeWeekends: true, excludeHolidays: false, halfDayRounding: 'round-up' as const, expect: 6 },
      { excludeWeekends: false, excludeHolidays: true, halfDayRounding: 'as-is' as const, expect: 5 },
      { excludeWeekends: false, excludeHolidays: true, halfDayRounding: 'round-up' as const, expect: 6 },
      { excludeWeekends: false, excludeHolidays: false, halfDayRounding: 'as-is' as const, expect: 7 },
      { excludeWeekends: false, excludeHolidays: false, halfDayRounding: 'round-up' as const, expect: 8 },
    ];
    for (const c of combos) {
      expect(calculateDuration(r, settings(c), HOLIDAYS), JSON.stringify(c)).toBe(c.expect);
    }
  });
});

describe('自訂假期與格式化', () => {
  it('自訂公司假期會被扣除', () => {
    const custom = buildHolidayMap([2026], [makeHoliday('2026-09-09', '公司活動日')]);
    const r = makeLeave({ startDate: '2026-09-07', endDate: '2026-09-11' });
    expect(calculateDuration(r, settings(), custom)).toBe(4);
  });

  it('roundHalf 消除浮點誤差', () => {
    expect(roundHalf(0.1 + 0.2)).toBe(0.5);
    expect(roundHalf(2.4999999999)).toBe(2.5);
  });

  it('formatDays', () => {
    expect(formatDays(3)).toBe('3');
    expect(formatDays(3.5)).toBe('3.5');
  });

  it('summarizeBreakdown 產生扣除說明', () => {
    // 9/25 五、9/26 六（中秋節翌日）、9/27 日、9/28 一、9/29 二、9/30 三、
    // 10/1 四（國慶日）、10/2 五 → 扣 2 天週末 + 1 天假期 = 5 天
    const r = makeLeave({ startDate: '2026-09-25', endDate: '2026-10-02' });
    const b = calculateBreakdown(r, settings(), HOLIDAYS);
    const s = summarizeBreakdown(b, HOLIDAYS, settings());
    expect(s.text).toBe('5 天');
    expect(s.excludedText).toContain('2 天週末');
    expect(s.excludedText).toContain('1 天公眾假期');
    expect(s.excludedText).toContain('國慶日');
    // 9/26 被歸類為週末，不該出現在假期名稱裡
    expect(s.excludedText).not.toContain('中秋節翌日');
  });

  it('無扣除時 excludedText 為 null', () => {
    const r = makeLeave({ startDate: '2026-09-07', endDate: '2026-09-08' });
    const b = calculateBreakdown(r, settings(), HOLIDAYS);
    expect(summarizeBreakdown(b, HOLIDAYS, settings()).excludedText).toBeNull();
  });
});
