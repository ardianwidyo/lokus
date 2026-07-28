import { useCallback, useEffect, useState } from 'react';

import { PANEL_STATUS } from '../components/states/index.js';

/**
 * Drives a data panel through the four required states. A panel built on this
 * hook cannot forget one of them: the hook only ever reports loading, error,
 * needs-permission, or ready, and the caller turns a ready-but-empty result
 * into `empty`.
 */

/** Failures that mean "not granted yet", not "broken". */
const PERMISSION_CODES = new Set([
  'AUTH_TENANT_CLAIM_MISSING',
  'TENANT_FORBIDDEN',
  'ROLE_FORBIDDEN',
  'PERMISSION_REQUIRED',
]);

export function useAsyncData(loader) {
  const [state, setState] = useState({
    status: PANEL_STATUS.LOADING,
    data: null,
    error: null,
  });

  const load = useCallback(async () => {
    setState((previous) => ({ ...previous, status: PANEL_STATUS.LOADING }));
    try {
      const data = await loader();
      setState({ status: PANEL_STATUS.READY, data, error: null });
    } catch (error) {
      setState({
        status: PERMISSION_CODES.has(error?.code)
          ? PANEL_STATUS.NEEDS_PERMISSION
          : PANEL_STATUS.ERROR,
        data: null,
        error,
      });
    }
  }, [loader]);

  useEffect(() => {
    let cancelled = false;
    // Guard against a resolved request landing after the panel unmounted.
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { ...state, reload: load };
}

export { PERMISSION_CODES };
