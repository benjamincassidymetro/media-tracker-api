import { handleAuthError, requireAuth } from '../_shared/auth.ts'
import { corsResponse } from '../_shared/cors.ts'
import { db } from '../_shared/db.ts'
import { decodeCursor, errorResponse, jsonResponse, paginatedResponse } from '../_shared/response.ts'
import { formatReview, type DbReview } from '../_shared/types.ts'

async function createActivityRecord(
  userId: string,
  mediaId: number,
  rating: number,
  reviewText: string | null,
): Promise<void> {
  await db.from('activity').insert({
    user_id: userId,
    activity_type: 'review',
    media_id: mediaId,
    rating,
    review_text: reviewText,
  })
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsResponse()

  const url = new URL(req.url)
  const [segment] = url.pathname
    .replace(/^(?:\/functions\/v1)?\/reviews/, '')
    .split('/')
    .filter(Boolean)

  let authUserId: string
  try {
    ;({ userId: authUserId } = await requireAuth(req))
  } catch (err) {
    return handleAuthError(err)
  }

  // /reviews (no segment)
  if (segment === undefined) {
    // GET /reviews
    if (req.method === 'GET') {
      const mediaId = url.searchParams.get('mediaId')
      const userId = url.searchParams.get('userId')
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100)
      const after = url.searchParams.get('after')

      let qb = db
        .from('reviews')
        .select('*, user:users(*), media(*)')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit + 1)

      if (mediaId) qb = qb.eq('media_id', parseInt(mediaId, 10))
      if (userId) qb = qb.eq('user_id', userId)

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

      const rows = (data ?? []) as DbReview[]
      return paginatedResponse(
        rows.slice(0, limit).map(formatReview),
        limit,
        (last) => {
          const row = last as ReturnType<typeof formatReview>
          return { created_at: row.createdAt, id: row.id }
        },
      )
    }

    // POST /reviews
    if (req.method === 'POST') {
      let body: Record<string, unknown>
      try {
        body = await req.json()
      } catch {
        return errorResponse(400, 'Invalid JSON.', 'INVALID_JSON')
      }

      const { mediaId, rating, reviewText, shareToFeed = true } = body as {
        mediaId?: number
        rating?: number
        reviewText?: string
        shareToFeed?: boolean
      }

      if (!mediaId || !rating) return errorResponse(400, 'Missing required fields: mediaId, rating.', 'MISSING_FIELDS')
      if (rating < 1 || rating > 5) return errorResponse(400, 'rating must be between 1 and 5.', 'INVALID_REQUEST')

      const { data, error } = await db
        .from('reviews')
        .insert({
          user_id: authUserId,
          media_id: mediaId,
          rating,
          review_text: reviewText ?? null,
          share_to_feed: shareToFeed,
        })
        .select('*, user:users(*), media(*)')
        .single()

      if (error) {
        if (error.code === '23505') {
          return errorResponse(409, 'You have already reviewed this media item.', 'DUPLICATE_REVIEW')
        }
        console.error(error)
        return errorResponse(500, 'Something went wrong. Please try again.', 'DATABASE_ERROR')
      }

      if (shareToFeed) {
        await createActivityRecord(authUserId, mediaId, rating, reviewText ?? null)
      }

      return jsonResponse(formatReview(data as DbReview), 201)
    }

    return errorResponse(405, 'Method not allowed.', 'METHOD_NOT_ALLOWED')
  }

  // /reviews/{id}
  const reviewId = parseInt(segment, 10)
  if (isNaN(reviewId)) return errorResponse(404, 'Not found.', 'NOT_FOUND')

  // PUT /reviews/{id}
  if (req.method === 'PUT') {
    const { data: existing, error: fetchError } = await db
      .from('reviews')
      .select('user_id')
      .eq('id', reviewId)
      .single()

    if (fetchError || !existing) return errorResponse(404, 'Review not found.', 'REVIEW_NOT_FOUND')
    if ((existing.user_id as string) !== authUserId) {
      return errorResponse(403, 'You can only edit your own reviews.', 'FORBIDDEN')
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return errorResponse(400, 'Invalid JSON.', 'INVALID_JSON')
    }

    const { rating, reviewText } = body as { rating?: number; reviewText?: string }
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return errorResponse(400, 'rating must be between 1 and 5.', 'INVALID_REQUEST')
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (rating !== undefined) updates.rating = rating
    if (reviewText !== undefined) updates.review_text = reviewText

    const { data, error } = await db
      .from('reviews')
      .update(updates)
      .eq('id', reviewId)
      .select('*, user:users(*), media(*)')
      .single()

    if (error) {
      console.error(error)
      return errorResponse(500, 'Something went wrong. Please try again.', 'DATABASE_ERROR')
    }

    return jsonResponse(formatReview(data as DbReview))
  }

  // DELETE /reviews/{id}
  if (req.method === 'DELETE') {
    const { data: existing, error: fetchError } = await db
      .from('reviews')
      .select('user_id')
      .eq('id', reviewId)
      .single()

    if (fetchError || !existing) return errorResponse(404, 'Review not found.', 'REVIEW_NOT_FOUND')
    if ((existing.user_id as string) !== authUserId) {
      return errorResponse(403, 'You can only delete your own reviews.', 'FORBIDDEN')
    }

    const { error } = await db.from('reviews').delete().eq('id', reviewId)
    if (error) {
      console.error(error)
      return errorResponse(500, 'Something went wrong. Please try again.', 'DATABASE_ERROR')
    }

    return new Response(null, { status: 204 })
  }

  return errorResponse(405, 'Method not allowed.', 'METHOD_NOT_ALLOWED')
})
