import { handleAuthError, requireAuth } from '../_shared/auth.ts'
import { corsResponse } from '../_shared/cors.ts'
import { db } from '../_shared/db.ts'
import { decodeCursor, errorResponse, paginatedResponse } from '../_shared/response.ts'
import { formatActivity, type DbActivity } from '../_shared/types.ts'

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsResponse()
  if (req.method !== 'GET') return errorResponse(405, 'Method not allowed.', 'METHOD_NOT_ALLOWED')

  let authUserId: string
  try {
    ;({ userId: authUserId } = await requireAuth(req))
  } catch (err) {
    return handleAuthError(err)
  }

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100)
  const after = url.searchParams.get('after')

  // Get IDs of users the auth user follows
  const { data: followRows, error: followError } = await db
    .from('follows')
    .select('followee_id')
    .eq('follower_id', authUserId)

  if (followError) {
    console.error(followError)
    return errorResponse(500, 'Something went wrong. Please try again.', 'DATABASE_ERROR')
  }

  const followeeIds = (followRows ?? []).map((r) => r.followee_id as string)

  if (followeeIds.length === 0) {
    return paginatedResponse([], limit, () => ({}))
  }

  let qb = db
    .from('activity')
    .select('*, user:users(*), media(*)')
    .in('user_id', followeeIds)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  if (after) {
    const cursor = decodeCursor(after)
    qb = qb.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
    )
  }

  const { data, error } = await qb
  if (error) {
    console.error(error)
    return errorResponse(500, 'Something went wrong. Please try again.', 'DATABASE_ERROR')
  }

  const rows = (data ?? []) as DbActivity[]
  return paginatedResponse(
    rows.slice(0, limit).map(formatActivity),
    limit,
    (last) => {
      const row = last as ReturnType<typeof formatActivity>
      return { created_at: row.createdAt, id: row.id }
    },
  )
})
