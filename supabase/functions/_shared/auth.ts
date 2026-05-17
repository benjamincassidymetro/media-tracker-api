import * as jose from 'npm:jose@^5'

import { errorResponse } from './response.ts'

export class AuthError extends Error {}

const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET')

export async function requireAuth(req: Request): Promise<{ userId: string }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Authentication required.')
  }
  const token = authHeader.slice(7)
  try {
    const secret = new TextEncoder().encode(jwtSecret)
    const { payload } = await jose.jwtVerify(token, secret)
    const userId = payload.sub
    if (!userId) throw new AuthError('Invalid token.')
    return { userId }
  } catch {
    throw new AuthError('Authentication required.')
  }
}

export function handleAuthError(err: unknown): Response {
  if (err instanceof AuthError) {
    return errorResponse(401, err.message)
  }
  console.error(err)
  return errorResponse(500, 'Something went wrong. Please try again.')
}
