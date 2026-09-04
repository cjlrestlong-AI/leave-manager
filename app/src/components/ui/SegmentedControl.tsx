import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

interface SegOption {
  value: string;
  label: string;
  icon?: IconName;
}

interface SegmentedControlProps {
  value: string;
  onChange: (v: string) => void;
  options: SegOption[];
  size?: 'sm' | 'md';
  ariaLabel?: string;
}

export function SegmentedControl({ value, onChange, options, size = 'md', ariaLabel }: SegmentedControlProps) {
  return (
    <div className={cn('segmented', size === 'sm' && 'segmented--sm')} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={cn('segmented__item', o.value === value && 'segmented__item--active')}
          onClick={() => onChange(o.value)}
        >
          {o.icon ? <Icon name={o.icon} size={16} /> : null}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}
