import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  err,
  ok,
  type AppError,
  type DataCapabilities,
  type DataProvider,
  type Result,
} from './DataProvider';
import { DEFAULT_SETTINGS, type AppData, type AppSettings, type Employee, type Holiday, type LeaveRecord } from '@/domain/types';
import type { SupabaseConfig } from './supabaseConfig';

interface DbEmployee {
  id: string;
  name: string;
  team: string | null;
  color_seed: number;
  active: boolean;
  sort_order: number;
  note: string | null;
  rev: number;
  updated_at: string;
  deleted_at: string | null;
}
interface DbLeave {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  start_half: 'full' | 'am' | 'pm';
  end_half: 'full' | 'am' | 'pm';
  type: string;
  note: string | null;
  rev: number;
  updated_at: string;
  deleted_at: string | null;
}
interface DbHoliday {
  id: string;
  date: string;
  name: string;
  kind: string;
  year: number;
  source: string;
  enabled: boolean;
  deleted_at: string | null;
}

function toEmployee(r: DbEmployee): Employee {
  return {
    id: r.id,
    name: r.name,
    team: r.team,
    colorSeed: r.color_seed,
    active: r.active,
    sortOrder: r.sort_order,
    note: r.note,
    rev: r.rev,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  };
}
function toLeave(r: DbLeave): LeaveRecord {
  return {
    id: r.id,
    employeeId: r.employee_id,
    startDate: r.start_date,
    endDate: r.end_date,
    startHalf: r.start_half,
    endHalf: r.end_half,
    type: r.type as LeaveRecord['type'],
    note: r.note,
    rev: r.rev,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  };
}
function toHoliday(r: DbHoliday): Holiday {
  return {
    id: r.id,
    date: r.date,
    name: r.name,
    kind: r.kind as Holiday['kind'],
    year: r.year,
    source: r.source as Holiday['source'],
    enabled: r.enabled,
    deletedAt: r.deleted_at,
  };
}

export class SupabaseProvider implements DataProvider {
  readonly capabilities: DataCapabilities;
  private client: SupabaseClient;

  constructor(config: SupabaseConfig, readOnly = false) {
    this.client = createClient(config.url, config.anonKey, { auth: { persistSession: false } });
    this.capabilities = { source: 'supabase', readOnly, label: '雲端同步' };
  }

  private guard(): Result<never> | null {
    if (this.capabilities.readOnly) return err({ kind: 'READ_ONLY', message: '唯讀模式，無法修改資料' });
    return null;
  }

  async loadAll(): Promise<Result<AppData>> {
    try {
      const [emp, lv, hol, setRow] = await Promise.all([
        this.client.from('employees').select('*').is('deleted_at', null),
        this.client.from('leave_records').select('*').is('deleted_at', null),
        this.client.from('holidays').select('*').is('deleted_at', null),
        this.client.from('app_settings').select('settings').eq('id', 1).maybeSingle(),
      ]);
      if (emp.error) return err({ kind: 'NETWORK', message: emp.error.message });
      if (lv.error) return err({ kind: 'NETWORK', message: lv.error.message });
      if (hol.error) return err({ kind: 'NETWORK', message: hol.error.message });

      const settings: AppSettings = { ...DEFAULT_SETTINGS, ...((setRow.data?.settings as Partial<AppSettings>) ?? {}) };
      return ok({
        employees: (emp.data as DbEmployee[]).map(toEmployee),
        leaves: (lv.data as DbLeave[]).map(toLeave),
        holidays: (hol.data as DbHoliday[]).map(toHoliday),
        settings,
      });
    } catch (e) {
      return err(networkError(e));
    }
  }

  async createEmployee(e: Employee): Promise<Result<Employee>> {
    if (this.guard()) return this.guard() as Result<Employee>;
    try {
      const { data, error } = await this.client
        .from('employees')
        .insert({
          name: e.name,
          team: e.team,
          color_seed: e.colorSeed,
          active: e.active,
          sort_order: e.sortOrder,
          note: e.note,
        })
        .select()
        .single();
      if (error) return err({ kind: 'NETWORK', message: error.message });
      return ok(toEmployee(data as DbEmployee));
    } catch (e) {
      return err(networkError(e));
    }
  }

  async updateEmployee(e: Employee): Promise<Result<Employee>> {
    if (this.guard()) return this.guard() as Result<Employee>;
    try {
      const { data, error } = await this.client
        .from('employees')
        .update({
          name: e.name,
          team: e.team,
          color_seed: e.colorSeed,
          active: e.active,
          sort_order: e.sortOrder,
          note: e.note,
        })
        .eq('id', e.id)
        .select()
        .single();
      if (error) return err({ kind: 'NETWORK', message: error.message });
      return ok(toEmployee(data as DbEmployee));
    } catch (e) {
      return err(networkError(e));
    }
  }

  async deleteEmployee(id: string): Promise<Result<void>> {
    if (this.guard()) return this.guard() as Result<void>;
    try {
      const { error } = await this.client.from('employees').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) return err({ kind: 'NETWORK', message: error.message });
      return ok(undefined);
    } catch (e) {
      return err(networkError(e));
    }
  }

  async createLeave(r: LeaveRecord): Promise<Result<LeaveRecord>> {
    if (this.guard()) return this.guard() as Result<LeaveRecord>;
    try {
      const { data, error } = await this.client
        .from('leave_records')
        .insert({
          employee_id: r.employeeId,
          start_date: r.startDate,
          end_date: r.endDate,
          start_half: r.startHalf,
          end_half: r.endHalf,
          type: r.type,
          note: r.note,
        })
        .select()
        .single();
      if (error) return err({ kind: 'NETWORK', message: error.message });
      return ok(toLeave(data as DbLeave));
    } catch (e) {
      return err(networkError(e));
    }
  }

  async updateLeave(r: LeaveRecord): Promise<Result<LeaveRecord>> {
    if (this.guard()) return this.guard() as Result<LeaveRecord>;
    try {
      const { data, error } = await this.client
        .from('leave_records')
        .update({
          employee_id: r.employeeId,
          start_date: r.startDate,
          end_date: r.endDate,
          start_half: r.startHalf,
          end_half: r.endHalf,
          type: r.type,
          note: r.note,
        })
        .eq('id', r.id)
        .select()
        .single();
      if (error) return err({ kind: 'NETWORK', message: error.message });
      return ok(toLeave(data as DbLeave));
    } catch (e) {
      return err(networkError(e));
    }
  }

  async deleteLeave(id: string): Promise<Result<void>> {
    if (this.guard()) return this.guard() as Result<void>;
    try {
      const { error } = await this.client.from('leave_records').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) return err({ kind: 'NETWORK', message: error.message });
      return ok(undefined);
    } catch (e) {
      return err(networkError(e));
    }
  }

  async createHoliday(h: Holiday): Promise<Result<Holiday>> {
    if (this.guard()) return this.guard() as Result<Holiday>;
    try {
      const { data, error } = await this.client
        .from('holidays')
        .insert({
          id: h.id || undefined,
          date: h.date,
          name: h.name,
          kind: h.kind,
          year: h.year,
          source: h.source,
          enabled: h.enabled,
        })
        .select()
        .single();
      if (error) return err({ kind: 'NETWORK', message: error.message });
      return ok(toHoliday(data as DbHoliday));
    } catch (e) {
      return err(networkError(e));
    }
  }

  async updateHoliday(h: Holiday): Promise<Result<Holiday>> {
    if (this.guard()) return this.guard() as Result<Holiday>;
    try {
      const { data, error } = await this.client
        .from('holidays')
        .update({ date: h.date, name: h.name, kind: h.kind, year: h.year, source: h.source, enabled: h.enabled })
        .eq('id', h.id)
        .select()
        .single();
      if (error) return err({ kind: 'NETWORK', message: error.message });
      return ok(toHoliday(data as DbHoliday));
    } catch (e) {
      return err(networkError(e));
    }
  }

  async deleteHoliday(id: string): Promise<Result<void>> {
    if (this.guard()) return this.guard() as Result<void>;
    try {
      const { error } = await this.client.from('holidays').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) return err({ kind: 'NETWORK', message: error.message });
      return ok(undefined);
    } catch (e) {
      return err(networkError(e));
    }
  }

  async saveSettings(s: AppSettings): Promise<Result<AppSettings>> {
    if (this.guard()) return this.guard() as Result<AppSettings>;
    try {
      const { error } = await this.client.from('app_settings').upsert({ id: 1, settings: s, updated_at: new Date().toISOString() });
      if (error) return err({ kind: 'NETWORK', message: error.message });
      return ok(s);
    } catch (e) {
      return err(networkError(e));
    }
  }

  async sync(): Promise<Result<AppData>> {
    return this.loadAll();
  }

  async healthCheck(): Promise<Result<true>> {
    try {
      const { error } = await this.client.from('employees').select('id', { count: 'exact', head: true });
      if (error) return err({ kind: 'NETWORK', message: error.message });
      return ok(true);
    } catch (e) {
      return err(networkError(e));
    }
  }
}

function networkError(e: unknown): AppError {
  return { kind: 'NETWORK', message: e instanceof Error ? e.message : '無法連線到雲端資料庫' };
}
