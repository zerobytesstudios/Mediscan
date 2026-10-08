import { useCallback, useState } from 'react';
import { errorMessage } from '../services/api';

/** Wraps a one-shot action (submit, delete, analyse) with loading + error state. */
export default function useAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async (action) => {
    setLoading(true);
    setError('');
    try {
      return await action();
    } catch (err) {
      setError(errorMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, run, setError };
}
