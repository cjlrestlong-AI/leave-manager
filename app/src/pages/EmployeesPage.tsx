import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button, Icon, Drawer, Input, Switch, Textarea, Avatar, Badge, Popover, EmptyState } from '@/components/ui';
import { useApp } from '@/state/AppContext';
import { useDerived, employeeDaysInMonth } from '@/domain/selectors';
import { useLeaveEditor } from '@/state/LeaveEditor';
import { NAME_MAX, NOTE_MAX, AVATAR_COLOR_COUNT } from '@/domain/constants';
import type { Employee } from '@/domain/types';

type EditorState = { mode: 'new' } | { mode: 'edit'; employee: Employee } | null;

export function EmployeesPage() {
  const { data, readOnly, addEmployee, updateEmployee, purgeEmployee, today } = useApp();
  const derived = useDerived(data, today);
  const editor = useLeaveEditor();
  const [state, setState] = useState<EditorState>(null);
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [active, setActive] = useState(true);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  const ym = today.slice(0, 7);

  const employeesWithDays = useMemo(
    () =>
      derived.employees.map((e) => ({
        employee: e,
        days: employeeDaysInMonth(derived.leaves, e.id, ym, data.settings, derived.holidayMap),
        hasLeaves: derived.leaves.some((r) => r.employeeId === e.id),
      })),
    [derived.employees, derived.leaves, ym, data.settings, derived.holidayMap],
  );

  function openNew() {
    setState({ mode: 'new' });
    setName('');
    setTeam('');
    setActive(true);
    setNote('');
    setError(undefined);
  }
  function openEdit(e: Employee) {
    setState({ mode: 'edit', employee: e });
    setName(e.name);
    setTeam(e.team ?? '');
    setActive(e.active);
    setNote(e.note ?? '');
    setError(undefined);
  }

  async function save() {
    if (!name.trim()) {
      setError('請填寫姓名');
      return;
    }
    const base = {
      name: name.trim().slice(0, NAME_MAX),
      team: team.trim() || null,
      active,
      note: note.trim() || null,
    };
    if (state?.mode === 'new') {
      await addEmployee({ ...base, colorSeed: derived.employees.length % AVATAR_COLOR_COUNT, sortOrder: derived.employees.length });
    } else if (state?.mode === 'edit' && state.employee) {
      await updateEmployee({ ...state.employee, ...base });
    }
    setState(null);
  }

  async function toggleActive(e: Employee) {
    await updateEmployee({ ...e, active: !e.active });
  }

  return (
    <div className="page">
      <PageHeader
        title="同事"
        description={`共 ${derived.employees.length} 位`}
        actions={
          !readOnly ? (
            <Button variant="primary" iconLeft="plus" onClick={openNew}>
              新增同事
            </Button>
          ) : null
        }
      />

      {employeesWithDays.length === 0 ? (
        <EmptyState
          icon="employees"
          title="尚未建立同事名單"
          description="先建立名單，登假時就能直接從下拉選人。"
          actions={
            !readOnly ? (
              <Button variant="primary" iconLeft="plus" onClick={openNew}>
                建立同事名單
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="emp-grid">
          {employeesWithDays.map(({ employee, days, hasLeaves }) => (
            <div key={employee.id} className="emp-card">
              <div className="emp-card__top">
                <Avatar name={employee.name} seed={employee.colorSeed} size={40} />
                <div className="emp-card__id">
                  <div className="emp-card__name truncate">{employee.name}</div>
                  <div className="emp-card__team truncate">{employee.team ?? '未分組'}</div>
                </div>
                {!employee.active ? <Badge tone="warn">已離職</Badge> : null}
              </div>
              <div className="emp-card__stat">
                <span className="emp-card__stat-num tnum">{days}</span>
                <span className="emp-card__stat-unit">本月休假天數</span>
              </div>
              <div className="emp-card__actions">
                {!readOnly ? (
                  <>
                    <Button size="sm" variant="secondary" iconLeft="plus" onClick={() => editor.open({ defaultEmployeeId: employee.id })}>
                      登假
                    </Button>
                    <Button size="sm" variant="ghost" iconLeft="edit" onClick={() => openEdit(employee)}>
                      編輯
                    </Button>
                    <Popover
                      align="right"
                      trigger={({ toggle }) => (
                        <button type="button" className="icon-btn" aria-label="更多" onClick={toggle}>
                          <Icon name="more" size={18} />
                        </button>
                      )}
                    >
                      {(close) => (
                        <div className="menu">
                          <button
                            type="button"
                            className="menu__item"
                            onClick={() => {
                              toggleActive(employee);
                              close();
                            }}
                          >
                            <Icon name={employee.active ? 'user' : 'check'} size={16} />
                            {employee.active ? '標記離職' : '復職'}
                          </button>
                          {!hasLeaves ? (
                            <button
                              type="button"
                              className="menu__item menu__item--danger"
                              onClick={() => {
                                purgeEmployee(employee.id);
                                close();
                              }}
                            >
                              <Icon name="trash" size={16} />
                              永久刪除
                            </button>
                          ) : (
                            <div className="menu__hint">有休假紀錄，僅可標記離職</div>
                          )}
                        </div>
                      )}
                    </Popover>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer open={state !== null} onClose={() => setState(null)} title={state?.mode === 'edit' ? '編輯同事' : '新增同事'} width={420} label="同事編輯">
        <div className="emp-form">
          <Input label="姓名" value={name} onChange={setName} required maxLength={NAME_MAX} error={error} />
          <Input label="部門 / 組別" value={team} onChange={setTeam} maxLength={40} placeholder="選填" />
          <Switch label="在職中" description="離職同事的紀錄會保留，但不再計入統計" checked={active} onChange={setActive} />
          <Textarea label="備註" value={note} onChange={setNote} maxLength={NOTE_MAX} rows={3} placeholder="選填" hint={`${note.length}/${NOTE_MAX}`} />
          <div className="emp-form__foot">
            <Button variant="ghost" onClick={() => setState(null)}>
              取消
            </Button>
            <Button variant="primary" iconLeft="check" onClick={save}>
              儲存
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
