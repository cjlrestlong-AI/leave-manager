/**
 * 建表 SQL 產生器。設定頁一鍵複製，貼進 Supabase SQL Editor 一次執行。
 *
 * 設計要點（與前端一致）：
 *  - 日期用 date 而非 timestamptz，與前端的 'YYYY-MM-DD' 字串一對一對應，無時區轉換。
 *  - rev 欄位 + trigger 做樂觀鎖（前端的 update 帶 .eq('rev', n)，0 筆＝被改過）。
 *  - 所有刪除為軟刪除（deleted_at），誤刪可還原。
 *  - 半日語意用 CHECK 約束保障。
 *  - RLS 嚴謹度 A / B / C 由參數決定。
 */

export type RlsMode = 'A' | 'B' | 'C';

export const RLS_DESCRIPTIONS: Record<RlsMode, string> = {
  A: '匿名可讀寫。零設定失敗率，適合先跑起來。',
  B: '寫入限於你的網站網域（檢查 request origin header）。',
  C: 'B + 額外要求 x-edit-key header，防一般窺探更強。',
};

function rlsPolicies(mode: RlsMode): string {
  if (mode === 'A') {
    return `
-- RLS 模式 A：匿名完全讀寫（最簡單，適合內部小團隊）
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON employees FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON leave_records FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON holidays FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON app_settings FOR ALL TO anon USING (true) WITH CHECK (true);`;
  }

  const originCheck =
    mode === 'B'
      ? `((current_setting('request.headers', true)::json->>'origin') = ANY(ARRAY['https://你的網域.example.com']))`
      : `((current_setting('request.headers', true)::json->>'origin') = ANY(ARRAY['https://你的網域.example.com']))
     AND (current_setting('request.headers', true)::json->>'x-edit-key') = '把這裡換成你的編輯碼'`;

  return `
-- RLS 模式 ${mode}：寫入限於來源網域${mode === 'C' ? ' + 編輯碼' : ''}
-- 請把上面網域與編輯碼替換成你自己的值。
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read" ON employees FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON leave_records FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON holidays FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON app_settings FOR SELECT TO anon USING (true);

CREATE POLICY "origin_write" ON employees FOR INSERT TO anon WITH CHECK (${originCheck});
CREATE POLICY "origin_write" ON leave_records FOR INSERT TO anon WITH CHECK (${originCheck});
CREATE POLICY "origin_write" ON holidays FOR INSERT TO anon WITH CHECK (${originCheck});
CREATE POLICY "origin_write" ON app_settings FOR INSERT TO anon WITH CHECK (${originCheck});
CREATE POLICY "origin_write" ON employees FOR UPDATE TO anon USING (${originCheck}) WITH CHECK (${originCheck});
CREATE POLICY "origin_write" ON leave_records FOR UPDATE TO anon USING (${originCheck}) WITH CHECK (${originCheck});
CREATE POLICY "origin_write" ON holidays FOR UPDATE TO anon USING (${originCheck}) WITH CHECK (${originCheck});
CREATE POLICY "origin_write" ON app_settings FOR UPDATE TO anon USING (${originCheck}) WITH CHECK (${originCheck});
CREATE POLICY "origin_write" ON employees FOR DELETE TO anon USING (${originCheck});
CREATE POLICY "origin_write" ON leave_records FOR DELETE TO anon USING (${originCheck});
CREATE POLICY "origin_write" ON holidays FOR DELETE TO anon USING (${originCheck});`;
}

export function buildSchemaSQL(mode: RlsMode = 'A'): string {
  return `-- 員工假期管理 · 建表 SQL（RLS 模式 ${mode}）
-- 在 Supabase SQL Editor 貼上一次執行即可。

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  team text,
  color_seed int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  note text,
  rev int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS leave_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_half text NOT NULL CHECK (start_half IN ('full','am','pm')),
  end_half text NOT NULL CHECK (end_half IN ('full','am','pm')),
  type text NOT NULL,
  note text,
  rev int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT half_semantics CHECK (
    (start_date = end_date AND start_half = end_half)
    OR (start_date < end_date AND start_half IN ('full','pm') AND end_half IN ('full','am'))
  )
);

CREATE TABLE IF NOT EXISTS holidays (
  id text PRIMARY KEY,
  date date NOT NULL,
  name text NOT NULL,
  kind text NOT NULL,
  year int NOT NULL,
  source text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS app_settings (
  id int PRIMARY KEY DEFAULT 1,
  settings jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_emp ON leave_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_range ON leave_records(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_holiday_date ON holidays(date);

-- rev 樂觀鎖 trigger：每次 UPDATE 自動 +1
CREATE OR REPLACE FUNCTION bump_rev() RETURNS trigger AS $$
BEGIN
  NEW.rev = COALESCE(OLD.rev, 0) + 1;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employees_rev BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION bump_rev();
CREATE TRIGGER trg_leave_rev BEFORE UPDATE ON leave_records FOR EACH ROW EXECUTE FUNCTION bump_rev();
CREATE TRIGGER trg_holidays_rev BEFORE UPDATE ON holidays FOR EACH ROW EXECUTE FUNCTION bump_rev();

-- 初始設定列
INSERT INTO app_settings (id, settings)
VALUES (1, '{"excludeWeekends":true,"excludeHolidays":true,"overlapThreshold":2,"reminderLeadDays":7,"halfDayRounding":"as-is","conflictWorkdaysOnly":true,"orgTimezone":"Asia/Hong_Kong"}')
ON CONFLICT (id) DO NOTHING;
${rlsPolicies(mode)}
`;
}
