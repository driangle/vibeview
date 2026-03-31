import useSWR from 'swr';
import { withToken } from '../api';

export type BackendStatus = 'connected' | 'disconnected';

export function useBackendStatus(): BackendStatus {
  const { error } = useSWR('/api/config', simpleFetch, {
    refreshInterval: 10_000,
    errorRetryCount: 1,
    errorRetryInterval: 3_000,
    dedupingInterval: 5_000,
  });

  return error ? 'disconnected' : 'connected';
}

async function simpleFetch(url: string) {
  const res = await fetch(withToken(url));
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
