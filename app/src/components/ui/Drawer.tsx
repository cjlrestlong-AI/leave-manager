import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  label?: string;
  className?: string;
}

export function Drawer({ open, onClose, title, children, footer, width = 460, label = '抽屜', className }: DrawerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      ref.current?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea, button')?.focus();
    }, 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div
        className={cn('drawer', className)}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-label={typeof label === 'string' ? label : undefined}
        ref={ref}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="drawer__head">
          <div className="drawer__title">{title}</div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="關閉">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="drawer__body">{children}</div>
        {footer ? <footer className="drawer__foot">{footer}</footer> : null}
      </div>
    </div>
  );
}
