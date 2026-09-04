import type { LeaveTypeId } from './types';

export interface LeaveTypeMeta {
  id: LeaveTypeId;
  label: string;
  /** CSS 變數名稱，不含 -- */
  cssVar: string;
  /** 直接給 inline style 用的 hex（與 tokens.css 同步） */
  hex: string;
}

/** 假別定義表。色彩全站只集中在這裡與警示色，其餘全中性。 */
export const LEAVE_TYPES: LeaveTypeMeta[] = [
  { id: 'annual', label: '年假', cssVar: 'type-annual', hex: '#2C5742' },
  { id: 'sick', label: '病假', cssVar: 'type-sick', hex: '#4A7891' },
  { id: 'compensatory', label: '補假', cssVar: 'type-compensatory', hex: '#A98A3E' },
  { id: 'maternity', label: '產假', cssVar: 'type-maternity', hex: '#A9758A' },
  { id: 'paternity', label: '侍產假', cssVar: 'type-paternity', hex: '#8E7BA6' },
  { id: 'bereavement', label: '恩恤假', cssVar: 'type-bereavement', hex: '#6A6F73' },
  { id: 'unpaid', label: '無薪假', cssVar: 'type-unpaid', hex: '#9BA3A0' },
  { id: 'other', label: '其他', cssVar: 'type-other', hex: '#9A7B5A' },
];

const TYPE_MAP = new Map(LEAVE_TYPES.map((t) => [t.id, t]));

export function leaveTypeMeta(id: LeaveTypeId): LeaveTypeMeta {
  return TYPE_MAP.get(id) ?? LEAVE_TYPES[LEAVE_TYPES.length - 1];
}

/** 頭像 12 色（與 tokens.css 的 --avatar-N 同步） */
export const AVATAR_COLORS = [
  '#2C5742',
  '#4A7891',
  '#A98A3E',
  '#A9758A',
  '#6A6F73',
  '#7E9B6B',
  '#B08968',
  '#5E8598',
  '#8A6E9E',
  '#96733F',
  '#4F8A7B',
  '#7C7A6B',
] as const;

export const AVATAR_COLOR_COUNT = AVATAR_COLORS.length;

export function avatarColor(seed: number): string {
  const i = ((seed % AVATAR_COLOR_COUNT) + AVATAR_COLOR_COUNT) % AVATAR_COLOR_COUNT;
  return AVATAR_COLORS[i];
}

/** 取中文姓名末兩字（複姓情境下比只取一字好） */
export function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  if (trimmed.length <= 2) return trimmed;
  return trimmed.slice(-2);
}

export const NOTE_MAX = 500;
export const NAME_MAX = 40;
