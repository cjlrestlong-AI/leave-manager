import { useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button, Icon, Switch, SegmentedControl, Input, Select, Modal, Badge, EmptyState } from '@/components/ui';
import { useApp } from '@/state/AppContext';
import { listHolidaysForYear } from '@/domain/holidays';
import { buildSchemaSQL, RLS_DESCRIPTIONS, type RlsMode } from '@/data/schema.sql';
import { loadSupabaseConfig, saveSupabaseConfig } from '@/data/supabaseConfig';
import { SupabaseProvider } from '@/data/SupabaseProvider';
import { copyText, downloadJSON } from '@/lib/download';
import { resetLocal } from '@/data/LocalProvider';
import { writeJSON } from '@/lib/storage';
import { formatDisplay } from '@/lib/date';
import type { Holiday, HolidayKind } from '@/domain/types';

function Stepper({ value, min, max, onChange, suffix }: { value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="stepper">
      <button type="button" className="stepper__btn" aria-label="減少" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Icon name="minus" size={16} />
      </button>
      <span className="stepper__value tnum">
        {value}
        {suffix ? <span className="stepper__suffix">{suffix}</span> : null}
      </span>
      <button type="button" className="stepper__btn" aria-label="增加" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}

export function SettingsPage() {
  const { data, readOnly, saveSettings, today, deleteHoliday, addHoliday, toast } = useApp();
  const s = data.settings;

  const [holYear, setHolYear] = useState(Number(today.slice(0, 4)));
  const [showClear, setShowClear] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [conn, setConn] = useState(() => {
    const c = loadSupabaseConfig();
    return { url: c?.url ?? '', anonKey: c?.anonKey ?? '', rls: (c?.rls ?? 'A') as RlsMode, editKey: c?.editKey ?? '' };
  });
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const builtins = useMemo(() => listHolidaysForYear(holYear), [holYear]);
  const userHolidays = useMemo(
    () => data.holidays.filter((h) => h.year === holYear && h.source === 'user' && !h.deletedAt),
    [data.holidays, holYear],
  );
  const disabledBuiltin = useMemo(() => new Set(userHolidays.filter((h) => !h.enabled).map((h) => h.date)), [userHolidays]);
  const companyHolidays = useMemo(() => userHolidays.filter((h) => h.enabled), [userHolidays]);

  const years = useMemo(() => {
    const set = new Set<number>([holYear, Number(today.slice(0, 4)), 2026, 2027]);
    return [...set].sort((a, b) => a - b);
  }, [holYear, today]);

  function set<K extends keyof typeof s>(key: K, value: (typeof s)[K]) {
    if (readOnly) return;
    void saveSettings({ ...s, [key]: value });
  }

  async function toggleBuiltin(h: Holiday) {
    const isOff = disabledBuiltin.has(h.date);
    if (isOff) {
      // 重新啟用：移除停用覆寫
      const override = userHolidays.find((u) => u.date === h.date && !u.enabled);
      if (override) await deleteHoliday(override.id);
    } else {
      await addHoliday({ date: h.date, name: h.name, kind: 'public', year: holYear, source: 'user', enabled: false, deletedAt: null });
    }
  }

  async function addCompanyHoliday(date: string, name: string, kind: HolidayKind) {
    if (!date || !name.trim()) return;
    await addHoliday({ date, name: name.trim(), kind, year: Number(date.slice(0, 4)), source: 'user', enabled: true, deletedAt: null });
  }

  function exportData() {
    downloadJSON(`leave-data-${today}.json`, data);
  }

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as typeof data;
        writeJSON('employees', parsed.employees ?? []);
        writeJSON('leaves', parsed.leaves ?? []);
        writeJSON('holidays', parsed.holidays ?? []);
        writeJSON('settings', parsed.settings ?? {});
        window.location.reload();
      } catch {
        toast('匯入失敗：檔案格式不正確', { tone: 'danger' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function clearAll() {
    resetLocal();
    window.location.reload();
  }

  function shareLink(): string {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}?v=ro`;
  }

  async function copyShare() {
    const ok = await copyText(shareLink());
    toast(ok ? '唯讀連結已複製' : '複製失敗，請手動複製', { tone: ok ? 'ok' : 'warn' });
  }

  function saveConnection() {
    if (!conn.url || !conn.anonKey) {
      toast('請填寫網址與 anon key', { tone: 'warn' });
      return;
    }
    saveSupabaseConfig({ url: conn.url.trim(), anonKey: conn.anonKey.trim(), rls: conn.rls, editKey: conn.rls === 'C' ? conn.editKey : undefined });
    toast('已儲存，重新整理頁面後生效', { tone: 'ok' });
  }

  function disconnect() {
    saveSupabaseConfig(null);
    toast('已中斷雲端連線，重新整理後回到本機模式', { tone: 'info' });
  }

  async function testConnection() {
    setTestMsg('連線中…');
    try {
      const p = new SupabaseProvider({ url: conn.url.trim(), anonKey: conn.anonKey.trim(), rls: conn.rls, editKey: conn.editKey || undefined }, true);
      const r = await p.healthCheck();
      setTestMsg(r.ok ? '連線成功' : `連線失敗：${r.error.message}`);
    } catch (err) {
      setTestMsg(`連線失敗：${err instanceof Error ? err.message : '未知錯誤'}`);
    }
  }

  return (
    <div className="page">
      <PageHeader title="設定" description="計假規則、公眾假期、雲端連線與資料管理" />

      {readOnly ? <div className="banner banner--warn">目前是唯讀分享模式，設定不可修改。</div> : null}

      <section className="card setting-section">
        <h2 className="card__title">計假規則</h2>
        <div className="setting-rows">
          <div className="setting-row">
            <div className="setting-row__text">
              <span className="setting-row__label">同日最多放假人數</span>
              <span className="setting-row__desc">超過此數即標示為衝突（預設 2 人）</span>
            </div>
            <Stepper value={s.overlapThreshold} min={1} max={10} onChange={(v) => set('overlapThreshold', v)} />
          </div>
          <div className="setting-row">
            <div className="setting-row__text">
              <span className="setting-row__label">提前提醒天數</span>
              <span className="setting-row__desc">未來幾天內的假期會出現在提醒（預設 7 天）</span>
            </div>
            <Stepper value={s.reminderLeadDays} min={0} max={60} suffix=" 天" onChange={(v) => set('reminderLeadDays', v)} />
          </div>
          <div className="setting-row">
            <Switch label="週末自動排除" description="計算天數時不計週末" checked={s.excludeWeekends} onChange={(v) => set('excludeWeekends', v)} />
          </div>
          <div className="setting-row">
            <Switch label="公眾假期自動排除" description="計算天數時不計香港公眾假期" checked={s.excludeHolidays} onChange={(v) => set('excludeHolidays', v)} />
          </div>
          <div className="setting-row">
            <Switch label="衝突只計工作日" description="週末與假期不計入「同時放假」人數" checked={s.conflictWorkdaysOnly} onChange={(v) => set('conflictWorkdaysOnly', v)} />
          </div>
          <div className="setting-row">
            <div className="setting-row__text">
              <span className="setting-row__label">半天進位</span>
              <span className="setting-row__desc">「半天不進位」會精確到 0.5 天</span>
            </div>
            <SegmentedControl
              size="sm"
              value={s.halfDayRounding}
              onChange={(v) => set('halfDayRounding', v as 'as-is' | 'round-up')}
              options={[
                { value: 'as-is', label: '不進位' },
                { value: 'round-up', label: '進位成整天' },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="card setting-section">
        <div className="card__head">
          <h2 className="card__title">公眾假期</h2>
          <Select label="" value={String(holYear)} onChange={(v) => setHolYear(Number(v))} options={years.map((y) => ({ value: String(y), label: `${y} 年` }))} />
        </div>

        <div className="hol-group-title">香港公眾假期（內建，可停用）</div>
        <ul className="hol-list">
          {builtins.map((h) => (
            <li key={h.date} className="hol-item">
              <span className="hol-item__date tnum">{formatDisplay(h.date, 'md')}</span>
              <span className="hol-item__name truncate">{h.name}</span>
              <Switch checked={!disabledBuiltin.has(h.date)} onChange={() => toggleBuiltin(h)} disabled={readOnly} description={disabledBuiltin.has(h.date) ? '已停用（視為上班日）' : undefined} />
            </li>
          ))}
        </ul>

        <div className="hol-group-title">公司假期（自訂）</div>
        {companyHolidays.length === 0 ? (
          <EmptyState icon="flag" title="尚未新增公司假期" description="例如公司旅遊日、特別假日等。" />
        ) : (
          <ul className="hol-list">
            {companyHolidays.map((h) => (
              <li key={h.id} className="hol-item">
                <span className="hol-item__date tnum">{formatDisplay(h.date, 'md')}</span>
                <span className="hol-item__name truncate">{h.name}</span>
                <Badge tone="neutral">{h.kind === 'company' ? '公司' : '自訂'}</Badge>
                {!readOnly ? (
                  <button type="button" className="icon-btn icon-btn--danger" aria-label="刪除" onClick={() => deleteHoliday(h.id)}>
                    <Icon name="trash" size={16} />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {!readOnly ? (
          <AddHolidayDialog year={holYear} onAdd={addCompanyHoliday} />
        ) : null}
      </section>

      <section className="card setting-section">
        <h2 className="card__title">雲端連線（可選）</h2>
        <p className="setting-note">
          連接 Supabase 可跨裝置同步。未設定時自動使用本機模式，功能完全不變。
        </p>
        <div className="setting-rows">
          <Input label="Supabase 網址" value={conn.url} onChange={(v) => setConn((c) => ({ ...c, url: v }))} placeholder="https://xxxx.supabase.co" disabled={readOnly} />
          <Input label="anon key" value={conn.anonKey} onChange={(v) => setConn((c) => ({ ...c, anonKey: v }))} placeholder="public anon key" disabled={readOnly} />
          <div className="setting-row">
            <div className="setting-row__text">
              <span className="setting-row__label">RLS 嚴謹度</span>
              <span className="setting-row__desc">{RLS_DESCRIPTIONS[conn.rls]}</span>
            </div>
            <Select label="" value={conn.rls} onChange={(v) => setConn((c) => ({ ...c, rls: v as RlsMode }))} options={[{ value: 'A', label: 'A 簡易' }, { value: 'B', label: 'B 來源限制' }, { value: 'C', label: 'C 來源+編輯碼' }]} />
          </div>
          {conn.rls === 'C' ? (
            <Input label="編輯碼（x-edit-key）" value={conn.editKey} onChange={(v) => setConn((c) => ({ ...c, editKey: v }))} disabled={readOnly} />
          ) : null}
        </div>
        <div className="setting-actions">
          <Button variant="secondary" iconLeft="refresh" onClick={testConnection}>
            測試連線
          </Button>
          <Button variant="primary" iconLeft="check" onClick={saveConnection} disabled={readOnly}>
            儲存連線
          </Button>
          {loadSupabaseConfig() ? (
            <Button variant="ghost" onClick={disconnect}>
              中斷連線
            </Button>
          ) : null}
        </div>
        {testMsg ? <p className="setting-test-msg">{testMsg}</p> : null}

        <div className="setting-actions">
          <Button variant="ghost" iconLeft="copy" onClick={() => copyText(buildSchemaSQL(conn.rls))}>
            複製建表 SQL
          </Button>
          <Button variant="ghost" iconLeft="external" onClick={() => setShowSchema(true)}>
            檢視 SQL
          </Button>
          <Button variant="ghost" iconLeft="link" onClick={copyShare}>
            複製唯讀分享連結
          </Button>
        </div>
        <p className="setting-safety">
          <Icon name="warning" size={14} /> 安全須知：本網站無登入機制，anon key 會出現在瀏覽器原始碼中。RLS B/C 只是提高門檻（header 可偽造），防誤觸與一般窺探，不防惡意人士。
          <strong>請勿在備註欄填寫身分證號、電話、住址、薪資、醫療證明等敏感個資。</strong>
        </p>
      </section>

      <section className="card setting-section">
        <h2 className="card__title">資料管理</h2>
        <div className="setting-actions">
          <Button variant="secondary" iconLeft="download" onClick={exportData}>
            匯出 JSON
          </Button>
          <Button variant="secondary" iconLeft="upload" onClick={() => fileRef.current?.click()}>
            匯入 JSON
          </Button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImportFile} />
          <Button variant="ghost" iconLeft="trash" onClick={() => setShowClear(true)}>
            清空全部資料
          </Button>
        </div>
      </section>

      <Modal open={showSchema} onClose={() => setShowSchema(false)} title="建表 SQL" width={640} label="建表 SQL">
        <pre className="sql-block">{buildSchemaSQL(conn.rls)}</pre>
      </Modal>

      <Modal open={showClear} onClose={() => setShowClear(false)} title="清空全部資料？" width={420} label="清空確認">
        <p>這會刪除本機所有同事、假單與假期資料，且無法復原。建議先匯出備份。</p>
        <div className="modal__foot">
          <Button variant="ghost" onClick={() => setShowClear(false)}>
            取消
          </Button>
          <Button variant="danger" iconLeft="trash" onClick={clearAll}>
            確認清空
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function AddHolidayDialog({ year, onAdd }: { year: number; onAdd: (date: string, name: string, kind: HolidayKind) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(`${year}-01-01`);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<HolidayKind>('company');

  function submit() {
    if (!date || !name.trim()) return;
    onAdd(date, name, kind);
    setOpen(false);
    setName('');
    setKind('company');
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" iconLeft="plus" onClick={() => setOpen(true)}>
        新增公司假期
      </Button>
    );
  }
  return (
    <div className="add-holiday">
      <Input label="日期" value={date} onChange={setDate} type="date" />
      <Input label="名稱" value={name} onChange={setName} placeholder="例如：公司旅遊日" />
      <Select label="類型" value={kind} onChange={(v) => setKind(v as HolidayKind)} options={[{ value: 'company', label: '公司假期' }, { value: 'public', label: '公眾假期' }, { value: 'weekly', label: '每週' }]} />
      <div className="add-holiday__actions">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          取消
        </Button>
        <Button variant="primary" size="sm" iconLeft="check" onClick={submit}>
          新增
        </Button>
      </div>
    </div>
  );
}
