import { isWeekend, type ISODate } from '@/lib/date';
import { expandRecordToDays } from './occupancy';
import type { HolidayMap } from './holidays';
import type { AppSettings, LeaveRecord } from './types';

export interface DurationBreakdown {
  /** 最終請假天數（0.5 為單位） */
  total: number;
  /** 含週末假期的日曆天數 */
  calendarDays: number;
  /** 有計入的工作日數（折算前） */
  workdays: number;
  weekendDays: number;
  holidayDays: number;
  /** 半日片段數（0 / 1 / 2） */
  halfDays: number;
  /** 被扣除的日期，供 UI「查看扣了哪些天」 */
  excludedDates: ISODate[];
  /** 因週末被扣除的日期 */
  weekendDates: ISODate[];
  /** 因公眾假期被扣除的日期（週末優先歸類為週末，不重複計算） */
  holidayDates: ISODate[];
}

/**
 * 天數計算。
 *
 * 順序是「先扣週末與公眾假期，再處理半天進位」：
 *   isCountable(d) = !(排除週末 && 週末) && !(排除假期 && 是公眾假期)
 *   raw   = Σ portion × isCountable(d)
 *   total = 半天進位 ? raw + 半日片段數 × 0.5 : raw
 *
 * 因此「週五下午 + 下週一整天」在 as-is 是 1.5 天、round-up 是 2 天；
 * 若週五剛好是公眾假期，兩種模式都是 1 天（那個半天被整個扣掉）。
 */
export function calculateBreakdown(
  r: LeaveRecord,
  settings: Pick<AppSettings, 'excludeWeekends' | 'excludeHolidays' | 'halfDayRounding'>,
  holidays: HolidayMap,
): DurationBreakdown {
  const days = expandRecordToDays(r);

  let raw = 0;
  let workdays = 0;
  let weekendDays = 0;
  let holidayDays = 0;
  let halfDays = 0;
  const excludedDates: ISODate[] = [];
  const weekendDates: ISODate[] = [];
  const holidayDates: ISODate[] = [];

  for (const d of days) {
    const holiday = holidays.get(d.date) ?? null;
    const weekend = isWeekend(d.date);
    const countable = !(settings.excludeWeekends && weekend) && !(settings.excludeHolidays && holiday);

    if (!countable) {
      excludedDates.push(d.date);
      // 週末優先：同時是週末又是假期的日子只算一次，歸類為週末
      if (weekend) {
        weekendDays += d.portion;
        weekendDates.push(d.date);
      } else {
        holidayDays += d.portion;
        holidayDates.push(d.date);
      }
      continue;
    }

    raw += d.portion;
    if (d.portion === 1) workdays += 1;
    else halfDays += 1;
  }

  const total = settings.halfDayRounding === 'round-up' ? raw + halfDays * 0.5 : raw;

  return {
    total: roundHalf(total),
    calendarDays: days.length,
    workdays,
    weekendDays: roundHalf(weekendDays),
    holidayDays: roundHalf(holidayDays),
    halfDays,
    excludedDates,
    weekendDates,
    holidayDates,
  };
}

export function calculateDuration(
  r: LeaveRecord,
  settings: Pick<AppSettings, 'excludeWeekends' | 'excludeHolidays' | 'halfDayRounding'>,
  holidays: HolidayMap,
): number {
  return calculateBreakdown(r, settings, holidays).total;
}

/** 無條件捨去到 0.5 的倍率，避免浮點誤差（0.30000000000000004 之類） */
export function roundHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

/** 天數的人話顯示：3 → "3"，3.5 → "3.5" */
export function formatDays(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

export interface BreakdownSummary {
  text: string;
  excludedText: string | null;
}

/** 產生「已扣除 2 天週末、1 天公眾假期」這類說明 */
export function summarizeBreakdown(
  b: DurationBreakdown,
  holidays: HolidayMap,
  settings: Pick<AppSettings, 'excludeWeekends' | 'excludeHolidays'>,
): BreakdownSummary {
  const parts: string[] = [];
  if (settings.excludeWeekends && b.weekendDays > 0) {
    parts.push(`${formatDays(b.weekendDays)} 天週末`);
  }
  if (settings.excludeHolidays && b.holidayDays > 0) {
    const names = b.holidayDates
      .map((d) => holidays.get(d)?.name)
      .filter((n): n is string => Boolean(n));
    const namePart = names.length > 0 ? `（${names.slice(0, 2).join('、')}${names.length > 2 ? '等' : ''}）` : '';
    parts.push(`${formatDays(b.holidayDays)} 天公眾假期${namePart}`);
  }
  return {
    text: `${formatDays(b.total)} 天`,
    excludedText: parts.length > 0 ? `已扣除 ${parts.join('、')}` : null,
  };
}
