import { useHashRoute, type RouteName } from '@/router/useHashRoute';
import { useApp } from '@/state/AppContext';
import { Icon, type IconName } from '@/components/ui';
import { ToastHost } from '@/components/ui';
import { DashboardPage } from '@/pages/DashboardPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { TimelinePage } from '@/pages/TimelinePage';
import { LeavesPage } from '@/pages/LeavesPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { SettingsPage } from '@/pages/SettingsPage';

const NAV: { route: RouteName; label: string; icon: IconName; desc: string }[] = [
  { route: 'dashboard', label: '看板', icon: 'dashboard', desc: '總覽' },
  { route: 'calendar', label: '月曆', icon: 'calendar', desc: '個人與團隊' },
  { route: 'timeline', label: '時間軸', icon: 'timeline', desc: '甘特圖' },
  { route: 'leaves', label: '假單', icon: 'leaves', desc: '列表' },
  { route: 'employees', label: '同事', icon: 'employees', desc: '名單' },
  { route: 'settings', label: '設定', icon: 'settings', desc: '規則與資料' },
];

function Page({ route }: { route: RouteName }) {
  switch (route) {
    case 'dashboard':
      return <DashboardPage />;
    case 'calendar':
      return <CalendarPage />;
    case 'timeline':
      return <TimelinePage />;
    case 'leaves':
      return <LeavesPage />;
    case 'employees':
      return <EmployeesPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
}

export function App() {
  const { route, navigate } = useHashRoute();
  const { readOnly, sync, sourceLabel, syncError } = useApp();
  const active = NAV.find((n) => n.route === route) ?? NAV[0];

  return (
    <div className="app">
      {readOnly ? (
        <div className="banner banner--info">唯讀分享模式 · 資料僅供檢視，無法新增或修改。</div>
      ) : null}
      {sync === 'offline' ? (
        <div className="banner banner--warn">
          雲端連線失敗，已自動切換到本機模式（資料仍可用）。{syncError ? <span className="banner__detail">{syncError}</span> : null}
        </div>
      ) : null}

      <div className="app__body">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo" aria-hidden>
            <Icon name="leaves" size={20} />
          </span>
          <div className="sidebar__brand-text">
            <span className="sidebar__brand-name">假期管理</span>
            <span className="sidebar__brand-sub">同事休假一覽</span>
          </div>
        </div>

        <nav className="nav" aria-label="主導覽">
          {NAV.map((n) => (
            <button
              key={n.route}
              type="button"
              className={n.route === route ? 'nav__item is-active' : 'nav__item'}
              aria-current={n.route === route ? 'page' : undefined}
              onClick={() => navigate(n.route)}
            >
              <Icon name={n.icon} size={18} className="nav__icon" />
              <span className="nav__label">{n.label}</span>
              <span className="nav__desc">{n.desc}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar__foot">
          <span className="sidebar__src">{sourceLabel}</span>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn topbar__menu"
            aria-label="選單"
            onClick={() => {
              const el = document.getElementById('tabbar');
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          >
            <Icon name="menu" size={20} />
          </button>
          <div className="topbar__title">
            <Icon name={active.icon} size={18} />
            <span>{active.label}</span>
          </div>
          <span className="topbar__src">{sourceLabel}</span>
        </header>

        <main className="content" id="main">
          <Page route={route} />
        </main>

        <nav className="tabbar" id="tabbar" aria-label="主導覽（底部）">
          {NAV.map((n) => (
            <button
              key={n.route}
              type="button"
              className={n.route === route ? 'tabbar__item is-active' : 'tabbar__item'}
              aria-current={n.route === route ? 'page' : undefined}
              onClick={() => navigate(n.route)}
            >
              <Icon name={n.icon} size={20} />
              <span className="tabbar__label">{n.label}</span>
            </button>
          ))}
        </nav>
      </div>
      </div>

      <ToastHost />
    </div>
  );
}
