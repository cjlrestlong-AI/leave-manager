import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  label?: string;
}

export function Modal({ open, onClose, title, children, footer, width = 520, label = '對話框' }: ModalProps) {
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
      ref.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    }, 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay overlay--center" onMouseDown={onClose}>
      <div
        className={cn('modal')}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-label={typeof label === 'string' ? label : undefined}
        ref={ref}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title ? (
          <header className="modal__head">
            <div className="modal__title">{title}</div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="關閉">
              <Icon name="close" size={18} />
            </button>
          </header>
        ) : null}
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__foot">{footer}</footer> : null}
      </div>
    </div>
  );
}
