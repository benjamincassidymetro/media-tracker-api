import { anonClient, requireAuth, CORS_HEADERS } from './supabase.ts'
import { formatMedia } from './media.ts'
import { formatProfile } from './auth.ts'

type JsonFn = (body: unknown, status?: number) => Response

const REVIEW_SELECT =
  '*, media:media(id, media_type, title, author, director, cover_url, published_year, average_rating, rating_count, genres), user:users(id, email, username, display_name, bio, avatar_url, created_at)'

export async function handleReviews(
  req: Request,
  segments: string[],
  method: string,
  url: URL,
  json: JsonFn,
): Promise<Response> {
  // GET /reviews
  if (segments.length === 1 && method === 'GET') {
    return getReviews(url, json)
  }

  // POST /reviews
  if (segments.length === 1 && method === 'POST') {
    return createReview(req, json)
  }

  // PUT /reviews/:mediaId
  if (segments.length === 2 && method === 'PUT') {
    return updateReview(req, segments[1], json)
  }

  // DELETE /reviews/:mediaId
  if (segments.length === 2 && method === 'DELETE') {
    return deleteReview(req, segments[1], json)
  }

  if (segments.length === 2) return json({ error: 'Method not allowed' }, 405)
  return json({ error: 'Not found' }, 404)
}

// ── GET /reviews ──────────────────────────────────────────────────────────────
async function getReviews(url: URL, json: JsonFn): Promise<Response> {
  const mediaId = url.searchParams.get('mediaId')
  const userId = url.searchParams.get('userId')
  const limit = Math.max(parseInt(url.searchParams.get('limit') ?? '20', 10), 1)
  const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10), 0)

  const supabase = anonClient()
  let q = supabase.from('reviews').select(REVIEW_SELECT, { count: 'exact' })

  if (mediaId) q = q.eq('media_id', parseInt(mediaId, 10))
  if (userId) q = q.eq('user_id', userId)

  q = q.range(offset, offset + limit - 1).order('created_at', { ascending: false })

  const { data, count, error } = await q
  if (error) return json({ error: error.message }, 500)

  return json({
    data: (data ?? []).map(formatReview),
    total: count ?? 0,
    limit,
    offset,
  })
}

// ── POST /reviews ─────────────────────────────────────────────────────────────
async function createReview(req: Request, json: JsonFn): Promise<Response> {
  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  let body: { mediaId?: number; rating?: number; reviewText?: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  if (!body.mediaId || body.rating == null) {
    return json({ error: 'mediaId and rating are required' }, 400)
  }
  if (body.rating < 1 || body.rating > 5) {
    return json({ error: 'rating must be between 1 and 5' }, 400)
  }

  // Enforce one review per user per media
  const { data: existing } = await client
    .from('reviews')
    .select('id')
    .eq('user_id', userId)
    .eq('media_id', body.mediaId)
    .maybeSingle()

  if (existing) return json({ error: 'Review already exists for this media' }, 409)

  const { data, error } = await client
    .from('reviews')
    .insert({
      user_id: userId,
      media_id: body.mediaId,
      rating: body.rating,
      review_text: body.reviewText ?? null,
    })
    .select(REVIEW_SELECT)
    .single()

  if (error) {
    if (error.code === '23505') return json({ error: 'Review already exists for this media' }, 409)
    if (error.code === '23503') return json({ error: 'Media not found' }, 404)
    return json({ error: error.message }, 500)
  }

  return json(formatReview(data), 201)
}

// ── PUT /reviews/:mediaId ─────────────────────────────────────────────────────
async function updateReview(req: Request, mediaIdStr: string, json: JsonFn): Promise<Response> {
  const mediaId = parseInt(mediaIdStr, 10)
  if (isNaN(mediaId)) return json({ error: 'Invalid media ID' }, 400)

  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  let body: { rating?: number; reviewText?: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  if (body.rating != null && (body.rating < 1 || body.rating > 5)) {
    return json({ error: 'rating must be between 1 and 5' }, 400)
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.rating != null) patch.rating = body.rating
  if (body.reviewText !== undefined) patch.review_text = body.reviewText

  const { data, error } = await client
    .from('reviews')
    .update(patch)
    .eq('user_id', userId)
    .eq('media_id', mediaId)
    .select(REVIEW_SELECT)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return json({ error: 'Review not found' }, 404)
    return json({ error: error.message }, 500)
  }

  return json(formatReview(data))
}

// ── DELETE /reviews/:mediaId ──────────────────────────────────────────────────
async function deleteReview(req: Request, mediaIdStr: string, json: JsonFn): Promise<Response> {
  const mediaId = parseInt(mediaIdStr, 10)
  if (isNaN(mediaId)) return json({ error: 'Invalid media ID' }, 400)

  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  const { error } = await client
    .from('reviews')
    .delete()
    .eq('user_id', userId)
    .eq('media_id', mediaId)

  if (error) return json({ error: error.message }, 500)

  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

// ── Formatter ─────────────────────────────────────────────────────────────────
function formatReview(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    mediaId: row.media_id,
    rating: row.rating,
    reviewText: row.review_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: row.user ? formatProfile(row.user as Record<string, unknown>) : null,
    media: row.media ? formatMedia(row.media as Record<string, unknown>) : null,
  }
}
