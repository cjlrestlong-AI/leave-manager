import type { ISODate } from '@/lib/date';

export type { ISODate };

/** 整天 / 上午 / 下午 */
export type HalfDay = 'full' | 'am' | 'pm';

export type LeaveTypeId =
  | 'annual'
  | 'sick'
  | 'compensatory'
  | 'maternity'
  | 'paternity'
  | 'bereavement'
  | 'unpaid'
  | 'other';

export interface Employee {
  id: string;
  name: string;
  /** 部門 / 組別 */
  team: string | null;
  /** 0..11，映射到 12 色頭像色板 */
  colorSeed: number;
  active: boolean;
  sortOrder: number;
  note: string | null;
  rev: number;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LeaveRecord {
  id: string;
  employeeId: string;
  startDate: ISODate;
  /** inclusive，含當日 */
  endDate: ISODate;
  startHalf: HalfDay;
  endHalf: HalfDay;
  type: LeaveTypeId;
  note: string | null;
  rev: number;
  updatedAt: string;
  deletedAt: string | null;
}

export type HolidayKind = 'public' | 'company' | 'weekly';

export interface Holiday {
  id: string;
  date: ISODate;
  name: string;
  kind: HolidayKind;
  year: number;
  source: 'builtin' | 'user';
  /** 是否計入「扣除」計算；週日可整組關閉 */
  enabled: boolean;
  /** 軟刪除標記；null 表示未刪除 */
  deletedAt: string | null;
}

export interface AppSettings {
  excludeWeekends: boolean;
  excludeHolidays: boolean;
  /** 同一天最多允許幾人同時放假，預設 2 */
  overlapThreshold: number;
  /** 提前幾天提醒，預設 7 */
  reminderLeadDays: number;
  /** 半日是否進位成整天 */
  halfDayRounding: 'as-is' | 'round-up';
  /** 衝突判定是否只計工作日 */
  conflictWorkdaysOnly: boolean;
  orgTimezone: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  excludeWeekends: true,
  excludeHolidays: true,
  overlapThreshold: 2,
  reminderLeadDays: 7,
  halfDayRounding: 'as-is',
  conflictWorkdaysOnly: true,
  orgTimezone: 'Asia/Hong_Kong',
};

/** 整包資料，供匯出匯入與 provider 交換 */
export interface AppData {
  employees: Employee[];
  leaves: LeaveRecord[];
  holidays: Holiday[];
  settings: AppSettings;
}

export const EMPTY_DATA: AppData = {
  employees: [],
  leaves: [],
  holidays: [],
  settings: { ...DEFAULT_SETTINGS },
};
