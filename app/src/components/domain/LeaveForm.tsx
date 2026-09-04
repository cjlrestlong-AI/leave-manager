import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { Button, ComboBox, DateField, SegmentedControl, Textarea, Avatar } from '@/components/ui';
import { PrecheckPanel } from './PrecheckPanel';
import { useApp } from '@/state/AppContext';
import {
  LEAVE_TYPES,
  NAME_MAX,
  NOTE_MAX,
  AVATAR_COLOR_COUNT,
} from '@/domain/constants';
import { addDays, dayOfWeek, isValidISODate, compareISO, type ISODate } from '@/lib/date';
import { isSingleDay, normalizeDraft } from '@/domain/leave';
import { precheckLeave } from '@/domain/precheck';
import type { AppSettings, Employee, HalfDay, LeaveRecord, LeaveTypeId } from '@/domain/types';
import type { HolidayMap } from '@/domain/holidays';

interface LeaveFormProps {
  employees: Employee[];
  existingLeaves: LeaveRecord[];
  holidayMap: HolidayMap;
  settings: AppSettings;
  today: string;
  draft?: LeaveRecord | null;
  defaultStart?: string;
  defaultEmployeeId?: string;
  onClose: () => void;
  onSaved: () => void;
}

function nextMonday(from: ISODate): ISODate {
  const d = (8 - dayOfWeek(from)) % 7;
  return addDays(from, d === 0 ? 7 : d);
}

export function LeaveForm({
  employees,
  existingLeaves,
  holidayMap,
  settings,
  today,
  draft,
  defaultStart,
  defaultEmployeeId,
  onClose,
  onSaved,
}: LeaveFormProps) {
  const { addLeave, updateLeave, addEmployee, readOnly } = useApp();

  const [employeeId, setEmployeeId] = useState(draft?.employeeId ?? defaultEmployeeId ?? '');
  const [startDate, setStartDate] = useState<ISODate>(draft?.startDate ?? (defaultStart as ISODate) ?? (today as ISODate));
  const [endDate, setEndDate] = useState<ISODate>(draft?.endDate ?? startDate);
  const [startHalf, setStartHalf] = useState<HalfDay>(draft?.startHalf ?? 'full');
  const [endHalf, setEndHalf] = useState<HalfDay>(draft?.endHalf ?? 'full');
  const [type, setType] = useState<LeaveTypeId>(draft?.type ?? 'annual');
  const [note, setNote] = useState(draft?.note ?? '');
  const [attempted, setAttempted] = useState(false);

  const single = isSingleDay(startDate, endDate);

  const employeeOptions = useMemo(
    () => employees.map((e) => ({ value: e.id, label: e.name, sublabel: e.team ?? undefined, seed: e.colorSeed })),
    [employees],
  );

  const draftRecord: LeaveRecord = useMemo(
    () => ({
      id: draft?.id ?? 'draft',
      employeeId,
      startDate,
      endDate,
      startHalf,
      endHalf,
      type,
      note: note || null,
      rev: draft?.rev ?? 0,
      updatedAt: draft?.updatedAt ?? '',
      deletedAt: null,
    }),
    [draft, employeeId, startDate, endDate, startHalf, endHalf, type, note],
  );

  const precheck = useMemo(
    () => precheckLeave({ draft: draftRecord, existing: existingLeaves, employees, holidays: holidayMap, settings }),
    [draftRecord, existingLeaves, employees, holidayMap, settings],
  );

  const hasEmployee = Boolean(employeeId);
  const datesValid = isValidISODate(startDate) && isValidISODate(endDate) && compareISO(endDate, startDate) >= 0;
  const canSubmit = hasEmployee && datesValid && precheck.ok;

  function handleStart(v: ISODate) {
    setStartDate(v);
    setEndDate((e) => (compareISO(e, v) < 0 ? v : e));
  }

  function handleSingleHalf(h: HalfDay) {
    setStartHalf(h);
    setEndHalf(h);
  }

  async function quickAdd(name: string) {
    const res = await addEmployee({
      name: name.trim().slice(0, NAME_MAX),
      team: null,
      colorSeed: employees.length % AVATAR_COLOR_COUNT,
      active: true,
      sortOrder: employees.length,
      note: null,
    });
    if (res.ok) setEmployeeId(res.value.id);
  }

  async function submit() {
    setAttempted(true);
    if (!canSubmit || readOnly) return;
    const base = {
      employeeId,
      startDate,
      endDate,
      startHalf,
      endHalf,
      type,
      note: note.trim() || null,
    };
    if (draft) {
      const rec = normalizeDraft({ ...base, id: draft.id, rev: draft.rev, updatedAt: draft.updatedAt, deletedAt: null });
      const res = await updateLeave(rec);
      if (res.ok) onSaved();
    } else {
      const res = await addLeave({ ...base });
      if (res.ok) onSaved();
    }
  }

  return (
    <div className="leave-form">
      <div className="leave-form__fields">
        <ComboBox
          label="同事"
          value={employeeId || null}
          onChange={setEmployeeId}
          options={employeeOptions}
          placeholder="選擇同事"
          allowCreate={!readOnly}
          createLabel={(n) => `新增同事：${n}`}
          onCreate={quickAdd}
          searchPlaceholder="搜尋同事或輸入新名字…"
          renderOptionLeft={(opt) =>
            opt.seed !== undefined ? <Avatar name={opt.label} seed={opt.seed} size={20} /> : null
          }
          error={attempted && !hasEmployee ? '請選擇同事' : undefined}
        />

        <div className="leave-form__row">
          <DateField label="開始日" value={startDate} onChange={handleStart} min={today} required />
          <div className="leave-form__quick">
            <button type="button" className="chip chip--clickable" onClick={() => { handleStart(today); setEndDate(today); }}>
              今天
            </button>
            <button type="button" className="chip chip--clickable" onClick={() => { const t = addDays(today, 1); handleStart(t); setEndDate(t); }}>
              明天
            </button>
            <button type="button" className="chip chip--clickable" onClick={() => { const m = nextMonday(today); handleStart(m); setEndDate(m); }}>
              下週一
            </button>
          </div>
        </div>

        <DateField label="結束日" value={endDate} onChange={setEndDate} min={startDate} required />

        {single ? (
          <SegmentedControl
            ariaLabel="時段"
            value={startHalf}
            onChange={(v) => handleSingleHalf(v as HalfDay)}
            options={[
              { value: 'full', label: '整天' },
              { value: 'am', label: '上午' },
              { value: 'pm', label: '下午' },
            ]}
          />
        ) : (
          <div className="leave-form__halves">
            <div className="leave-form__half">
              <span className="leave-form__half-label">開始日時段</span>
              <SegmentedControl
                ariaLabel="開始日時段"
                size="sm"
                value={startHalf === 'am' ? 'full' : startHalf}
                onChange={(v) => setStartHalf(v as HalfDay)}
                options={[
                  { value: 'full', label: '整天' },
                  { value: 'pm', label: '下午起' },
                ]}
              />
            </div>
            <div className="leave-form__half">
              <span className="leave-form__half-label">結束日時段</span>
              <SegmentedControl
                ariaLabel="結束日時段"
                size="sm"
                value={endHalf === 'pm' ? 'full' : endHalf}
                onChange={(v) => setEndHalf(v as HalfDay)}
                options={[
                  { value: 'full', label: '整天' },
                  { value: 'am', label: '上午止' },
                ]}
              />
            </div>
          </div>
        )}

        <div className="leave-form__types">
          <span className="field__label">假別</span>
          <div className="leave-form__type-grid">
            {LEAVE_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={readOnly}
                className={cn('type-chip', type === t.id && 'type-chip--active')}
                style={{ ['--chip-color' as string]: t.hex }}
                onClick={() => setType(t.id)}
              >
                <span className="type-chip__bar" />
                <span className="type-chip__label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Textarea
          label="備註"
          value={note}
          onChange={setNote}
          maxLength={NOTE_MAX}
          rows={3}
          placeholder="交接事項等（請勿填寫身分證號、電話、薪資等敏感個資）"
          hint={`${note.length}/${NOTE_MAX}`}
        />
      </div>

      <PrecheckPanel result={precheck} settings={settings} employeeById={new Map(employees.map((e) => [e.id, e]))} holidayMap={holidayMap} />

      {readOnly ? (
        <div className="leave-form__foot">
          <Button variant="secondary" block onClick={onClose}>
            關閉
          </Button>
        </div>
      ) : (
        <div className="leave-form__foot">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" iconLeft="check" onClick={submit} disabled={attempted && !canSubmit}>
            {draft ? '儲存修改' : '登錄假單'}
          </Button>
        </div>
      )}

      {attempted && !datesValid ? (
        <p className="leave-form__date-error">請確認日期：結束日不能早於開始日</p>
      ) : null}
    </div>
  );
}
