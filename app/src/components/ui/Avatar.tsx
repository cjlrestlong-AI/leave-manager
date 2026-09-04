import { cn } from '@/lib/cn';
import { avatarColor, initialsOf } from '@/domain/constants';

interface AvatarProps {
  name: string;
  seed: number;
  size?: number;
  className?: string;
  title?: string;
}

export function Avatar({ name, seed, size = 32, className, title }: AvatarProps) {
  const color = avatarColor(seed);
  return (
    <span
      className={cn('avatar', className)}
      style={{ width: size, height: size, background: color, fontSize: Math.max(11, Math.round(size * 0.4)) }}
      title={title ?? name}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  );
}
