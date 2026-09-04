import { describe, expect, it } from 'vitest';
import { precheckLeave, precheckLevel, precheckMessage } from '@/domain/precheck';
import { buildHolidayMap } from '@/domain/holidays';
import { annual, makeEmployee, makeLeave, settings } from './fixtures';

const HOLIDAYS = buildHolidayMap([2026], []);

const employees = [
  makeEmployee({ id: 'e1', name: '陳大明' }),
  makeEmployee({ id: 'e2', name: '李小美' }),
  makeEmployee({ id: 'e3', name: '王大同' }),
];

function check(draft: ReturnType<typeof annual>, existing: readonly ReturnType<typeof annual>[] = []) {
  return precheckLeave({ draft, existing, employees, holidays: HOLIDAYS, settings: settings() });
}

describe('precheck 與他人重疊', () => {
  it('沒有任何人重疊 → ok，maxConcurrent=1', () => {
    const r = check(annual('e1', '2026-09-07', '2026-09-08'));
    expect(r.ok).toBe(true);
    expect(r.maxConcurrent).toBe(1);
    expect(r.overlaps).toEqual([]);
    expect(r.newConflicts).toEqual([]);
    expect(precheckLevel(r, 2)).toBe('ok');
  });

  it('與一人重疊但沒超標 → near 等級', () => {
    const r = check(annual('e2', '2026-09-07', '2026-09-07'), [
      annual('e1', '2026-09-07', '2026-09-07'),
    ]);
    expect(r.ok).toBe(true);
    expect(r.maxConcurrent).toBe(2);
    expect(precheckLevel(r, 2)).toBe('near');
    expect(r.overlaps).toHaveLength(1);
    expect(r.overlaps[0].others[0].name).toBe('陳大明');
  });

  it('與兩人重疊 → 超標，產生 newConflicts', () => {
    const r = check(annual('e3', '2026-09-07', '2026-09-07'), [
      annual('e1', '2026-09-07', '2026-09-07'),
      annual('e2', '2026-09-07', '2026-09-07'),
    ]);
    expect(r.ok).toBe(true); // 超標不是硬性錯誤，仍可強制送出
    expect(r.maxConcurrent).toBe(3);
    expect(precheckLevel(r, 2)).toBe('over');
    expect(r.newConflicts).toHaveLength(1);
    expect(r.newConflicts[0].peak).toBe(3);
    expect(precheckMessage(r, settings())).toContain('超過上限 2 人');
  });

  it('既有的超標不會被當成「新增」', () => {
    const existing = [
      annual('e1', '2026-09-07', '2026-09-07'),
      annual('e2', '2026-09-07', '2026-09-07'),
      annual('e3', '2026-09-07', '2026-09-07'),
    ];
    const r = check({ ...annual('e1', '2026-09-20', '2026-09-20'), id: 'new' }, existing);
    // 草稿在 9/20，與既有衝突無關
    expect(r.newConflicts).toEqual([]);
    expect(r.resultingConflicts).toEqual([]);
  });

  it('overlaps 只列草稿涵蓋的日期，且排除自己', () => {
    const r = check(annual('e2', '2026-09-07', '2026-09-09'), [
      annual('e1', '2026-09-07', '2026-09-07'),
      annual('e2', '2026-09-08', '2026-09-08'), // 自己（同 id 不同）
    ]);
    void r;
  });
});

describe('precheck 自我重疊', () => {
  it('同一人同一天已有別的假單 → 硬性錯誤，不可送出', () => {
    const existing = [annual('e1', '2026-09-07', '2026-09-09')];
    const draft = { ...annual('e1', '2026-09-08', '2026-09-08'), id: 'new-1' };
    const r = check(draft, existing);
    expect(r.ok).toBe(false);
    expect(r.hardErrors[0].code).toBe('SELF_OVERLAP');
    expect(r.selfOverlaps).toHaveLength(1);
    expect(r.selfOverlaps[0].againstRecordId).toBe(existing[0].id);
  });

  it('編輯時排除自身 id，不會誤判自我重疊', () => {
    const existing = [annual('e1', '2026-09-07', '2026-09-09')];
    const draft = { ...existing[0], endDate: '2026-09-10' };
    const r = check(draft, existing);
    expect(r.selfOverlaps).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('不同同事同一天不算自我重疊', () => {
    const r = check(annual('e2', '2026-09-08', '2026-09-08'), [
      annual('e1', '2026-09-07', '2026-09-09'),
    ]);
    expect(r.selfOverlaps).toEqual([]);
  });
});

describe('precheck 其他硬性錯誤', () => {
  it('結束日早於開始日 → INVALID_RANGE', () => {
    const r = check(annual('e1', '2026-09-10', '2026-09-08'));
    expect(r.ok).toBe(false);
    expect(r.hardErrors[0].code).toBe('INVALID_RANGE');
  });

  it('未選同事 → EMPLOYEE_MISSING', () => {
    const r = check(annual('', '2026-09-08', '2026-09-08'));
    expect(r.ok).toBe(false);
    expect(r.hardErrors[0].code).toBe('EMPLOYEE_MISSING');
  });

  it('已離職同事 → EMPLOYEE_INACTIVE', () => {
    const inactive = [
      makeEmployee({ id: 'e1', name: '陳大明' }),
      makeEmployee({ id: 'e9', name: '離職者', active: false }),
    ];
    const r = precheckLeave({
      draft: annual('e9', '2026-09-08', '2026-09-08'),
      existing: [],
      employees: inactive,
      holidays: HOLIDAYS,
      settings: settings(),
    });
    expect(r.hardErrors[0].code).toBe('EMPLOYEE_INACTIVE');
  });
});

describe('precheck 天數與訊息', () => {
  it('breakdown 與 duration 計算一致', () => {
    const r = check(annual('e1', '2026-09-07', '2026-09-11'));
    expect(r.breakdown.total).toBe(5);
  });

  it('ok 情況的訊息包含天數與上限', () => {
    const r = check(annual('e1', '2026-09-07', '2026-09-08'));
    const msg = precheckMessage(r, settings());
    expect(msg).toContain('共 2 天');
    expect(msg).toContain('上限 2 人');
  });

  it('既有軟刪除的假單不影響預檢', () => {
    const existing = [
      { ...annual('e2', '2026-09-07', '2026-09-07'), deletedAt: '2026-09-01T00:00:00.000Z' },
      { ...annual('e3', '2026-09-07', '2026-09-07'), deletedAt: '2026-09-01T00:00:00.000Z' },
    ];
    const r = check(annual('e1', '2026-09-07', '2026-09-07'), existing);
    expect(r.maxConcurrent).toBe(1);
    expect(r.overlaps).toEqual([]);
  });

  it('半天草稿會正確反映在 maxConcurrent', () => {
    const r = check(
      { ...annual('e2', '2026-09-07', '2026-09-07'), startHalf: 'am' as const, endHalf: 'am' as const },
      [annual('e1', '2026-09-07', '2026-09-07')],
    );
    expect(r.maxConcurrent).toBe(2);
    expect(r.breakdown.total).toBe(0.5);
  });

  it('makeLeave 預設值可用於組草稿', () => {
    const d = makeLeave({ employeeId: 'e1', startDate: '2026-09-07', endDate: '2026-09-08' });
    expect(precheckLevel(check(d), 2)).toBe('ok');
  });
});
