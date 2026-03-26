export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
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
