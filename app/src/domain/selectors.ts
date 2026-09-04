import { useMemo } from 'react';
import { buildHolidayMap, type HolidayMap } from '@/domain/holidays';
import { buildOccupancyIndex, makeWorkdayPredicate, type OccupancyIndex } from '@/domain/occupancy';
import { detectConflicts, type ConflictSegment } from '@/domain/conflict';
import { buildReminders, type Reminder } from '@/domain/reminders';
import { calculateDuration } from '@/domain/duration';
import { liveEmployees, liveRecords } from '@/domain/leave';
import type { AppData, AppSettings, Employee, LeaveRecord } from '@/domain/types';

export interface DerivedData {
  employees: Employee[];
  leaves: LeaveRecord[];
  employeeById: Map<string, Employee>;
  holidayMap: HolidayMap;
  index: OccupancyIndex;
  /** 超過門檻的衝突段 */
  conflicts: ConflictSegment[];
  /** 含「剛好等於門檻」的段（用於「已達上限」提示） */
  allFlagged: ConflictSegment[];
  reminders: Reminder[];
  isWorkday: (date: string) => boolean;
  today: string;
}

/**
 * 從原始資料衍生出所有視圖需要的結果。
 * 全部走 useMemo，資料量小，欄位一改即可即時反映到月曆／時間軸／看板。
 */
export function useDerived(data: AppData, today: string): DerivedData {
  return useMemo(() => {
    const employees = liveEmployees(data.employees);
    const leaves = liveRecords(data.leaves);
    const employeeById = new Map(employees.map((e) => [e.id, e]));

    const years = new Set<number>();
    years.add(Number(today.slice(0, 4)));
    years.add(Number(today.slice(0, 4)) + 1);
    for (const r of leaves) {
      years.add(Number(r.startDate.slice(0, 4)));
      years.add(Number(r.endDate.slice(0, 4)));
    }
    const holidayMap = buildHolidayMap(years, data.holidays);

    const occOpts = {
      excludeWeekends: data.settings.excludeWeekends,
      excludeHolidays: data.settings.excludeHolidays,
    };
    const index = buildOccupancyIndex(leaves, holidayMap, occOpts);
    const isWorkday = makeWorkdayPredicate(holidayMap, occOpts);

    const baseOpts = {
      workdaysOnly: data.settings.conflictWorkdaysOnly,
      includeAtThreshold: false,
      isWorkday,
    };
    const conflicts = detectConflicts(index, data.settings.overlapThreshold, baseOpts);
    const allFlagged = detectConflicts(index, data.settings.overlapThreshold, {
      ...baseOpts,
      includeAtThreshold: true,
    });

    const reminders = buildReminders({
      records: leaves,
      employees,
      holidays: holidayMap,
      settings: data.settings,
      conflicts,
      today,
    });

    return {
      employees,
      leaves,
      employeeById,
      holidayMap,
      index,
      conflicts,
      allFlagged,
      reminders,
      isWorkday,
      today,
    };
  }, [data, today]);
}

/** 某人在某日期區間內的請假總天數（考量設定） */
export function employeeDaysInRange(
  records: readonly LeaveRecord[],
  employeeId: string,
  start: string,
  end: string,
  settings: AppSettings,
  holidays: HolidayMap,
): number {
  let total = 0;
  for (const r of records) {
    if (r.employeeId !== employeeId) continue;
    if (r.endDate < start || r.startDate > end) continue;
    total += calculateDuration(r, settings, holidays);
  }
  return total;
}

/** 某人在指定年月的請假天數（含跨月假單） */
export function employeeDaysInMonth(
  records: readonly LeaveRecord[],
  employeeId: string,
  yearMonth: string,
  settings: AppSettings,
  holidays: HolidayMap,
): number {
  const [y, m] = yearMonth.split('-').map(Number);
  const monthStart = `${yearMonth}-01`;
  const monthEnd = lastDayOfMonth(y, m);
  return employeeDaysInRange(records, employeeId, monthStart, monthEnd, settings, holidays);
}

function lastDayOfMonth(y: number, m: number): string {
  const d = new Date(y, m, 0); // m+1 月的前一天 = 當月最後一天（m 為 1-12）
  return `${y}-${String(m).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
