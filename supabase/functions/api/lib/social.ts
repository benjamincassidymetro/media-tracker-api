import { anonClient, requireAuth, CORS_HEADERS } from './supabase.ts'
import { formatMedia } from './media.ts'
import { formatProfile } from './auth.ts'

type JsonFn = (body: unknown, status?: number) => Response

const ACTIVITY_SELECT =
  '*, user:users(id, email, username, display_name, bio, avatar_url, created_at), media:media(id, media_type, title, author, director, cover_url, published_year, average_rating, rating_count, genres)'

export async function handleSocial(
  req: Request,
  segments: string[],
  method: string,
  url: URL,
  json: JsonFn,
): Promise<Response> {
  // ── /activity ─────────────────────────────────────────────────────────
  if (segments[0] === 'activity' && segments.length === 1 && method === 'GET') {
    return getActivityFeed(req, url, json)
  }

  // ── /followers ────────────────────────────────────────────────────────
  if (segments[0] === 'followers') {
    // GET /followers
    if (segments.length === 1 && method === 'GET') {
      return getFollowers(req, url, json)
    }

    // POST /followers/:userId
    if (segments.length === 2 && method === 'POST') {
      return followUser(req, segments[1], json)
    }

    // DELETE /followers/:userId
    if (segments.length === 2 && method === 'DELETE') {
      return unfollowUser(req, segments[1], json)
    }

    if (segments.length === 2) return json({ error: 'Method not allowed' }, 405)
  }

  return json({ error: 'Not found' }, 404)
}

// ── GET /activity ─────────────────────────────────────────────────────────────
async function getActivityFeed(req: Request, url: URL, json: JsonFn): Promise<Response> {
  const { client } = await requireAuth(req, json).catch((r) => { throw r })

  const limit = Math.max(parseInt(url.searchParams.get('limit') ?? '20', 10), 1)
  const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10), 0)

  const { data, error } = await client
    .from('activity_feed')
    .select(ACTIVITY_SELECT)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })

  if (error) return json({ error: error.message }, 500)

  return json((data ?? []).map(formatActivity))
}

// ── GET /followers ────────────────────────────────────────────────────────────
async function getFollowers(req: Request, url: URL, json: JsonFn): Promise<Response> {
  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  const type = url.searchParams.get('type') ?? 'followers'
  const targetId = url.searchParams.get('userId') ?? userId

  if (type === 'followers') {
    // Who follows targetId?
    const { data, error } = await client
      .from('follows')
      .select('follower:users!follower_id(id, email, username, display_name, bio, avatar_url, created_at)')
      .eq('following_id', targetId)

    if (error) return json({ error: error.message }, 500)
    return json((data ?? []).map((r) => formatProfile(r.follower as Record<string, unknown>)))
  } else {
    // Who is targetId following?
    const { data, error } = await client
      .from('follows')
      .select('following:users!following_id(id, email, username, display_name, bio, avatar_url, created_at)')
      .eq('follower_id', targetId)

    if (error) return json({ error: error.message }, 500)
    return json((data ?? []).map((r) => formatProfile(r.following as Record<string, unknown>)))
  }
}

// ── POST /followers/:userId ───────────────────────────────────────────────────
async function followUser(req: Request, targetId: string, json: JsonFn): Promise<Response> {
  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  if (userId === targetId) return json({ error: 'Cannot follow yourself' }, 400)

  const { error } = await client
    .from('follows')
    .insert({ follower_id: userId, following_id: targetId })

  if (error) {
    if (error.code === '23505') return json({ error: 'Already following this user' }, 409)
    if (error.code === '23503') return json({ error: 'User not found' }, 404)
    return json({ error: error.message }, 500)
  }

  return new Response(null, { status: 201, headers: CORS_HEADERS })
}

// ── DELETE /followers/:userId ─────────────────────────────────────────────────
async function unfollowUser(req: Request, targetId: string, json: JsonFn): Promise<Response> {
  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  const { error } = await client
    .from('follows')
    .delete()
    .eq('follower_id', userId)
    .eq('following_id', targetId)

  if (error) return json({ error: error.message }, 500)

  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

// ── Formatters ─────────────────────────────────────────────────────────────────
function formatActivity(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    activityType: row.activity_type,
    mediaId: row.media_id,
    rating: row.rating,
    reviewText: row.review_text,
    status: row.status,
    createdAt: row.created_at,
    user: row.user ? formatProfile(row.user as Record<string, unknown>) : null,
    media: row.media ? formatMedia(row.media as Record<string, unknown>) : null,
  }
}
