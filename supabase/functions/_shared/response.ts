import { CORS_HEADERS } from './cors.ts'

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export function errorResponse(status: number, message: string): Response {
  return jsonResponse({ message }, status)
}

export function encodeCursor(obj: Record<string, unknown>): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export function decodeCursor(cursor: string): Record<string, unknown> {
  const padded = cursor.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (padded.length % 4)) % 4
  return JSON.parse(atob(padded + '='.repeat(padLength)))
}

export function paginatedResponse(
  items: unknown[],
  limit: number,
  cursorFn: (lastItem: unknown) => Record<string, unknown>,
): Response {
  const hasMore = items.length === limit
  const headers = new Headers({
    ...CORS_HEADERS,
    'Content-Type': 'application/json',
    'X-Has-More': String(hasMore),
  })
  if (hasMore) {
    headers.set('X-Next-Cursor', encodeCursor(cursorFn(items[items.length - 1])))
  }
  return new Response(JSON.stringify(items), { status: 200, headers })
}
