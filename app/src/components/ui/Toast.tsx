import { useApp } from '@/state/AppContext';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import type { ToastTone } from '@/state/AppContext';

const toneIcon: Record<ToastTone, IconName> = {
  ok: 'check',
  warn: 'warning',
  danger: 'warning',
  info: 'info',
};

export function ToastHost() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cn('toast', `toast--${t.tone}`)}>
          <Icon name={toneIcon[t.tone]} size={18} className="toast__icon" />
          <span className="toast__msg">{t.message}</span>
          {t.action ? (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                t.action?.onClick();
                dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          ) : null}
          <button type="button" className="toast__close icon-btn" onClick={() => dismissToast(t.id)} aria-label="關閉">
            <Icon name="close" size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
