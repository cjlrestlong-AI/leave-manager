import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Drawer } from '@/components/ui';
import { LeaveForm } from '@/components/domain/LeaveForm';
import { useApp } from './AppContext';
import { useDerived } from '@/domain/selectors';
import type { ISODate, LeaveRecord } from '@/domain/types';

interface EditorOpts {
  draft?: LeaveRecord | null;
  defaultStart?: ISODate;
  defaultEmployeeId?: string;
}

interface LeaveEditorCtx {
  open: (o?: EditorOpts) => void;
  close: () => void;
}

const Ctx = createContext<LeaveEditorCtx | null>(null);

export function LeaveEditorProvider({ children }: { children: ReactNode }) {
  const { data, today } = useApp();
  const derived = useDerived(data, today);
  const [opts, setOpts] = useState<EditorOpts | null>(null);

  const open = useCallback((o?: EditorOpts) => setOpts(o ?? {}), []);
  const close = useCallback(() => setOpts(null), []);

  return (
    <Ctx.Provider value={{ open, close }}>
      {children}
      <Drawer
        open={opts !== null}
        onClose={close}
        title={opts?.draft ? '編輯假單' : '登錄假單'}
        width={480}
        label="假單編輯"
      >
        {opts ? (
          <LeaveForm
            employees={derived.employees}
            existingLeaves={derived.leaves}
            holidayMap={derived.holidayMap}
            settings={data.settings}
            today={today}
            draft={opts.draft ?? null}
            defaultStart={opts.defaultStart}
            defaultEmployeeId={opts.defaultEmployeeId}
            onClose={close}
            onSaved={close}
          />
        ) : null}
      </Drawer>
    </Ctx.Provider>
  );
}

export function useLeaveEditor() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLeaveEditor 必須在 LeaveEditorProvider 內使用');
  return c;
}
