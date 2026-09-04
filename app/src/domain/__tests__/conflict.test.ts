import { describe, expect, it } from 'vitest';
import { detectConflicts, overSegments } from '@/domain/conflict';
import { buildOccupancyIndex, makeWorkdayPredicate } from '@/domain/occupancy';
import { buildHolidayMap } from '@/domain/holidays';
import { annual, makeLeave } from './fixtures';

const opts = { excludeWeekends: true, excludeHolidays: true };
const HOLIDAYS = buildHolidayMap([2026], []);

function indexOf(records: readonly ReturnType<typeof annual>[]) {
  return buildOccupancyIndex(records, HOLIDAYS, opts);
}

const IS_WORKDAY = makeWorkdayPredicate(HOLIDAYS, opts);
const conflictOpts = { workdaysOnly: true, includeAtThreshold: false, isWorkday: IS_WORKDAY };

describe('detectConflicts 門檻', () => {
  it('門檻 2 時，剛好 2 人不警示', () => {
    const idx = indexOf([
      annual('e1', '2026-09-07', '2026-09-07'),
      annual('e2', '2026-09-07', '2026-09-07'),
    ]);
    expect(detectConflicts(idx, 2, conflictOpts)).toEqual([]);
  });

  it('門檻 2 時，3 人警示且 severity=over', () => {
    const idx = indexOf([
      annual('e1', '2026-09-07', '2026-09-07'),
      annual('e2', '2026-09-07', '2026-09-07'),
      annual('e3', '2026-09-07', '2026-09-07'),
    ]);
    const segs = detectConflicts(idx, 2, conflictOpts);
    expect(segs).toHaveLength(1);
    expect(segs[0].peak).toBe(3);
    expect(segs[0].severity).toBe('over');
  });

  it('includeAtThreshold 時，剛好等於門檻會出現 severity=at', () => {
    const idx = indexOf([
      annual('e1', '2026-09-07', '2026-09-07'),
      annual('e2', '2026-09-07', '2026-09-07'),
    ]);
    const segs = detectConflicts(idx, 2, { workdaysOnly: true, includeAtThreshold: true, isWorkday: IS_WORKDAY });
    expect(segs).toHaveLength(1);
    expect(segs[0].severity).toBe('at');
    expect(overSegments(segs)).toEqual([]);
  });

  it('門檻改成 4 時，3 人不警示', () => {
    const idx = indexOf([
      annual('e1', '2026-09-07', '2026-09-07'),
      annual('e2', '2026-09-07', '2026-09-07'),
      annual('e3', '2026-09-07', '2026-09-07'),
    ]);
    expect(detectConflicts(idx, 4, conflictOpts)).toEqual([]);
  });

  it('門檻 1 時，2 人就警示', () => {
    const idx = indexOf([
      annual('e1', '2026-09-07', '2026-09-07'),
      annual('e2', '2026-09-07', '2026-09-07'),
    ]);
    expect(detectConflicts(idx, 1, conflictOpts)).toHaveLength(1);
  });

  it('連續三天都超標 → 合併成一段', () => {
    const idx = indexOf([
      annual('e1', '2026-09-07', '2026-09-09'),
      annual('e2', '2026-09-07', '2026-09-09'),
      annual('e3', '2026-09-07', '2026-09-09'),
    ]);
    const segs = detectConflicts(idx, 2, conflictOpts);
    expect(segs).toHaveLength(1);
    expect(segs[0].startDate).toBe('2026-09-07');
    expect(segs[0].endDate).toBe('2026-09-09');
    expect(segs[0].dates).toHaveLength(3);
    expect(segs[0].workdayCount).toBe(3);
  });

  it('不連續的兩天超標 → 兩段', () => {
    const idx = indexOf([
      annual('e1', '2026-09-07', '2026-09-07'),
      annual('e2', '2026-09-07', '2026-09-07'),
      annual('e3', '2026-09-07', '2026-09-07'),
      annual('e1', '2026-09-10', '2026-09-10'),
      annual('e2', '2026-09-10', '2026-09-10'),
      annual('e3', '2026-09-10', '2026-09-10'),
    ]);
    const segs = detectConflicts(idx, 2, conflictOpts);
    expect(segs).toHaveLength(2);
  });
});

describe('detectConflicts 跨週末合併', () => {
  it('週五與下週一都超標 → 合併成一張卡（workdaysOnly）', () => {
    // 2026-09-18 週五，2026-09-21 週一
    const idx = indexOf([
      annual('e1', '2026-09-18', '2026-09-18'),
      annual('e2', '2026-09-18', '2026-09-18'),
      annual('e3', '2026-09-18', '2026-09-18'),
      annual('e1', '2026-09-21', '2026-09-21'),
      annual('e2', '2026-09-21', '2026-09-21'),
      annual('e3', '2026-09-21', '2026-09-21'),
    ]);
    const segs = detectConflicts(idx, 2, conflictOpts);
    expect(segs).toHaveLength(1);
    expect(segs[0].startDate).toBe('2026-09-18');
    expect(segs[0].endDate).toBe('2026-09-21');
    expect(segs[0].workdayCount).toBe(2);
  });

  it('週五與下週二都超標 → 仍合併（中間只隔週末與週一，但週一不超標）', () => {
    // 週五 9/18 與週二 9/22：中間的週一是工作日但沒超標 → 不合併
    const idx = indexOf([
      annual('e1', '2026-09-18', '2026-09-18'),
      annual('e2', '2026-09-18', '2026-09-18'),
      annual('e3', '2026-09-18', '2026-09-18'),
      annual('e1', '2026-09-22', '2026-09-22'),
      annual('e2', '2026-09-22', '2026-09-22'),
      annual('e3', '2026-09-22', '2026-09-22'),
    ]);
    expect(detectConflicts(idx, 2, conflictOpts)).toHaveLength(2);
  });

  it('workdaysOnly=false 時週五與下週一不合併', () => {
    const idx = indexOf([
      annual('e1', '2026-09-18', '2026-09-18'),
      annual('e2', '2026-09-18', '2026-09-18'),
      annual('e3', '2026-09-18', '2026-09-18'),
      annual('e1', '2026-09-21', '2026-09-21'),
      annual('e2', '2026-09-21', '2026-09-21'),
      annual('e3', '2026-09-21', '2026-09-21'),
    ]);
    expect(detectConflicts(idx, 2, { workdaysOnly: false, includeAtThreshold: false })).toHaveLength(2);
  });

  it('跨公眾假期的衝突合併：9/25(五) 與 9/28(一)，9/26 中秋節翌日為假期', () => {
    const idx = indexOf([
      annual('e1', '2026-09-25', '2026-09-25'),
      annual('e2', '2026-09-25', '2026-09-25'),
      annual('e3', '2026-09-25', '2026-09-25'),
      annual('e1', '2026-09-28', '2026-09-28'),
      annual('e2', '2026-09-28', '2026-09-28'),
      annual('e3', '2026-09-28', '2026-09-28'),
    ]);
    // 9/27 是週日、9/26 是假期（週六）→ 中間全是非工作日 → 合併
    const segs = detectConflicts(idx, 2, conflictOpts);
    expect(segs).toHaveLength(1);
    expect(segs[0].startDate).toBe('2026-09-25');
    expect(segs[0].endDate).toBe('2026-09-28');
  });
});

describe('detectConflicts 內容', () => {
  it('employeeIds 為聯集去重', () => {
    const idx = indexOf([
      annual('e1', '2026-09-07', '2026-09-08'),
      annual('e2', '2026-09-07', '2026-09-07'),
      annual('e3', '2026-09-08', '2026-09-08'),
      annual('e4', '2026-09-07', '2026-09-08'),
    ]);
    const segs = detectConflicts(idx, 2, conflictOpts);
    expect(segs).toHaveLength(1);
    expect(segs[0].employeeIds.sort()).toEqual(['e1', 'e2', 'e3', 'e4']);
    expect(segs[0].peak).toBe(3);
  });

  it('只計工作日時，純週末的聚會不構成衝突', () => {
    const idx = indexOf([
      annual('e1', '2026-09-05', '2026-09-05'), // 週六
      annual('e2', '2026-09-05', '2026-09-05'),
      annual('e3', '2026-09-05', '2026-09-05'),
    ]);
    expect(detectConflicts(idx, 2, conflictOpts)).toEqual([]);
    expect(detectConflicts(idx, 2, { workdaysOnly: false, includeAtThreshold: false })).toHaveLength(1);
  });

  it('沒有任何資料時回傳空陣列', () => {
    const idx = buildOccupancyIndex([], HOLIDAYS, opts);
    expect(detectConflicts(idx, 2, conflictOpts)).toEqual([]);
  });

  it('軟刪除紀錄不造成衝突', () => {
    const records = [
      annual('e1', '2026-09-07', '2026-09-07'),
      annual('e2', '2026-09-07', '2026-09-07'),
      makeLeave({ id: 'x', employeeId: 'e3', startDate: '2026-09-07', endDate: '2026-09-07', deletedAt: '2026-09-08T00:00:00.000Z' }),
    ];
    const idx = buildOccupancyIndex(records, HOLIDAYS, opts);
    expect(detectConflicts(idx, 2, conflictOpts)).toEqual([]);
  });
});
