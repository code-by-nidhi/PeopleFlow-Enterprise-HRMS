import { useCallback, useState } from 'react';
import { getErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';

/**
 * Wraps a mutation with pending state and toast feedback.
 *
 *   const [approve, approving] = useAction((id) => leavesApi.approve(id), {
 *     success: 'Leave approved', onSuccess: reload,
 *   });
 */
export function useAction(action, { success, error: errorTitle = 'Action failed', onSuccess } = {}) {
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const run = useCallback(async (...args) => {
    setPending(true);
    try {
      const res = await action(...args);
      const message = typeof success === 'function' ? success(res) : success;
      if (message) toast.success(message);
      if (onSuccess) await onSuccess(res, ...args);
      return res;
    } catch (err) {
      toast.error(errorTitle, getErrorMessage(err));
      return null;
    } finally {
      setPending(false);
    }
  }, [action, success, errorTitle, onSuccess, toast]);

  return [run, pending];
}
