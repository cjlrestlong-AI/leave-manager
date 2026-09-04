import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  compareISO,
  diffDays,
  eachDay,
  endOfMonth,
  formatDisplay,
  formatISODate,
  formatRange,
  isWeekend,
  isValidISODate,
  nextDay,
  parseISODate,
  prevDay,
  startOfMonth,
  startOfWeek,
  toISODate,
} from '@/lib/date';
import { todayInOrg } from '@/lib/hkt';

describe('date 基礎', () => {
  it('ISO 字串字典序即時間序', () => {
    expect(compareISO('2026-09-03', '2026-09-04')).toBe(-1);
    expect(compareISO('2026-10-01', '2026-09-30')).toBe(1);
    expect(compareISO('2026-09-03', '2026-09-03')).toBe(0);
  });

  it('parse → format 來回一致，且不經過 UTC', () => {
    const d = parseISODate('2026-09-03');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(3);
    expect(formatISODate(d)).toBe('2026-09-03');
  });

  it('isValidISODate 擋掉不存在的日期', () => {
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('2026-9-3')).toBe(false);
    expect(isValidISODate('2026-02-28')).toBe(true);
    expect(isValidISODate('2028-02-29')).toBe(true); // 閏年
    expect(isValidISODate('2026-02-29')).toBe(false);
  });

  it('跨月跨年加減天', () => {
    expect(nextDay('2026-09-30')).toBe('2026-10-01');
    expect(nextDay('2026-12-31')).toBe('2027-01-01');
    expect(prevDay('2026-10-01')).toBe('2026-09-30');
    expect(prevDay('2027-01-01')).toBe('2026-12-31');
    expect(addDays('2026-09-03', 30)).toBe('2026-10-03');
    expect(addDays('2026-09-03', -3)).toBe('2026-08-31');
  });

  it('閏年 2028-02-29 前後連續', () => {
    expect(nextDay('2028-02-28')).toBe('2028-02-29');
    expect(nextDay('2028-02-29')).toBe('2028-03-01');
    expect(diffDays('2028-03-01', '2028-02-28')).toBe(2);
  });

  it('eachDay 含首尾', () => {
    expect(eachDay('2026-09-03', '2026-09-05')).toEqual([
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
    ]);
    expect(eachDay('2026-09-03', '2026-09-03')).toEqual(['2026-09-03']);
    expect(eachDay('2026-09-05', '2026-09-03')).toEqual([]);
  });

  it('週末判定', () => {
    // 2026-09-05 是週六，2026-09-06 是週日，2026-09-07 是週一
    expect(isWeekend('2026-09-05')).toBe(true);
    expect(isWeekend('2026-09-06')).toBe(true);
    expect(isWeekend('2026-09-07')).toBe(false);
  });

  it('月份工具', () => {
    expect(startOfMonth('2026-09-18')).toBe('2026-09-01');
    expect(endOfMonth('2026-09-18')).toBe('2026-09-30');
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
  });

  it('startOfWeek（週日起）', () => {
    // 2026-09-09 是週三
    expect(startOfWeek('2026-09-09')).toBe('2026-09-06');
    expect(startOfWeek('2026-09-06')).toBe('2026-09-06');
  });

  it('toISODate 補零', () => {
    expect(toISODate(2026, 9, 3)).toBe('2026-09-03');
    expect(toISODate(2026, 12, 25)).toBe('2026-12-25');
  });

  it('顯示格式', () => {
    expect(formatDisplay('2026-09-03', 'long')).toBe('2026年9月3日');
    expect(formatDisplay('2026-09-03', 'short')).toBe('9/3');
    expect(formatDisplay('2026-09-03', 'md')).toBe('9月3日（四）');
    expect(formatDisplay('2026-09-03', 'monthTitle')).toBe('2026年9月');
    expect(formatRange('2026-09-03', '2026-09-05')).toBe('9/3 – 9/5');
    expect(formatRange('2026-12-30', '2027-01-02')).toBe('2026年12月30日 – 2027年1月2日');
  });
});

describe('香港時區', () => {
  it('UTC 16:00 時香港已是隔日 00:00', () => {
    const now = new Date('2026-09-03T16:00:00.000Z');
    expect(todayInOrg('Asia/Hong_Kong', now)).toBe('2026-09-04');
  });

  it('UTC 15:59 時香港仍是同一天 23:59', () => {
    const now = new Date('2026-09-03T15:59:00.000Z');
    expect(todayInOrg('Asia/Hong_Kong', now)).toBe('2026-09-03');
  });

  it('同一個 UTC 時刻，香港比紐約早一天', () => {
    const now = new Date('2026-09-03T20:00:00.000Z');
    expect(todayInOrg('Asia/Hong_Kong', now)).toBe('2026-09-04');
    expect(todayInOrg('America/New_York', now)).toBe('2026-09-03');
  });

  it('回傳值永遠是合法的 YYYY-MM-DD', () => {
    expect(isValidISODate(todayInOrg())).toBe(true);
    expect(todayInOrg()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
