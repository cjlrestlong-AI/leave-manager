import { compareISO, nextDay, type ISODate } from '@/lib/date';
import type { OccupancyIndex } from './occupancy';

export interface DayConflictDetail {
  date: ISODate;
  employeeIds: string[];
  count: number;
  weighted: number;
}

export interface ConflictSegment {
  /** 區間起訖（inclusive）。週末與假日可能包在裡面 */
  startDate: ISODate;
  endDate: ISODate;
  /** 區間內所有達標日（不一定日曆連續） */
  dates: ISODate[];
  /** 區間內最大不重複人數 */
  peak: number;
  peakWeighted: number;
  /** 聯集去重 */
  employeeIds: string[];
  days: DayConflictDetail[];
  /** over：超過門檻；at：剛好等於門檻 */
  severity: 'over' | 'at';
  /** 這段實際影響幾個工作日 */
  workdayCount: number;
}

export interface ConflictOptions {
  /** 只計工作日（跳過週末與公眾假期） */
  workdaysOnly: boolean;
  /** 是否把「剛好等於門檻」也視為需要注意 */
  includeAtThreshold: boolean;
  /**
   * 工作日判定函式（workdaysOnly 為 true 時強烈建議提供）。
   * 必須用 makeWorkdayPredicate 產生，不能依賴索引 ——
   * 索引只收錄「有人放假」的日期，兩個達標日之間的空檔查不到。
   */
  isWorkday?: (date: ISODate) => boolean;
}

function hitsThreshold(count: number, threshold: number, includeAt: boolean): 'over' | 'at' | null {
  if (count > threshold) return 'over';
  if (includeAt && count === threshold) return 'at';
  return null;
}

/**
 * 衝突偵測與區間合併。
 *
 * 連續性判定是這裡最關鍵的細節：
 *  - workdaysOnly = false：兩個達標日必須日曆相鄰才合併。
 *  - workdaysOnly = true：中間只隔週末／假日也算連續，
 *    因此 9/18(五) 與 9/21(一) 會合併成一張卡「9/18 – 9/21」，而不是兩張。
 */
export function detectConflicts(
  index: OccupancyIndex,
  threshold: number,
  opts: ConflictOptions,
): ConflictSegment[] {
  const allDates = [...index.keys()].sort();

  const isWorkday = opts.isWorkday ?? (() => true);

  const hits: DayConflictDetail[] = [];
  for (const date of allDates) {
    const occ = index.get(date);
    if (!occ) continue;
    if (opts.workdaysOnly && !isWorkday(date)) continue;
    const severity = hitsThreshold(occ.distinct, threshold, opts.includeAtThreshold);
    if (!severity) continue;
    hits.push({
      date,
      employeeIds: occ.employeeIds,
      count: occ.distinct,
      weighted: occ.weighted,
    });
  }

  if (hits.length === 0) return [];

  // 合併：相鄰達標日，或中間只隔非工作日的達標日
  const segments: DayConflictDetail[][] = [];
  let current: DayConflictDetail[] = [hits[0]];

  for (let i = 1; i < hits.length; i++) {
    const prev = current[current.length - 1];
    const cur = hits[i];
    let continuous = false;

    if (nextDay(prev.date) === cur.date) {
      continuous = true;
    } else if (opts.workdaysOnly) {
      // 檢查中間是否全都是非工作日（用獨立判定函式，不依賴索引）
      let allNonWorkday = true;
      let d = nextDay(prev.date);
      let guard = 0;
      while (d !== cur.date && guard++ < 400) {
        if (isWorkday(d)) {
          allNonWorkday = false;
          break;
        }
        d = nextDay(d);
      }
      continuous = allNonWorkday;
    }

    if (continuous) current.push(cur);
    else {
      segments.push(current);
      current = [cur];
    }
  }
  segments.push(current);

  return segments.map((days) => {
    let peak = 0;
    let peakWeighted = 0;
    const empSet = new Set<string>();
    let workdayCount = 0;
    let severity: 'over' | 'at' = 'at';

    for (const d of days) {
      peak = Math.max(peak, d.count);
      peakWeighted = Math.max(peakWeighted, d.weighted);
      for (const id of d.employeeIds) empSet.add(id);
      if (isWorkday(d.date)) workdayCount++;
      if (hitsThreshold(d.count, threshold, opts.includeAtThreshold) === 'over') severity = 'over';
    }

    return {
      startDate: days[0].date,
      endDate: days[days.length - 1].date,
      dates: days.map((d) => d.date),
      peak,
      peakWeighted,
      employeeIds: [...empSet],
      days,
      severity,
      workdayCount,
    };
  });
}

/** 某個日期是否落在任一衝突段內 */
export function isDateInConflict(segments: readonly ConflictSegment[], date: ISODate): boolean {
  return segments.some((s) => compareISO(date, s.startDate) >= 0 && compareISO(date, s.endDate) <= 0);
}

export function findConflictSegment(
  segments: readonly ConflictSegment[],
  date: ISODate,
): ConflictSegment | null {
  return (
    segments.find((s) => compareISO(date, s.startDate) >= 0 && compareISO(date, s.endDate) <= 0) ??
    null
  );
}

/** 只保留 severity 為 over 的段（供警示計數用） */
export function overSegments(segments: readonly ConflictSegment[]): ConflictSegment[] {
  return segments.filter((s) => s.severity === 'over');
}

/** 穩定 id，供 React key */
export function segmentKey(s: ConflictSegment): string {
  return `${s.startDate}_${s.endDate}`;
}
