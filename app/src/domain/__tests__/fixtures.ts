import type { AppSettings, Employee, HalfDay, Holiday, LeaveRecord, LeaveTypeId } from '@/domain/types';
import { DEFAULT_SETTINGS } from '@/domain/types';

let seq = 0;

export function makeEmployee(over: Partial<Employee> = {}): Employee {
  seq += 1;
  return {
    id: `emp-${seq}`,
    name: `同事${seq}`,
    team: null,
    colorSeed: seq % 12,
    active: true,
    sortOrder: seq,
    note: null,
    rev: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...over,
  };
}

export function makeLeave(over: Partial<LeaveRecord> = {}): LeaveRecord {
  seq += 1;
  return {
    id: `lv-${seq}`,
    employeeId: 'emp-1',
    startDate: '2026-09-01',
    endDate: '2026-09-01',
    startHalf: 'full',
    endHalf: 'full',
    type: 'annual',
    note: null,
    rev: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...over,
  };
}

export function half(start: HalfDay, end: HalfDay): Pick<LeaveRecord, 'startHalf' | 'endHalf'> {
  return { startHalf: start, endHalf: end };
}

export function makeHoliday(date: string, name = '假期', over: Partial<Holiday> = {}): Holiday {
  return {
    id: `hol-${date}`,
    date,
    name,
    kind: 'public',
    year: Number(date.slice(0, 4)),
    source: 'user',
    enabled: true,
    deletedAt: null,
    ...over,
  };
}

export function settings(over: Partial<AppSettings> = {}): AppSettings {
  return { ...DEFAULT_SETTINGS, ...over };
}

export function annual(employeeId: string, start: string, end: string, type: LeaveTypeId = 'annual'): LeaveRecord {
  return makeLeave({ employeeId, startDate: start, endDate: end, type });
}

export function resetSeq(): void {
  seq = 0;
}
