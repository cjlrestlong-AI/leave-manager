import { compareISO, eachDay, type ISODate } from '@/lib/date';
import { detectConflicts, type ConflictSegment } from './conflict';
import { calculateBreakdown, type DurationBreakdown } from './duration';
import { buildOccupancyIndex, makeWorkdayPredicate, type OccupancyIndex } from './occupancy';
import type { HolidayMap } from './holidays';
import { leaveTypeMeta } from './constants';
import type { AppSettings, Employee, HalfDay, LeaveRecord, LeaveTypeId } from './types';

export interface OverlapDay {
  date: ISODate;
  others: Array<{ employeeId: string; name: string; type: LeaveTypeId; half: HalfDay }>;
  countBefore: number;
  countAfter: number;
  wouldExceed: boolean;
}

export interface PrecheckResult {
  /** false = 有硬性錯誤，不該送出 */
  ok: boolean;
  hardErrors: Array<{
    code: 'SELF_OVERLAP' | 'INVALID_RANGE' | 'EMPLOYEE_INACTIVE' | 'EMPLOYEE_MISSING';
    message: string;
    date?: ISODate;
  }>;
  breakdown: DurationBreakdown;
  /** 與既有假單重疊的逐日明細（只列草稿涵蓋的日期） */
  overlaps: OverlapDay[];
  /** 送出後會產生或擴大的衝突段 */
  resultingConflicts: ConflictSegment[];
  /** 原本不存在、送出後才出現的段 */
  newConflicts: ConflictSegment[];
  /** 草稿期間單日最高人數（含自己） */
  maxConcurrent: number;
  /** 與自己其他假單撞到的日期 */
  selfOverlaps: Array<{ date: ISODate; againstRecordId: string }>;
}

export interface PrecheckInput {
  /** 已 normalize 的草稿 */
  draft: LeaveRecord;
  /** 既有假單。**編輯時必須排除 draft.id 本身** */
  existing: readonly LeaveRecord[];
  employees: readonly Employee[];
  holidays: HolidayMap;
  settings: AppSettings;
}

function segmentKey(s: ConflictSegment): string {
  return `${s.startDate}_${s.endDate}`;
}

/**
 * 送出前的即時衝突預檢。
 *
 * 做法：把草稿塞進既有假單跑一次索引 + 偵測，
 * 再對比「不含草稿」的基線，算出送出後新增或擴大的衝突段。
 * 資料量小，每次改欄位重算都沒問題（UI 層 debounce 80ms）。
 */
export function precheckLeave(input: PrecheckInput): PrecheckResult {
  const { draft, existing, employees, holidays, settings } = input;
  const empById = new Map(employees.map((e) => [e.id, e]));
  const nameOf = (id: string) => empById.get(id)?.name ?? '（已移除同事）';

  const hardErrors: PrecheckResult['hardErrors'] = [];

  if (compareISO(draft.endDate, draft.startDate) < 0) {
    hardErrors.push({ code: 'INVALID_RANGE', message: '結束日不能早於開始日' });
  }
  if (!empById.has(draft.employeeId)) {
    hardErrors.push({ code: 'EMPLOYEE_MISSING', message: '請先選擇同事' });
  } else if (empById.get(draft.employeeId)?.active === false) {
    hardErrors.push({ code: 'EMPLOYEE_INACTIVE', message: '這位同事已標記離職' });
  }

  const opts = {
    excludeWeekends: settings.excludeWeekends,
    excludeHolidays: settings.excludeHolidays,
  };

  const baseRecords = existing.filter((r) => !r.deletedAt && r.id !== draft.id);
  const withDraft = [
    ...baseRecords,
    { ...draft, deletedAt: null } as LeaveRecord,
  ];

  const baseIndex = buildOccupancyIndex(baseRecords, holidays, opts);
  const draftIndex = buildOccupancyIndex(withDraft, holidays, opts);

  const conflictOpts = {
    workdaysOnly: settings.conflictWorkdaysOnly,
    includeAtThreshold: false,
    isWorkday: makeWorkdayPredicate(holidays, opts),
  };
  const baseConflicts = detectConflicts(baseIndex, settings.overlapThreshold, conflictOpts);
  const draftConflicts = detectConflicts(draftIndex, settings.overlapThreshold, conflictOpts);

  // 與草稿日期區間有交集的段
  const draftDates = eachDay(draft.startDate, draft.endDate);
  const inRange = (s: ConflictSegment) =>
    compareISO(s.startDate, draft.endDate) <= 0 && compareISO(draft.startDate, s.endDate) <= 0;

  const resultingConflicts = draftConflicts.filter(inRange);
  const baseKeys = new Set(baseConflicts.map(segmentKey));
  const newConflicts = resultingConflicts.filter((s) => !baseKeys.has(segmentKey(s)));

  // 逐日重疊明細
  const overlaps: OverlapDay[] = [];
  let maxConcurrent = 0;
  for (const date of draftDates) {
    const before = baseIndex.get(date);
    const after = draftIndex.get(date);
    const countBefore = before?.distinct ?? 0;
    const countAfter = after?.distinct ?? 0;
    maxConcurrent = Math.max(maxConcurrent, countAfter);
    if (countBefore === 0) continue;

    const others = (before?.slots ?? [])
      .filter((s) => s.employeeId !== draft.employeeId)
      .map((s) => ({
        employeeId: s.employeeId,
        name: nameOf(s.employeeId),
        type: s.type,
        half: s.half,
      }))
      // 同一人可能一天有多筆，去重
      .filter((v, i, arr) => arr.findIndex((x) => x.employeeId === v.employeeId) === i);

    if (others.length === 0) continue;

    overlaps.push({
      date,
      others,
      countBefore,
      countAfter,
      wouldExceed: countAfter > settings.overlapThreshold,
    });
  }

  // 自我重疊：同一人同一天已有別的假單
  const selfOverlaps: PrecheckResult['selfOverlaps'] = [];
  for (const date of draftDates) {
    const hit = baseRecords.find(
      (r) =>
        r.employeeId === draft.employeeId &&
        compareISO(date, r.startDate) >= 0 &&
        compareISO(date, r.endDate) <= 0,
    );
    if (hit) selfOverlaps.push({ date, againstRecordId: hit.id });
  }
  if (selfOverlaps.length > 0) {
    hardErrors.push({
      code: 'SELF_OVERLAP',
      message: `這位同事在 ${selfOverlaps.length} 天內已有其他假單（${selfOverlaps[0].date} 等）`,
      date: selfOverlaps[0].date,
    });
  }

  const breakdown = calculateBreakdown(draft, settings, holidays);

  return {
    ok: hardErrors.length === 0,
    hardErrors,
    breakdown,
    overlaps,
    resultingConflicts,
    newConflicts,
    maxConcurrent,
    selfOverlaps,
  };
}

/** 預檢結果的等級，供 UI 決定配色 */
export type PrecheckLevel = 'ok' | 'near' | 'over';

export function precheckLevel(result: PrecheckResult, threshold: number): PrecheckLevel {
  if (!result.ok) return 'over';
  if (result.maxConcurrent > threshold) return 'over';
  if (result.maxConcurrent === threshold) return 'near';
  return 'ok';
}

/** 預檢面板的主文案（事實陳述，不做行銷腔） */
export function precheckMessage(result: PrecheckResult, settings: AppSettings): string {
  const days = result.breakdown.total;
  if (!result.ok) return result.hardErrors[0].message;

  const seg = result.resultingConflicts[0];
  if (seg && seg.peak > settings.overlapThreshold) {
    return `這段期間最多會有 ${seg.peak} 人同時放假，超過上限 ${settings.overlapThreshold} 人（共 ${days} 天）`;
  }
  if (result.maxConcurrent === settings.overlapThreshold) {
    return `共 ${days} 天，期間最多 ${result.maxConcurrent} 人同時放假，已達上限`;
  }
  return `共 ${days} 天 · 期間最多 ${result.maxConcurrent} 人同時放假（上限 ${settings.overlapThreshold} 人）`;
}

export function overlapNames(result: PrecheckResult, limit = 4): string {
  const names = new Set<string>();
  for (const o of result.overlaps) for (const p of o.others) names.add(p.name);
  const arr = [...names];
  return arr.slice(0, limit).join('、') + (arr.length > limit ? ` 等 ${arr.length} 人` : '');
}

export function typeLabelOf(id: LeaveTypeId): string {
  return leaveTypeMeta(id).label;
}

export type { OccupancyIndex };
