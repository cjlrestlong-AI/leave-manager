import { memo, type ReactNode, type CSSProperties } from 'react';

/**
 * 全部自製 inline SVG 圖示（20×20、stroke 1.5、currentColor）。
 * 絕對不用 emoji —— 這是避免「AI 模板感」的硬規則之一。
 */
const paths: Record<string, ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </>
  ),
  timeline: <path d="M4 20V10M10 20V4M16 20V13M20 20V7" />,
  leaves: (
    <>
      <path d="M8.5 7h12M8.5 12h12M8.5 17h12" />
      <path d="M3.5 7h.01M3.5 12h.01M3.5 17h.01" />
    </>
  ),
  employees: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
      <path d="M16 5.6a3 3 0 0 1 0 5.2M20.5 20c0-2.4-1.6-4.4-4-5.2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M4.4 4.4l2 2M17.6 17.6l2 2M2.5 12h3M18.5 12h3M4.4 19.6l2-2M17.6 6.4l2-2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  edit: (
    <>
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
      <path d="M13.5 6.5l3 3" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  restore: (
    <>
      <path d="M9.5 14L4 9l5.5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  warning: (
    <>
      <path d="M12 3.5l9 16H3z" />
      <path d="M12 9.5v4.5M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5h.01" />
    </>
  ),
  chevronLeft: <path d="M14.5 6l-6 6 6 6" />,
  chevronRight: <path d="M9.5 6l6 6-6 6" />,
  chevronDown: <path d="M6 9.5l6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  download: (
    <>
      <path d="M12 3.5v12M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4 20.5h16" />
    </>
  ),
  upload: (
    <>
      <path d="M12 20.5V8.5M7.5 13.5L12 9l4.5 4.5" />
      <path d="M4 3.5h16" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15" />
    </>
  ),
  link: (
    <>
      <path d="M10 14.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L12 7.3" />
      <path d="M14 9.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7L12 16.7" />
    </>
  ),
  filter: <path d="M3.5 5h17l-6.5 7.5v5l-4 2v-7z" />,
  sort: <path d="M7.5 4v16M7.5 4L4 7.5M7.5 4l3.5 3.5M16.5 20V4M16.5 20l-3.5-3.5M16.5 20l3.5-3.5" />,
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  more: (
    <>
      <circle cx="12" cy="5" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="12" cy="19" r="1.4" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.3-4.5L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.3 4.5L20 16" />
      <path d="M20 20v-4h-4" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </>
  ),
  flag: <path d="M5 21V4M5 4h13l-2 4 2 4H5" />,
  bell: (
    <>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 5 1.5 6 1.5 6h-15S6 14.5 6 9.5z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  note: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M14 3v5h5M9 13h7M9 17h5" />
    </>
  ),
  home: (
    <>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v10h12V10" />
    </>
  ),
  alert: (
    <>
      <circle cx="9" cy="12" r="6" />
      <circle cx="15" cy="12" r="6" />
    </>
  ),
};

export type IconName = keyof typeof paths;

export const ICON_NAMES = Object.keys(paths) as IconName[];

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export const Icon = memo(function Icon({ name, size = 20, className, style, title }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {paths[name]}
      {title ? <title>{title}</title> : null}
    </svg>
  );
});
