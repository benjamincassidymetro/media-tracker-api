import { handleAuthError, requireAuth } from '../_shared/auth.ts'
import { corsResponse } from '../_shared/cors.ts'
import { db } from '../_shared/db.ts'
import { decodeCursor, errorResponse, jsonResponse, paginatedResponse } from '../_shared/response.ts'
import { formatQuote, type DbQuote } from '../_shared/types.ts'

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsResponse()

  const url = new URL(req.url)
  const [segment, subResource] = url.pathname
    .replace(/^(?:\/functions\/v1)?\/quotes/, '')
    .split('/')
    .filter(Boolean)

  let authUserId: string
  try {
    ;({ userId: authUserId } = await requireAuth(req))
  } catch (err) {
    return handleAuthError(err)
  }

  // /quotes (no segment)
  if (segment === undefined) {
    // GET /quotes
    if (req.method === 'GET') {
      const publicOnly = url.searchParams.get('public') === 'true'
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100)
      const after = url.searchParams.get('after')

      let qb = db
        .from('quotes')
        .select('*, media(*)')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit + 1)

      if (publicOnly) {
        qb = qb.eq('is_public', true)
      } else {
        qb = qb.eq('user_id', authUserId)
      }

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

      const rows = (data ?? []) as DbQuote[]
      return paginatedResponse(
        rows.slice(0, limit).map(formatQuote),
        limit,
        (last) => {
          const row = last as ReturnType<typeof formatQuote>
          return { created_at: row.createdAt, id: row.id }
        },
      )
    }

    // POST /quotes
    if (req.method === 'POST') {
      let body: Record<string, unknown>
      try {
        body = await req.json()
      } catch {
        return errorResponse(400, 'Invalid JSON.', 'INVALID_JSON')
      }

      const { mediaId, quoteText, pageNumber, isPublic = false } = body as {
        isPublic?: boolean
        mediaId?: number
        pageNumber?: number
        quoteText?: string
      }

      if (!mediaId || !quoteText) return errorResponse(400, 'Missing required fields: mediaId, quoteText.', 'MISSING_FIELDS')
      if (quoteText.length > 500) return errorResponse(400, 'quoteText must be 500 characters or fewer.', 'INVALID_REQUEST')

      const { data, error } = await db
        .from('quotes')
        .insert({
          user_id: authUserId,
          media_id: mediaId,
          quote_text: quoteText,
          page_number: pageNumber ?? null,
          is_public: isPublic,
        })
        .select('*, media(*)')
        .single()

      if (error) {
        console.error(error)
        return errorResponse(500, 'Something went wrong. Please try again.', 'DATABASE_ERROR')
      }

      return jsonResponse(formatQuote(data as DbQuote), 201)
    }

    return errorResponse(405, 'Method not allowed.', 'METHOD_NOT_ALLOWED')
  }

  const quoteId = parseInt(segment, 10)
  if (isNaN(quoteId)) return errorResponse(404, 'Not found.', 'NOT_FOUND')

  // /quotes/{id}/likes
  if (subResource === 'likes') {
    // POST /quotes/{id}/likes
    if (req.method === 'POST') {
      const { error } = await db
        .from('quote_likes')
        .insert({ user_id: authUserId, quote_id: quoteId })

      if (error) {
        if (error.code === '23505') return errorResponse(409, 'You have already liked this quote.', 'DUPLICATE_QUOTE_LIKE')
        console.error(error)
        return errorResponse(500, 'Something went wrong. Please try again.', 'DATABASE_ERROR')
      }

      return new Response(null, { status: 204 })
    }

    // DELETE /quotes/{id}/likes
    if (req.method === 'DELETE') {
      await db
        .from('quote_likes')
        .delete()
        .eq('user_id', authUserId)
        .eq('quote_id', quoteId)
      return new Response(null, { status: 204 })
    }

    return errorResponse(405, 'Method not allowed.', 'METHOD_NOT_ALLOWED')
  }

  // PUT /quotes/{id}
  if (req.method === 'PUT') {
    const { data: existing, error: fetchError } = await db
      .from('quotes')
      .select('user_id')
      .eq('id', quoteId)
      .single()

    if (fetchError || !existing) return errorResponse(404, 'Quote not found.', 'QUOTE_NOT_FOUND')
    if ((existing.user_id as string) !== authUserId) {
      return errorResponse(403, 'You can only edit your own quotes.', 'FORBIDDEN')
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return errorResponse(400, 'Invalid JSON.', 'INVALID_JSON')
    }

    const { quoteText, isPublic } = body as { isPublic?: boolean; quoteText?: string }
    const updates: Record<string, unknown> = {}
    if (quoteText !== undefined) {
      if (quoteText.length > 500) return errorResponse(400, 'quoteText must be 500 characters or fewer.', 'INVALID_REQUEST')
      updates.quote_text = quoteText
    }
    if (isPublic !== undefined) updates.is_public = isPublic

    const { data, error } = await db
      .from('quotes')
      .update(updates)
      .eq('id', quoteId)
      .select('*, media(*)')
      .single()

    if (error) {
      console.error(error)
      return errorResponse(500, 'Something went wrong. Please try again.', 'DATABASE_ERROR')
    }

    return jsonResponse(formatQuote(data as DbQuote))
  }

  // DELETE /quotes/{id}
  if (req.method === 'DELETE') {
    const { data: existing, error: fetchError } = await db
      .from('quotes')
      .select('user_id')
      .eq('id', quoteId)
      .single()

    if (fetchError || !existing) return errorResponse(404, 'Quote not found.', 'QUOTE_NOT_FOUND')
    if ((existing.user_id as string) !== authUserId) {
      return errorResponse(403, 'You can only delete your own quotes.', 'FORBIDDEN')
    }

    await db.from('quotes').delete().eq('id', quoteId)
    return new Response(null, { status: 204 })
  }

  return errorResponse(405, 'Method not allowed.', 'METHOD_NOT_ALLOWED')
})
