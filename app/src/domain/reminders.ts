import { addDays, compareISO, diffDays, formatDisplay, formatRange, type ISODate } from '@/lib/date';
import { formatDays, calculateDuration } from './duration';
import type { ConflictSegment } from './conflict';
import type { HolidayMap } from './holidays';
import { leaveTypeMeta } from './constants';
import type { AppSettings, Employee, LeaveRecord } from './types';

export type ReminderKind = 'conflict-soon' | 'starting' | 'on-leave' | 'returning';

export interface Reminder {
  id: string;
  kind: ReminderKind;
  level: 'info' | 'warn';
  date: ISODate;
  /** 0 = 今天 */
  daysUntil: number;
  employeeId?: string;
  recordId?: string;
  title: string;
  detail: string;
  /** 預先算好的排序鍵 */
  sortKey: string;
}

export interface ReminderInput {
  records: readonly LeaveRecord[];
  employees: readonly Employee[];
  holidays: HolidayMap;
  settings: AppSettings;
  conflicts: readonly ConflictSegment[];
  /** 由外部注入（香港時區） */
  today: ISODate;
  leadDays?: number;
}

/**
 * 提前 N 天提醒。
 *
 *  conflict-soon：衝突段的起始日落於提醒窗口內 → 警告等級，排最前
 *  on-leave     ：今天正在放假中
 *  starting     ：還沒開始，且起始日在窗口內
 *  returning    ：今天是最後一天，明天恢復上班
 */
export function buildReminders(input: ReminderInput): Reminder[] {
  const { records, employees, holidays, settings, conflicts, today } = input;
  const leadDays = input.leadDays ?? settings.reminderLeadDays;

  const empById = new Map(employees.map((e) => [e.id, e]));
  const nameOf = (id: string) => empById.get(id)?.name ?? '（已移除同事）';
  const out: Reminder[] = [];

  // ── 衝突即將發生 ──
  for (const seg of conflicts) {
    if (seg.severity !== 'over') continue;
    const start = seg.startDate;
    if (compareISO(start, today) < 0) continue;
    const daysUntil = diffDays(start, today);
    if (daysUntil > leadDays) continue;
    const names = seg.employeeIds.map(nameOf);
    out.push({
      id: `conflict:${seg.startDate}_${seg.endDate}`,
      kind: 'conflict-soon',
      level: 'warn',
      date: start,
      daysUntil,
      title: `${seg.peak} 人同時放假，超過上限 ${settings.overlapThreshold} 人`,
      detail: `${formatRange(seg.startDate, seg.endDate)} · 涉及 ${names.slice(0, 3).join('、')}${
        names.length > 3 ? ` 等 ${names.length} 人` : ''
      }`,
      sortKey: '',
    });
  }

  // ── 個別假單 ──
  for (const r of records) {
    if (r.deletedAt) continue;
    if (!empById.has(r.employeeId)) continue;
    const name = nameOf(r.employeeId);
    const typeLabel = leaveTypeMeta(r.type).label;

    if (compareISO(r.startDate, today) <= 0 && compareISO(today, r.endDate) <= 0) {
      const dayIndex = diffDays(today, r.startDate) + 1;
      const totalDays = diffDays(r.endDate, r.startDate) + 1;
      out.push({
        id: `onleave:${r.id}`,
        kind: 'on-leave',
        level: 'info',
        date: today,
        daysUntil: 0,
        employeeId: r.employeeId,
        recordId: r.id,
        title: `${name} 休假中（第 ${dayIndex} 天）`,
        detail: `${typeLabel} · ${formatRange(r.startDate, r.endDate)} · 共 ${totalDays} 天`,
        sortKey: '',
      });
      if (compareISO(r.endDate, today) === 0) {
        out.push({
          id: `return:${r.id}`,
          kind: 'returning',
          level: 'info',
          date: addDays(today, 1),
          daysUntil: 1,
          employeeId: r.employeeId,
          recordId: r.id,
          title: `${name} 明天恢復上班`,
          detail: `${typeLabel} 至 ${formatDisplay(r.endDate)}`,
          sortKey: '',
        });
      }
      continue;
    }

    if (compareISO(r.startDate, today) > 0) {
      const daysUntil = diffDays(r.startDate, today);
      if (daysUntil > leadDays) continue;

      const days = calculateDuration(r, settings, holidays);
      out.push({
        id: `start:${r.id}`,
        kind: 'starting',
        level: 'info',
        date: r.startDate,
        daysUntil,
        employeeId: r.employeeId,
        recordId: r.id,
        title: `${name} 開始放${typeLabel}`,
        detail: `${formatRange(r.startDate, r.endDate)} · ${formatDays(days)} 天`,
        sortKey: '',
      });
    }
  }

  // 排序：警告先 → 天數升冪 → 日期升冪 → 姓名
  out.sort((a, b) => {
    if (a.level !== b.level) return a.level === 'warn' ? -1 : 1;
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    if (a.date !== b.date) return compareISO(a.date, b.date);
    return a.title.localeCompare(b.title, 'zh-Hant-HK');
  });

  for (const r of out) {
    r.sortKey = `${r.level === 'warn' ? 0 : 1}:${String(r.daysUntil).padStart(4, '0')}:${r.date}:${r.id}`;
  }

  return out;
}

export type ReminderGroup = 'today' | 'tomorrow' | 'thisWeek' | 'later';

export function groupOf(reminder: Reminder): ReminderGroup {
  if (reminder.daysUntil <= 0) return 'today';
  if (reminder.daysUntil === 1) return 'tomorrow';
  if (reminder.daysUntil <= 7) return 'thisWeek';
  return 'later';
}

export const GROUP_LABELS: Record<ReminderGroup, string> = {
  today: '今天',
  tomorrow: '明天',
  thisWeek: '本週內',
  later: '之後',
};

export function groupReminders(reminders: readonly Reminder[]): Array<{
  group: ReminderGroup;
  label: string;
  items: Reminder[];
}> {
  const order: ReminderGroup[] = ['today', 'tomorrow', 'thisWeek', 'later'];
  return order
    .map((g) => ({
      group: g,
      label: GROUP_LABELS[g],
      items: reminders.filter((r) => groupOf(r) === g),
    }))
    .filter((g) => g.items.length > 0);
}
