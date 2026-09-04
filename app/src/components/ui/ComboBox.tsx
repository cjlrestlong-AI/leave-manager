import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

export interface ComboOption {
  value: string;
  label: string;
  sublabel?: string;
  seed?: number;
}

interface ComboBoxProps {
  label?: string;
  value: string | null;
  onChange: (value: string) => void;
  options: ComboOption[];
  placeholder?: string;
  error?: string;
  hint?: string;
  allowCreate?: boolean;
  createLabel?: (text: string) => string;
  onCreate?: (text: string) => void;
  searchPlaceholder?: string;
  renderOptionLeft?: (opt: ComboOption) => ReactNode;
}

type Row = { kind: 'option'; opt: ComboOption } | { kind: 'create' };

export function ComboBox(props: ComboBoxProps) {
  const {
    label,
    value,
    onChange,
    options,
    placeholder = '請選擇',
    error,
    hint,
    allowCreate,
    createLabel,
    onCreate,
    searchPlaceholder = '搜尋…',
    renderOptionLeft,
  } = props;
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q) || (o.sublabel ?? '').toLowerCase().includes(q))
    : options;
  const canCreate = Boolean(allowCreate && onCreate && q.length > 0 && !options.some((o) => o.label.toLowerCase() === q));

  const rows: Row[] = [
    ...filtered.map((opt) => ({ kind: 'option' as const, opt })),
    ...(canCreate ? [{ kind: 'create' as const }] : []),
  ];

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      setActive(0);
      const t = setTimeout(() => searchRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
    setQuery('');
    return undefined;
  }, [open]);

  function select(v: string) {
    onChange(v);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, rows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const it = rows[active];
      if (it?.kind === 'option') select(it.opt.value);
      else if (it?.kind === 'create') {
        onCreate?.(query.trim());
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className={cn('field', error && 'field--error')}>
      {label ? <label className="field__label" htmlFor={id}>{label}</label> : null}
      <div className="combobox" ref={rootRef}>
        <button
          type="button"
          id={id}
          className="combobox__trigger field__control"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {selected ? (
            <span className="combobox__value">
              {renderOptionLeft ? renderOptionLeft(selected) : null}
              <span className="combobox__text">{selected.label}</span>
            </span>
          ) : (
            <span className="combobox__placeholder">{placeholder}</span>
          )}
          <Icon name="chevronDown" size={16} className="combobox__caret" />
        </button>
        {open ? (
          <div className="combobox__panel" role="listbox">
            <div className="combobox__search">
              <Icon name="search" size={15} />
              <input
                ref={searchRef}
                className="combobox__search-input"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
              />
            </div>
            <ul className="combobox__list">
              {rows.length === 0 ? (
                <li className="combobox__empty">沒有符合的選項</li>
              ) : (
                rows.map((it, i) => (
                  <li
                    key={it.kind === 'option' ? it.opt.value : '__create'}
                    role="option"
                    aria-selected={it.kind === 'option' && it.opt.value === value}
                    className={cn('combobox__item', i === active && 'combobox__item--active')}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => {
                      if (it.kind === 'option') select(it.opt.value);
                      else {
                        onCreate?.(query.trim());
                        setOpen(false);
                      }
                    }}
                  >
                    {it.kind === 'option' ? (
                      <>
                        {renderOptionLeft ? renderOptionLeft(it.opt) : null}
                        <span className="combobox__item-label">{it.opt.label}</span>
                        {it.opt.sublabel ? <span className="combobox__item-sub">{it.opt.sublabel}</span> : null}
                      </>
                    ) : (
                      <span className="combobox__item-label combobox__item-create">
                        <Icon name="plus" size={15} />
                        {createLabel ? createLabel(query.trim()) : `新增「${query.trim()}」`}
                      </span>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="field__msg field__msg--error">{error}</p>
      ) : hint ? (
        <p className="field__msg">{hint}</p>
      ) : null}
    </div>
  );
}
