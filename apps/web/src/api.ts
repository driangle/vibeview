export class ApiError extends Error {
  status: number;
  constructor(status: number, statusText: string) {
    super(`API error: ${status} ${statusText}`);
    this.status = status;
  }
}

// Capture the access token from the URL (LAN mode) and persist to
// sessionStorage so it survives page refreshes and client-side navigation.
const TOKEN_KEY = 'vibeview_token';
const urlToken = new URLSearchParams(window.location.search).get('token');
if (urlToken) {
  sessionStorage.setItem(TOKEN_KEY, urlToken);
}
const accessToken: string | null = urlToken ?? sessionStorage.getItem(TOKEN_KEY);

// Append the access token to an API URL if one is present.
export function withToken(url: string): string {
  if (!accessToken) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(accessToken)}`;
}

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(withToken(url));
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
