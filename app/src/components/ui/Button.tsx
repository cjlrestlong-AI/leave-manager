import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: IconName;
  iconRight?: IconName;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', iconLeft, iconRight, block, className, children, type = 'button', disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn('btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', disabled && 'btn--disabled', className)}
      {...rest}
    >
      {iconLeft ? <Icon name={iconLeft} size={size === 'sm' ? 16 : 18} className="btn__icon" /> : null}
      {children ? <span className="btn__label">{children}</span> : null}
      {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 16 : 18} className="btn__icon" /> : null}
    </button>
  );
});
