import { eachDay, isWeekend, type ISODate } from '@/lib/date';
import type { HalfDay, Holiday, LeaveRecord, LeaveTypeId } from './types';
import type { HolidayMap } from './holidays';

export interface DaySlot {
  recordId: string;
  employeeId: string;
  type: LeaveTypeId;
  /** 當日的時段：full / am / pm */
  half: HalfDay;
  /** 當日占用比例：整天 1，半天 0.5 */
  portion: 0.5 | 1;
}

export interface DayOccupancy {
  date: ISODate;
  slots: DaySlot[];
  /** Σ portion，單位「人天」，供統計用 */
  weighted: number;
  /** 不重複人數。同一人當天 am + pm 兩筆仍算 1 —— 門檻判定用這個 */
  distinct: number;
  /** 已去重 */
  employeeIds: string[];
  isWeekend: boolean;
  holiday: Holiday | null;
  /** 依設定判定為「需計假的工作日」 */
  isWorkday: boolean;
}

export type OccupancyIndex = Map<ISODate, DayOccupancy>;

export interface ExpandedDay {
  date: ISODate;
  portion: 0.5 | 1;
  half: HalfDay;
}

/**
 * 把一筆假單展開成逐日的占用片段（含半日）。
 *
 *  單日：portion = full ? 1 : 0.5
 *  多日：首日 (startHalf === 'pm' ? 0.5 : 1) + 中間各 1 + 末日 (endHalf === 'am' ? 0.5 : 1)
 *
 * 注意：起訖相鄰時不會進入中間迴圈，直接得到 [pm, am] 兩筆 0.5，共 1.0 天。
 */
export function expandRecordToDays(r: LeaveRecord): ExpandedDay[] {
  if (r.endDate < r.startDate) return [];

  if (r.startDate === r.endDate) {
    return [
      {
        date: r.startDate,
        portion: r.startHalf === 'full' ? 1 : 0.5,
        half: r.startHalf,
      },
    ];
  }

  const out: ExpandedDay[] = [];
  out.push({
    date: r.startDate,
    portion: r.startHalf === 'pm' ? 0.5 : 1,
    half: r.startHalf,
  });

  const all = eachDay(r.startDate, r.endDate);
  for (let i = 1; i < all.length - 1; i++) {
    out.push({ date: all[i], portion: 1, half: 'full' });
  }

  out.push({
    date: r.endDate,
    portion: r.endHalf === 'am' ? 0.5 : 1,
    half: r.endHalf,
  });

  return out;
}

export interface OccupancyOptions {
  excludeWeekends: boolean;
  excludeHolidays: boolean;
}

export function isCountableDay(
  date: ISODate,
  holiday: Holiday | null,
  opts: OccupancyOptions,
): boolean {
  if (opts.excludeWeekends && isWeekend(date)) return false;
  if (opts.excludeHolidays && holiday) return false;
  return true;
}

/**
 * 產生「這天是否為工作日」的判定函式。
 *
 * 必須獨立於占用索引：索引只收錄「有人放假」的日期，
 * 衝突合併要判斷兩個達標日之間夾著的是不是週末／假期時，
 * 那些日期通常沒人放假，索引裡查不到。
 */
export function makeWorkdayPredicate(
  holidays: HolidayMap,
  opts: OccupancyOptions,
): (date: ISODate) => boolean {
  return (date) => isCountableDay(date, holidays.get(date) ?? null, opts);
}

/**
 * 建立逐日占用索引。records 需已過濾軟刪除。複雜度 O(總天數)。
 */
export function buildOccupancyIndex(
  records: readonly LeaveRecord[],
  holidays: HolidayMap,
  opts: OccupancyOptions,
): OccupancyIndex {
  const byDate = new Map<ISODate, Map<string, DaySlot>>();

  for (const r of records) {
    if (r.deletedAt) continue;
    for (const day of expandRecordToDays(r)) {
      let slots = byDate.get(day.date);
      if (!slots) {
        slots = new Map();
        byDate.set(day.date, slots);
      }
      // 同一人同一天多筆（如 am + pm 兩筆）時，用複合 key 保留兩筆，
      // 但 distinct 計算時以 employeeId 去重。
      const key = `${r.id}`;
      slots.set(key, {
        recordId: r.id,
        employeeId: r.employeeId,
        type: r.type,
        half: day.half,
        portion: day.portion,
      });
    }
  }

  const index: OccupancyIndex = new Map();
  for (const [date, slotMap] of byDate) {
    const slots = [...slotMap.values()];
    let weighted = 0;
    const distinctSet = new Set<string>();
    for (const s of slots) {
      weighted += s.portion;
      distinctSet.add(s.employeeId);
    }
    const holiday = holidays.get(date) ?? null;
    index.set(date, {
      date,
      slots,
      weighted,
      distinct: distinctSet.size,
      employeeIds: [...distinctSet],
      isWeekend: isWeekend(date),
      holiday,
      isWorkday: isCountableDay(date, holiday, opts),
    });
  }

  return index;
}

/** 排序後的日期鍵 */
export function sortedDates(index: OccupancyIndex): ISODate[] {
  return [...index.keys()].sort();
}

/** 某日的占用；無資料時回傳空占用 */
export function occupancyOn(index: OccupancyIndex, date: ISODate): DayOccupancy | null {
  return index.get(date) ?? null;
}
