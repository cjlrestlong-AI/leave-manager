import { STORAGE_PREFIX } from '@/lib/storage';
import type { RlsMode } from './schema.sql';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  rls: RlsMode;
  editKey?: string;
}

const KEY = `${STORAGE_PREFIX}:supabase`;

export function loadSupabaseConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Partial<SupabaseConfig>;
    if (!c.url || !c.anonKey) return null;
    return { url: c.url, anonKey: c.anonKey, rls: c.rls ?? 'A', editKey: c.editKey };
  } catch {
    return null;
  }
}

export function saveSupabaseConfig(c: SupabaseConfig | null): void {
  try {
    if (c) localStorage.setItem(KEY, JSON.stringify(c));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
