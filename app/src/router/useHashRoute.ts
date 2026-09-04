import { useEffect, useState, useCallback } from 'react';

export type RouteName =
  | 'dashboard'
  | 'calendar'
  | 'timeline'
  | 'leaves'
  | 'employees'
  | 'settings';

const VALID: RouteName[] = ['dashboard', 'calendar', 'timeline', 'leaves', 'employees', 'settings'];

function parseHash(): { route: RouteName; query: URLSearchParams } {
  const raw = typeof window !== 'undefined' ? window.location.hash.replace(/^#\/?/, '') : '';
  const [pathPart, queryPart] = raw.split('?');
  const route = (VALID.includes(pathPart as RouteName) ? pathPart : 'dashboard') as RouteName;
  const query = new URLSearchParams(queryPart ?? '');
  return { route, query };
}

export interface RouteState {
  route: RouteName;
  query: URLSearchParams;
  /** 重導向（例如唯讀連結） */
  navigate: (route: RouteName, query?: Record<string, string>) => void;
}

export function useHashRoute(): RouteState {
  const [state, setState] = useState(parseHash());

  useEffect(() => {
    const onHash = () => setState(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((route: RouteName, query?: Record<string, string>) => {
    const base = `#/${route}`;
    if (query) {
      const q = new URLSearchParams(query);
      window.location.hash = `${base}?${q.toString()}`;
    } else {
      window.location.hash = base;
    }
  }, []);

  return { ...state, navigate };
}
