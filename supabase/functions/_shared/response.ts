import { CORS_HEADERS } from './cors.ts'

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export type ErrorCode =
  | 'INVALID_JSON'
  | 'MISSING_FIELDS'
  | 'INVALID_CLIENT_CREDENTIALS'
  | 'DUPLICATE_EMAIL'
  | 'DUPLICATE_USERNAME'
  | 'DUPLICATE_LIBRARY_ITEM'
  | 'DUPLICATE_REVIEW'
  | 'DUPLICATE_GOAL'
  | 'DUPLICATE_QUOTE_LIKE'
  | 'DUPLICATE_FOLLOW'
  | 'USERNAME_TOO_SHORT'
  | 'INVALID_USERNAME'
  | 'INVALID_EMAIL'
  | 'PASSWORD_WEAK'
  | 'SELF_FOLLOW_NOT_ALLOWED'
  | 'INVALID_REQUEST'
  | 'INVALID_CURSOR'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'MEDIA_NOT_FOUND'
  | 'REVIEW_NOT_FOUND'
  | 'QUOTE_NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'MAX_PRIORITIES_EXCEEDED'
  | 'BUSINESS_RULE_VIOLATION'
  | 'DATABASE_ERROR'

export function errorResponse(status: number, message: string, code?: ErrorCode): Response {
  const body: { message: string; code?: ErrorCode } = { message }
  if (code) body.code = code
  return jsonResponse(body, status)
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
