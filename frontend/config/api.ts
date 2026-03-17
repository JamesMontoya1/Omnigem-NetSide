export const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE as string) || 'http://localhost:3002';

/** Returns headers with Authorization token if available */
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('shifts_token') : null;
  const headers: Record<string, string> = { ...extra };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/** Shorthand for JSON + auth headers */
export function jsonAuthHeaders(): Record<string, string> {
  return authHeaders({ 'Content-Type': 'application/json' });
}
