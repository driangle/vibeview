export class ApiError extends Error {
  status: number;
  constructor(status: number, statusText: string) {
    super(`API error: ${status} ${statusText}`);
    this.status = status;
  }
}

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
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
