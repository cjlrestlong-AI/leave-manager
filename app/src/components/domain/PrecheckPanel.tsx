import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { formatRange, formatDisplay } from '@/lib/date';
import { summarizeBreakdown } from '@/domain/duration';
import { precheckLevel, precheckMessage, type PrecheckResult } from '@/domain/precheck';
import type { HolidayMap } from '@/domain/holidays';
import type { AppSettings, Employee } from '@/domain/types';

interface PrecheckPanelProps {
  result: PrecheckResult;
  settings: AppSettings;
  employeeById: Map<string, Employee>;
  holidayMap: HolidayMap;
}

export function PrecheckPanel({ result, settings, employeeById, holidayMap }: PrecheckPanelProps) {
  const level = precheckLevel(result, settings.overlapThreshold);
  const summary = summarizeBreakdown(result.breakdown, holidayMap, settings);

  const nameOf = (id: string) => employeeById.get(id)?.name ?? '（已移除同事）';

  return (
    <div className={cn('precheck', `precheck--${level}`)}>
      <div className="precheck__head">
        <Icon name={level === 'ok' ? 'check' : level === 'near' ? 'warning' : 'warning'} size={16} />
        <span className="precheck__msg">{precheckMessage(result, settings)}</span>
      </div>

      <div className="precheck__days">
        <span className="precheck__days-num tnum">{result.breakdown.total}</span>
        <span className="precheck__days-unit">天</span>
        {summary.excludedText ? <span className="precheck__excluded">{summary.excludedText}</span> : null}
      </div>

      {result.overlaps.length > 0 ? (
        <div className="precheck__section">
          <div className="precheck__section-title">與現有假單重疊</div>
          <ul className="precheck__list">
            {result.overlaps.map((o) => (
              <li key={o.date} className={cn('precheck__row', o.wouldExceed && 'precheck__row--over')}>
                <span className="precheck__date tnum">{formatDisplay(o.date, 'short')}</span>
                <span className="precheck__row-detail">
                  已有 {o.countBefore} 人：{o.others.map((p) => p.name).join('、')}
                </span>
                {o.wouldExceed ? <span className="precheck__tag">超標</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.newConflicts.length > 0 ? (
        <div className="precheck__section">
          <div className="precheck__section-title">送出後將產生衝突</div>
          <ul className="precheck__list">
            {result.newConflicts.map((s) => (
              <li key={`${s.startDate}_${s.endDate}`} className="precheck__row precheck__row--over">
                <span className="precheck__date tnum">{formatRange(s.startDate, s.endDate, 'short')}</span>
                <span className="precheck__row-detail">
                  {s.peak} 人同時放假 · {s.employeeIds.map(nameOf).join('、')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!result.ok && result.hardErrors.length > 0 ? (
        <div className="precheck__errors">
          {result.hardErrors.map((e, i) => (
            <div key={i} className="precheck__error">
              <Icon name="warning" size={14} />
              <span>{e.message}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
