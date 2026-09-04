import { formatISODate } from './date';

/**
 * 香港時區（機構時區）相關工具。
 * 「今天」必須用機構時區計算，否則在日本或英國開網站會差一天。
 */

export const ORG_TIMEZONE = 'Asia/Hong_Kong';

/**
 * 以指定時區取得今天的 ISODate。
 * 'en-CA' 的日期格式恰好是 YYYY-MM-DD，可直接用。
 */
export function todayInOrg(timeZone: string = ORG_TIMEZONE, now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** 以香港時區格式化事件時間戳（updated_at 等） */
export function formatTimestamp(
  iso: string,
  timeZone: string = ORG_TIMEZONE,
  opts: { withTime?: boolean } = {},
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const f = new Intl.DateTimeFormat('zh-Hant-HK', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    ...(opts.withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  });
  return f.format(d);
}

/** 距今天數的人話：0 → 今天，1 → 明天，2 → 後天，其餘 → N 天後 */
export function relativeDayLabel(daysUntil: number): string {
  if (daysUntil === 0) return '今天';
  if (daysUntil === 1) return '明天';
  if (daysUntil === 2) return '後天';
  if (daysUntil < 0) return `${Math.abs(daysUntil)} 天前`;
  return `${daysUntil} 天後`;
}

/** 取得某月第一天（供日曆用），避免重複 import date.ts 造成循環 */
export function monthStartOf(today: string): string {
  return `${today.slice(0, 7)}-01`;
}

export { formatISODate };
