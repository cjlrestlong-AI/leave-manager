import { compareISO, isValidISODate, type ISODate } from '@/lib/date';
import type { Employee, HalfDay, LeaveRecord, LeaveTypeId } from './types';

/** 假單草稿（表單使用），id 在新增時產生 */
export type LeaveDraft = Omit<LeaveRecord, 'rev' | 'updatedAt' | 'deletedAt'> &
  Partial<Pick<LeaveRecord, 'rev' | 'updatedAt' | 'deletedAt'>>;

/** 半天語意的合法組合 */
export function isValidHalfCombo(startHalf: HalfDay, endHalf: HalfDay, singleDay: boolean): boolean {
  if (singleDay) return startHalf === endHalf;
  // 多日：首日只能整天或下午開始；末日只能整天或上午結束
  return (
    (startHalf === 'full' || startHalf === 'pm') && (endHalf === 'full' || endHalf === 'am')
  );
}

/** 依日期區間決定 UI 該顯示哪一種時段選擇器 */
export function isSingleDay(start: ISODate, end: ISODate): boolean {
  return start === end;
}

export function normalizeDraft(draft: LeaveDraft): LeaveRecord {
  const single = isSingleDay(draft.startDate, draft.endDate);
  let startHalf = draft.startHalf;
  let endHalf = draft.endHalf;
  if (single && startHalf !== endHalf) {
    // 單日兩欄必須一致，以起始欄為準
    endHalf = startHalf;
  }
  if (!single) {
    if (startHalf === 'am') startHalf = 'full';
    if (endHalf === 'pm') endHalf = 'full';
  }
  return {
    ...draft,
    startHalf,
    endHalf,
    rev: draft.rev ?? 1,
    updatedAt: draft.updatedAt ?? new Date().toISOString(),
    deletedAt: draft.deletedAt ?? null,
  };
}

export type ValidationIssue = {
  field: 'employeeId' | 'startDate' | 'endDate' | 'half' | 'note';
  code: 'REQUIRED' | 'INVALID_DATE' | 'END_BEFORE_START' | 'INVALID_HALF_COMBO' | 'TOO_LONG';
  message: string;
};

export function validateRecord(r: LeaveRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!r.employeeId) {
    issues.push({ field: 'employeeId', code: 'REQUIRED', message: '請選擇同事' });
  }
  if (!isValidISODate(r.startDate)) {
    issues.push({ field: 'startDate', code: 'INVALID_DATE', message: '開始日期格式不正確' });
  }
  if (!isValidISODate(r.endDate)) {
    issues.push({ field: 'endDate', code: 'INVALID_DATE', message: '結束日期格式不正確' });
  }
  if (
    isValidISODate(r.startDate) &&
    isValidISODate(r.endDate) &&
    compareISO(r.endDate, r.startDate) < 0
  ) {
    issues.push({ field: 'endDate', code: 'END_BEFORE_START', message: '結束日不能早於開始日' });
  }
  if (
    isValidISODate(r.startDate) &&
    isValidISODate(r.endDate) &&
    compareISO(r.endDate, r.startDate) >= 0 &&
    !isValidHalfCombo(r.startHalf, r.endHalf, isSingleDay(r.startDate, r.endDate))
  ) {
    issues.push({ field: 'half', code: 'INVALID_HALF_COMBO', message: '時段組合不合法' });
  }
  if (r.note && r.note.length > 500) {
    issues.push({ field: 'note', code: 'TOO_LONG', message: '備註不可超過 500 字' });
  }

  return issues;
}

/** 該假單是否涵蓋某一天 */
export function coversDate(r: LeaveRecord, date: ISODate): boolean {
  return compareISO(date, r.startDate) >= 0 && compareISO(date, r.endDate) <= 0;
}

/** 兩筆假單的日期區間是否重疊（不含半天語意，僅看區間） */
export function rangesOverlap(a: LeaveRecord, b: LeaveRecord): boolean {
  return compareISO(a.startDate, b.endDate) <= 0 && compareISO(b.startDate, a.endDate) <= 0;
}

/** 時段的人話描述，例如「上午」「下午」「9/3 下午 – 9/5 上午」 */
export function halfLabel(half: HalfDay): string {
  return half === 'full' ? '整天' : half === 'am' ? '上午' : '下午';
}

export function sortRecords(records: readonly LeaveRecord[]): LeaveRecord[] {
  return [...records].sort(
    (a, b) =>
      compareISO(a.startDate, b.startDate) ||
      compareISO(a.endDate, b.endDate) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/** 排除已軟刪除的紀錄 */
export function liveRecords(records: readonly LeaveRecord[]): LeaveRecord[] {
  return records.filter((r) => !r.deletedAt);
}

/** 排除已軟刪除且已離職的同事 */
export function liveEmployees(employees: readonly Employee[]): Employee[] {
  return employees.filter((e) => !e.deletedAt);
}

export function byId<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((i) => [i.id, i]));
}

export const LEAVE_TYPE_IDS: LeaveTypeId[] = [
  'annual',
  'sick',
  'compensatory',
  'maternity',
  'paternity',
  'bereavement',
  'unpaid',
  'other',
];
