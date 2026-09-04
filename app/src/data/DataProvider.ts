import type { AppData, AppSettings, Employee, Holiday, LeaveRecord } from '@/domain/types';

export type DataSource = 'local' | 'supabase';

export type AppError =
  | { kind: 'READ_ONLY'; message: string }
  | { kind: 'NETWORK'; message: string }
  | { kind: 'CONFLICT'; message: string; server?: unknown }
  | { kind: 'NOT_FOUND'; message: string }
  | { kind: 'STORAGE_FULL'; message: string }
  | { kind: 'UNKNOWN'; message: string };

export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = (error: AppError): Result<never> => ({ ok: false, error });

export interface DataCapabilities {
  source: DataSource;
  /** 是否為唯讀（唯讀分享連結） */
  readOnly: boolean;
  label: string;
}

/**
 * 資料存取介面。
 * 所有方法回傳 Result，不 throw —— 讓呼叫端能一致地處理降級與重試。
 */
export interface DataProvider {
  readonly capabilities: DataCapabilities;
  loadAll(): Promise<Result<AppData>>;

  createEmployee(e: Employee): Promise<Result<Employee>>;
  updateEmployee(e: Employee): Promise<Result<Employee>>;
  deleteEmployee(id: string): Promise<Result<void>>;

  createLeave(r: LeaveRecord): Promise<Result<LeaveRecord>>;
  updateLeave(r: LeaveRecord): Promise<Result<LeaveRecord>>;
  deleteLeave(id: string): Promise<Result<void>>;

  createHoliday(h: Holiday): Promise<Result<Holiday>>;
  updateHoliday(h: Holiday): Promise<Result<Holiday>>;
  deleteHoliday(id: string): Promise<Result<void>>;

  saveSettings(s: AppSettings): Promise<Result<AppSettings>>;

  /** 雲端輪詢；本機模式為 no-op */
  sync(): Promise<Result<AppData>>;
  /** 健康檢查，供降級決策 */
  healthCheck(): Promise<Result<true>>;
}
