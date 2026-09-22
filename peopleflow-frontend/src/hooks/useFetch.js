import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../api/client';

/**
 * Runs `request(config)` whenever `deps` change and exposes the API envelope.
 * In-flight requests are aborted when deps change or the component unmounts,
 * so stale responses can never overwrite newer ones.
 *
 *   const { data, meta, loading, error, reload } = useFetch(
 *     (config) => employeesApi.list(params, config), [params.page]
 *   );
 */
export function useFetch(request, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, meta: null, loading: enabled, error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const requestRef = useRef(request);
  requestRef.current = request;

  useEffect(() => {
    if (!enabled) {
      setState((prev) => ({ ...prev, loading: false }));
      return undefined;
    }

    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));

    requestRef.current({ signal: controller.signal })
      .then((res) => {
        setState({ data: res.data.data, meta: res.data.meta || null, loading: false, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState((prev) => ({ ...prev, loading: false, error: getErrorMessage(error) }));
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey, enabled]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const setData = useCallback((updater) => {
    setState((prev) => ({ ...prev, data: typeof updater === 'function' ? updater(prev.data) : updater }));
  }, []);

  return { ...state, reload, setData };
}
