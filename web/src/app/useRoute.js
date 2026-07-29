import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_PATH, SCREENS, findScreenByPath } from './screens.js';

/**
 * Fourteen static paths, no nested routes, no data loaders — a router library
 * would be a dependency plan.md does not list, for a problem this size.
 * History API plus a popstate listener is the whole requirement.
 */
export function useRoute() {
  const [location, setLocation] = useState(() => ({
    path: currentPath(),
    search: window.location.search,
  }));

  useEffect(() => {
    const onPopState = () =>
      setLocation({ path: currentPath(), search: window.location.search });
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  /**
   * Accepts a plain path or one with a query string ("/draft?review=rev-1").
   * The screen is chosen by pathname; the query is state the screen reads, and
   * lives in the URL so a deep link to one review is shareable.
   */
  const navigate = useCallback((target) => {
    const [nextPath, query = ''] = String(target).split('?');
    const search = query ? `?${query}` : '';

    if (nextPath === window.location.pathname && search === window.location.search) return;

    window.history.pushState({}, '', `${nextPath}${search}`);
    setLocation({ path: findScreenByPath(nextPath) ? nextPath : DEFAULT_PATH, search });
  }, []);

  const { path, search } = location;

  // An unknown path falls back to the first screen rather than rendering blank.
  const screen = findScreenByPath(path) ?? SCREENS[0];
  const query = new URLSearchParams(search);

  return { screen, path, query, navigate };
}

function currentPath() {
  const { pathname } = window.location;
  return findScreenByPath(pathname) ? pathname : DEFAULT_PATH;
}
