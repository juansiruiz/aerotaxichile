const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'

type FetchOptions = RequestInit & { token?: string }

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...rest } = options
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...rest.headers,
  }

  const res = await fetch(`${API_URL}${path}`, { ...rest, headers })
  const json = await res.json()

  if (!res.ok) {
    throw new Error((json as { error: string }).error ?? 'Error desconocido')
  }

  return json as T
}

export const api = {
  get: <T>(path: string, token?: string) => apiFetch<T>(path, { method: 'GET', token }),
  post: <T>(path: string, body: unknown, token?: string) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body), token }),
  put: <T>(path: string, body: unknown, token?: string) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body), token }),
  patch: <T>(path: string, body: unknown, token?: string) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body), token }),
  delete: <T>(path: string, token?: string) => apiFetch<T>(path, { method: 'DELETE', token }),
}
