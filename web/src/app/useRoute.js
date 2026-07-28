import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_PATH, SCREENS, findScreenByPath } from './screens.js';

/**
 * Fourteen static paths, no nested routes, no data loaders — a router library
 * would be a dependency plan.md does not list, for a problem this size.
 * History API plus a popstate listener is the whole requirement.
 */
export function useRoute() {
  const [path, setPath] = useState(() => currentPath());

  useEffect(() => {
    const onPopState = () => setPath(currentPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextPath) => {
    if (nextPath === currentPath()) return;
    window.history.pushState({}, '', nextPath);
    setPath(nextPath);
  }, []);

  // An unknown path falls back to the first screen rather than rendering blank.
  const screen = findScreenByPath(path) ?? SCREENS[0];

  return { screen, path, navigate };
}

function currentPath() {
  const { pathname } = window.location;
  return findScreenByPath(pathname) ? pathname : DEFAULT_PATH;
}
