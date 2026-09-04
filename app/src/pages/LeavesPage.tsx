import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button, Icon, Input, Badge, Avatar, Chip, EmptyState } from '@/components/ui';
import { useApp } from '@/state/AppContext';
import { useDerived } from '@/domain/selectors';
import { useLeaveEditor } from '@/state/LeaveEditor';
import { LEAVE_TYPES, leaveTypeMeta } from '@/domain/constants';
import { calculateDuration } from '@/domain/duration';
import { halfLabel, isSingleDay } from '@/domain/leave';
import { formatRange, compareISO } from '@/lib/date';
import type { HalfDay, LeaveRecord, LeaveTypeId } from '@/domain/types';

type SortKey = 'start' | 'days' | 'name';
type StatusFilter = 'active' | 'deleted' | 'all';

function HalfIcons({ rec }: { rec: LeaveRecord }) {
  const single = isSingleDay(rec.startDate, rec.endDate);
  const icons: HalfDay[] = [];
  if (single) {
    if (rec.startHalf !== 'full') icons.push(rec.startHalf);
  } else {
    if (rec.startHalf === 'pm') icons.push('pm');
    if (rec.endHalf === 'am') icons.push('am');
  }
  if (icons.length === 0) return null;
  return (
    <span className="half-icons">
      {icons.map((h, i) => (
        <Icon key={i} name={h === 'am' ? 'sun' : 'moon'} size={12} title={halfLabel(h)} />
      ))}
    </span>
  );
}

export function LeavesPage() {
  const { data, readOnly, today, deleteLeave, restoreLeave } = useApp();
  const derived = useDerived(data, today);
  const editor = useLeaveEditor();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<LeaveTypeId | 'all'>('all');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [sortKey, setSortKey] = useState<SortKey>('start');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const rows = useMemo(() => {
    const all = data.leaves;
    const q = query.trim().toLowerCase();
    let list = all.filter((r) => {
      if (status === 'active' && r.deletedAt) return false;
      if (status === 'deleted' && !r.deletedAt) return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (q) {
        const name = derived.employeeById.get(r.employeeId)?.name.toLowerCase() ?? '';
        const note = (r.note ?? '').toLowerCase();
        if (!name.includes(q) && !note.includes(q)) return false;
      }
      return true;
    });
    list = list.slice().sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'start') cmp = compareISO(a.startDate, b.startDate) || compareISO(a.endDate, b.endDate);
      else if (sortKey === 'days') {
        const da = calculateDuration(a, data.settings, derived.holidayMap);
        const db = calculateDuration(b, data.settings, derived.holidayMap);
        cmp = da - db;
      } else cmp = (derived.employeeById.get(a.employeeId)?.name ?? '').localeCompare(derived.employeeById.get(b.employeeId)?.name ?? '', 'zh-Hant-HK');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [data.leaves, data.settings, derived.employeeById, derived.holidayMap, query, typeFilter, status, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  }

  const sortIndicator = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

  return (
    <div className="page">
      <PageHeader
        title="假單"
        description={`共 ${rows.length} 筆`}
        actions={
          !readOnly && status === 'active' ? (
            <Button variant="primary" iconLeft="plus" onClick={() => editor.open()}>
              登錄假單
            </Button>
          ) : null
        }
      />

      <div className="leaves-toolbar">
        <Input value={query} onChange={setQuery} placeholder="搜尋同事或備註…" prefix={<Icon name="search" size={15} />} />
        <SegmentedStatus value={status} onChange={setStatus} />
      </div>

      <div className="type-filter">
        <Chip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>
          全部
        </Chip>
        {LEAVE_TYPES.map((t) => (
          <Chip key={t.id} color={t.hex} active={typeFilter === t.id} onClick={() => setTypeFilter(t.id)}>
            {t.label}
          </Chip>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="leaves"
          title={status === 'deleted' ? '回收桶是空的' : '尚無假單'}
          description={status === 'deleted' ? '刪除的假單會暫存在這裡，可隨時還原。' : '點右上角「登錄假單」開始記錄。'}
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort('name')}>
                  同事{sortIndicator('name')}
                </th>
                <th>假別</th>
                <th className="sortable" onClick={() => toggleSort('start')}>
                  日期區間{sortIndicator('start')}
                </th>
                <th className="sortable th--num" onClick={() => toggleSort('days')}>
                  天數{sortIndicator('days')}
                </th>
                <th>狀態</th>
                <th>備註</th>
                <th className="th--actions">動作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const meta = leaveTypeMeta(r.type);
                const emp = derived.employeeById.get(r.employeeId);
                const days = calculateDuration(r, data.settings, derived.holidayMap);
                const deleted = Boolean(r.deletedAt);
                return (
                  <tr key={r.id} className={deleted ? 'data-table__row--deleted' : undefined}>
                    <td>
                      <span className="row-gap-2">
                        <Avatar name={emp?.name ?? ''} seed={emp?.colorSeed ?? 0} size={24} />
                        <span className="truncate">{emp?.name ?? '（已移除同事）'}</span>
                      </span>
                    </td>
                    <td>
                      <span className="type-tag" style={{ ['--chip-color' as string]: meta.hex }}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="tnum">
                      <span className="row-gap-2">
                        {formatRange(r.startDate, r.endDate, 'short')}
                        <HalfIcons rec={r} />
                      </span>
                    </td>
                    <td className="th--num tnum">{days}</td>
                    <td>
                      {deleted ? <Badge tone="warn">已刪除</Badge> : <Badge tone="neutral">生效中</Badge>}
                    </td>
                    <td className="col-note truncate" title={r.note ?? ''}>
                      {r.note ?? '—'}
                    </td>
                    <td className="th--actions">
                      {deleted ? (
                        <button type="button" className="icon-btn" title="還原" onClick={() => restoreLeave(r.id)} disabled={readOnly}>
                          <Icon name="restore" size={17} />
                        </button>
                      ) : (
                        <>
                          <button type="button" className="icon-btn" title="編輯" onClick={() => editor.open({ draft: r })} disabled={readOnly}>
                            <Icon name="edit" size={17} />
                          </button>
                          <button type="button" className="icon-btn icon-btn--danger" title="刪除" onClick={() => deleteLeave(r.id)} disabled={readOnly}>
                            <Icon name="trash" size={17} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SegmentedStatus({ value, onChange }: { value: StatusFilter; onChange: (v: StatusFilter) => void }) {
  return (
    <div className="seg-status">
      {(
        [
          { v: 'active', l: '生效中' },
          { v: 'deleted', l: '回收桶' },
          { v: 'all', l: '全部' },
        ] as const
      ).map((o) => (
        <button key={o.v} type="button" className={value === o.v ? 'is-active' : ''} onClick={() => onChange(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  );
}
