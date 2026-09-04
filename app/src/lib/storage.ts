export const STORAGE_PREFIX = 'leave-mgmt:v1';

export function storageKey(name: string): string {
  return `${STORAGE_PREFIX}:${name}`;
}

export function readJSON<T>(name: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(storageKey(name));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(name: string, value: unknown): boolean {
  try {
    localStorage.setItem(storageKey(name), JSON.stringify(value));
    return true;
  } catch (err) {
    // 最常見是容量滿了（QuotaExceededError），要讓 UI 能提示使用者
    console.warn('[storage] 寫入失敗', err);
    return false;
  }
}

export function removeKey(name: string): void {
  try {
    localStorage.removeItem(storageKey(name));
  } catch {
    /* 忽略 */
  }
}

export function readString(name: string): string | null {
  try {
    return localStorage.getItem(storageKey(name));
  } catch {
    return null;
  }
}

export function writeString(name: string, value: string): void {
  try {
    localStorage.setItem(storageKey(name), value);
  } catch {
    /* 忽略 */
  }
}

/** 列出所有本專案使用的 key，供資料管理頁顯示 */
export function allKeys(): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) out.push(k);
    }
  } catch {
    /* 忽略 */
  }
  return out;
}

export function clearAll(): void {
  for (const k of allKeys()) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* 忽略 */
    }
  }
}
