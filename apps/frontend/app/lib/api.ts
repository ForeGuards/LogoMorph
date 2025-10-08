export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export function isApiResponse<T = unknown>(value: unknown): value is ApiResponse<T> {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    'success' in obj &&
    typeof obj.success === 'boolean' &&
    (!('error' in obj) || typeof obj.error === 'string')
  );
}

export async function parseApiResponse<T = unknown>(response: Response): Promise<ApiResponse<T>> {
  // Next.js/TypeScript treats response.json() as unknown; validate shape explicitly
  const json: unknown = await response.json();
  if (!isApiResponse<T>(json)) {
    return { success: false, error: 'Invalid API response shape' };
  }
  return json;
}
