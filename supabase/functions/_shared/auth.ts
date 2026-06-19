import * as jose from 'npm:jose@^5'

import { errorResponse, type ErrorCode } from './response.ts'
import { jwtSecret } from './secrets.ts'

export class AuthError extends Error {
  constructor(
    message: string,
    public code: ErrorCode = 'UNAUTHORIZED',
  ) {
    super(message)
  }
}

export async function requireAuth(req: Request): Promise<{ userId: string }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Authorization header required.', 'UNAUTHORIZED')
  }
  const token = authHeader.slice(7)
  try {
    const secret = new TextEncoder().encode(jwtSecret)
    const { payload } = await jose.jwtVerify(token, secret)
    const userId = payload.sub
    if (!userId) throw new AuthError('Invalid token.', 'TOKEN_INVALID')
    return { userId }
  } catch (err) {
    if (err instanceof jose.errors.JWTExpired) {
      throw new AuthError('Token has expired.', 'TOKEN_EXPIRED')
    }
    throw new AuthError('Invalid or malformed token.', 'TOKEN_INVALID')
  }
}

export function handleAuthError(err: unknown): Response {
  if (err instanceof AuthError) {
    return errorResponse(401, err.message, err.code)
  }
  console.error(err)
  return errorResponse(500, 'Something went wrong. Please try again.', 'DATABASE_ERROR')
}
