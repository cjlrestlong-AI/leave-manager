/**
 * 時區安全的「日曆日」工具。
 *
 * 四條鐵律：
 *  1. ISODate（'YYYY-MM-DD' 字串）是全站唯一真值；Date 物件只在本檔案內短暫存在。
 *  2. 禁止 new Date('2026-09-03') —— 會被當 UTC 解析，負時區環境會差一天。
 *  3. 禁止對日期欄位用 toISOString() —— UTC 化，必錯。
 *  4. 「今天」永遠由外部注入或走 lib/hkt.ts 的香港時區，本檔案不主動取現在時間。
 */

export type ISODate = string;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toISODate(year: number, month1: number, day: number): ISODate {
  const m = String(month1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${String(year).padStart(4, '0')}-${m}-${d}`;
}

/** 手動切字串建構本地時區的日曆日 00:00，絕不 parse ISO 字串 */
export function parseISODate(s: ISODate): Date {
  const m = ISO_RE.exec(s);
  if (!m) throw new Error(`Invalid ISODate: ${s}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** 用 getFullYear/getMonth/getDate 取值，絕不用 toISOString */
export function formatISODate(d: Date): ISODate {
  return toISODate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** 同時驗證格式與真實性（防 2026-02-30） */
export function isValidISODate(s: string): boolean {
  const m = ISO_RE.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

export function nextDay(s: ISODate): ISODate {
  const d = parseISODate(s);
  d.setDate(d.getDate() + 1);
  return formatISODate(d);
}

export function prevDay(s: ISODate): ISODate {
  const d = parseISODate(s);
  d.setDate(d.getDate() - 1);
  return formatISODate(d);
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return formatISODate(d);
}

/** a - b，單位為日曆天 */
export function diffDays(a: ISODate, b: ISODate): number {
  const ms = parseISODate(a).getTime() - parseISODate(b).getTime();
  return Math.round(ms / 86400000);
}

/** 含首尾的日期陣列；若 end < start 回傳空陣列 */
export function eachDay(start: ISODate, end: ISODate): ISODate[] {
  if (compareISO(start, end) > 0) return [];
  const out: ISODate[] = [];
  let cur = start;
  // 上限保護，避免異常資料造成無窮迴圈
  for (let i = 0; i < 5000; i++) {
    out.push(cur);
    if (cur === end) break;
    cur = nextDay(cur);
  }
  return out;
}

/** ISO 字串字典序即時間序 */
export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function minISO(a: ISODate, b: ISODate): ISODate {
  return compareISO(a, b) <= 0 ? a : b;
}

export function maxISO(a: ISODate, b: ISODate): ISODate {
  return compareISO(a, b) >= 0 ? a : b;
}

/** 0 = 週日 … 6 = 週六 */
export function dayOfWeek(s: ISODate): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return parseISODate(s).getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function isWeekend(s: ISODate): boolean {
  const d = dayOfWeek(s);
  return d === 0 || d === 6;
}

export function startOfWeek(s: ISODate, weekStartsOn: 0 | 1 = 0): ISODate {
  const dow = dayOfWeek(s);
  const delta = (dow - weekStartsOn + 7) % 7;
  return addDays(s, -delta);
}

export function startOfMonth(s: ISODate): ISODate {
  return `${s.slice(0, 7)}-01`;
}

export function endOfMonth(s: ISODate): ISODate {
  return toISODate(Number(s.slice(0, 4)), Number(s.slice(5, 7)), daysInMonth(Number(s.slice(0, 4)), Number(s.slice(5, 7))));
}

export function addMonths(s: ISODate, n: number): ISODate {
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return toISODate(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

export function yearOf(s: ISODate): number {
  return Number(s.slice(0, 4));
}

export function monthOf(s: ISODate): number {
  return Number(s.slice(5, 7));
}

const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六'] as const;

export function weekdayZh(s: ISODate): string {
  return WEEKDAY_ZH[dayOfWeek(s)];
}

export type DateStyle = 'long' | 'short' | 'md' | 'monthTitle';

/**
 * 'long'       2026年9月3日
 * 'short'      9/3
 * 'md'         9月3日（四）
 * 'monthTitle' 2026年9月
 */
export function formatDisplay(s: ISODate, style: DateStyle = 'md'): string {
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  switch (style) {
    case 'long':
      return `${y}年${m}月${d}日`;
    case 'short':
      return `${m}/${d}`;
    case 'monthTitle':
      return `${y}年${m}月`;
    case 'md':
    default:
      return `${m}月${d}日（${weekdayZh(s)}）`;
  }
}

/** 2026-09-03 – 2026-09-05 → "9月3日 – 9月5日"；同日只顯示一次 */
export function formatRange(start: ISODate, end: ISODate, style: DateStyle = 'short'): string {
  if (start === end) return formatDisplay(start, style === 'short' ? 'md' : style);
  if (yearOf(start) === yearOf(end)) {
    return `${formatDisplay(start, style)} – ${formatDisplay(end, style)}`;
  }
  return `${formatDisplay(start, 'long')} – ${formatDisplay(end, 'long')}`;
}
