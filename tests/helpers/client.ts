export const BASE_URL =
  process.env.TEST_BASE_URL ?? 'http://127.0.0.1:54321/functions/v1'

export const CLIENT_ID = 'ics342-android-v1'
export const CLIENT_SECRET = 'mt-android-s26-xK9pQ2'

type ApiOptions = RequestInit & { token?: string }

export async function api(path: string, options: ApiOptions = {}): Promise<Response> {
  const { token, headers: extraHeaders, ...rest } = options
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders as Record<string, string>),
  }
  return fetch(`${BASE_URL}${path}`, { ...rest, headers })
}

export async function apiJson<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const res = await api(path, options)
  return res.json() as T
}
