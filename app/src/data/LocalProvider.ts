import type { AppData, AppSettings, Employee, Holiday, LeaveRecord } from '@/domain/types';
import { DEFAULT_SETTINGS } from '@/domain/types';
import { readJSON, writeJSON, removeKey } from '@/lib/storage';
import { newId } from '@/lib/id';
import {
  err,
  ok,
  type AppError,
  type DataCapabilities,
  type DataProvider,
  type Result,
} from './DataProvider';

const K_EMP = 'employees';
const K_LEAVE = 'leaves';
const K_HOLIDAY = 'holidays';
const K_SETTINGS = 'settings';
const K_SEEDED = 'seeded';

const caps = (readOnly: boolean): DataCapabilities => ({
  source: 'local',
  readOnly,
  label: readOnly ? '本機唯讀' : '本機模式',
});

function stamp<T extends { rev: number; updatedAt: string }>(x: T): T {
  return { ...x, rev: (x.rev ?? 0) + 1, updatedAt: new Date().toISOString() };
}

/**
 * localStorage 實作。
 * 唯讀時所有寫入方法直接回傳 Err(READ_ONLY) —— 這是唯讀分享模式的第二道防線。
 */
export class LocalProvider implements DataProvider {
  readonly capabilities: DataCapabilities;

  constructor(readOnly = false) {
    this.capabilities = caps(readOnly);
  }

  async loadAll(): Promise<Result<AppData>> {
    const employees = readJSON<Employee[]>(K_EMP, []);
    const leaves = readJSON<LeaveRecord[]>(K_LEAVE, []);
    const holidays = readJSON<Holiday[]>(K_HOLIDAY, []);
    const settings = { ...DEFAULT_SETTINGS, ...readJSON<Partial<AppSettings>>(K_SETTINGS, {}) };
    return ok({ employees, leaves, holidays, settings });
  }

  private guard<T>(): Result<T> | null {
    if (this.capabilities.readOnly) {
      return err({ kind: 'READ_ONLY', message: '唯讀模式，無法修改資料' });
    }
    return null;
  }

  private persist(listKey: string, data: unknown): AppError | null {
    const success = writeJSON(listKey, data);
    return success ? null : { kind: 'STORAGE_FULL', message: '瀏覽器儲存空間不足，請匯出備份後清理' };
  }

  async createEmployee(e: Employee): Promise<Result<Employee>> {
    const g = this.guard<Employee>();
    if (g) return g;
    const list = readJSON<Employee[]>(K_EMP, []);
    const row: Employee = stamp({ ...e, id: e.id || newId('emp') });
    list.push(row);
    const e2 = this.persist(K_EMP, list);
    return e2 ? err(e2) : ok(row);
  }

  async updateEmployee(e: Employee): Promise<Result<Employee>> {
    const g = this.guard<Employee>();
    if (g) return g;
    const list = readJSON<Employee[]>(K_EMP, []);
    const i = list.findIndex((x) => x.id === e.id);
    if (i < 0) return err({ kind: 'NOT_FOUND', message: '找不到這位同事' });
    const row = stamp(e);
    list[i] = row;
    const e2 = this.persist(K_EMP, list);
    return e2 ? err(e2) : ok(row);
  }

  async deleteEmployee(id: string): Promise<Result<void>> {
    const g = this.guard<void>();
    if (g) return g;
    const list = readJSON<Employee[]>(K_EMP, []);
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return err({ kind: 'NOT_FOUND', message: '找不到這位同事' });
    list[i] = { ...list[i], deletedAt: new Date().toISOString() };
    const e2 = this.persist(K_EMP, list);
    return e2 ? err(e2) : ok(undefined);
  }

  /** 永久刪除（僅供無假單的同事） */
  async purgeEmployee(id: string): Promise<Result<void>> {
    const g = this.guard<void>();
    if (g) return g;
    const list = readJSON<Employee[]>(K_EMP, []).filter((x) => x.id !== id);
    const e2 = this.persist(K_EMP, list);
    return e2 ? err(e2) : ok(undefined);
  }

  async createLeave(r: LeaveRecord): Promise<Result<LeaveRecord>> {
    const g = this.guard<LeaveRecord>();
    if (g) return g;
    const list = readJSON<LeaveRecord[]>(K_LEAVE, []);
    const row: LeaveRecord = stamp({ ...r, id: r.id || newId('lv') });
    list.push(row);
    const e2 = this.persist(K_LEAVE, list);
    return e2 ? err(e2) : ok(row);
  }

  async updateLeave(r: LeaveRecord): Promise<Result<LeaveRecord>> {
    const g = this.guard<LeaveRecord>();
    if (g) return g;
    const list = readJSON<LeaveRecord[]>(K_LEAVE, []);
    const i = list.findIndex((x) => x.id === r.id);
    if (i < 0) return err({ kind: 'NOT_FOUND', message: '找不到這筆假單' });
    const row = stamp(r);
    list[i] = row;
    const e2 = this.persist(K_LEAVE, list);
    return e2 ? err(e2) : ok(row);
  }

  async deleteLeave(id: string): Promise<Result<void>> {
    const g = this.guard<void>();
    if (g) return g;
    const list = readJSON<LeaveRecord[]>(K_LEAVE, []);
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return err({ kind: 'NOT_FOUND', message: '找不到這筆假單' });
    list[i] = { ...list[i], deletedAt: new Date().toISOString() };
    const e2 = this.persist(K_LEAVE, list);
    return e2 ? err(e2) : ok(undefined);
  }

  async restoreLeave(id: string): Promise<Result<void>> {
    const g = this.guard<void>();
    if (g) return g;
    const list = readJSON<LeaveRecord[]>(K_LEAVE, []);
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return err({ kind: 'NOT_FOUND', message: '找不到這筆假單' });
    list[i] = { ...list[i], deletedAt: null };
    const e2 = this.persist(K_LEAVE, list);
    return e2 ? err(e2) : ok(undefined);
  }

  async createHoliday(h: Holiday): Promise<Result<Holiday>> {
    const g = this.guard<Holiday>();
    if (g) return g;
    const list = readJSON<Holiday[]>(K_HOLIDAY, []);
    const row: Holiday = { ...h, id: h.id || newId('hol') };
    list.push(row);
    const e2 = this.persist(K_HOLIDAY, list);
    return e2 ? err(e2) : ok(row);
  }

  async updateHoliday(h: Holiday): Promise<Result<Holiday>> {
    const g = this.guard<Holiday>();
    if (g) return g;
    const list = readJSON<Holiday[]>(K_HOLIDAY, []);
    const i = list.findIndex((x) => x.id === h.id);
    if (i < 0) return err({ kind: 'NOT_FOUND', message: '找不到這筆假期' });
    list[i] = h;
    const e2 = this.persist(K_HOLIDAY, list);
    return e2 ? err(e2) : ok(h);
  }

  async deleteHoliday(id: string): Promise<Result<void>> {
    const g = this.guard<void>();
    if (g) return g;
    const list = readJSON<Holiday[]>(K_HOLIDAY, []).filter((x) => x.id !== id);
    const e2 = this.persist(K_HOLIDAY, list);
    return e2 ? err(e2) : ok(undefined);
  }

  async saveSettings(s: AppSettings): Promise<Result<AppSettings>> {
    const g = this.guard<AppSettings>();
    if (g) return g;
    const e2 = this.persist(K_SETTINGS, s);
    return e2 ? err(e2) : ok(s);
  }

  async sync(): Promise<Result<AppData>> {
    return this.loadAll();
  }

  async healthCheck(): Promise<Result<true>> {
    return ok(true);
  }
}

/** 首次使用時寫入範例資料的標記 */
export function isSeeded(): boolean {
  return readJSON<boolean>(K_SEEDED, false);
}

export function markSeeded(): void {
  writeJSON(K_SEEDED, true);
}

export function resetLocal(): void {
  removeKey(K_EMP);
  removeKey(K_LEAVE);
  removeKey(K_HOLIDAY);
  removeKey(K_SETTINGS);
  removeKey(K_SEEDED);
}
