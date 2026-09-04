import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { todayInOrg } from '@/lib/hkt';
import { DEFAULT_SETTINGS, type AppData, type AppSettings, type Employee, type Holiday, type LeaveRecord } from '@/domain/types';
import { LocalProvider, markSeeded } from '@/data/LocalProvider';
import { SupabaseProvider } from '@/data/SupabaseProvider';
import { loadSupabaseConfig } from '@/data/supabaseConfig';
import type { DataProvider, Result } from '@/data/DataProvider';
import type { AppError } from '@/data/DataProvider';

function createProvider(readOnly: boolean): { provider: DataProvider; isCloud: boolean } {
  const cfg = loadSupabaseConfig();
  if (cfg) {
    try {
      return { provider: new SupabaseProvider(cfg, readOnly), isCloud: true };
    } catch {
      /* 建立失敗就退回本機 */
    }
  }
  return { provider: new LocalProvider(readOnly), isCloud: false };
}

export type ToastTone = 'ok' | 'warn' | 'danger' | 'info';
export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
  duration: number;
}
export type SyncState = 'idle' | 'syncing' | 'offline' | 'error';

interface AppCtx {
  data: AppData;
  today: string;
  readOnly: boolean;
  provider: DataProvider;
  sourceLabel: string;
  sync: SyncState;
  syncError?: string;
  refresh: () => Promise<void>;

  toast: (message: string, opts?: { tone?: ToastTone; action?: ToastItem['action']; duration?: number }) => string;
  toasts: ToastItem[];
  dismissToast: (id: string) => void;

  addEmployee: (input: Omit<Employee, 'id' | 'rev' | 'updatedAt' | 'deletedAt'>) => Promise<Result<Employee>>;
  updateEmployee: (e: Employee) => Promise<Result<Employee>>;
  deleteEmployee: (id: string) => Promise<Result<void>>;
  purgeEmployee: (id: string) => Promise<Result<void>>;

  addLeave: (input: Omit<LeaveRecord, 'id' | 'rev' | 'updatedAt' | 'deletedAt'>) => Promise<Result<LeaveRecord>>;
  updateLeave: (r: LeaveRecord) => Promise<Result<LeaveRecord>>;
  deleteLeave: (id: string) => Promise<Result<void>>;
  restoreLeave: (id: string) => Promise<Result<void>>;

  addHoliday: (h: Omit<Holiday, 'id'>) => Promise<Result<Holiday>>;
  updateHoliday: (h: Holiday) => Promise<Result<Holiday>>;
  deleteHoliday: (id: string) => Promise<Result<void>>;

  saveSettings: (s: AppSettings) => Promise<Result<AppSettings>>;
}

const Ctx = createContext<AppCtx | null>(null);

function errorToMessage(e: AppError): string {
  return e.message;
}

function replaceById<T extends { id: string }>(arr: T[], item: T): T[] {
  const i = arr.findIndex((x) => x.id === item.id);
  if (i < 0) return [...arr, item];
  const copy = arr.slice();
  copy[i] = item;
  return copy;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const readOnly = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('v') === 'ro';

  const initial = useRef(createProvider(readOnly));
  const providerRef = useRef<DataProvider>(initial.current.provider);
  const isCloudRef = useRef(initial.current.isCloud);
  const [data, setData] = useState<AppData>(() => ({
    employees: [],
    leaves: [],
    holidays: [],
    settings: { ...DEFAULT_SETTINGS },
  }));
  const [loaded, setLoaded] = useState(false);
  const [sync, setSync] = useState<SyncState>('idle');
  const [syncError, setSyncError] = useState<string | undefined>(undefined);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastSeq = useRef(0);
  const today = useMemo(() => todayInOrg(), []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback<AppCtx['toast']>(
    (message, opts) => {
      const id = `t${++toastSeq.current}`;
      const item: ToastItem = {
        id,
        message,
        tone: opts?.tone ?? 'info',
        action: opts?.action,
        duration: opts?.duration ?? 4000,
      };
      setToasts((t) => [...t, item]);
      if (item.duration > 0) {
        setTimeout(() => dismissToast(id), item.duration);
      }
      return id;
    },
    [dismissToast],
  );

  const refresh = useCallback(async () => {
    const res = await providerRef.current.loadAll();
    if (res.ok) {
      setData(res.value);
    } else {
      setSync('error');
      setSyncError(errorToMessage(res.error));
    }
  }, []);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    async function load() {
      const res = await providerRef.current.loadAll();
      if (!active) return;
      if (res.ok) {
        setData(res.value);
        setSync('idle');
        setSyncError(undefined);
        markSeeded();
      } else {
        // 雲端失敗 → 自動降級本機模式，網站照常可用（絕不卡住）
        if (isCloudRef.current) {
          providerRef.current = new LocalProvider(readOnly);
          isCloudRef.current = false;
          const local = await providerRef.current.loadAll();
          if (local.ok && active) {
            setData(local.value);
            markSeeded();
          }
        }
        setSync('offline');
        setSyncError(errorToMessage(res.error));
      }
      setLoaded(true);
    }

    load();

    if (isCloudRef.current) {
      const poll = () => {
        if (active) load();
      };
      timer = window.setInterval(poll, 60000);
      const onFocus = () => {
        if (active) load();
      };
      window.addEventListener('focus', onFocus);
      return () => {
        active = false;
        window.clearInterval(timer);
        window.removeEventListener('focus', onFocus);
      };
    }
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]);

  const applyResult = useCallback(
    <T,>(res: Result<T>, onOk: () => void, okMsg?: string, errMsg?: (e: AppError) => string) => {
      if (res.ok) {
        onOk();
        if (okMsg) toast(okMsg, { tone: 'ok' });
      } else {
        const msg = errMsg ? errMsg(res.error) : errorToMessage(res.error);
        // 唯讀等級的錯誤不重複刷 toast
        toast(msg, { tone: res.error.kind === 'READ_ONLY' ? 'warn' : 'danger' });
      }
      return res;
    },
    [toast],
  );

  const addEmployee = useCallback<AppCtx['addEmployee']>(
    (input) => {
      const p = providerRef.current;
      const promise = p.createEmployee({
        ...input,
        id: '',
        rev: 0,
        updatedAt: '',
        deletedAt: null,
      } as Employee);
      return promise.then((res) => {
        applyResult(res, () => res.ok && setData((d) => ({ ...d, employees: replaceById(d.employees, res.value) })), '已新增同事');
        return res;
      });
    },
    [applyResult],
  );

  const updateEmployee = useCallback<AppCtx['updateEmployee']>(
    (e) =>
      providerRef.current.updateEmployee(e).then((res) => {
        applyResult(res, () => res.ok && setData((d) => ({ ...d, employees: replaceById(d.employees, res.value) })), '已更新');
        return res;
      }),
    [applyResult],
  );

  const deleteEmployee = useCallback<AppCtx['deleteEmployee']>(
    (id) =>
      providerRef.current.deleteEmployee(id).then((res) => {
        applyResult(res, () =>
          setData((d) => ({
            ...d,
            employees: d.employees.map((e) => (e.id === id ? { ...e, deletedAt: new Date().toISOString() } : e)),
          })),
        );
        return res;
      }),
    [applyResult],
  );

  const purgeEmployee = useCallback<AppCtx['purgeEmployee']>(
    (id) =>
      providerRef.current.deleteEmployee(id).then((res) => {
        applyResult(res, () => setData((d) => ({ ...d, employees: d.employees.filter((e) => e.id !== id) })));
        return res;
      }),
    [applyResult],
  );

  const addLeave = useCallback<AppCtx['addLeave']>(
    (input) =>
      providerRef.current
        .createLeave({ ...input, id: '', rev: 0, updatedAt: '', deletedAt: null } as LeaveRecord)
        .then((res) => {
          applyResult(res, () => res.ok && setData((d) => ({ ...d, leaves: replaceById(d.leaves, res.value) })), '已登錄假單');
          return res;
        }),
    [applyResult],
  );

  const updateLeave = useCallback<AppCtx['updateLeave']>(
    (r) =>
      providerRef.current.updateLeave(r).then((res) => {
        applyResult(res, () => res.ok && setData((d) => ({ ...d, leaves: replaceById(d.leaves, res.value) })), '已更新');
        return res;
      }),
    [applyResult],
  );

  const deleteLeave = useCallback<AppCtx['deleteLeave']>(
    (id) =>
      providerRef.current.deleteLeave(id).then((res) => {
        applyResult(res, () =>
          setData((d) => ({
            ...d,
            leaves: d.leaves.map((r) => (r.id === id ? { ...r, deletedAt: new Date().toISOString() } : r)),
          })),
        );
        return res;
      }),
    [applyResult],
  );

  const restoreLeave = useCallback<AppCtx['restoreLeave']>(
    (id) =>
      providerRef.current.deleteLeave(id).then((res) => {
        applyResult(res, () =>
          setData((d) => ({
            ...d,
            leaves: d.leaves.map((r) => (r.id === id ? { ...r, deletedAt: null } : r)),
          })),
        );
        return res;
      }),
    [applyResult],
  );

  const addHoliday = useCallback<AppCtx['addHoliday']>(
    (h) =>
      providerRef.current.createHoliday({ ...h, id: '' } as Holiday).then((res) => {
        applyResult(res, () => res.ok && setData((d) => ({ ...d, holidays: replaceById(d.holidays, res.value) })), '已新增假期');
        return res;
      }),
    [applyResult],
  );

  const updateHoliday = useCallback<AppCtx['updateHoliday']>(
    (h) =>
      providerRef.current.updateHoliday(h).then((res) => {
        applyResult(res, () => res.ok && setData((d) => ({ ...d, holidays: replaceById(d.holidays, res.value) })), '已更新');
        return res;
      }),
    [applyResult],
  );

  const deleteHoliday = useCallback<AppCtx['deleteHoliday']>(
    (id) =>
      providerRef.current.deleteHoliday(id).then((res) => {
        applyResult(res, () => setData((d) => ({ ...d, holidays: d.holidays.filter((h) => h.id !== id) })));
        return res;
      }),
    [applyResult],
  );

  const saveSettings = useCallback<AppCtx['saveSettings']>(
    (s) =>
      providerRef.current.saveSettings(s).then((res) => {
        applyResult(res, () => res.ok && setData((d) => ({ ...d, settings: res.value })));
        return res;
      }),
    [applyResult],
  );

  const value: AppCtx = {
    data,
    today,
    readOnly,
    provider: providerRef.current,
    sourceLabel: providerRef.current.capabilities.label,
    sync,
    syncError,
    refresh,
    toast,
    toasts,
    dismissToast,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    purgeEmployee,
    addLeave,
    updateLeave,
    deleteLeave,
    restoreLeave,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    saveSettings,
  };

  void loaded;

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp 必須在 AppProvider 內使用');
  return ctx;
}
