import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/** Unauthenticated client — for public reads and auth operations. */
export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

/**
 * User-scoped client — passes the caller's JWT so RLS policies enforce
 * per-user data access.
 */
export function userClient(token: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

/**
 * Service-role client — bypasses RLS.  Use only for trusted server-side
 * operations (e.g. profile creation after signup).
 */
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

/** Extract Bearer token from Authorization header; returns null if absent. */
export function getBearerToken(req: Request): string | null {
  const header = req.headers.get('Authorization') ?? ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : null
}

/**
 * Require authentication.  Returns `{ userId, client }` on success or
 * throws a Response with 401.
 */
export async function requireAuth(
  req: Request,
  json: (body: unknown, status?: number) => Response,
): Promise<{ userId: string; client: SupabaseClient }> {
  const token = getBearerToken(req)
  if (!token) throw json({ error: 'Authentication required' }, 401)

  const client = userClient(token)
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) throw json({ error: 'Invalid or expired token' }, 401)

  return { userId: user.id, client }
}
