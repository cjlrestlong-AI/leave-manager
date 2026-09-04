import { dayOfWeek, eachDay, type ISODate } from '@/lib/date';
import type { Holiday } from './types';

/**
 * 香港公眾假期內建資料。
 * 2026 與 2027 兩年取自香港特別行政區政府憲報公布（各 17 天）。
 * 2026：https://www.info.gov.hk/gia/general/202505/16/P2025051300354.htm
 * 2027：https://www.info.gov.hk/gia/general/202605/15/P2026051400304.htm
 * 其他年度請在設定頁自行維護。
 *
 * 星期日不寫入資料表，由「週末自動排除」開關統一處理，避免 52 筆冗餘資料。
 */

interface BuiltinEntry {
  date: ISODate;
  name: string;
}

export const BUILTIN_HOLIDAYS: ReadonlyArray<BuiltinEntry> = [
  // ── 2026 ──
  { date: '2026-01-01', name: '元旦' },
  { date: '2026-02-17', name: '農曆年初一' },
  { date: '2026-02-18', name: '農曆年初二' },
  { date: '2026-02-19', name: '農曆年初三' },
  { date: '2026-04-03', name: '耶穌受難節' },
  { date: '2026-04-04', name: '耶穌受難節翌日' },
  { date: '2026-04-06', name: '清明節翌日' },
  { date: '2026-04-07', name: '復活節星期一翌日' },
  { date: '2026-05-01', name: '勞動節' },
  { date: '2026-05-25', name: '佛誕翌日' },
  { date: '2026-06-19', name: '端午節' },
  { date: '2026-07-01', name: '香港特別行政區成立紀念日' },
  { date: '2026-09-26', name: '中秋節翌日' },
  { date: '2026-10-01', name: '國慶日' },
  { date: '2026-10-19', name: '重陽節翌日' },
  { date: '2026-12-25', name: '聖誕節' },
  { date: '2026-12-26', name: '聖誕節後第一個周日' },

  // ── 2027（年初二逢週日，故年初四為補假）──
  { date: '2027-01-01', name: '元旦' },
  { date: '2027-02-06', name: '農曆年初一' },
  { date: '2027-02-08', name: '農曆年初三' },
  { date: '2027-02-09', name: '農曆年初四' },
  { date: '2027-03-26', name: '耶穌受難節' },
  { date: '2027-03-27', name: '耶穌受難節翌日' },
  { date: '2027-03-29', name: '復活節星期一' },
  { date: '2027-04-05', name: '清明節' },
  { date: '2027-05-01', name: '勞動節' },
  { date: '2027-05-13', name: '佛誕' },
  { date: '2027-06-09', name: '端午節' },
  { date: '2027-07-01', name: '香港特別行政區成立紀念日' },
  { date: '2027-09-16', name: '中秋節翌日' },
  { date: '2027-10-01', name: '國慶日' },
  { date: '2027-10-08', name: '重陽節' },
  { date: '2027-12-25', name: '聖誕節' },
  { date: '2027-12-27', name: '聖誕節後第一個周日' },
];

export const BUILTIN_YEARS = [2026, 2027] as const;

function builtinHoliday(e: BuiltinEntry): Holiday {
  return {
    id: `builtin:${e.date}`,
    date: e.date,
    name: e.name,
    kind: 'public',
    year: Number(e.date.slice(0, 4)),
    source: 'builtin',
    enabled: true,
    deletedAt: null,
  };
}

export type HolidayMap = Map<ISODate, Holiday>;

/**
 * 合併內建假期與使用者自訂假期。
 * 使用者若在某一筆內建假期上標記 enabled: false，該筆會被移除（等同「這天我要上班」）。
 * 使用者自訂永遠覆蓋內建。
 */
export function buildHolidayMap(years: Iterable<number>, custom: readonly Holiday[] = []): HolidayMap {
  const wanted = new Set(years);
  const map: HolidayMap = new Map();

  for (const e of BUILTIN_HOLIDAYS) {
    const y = Number(e.date.slice(0, 4));
    if (!wanted.has(y)) continue;
    map.set(e.date, builtinHoliday(e));
  }

  const live = custom.filter((h) => !h.deletedAt);
  for (const h of live) {
    if (!wanted.has(h.year)) continue;
    if (h.enabled) map.set(h.date, h);
    else map.delete(h.date);
  }

  return map;
}

/** 供設定頁顯示：某年度的完整假期清單（含被停用的內建假期） */
export function listHolidaysForYear(year: number, custom: readonly Holiday[] = []): Holiday[] {
  const rows: Holiday[] = BUILTIN_HOLIDAYS.filter((e) => Number(e.date.slice(0, 4)) === year).map(builtinHoliday);
  for (const h of custom) {
    if (h.year !== year) continue;
    const i = rows.findIndex((r) => r.date === h.date);
    if (i >= 0) rows[i] = h;
    else rows.push(h);
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return rows;
}

/** 區間內的所有週日（供顯示用；是否扣除由設定決定） */
export function sundaysIn(start: ISODate, end: ISODate): ISODate[] {
  return eachDay(start, end).filter((d) => dayOfWeek(d) === 0);
}
