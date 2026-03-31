export class ApiError extends Error {
  status: number;
  constructor(status: number, statusText: string) {
    super(`API error: ${status} ${statusText}`);
    this.status = status;
  }
}

// Capture the access token from the initial page URL (LAN mode).
// Stored once at module load so client-side navigation doesn't lose it.
const accessToken: string | null = new URLSearchParams(window.location.search).get('token');

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
