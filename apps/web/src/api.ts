export class ApiError extends Error {
  status: number;
  constructor(status: number, statusText: string) {
    super(`API error: ${status} ${statusText}`);
    this.status = status;
  }
}

// Capture the access token from the URL fragment (LAN mode) and persist it to
// sessionStorage so it survives refreshes and client-side navigation. A fragment
// is never sent to the server, so unlike a query string the token stays out of
// access logs and Referer headers. We also strip it from the visible URL and
// history entry immediately after reading it.
const TOKEN_KEY = 'vibeview_token';

function captureToken(): string | null {
  const match = /(?:^#|[#&])token=([^&]+)/.exec(window.location.hash);
  if (!match) return sessionStorage.getItem(TOKEN_KEY);
  const token = decodeURIComponent(match[1]);
  sessionStorage.setItem(TOKEN_KEY, token);
  history.replaceState(null, '', window.location.pathname + window.location.search);
  return token;
}

const accessToken: string | null = captureToken();

// Build request headers carrying the access token via Authorization: Bearer.
// Preferred over any token-in-URL scheme so the secret never lands in logs or
// the Referer header. Pass `extra` to merge in headers like Content-Type.
export function authHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  return headers;
}

// Establish the SSE auth cookie via a header-authenticated handshake. EventSource
// cannot send the Authorization header, so the server sets an HttpOnly cookie
// that the stream request carries automatically. Cached so we handshake once.
let streamAuth: Promise<void> | null = null;
export function ensureStreamAuth(): Promise<void> {
  if (!accessToken) return Promise.resolve();
  if (!streamAuth) {
    streamAuth = fetch('/api/auth/stream', {
      method: 'POST',
      headers: authHeaders(),
    }).then(() => undefined);
  }
  return streamAuth;
}

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new ApiError(res.status, res.statusText);
  }
  return res.json();
}

export function validatedFetcher<T>(guard: (v: unknown) => v is T) {
  return async (url: string): Promise<T> => {
    const data: unknown = await fetcher(url);
    if (!guard(data)) {
      console.warn('API response failed validation for', url, data);
      throw new Error(`Invalid API response from ${url}`);
    }
    return data;
  };
}
