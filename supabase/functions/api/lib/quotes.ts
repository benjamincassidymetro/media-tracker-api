import { anonClient, requireAuth, CORS_HEADERS } from './supabase.ts'
import { formatMedia } from './media.ts'

type JsonFn = (body: unknown, status?: number) => Response

const QUOTE_SELECT =
  '*, media:media(id, media_type, title, author, director, cover_url, published_year, average_rating, rating_count, genres)'

export async function handleQuotes(
  req: Request,
  segments: string[],
  method: string,
  url: URL,
  json: JsonFn,
): Promise<Response> {
  // GET /quotes
  if (segments.length === 1 && method === 'GET') {
    return getQuotes(req, url, json)
  }

  // POST /quotes
  if (segments.length === 1 && method === 'POST') {
    return createQuote(req, json)
  }

  if (segments.length === 2) {
    const id = segments[1]

    // PUT /quotes/:id
    if (method === 'PUT') return updateQuote(req, id, json)

    // DELETE /quotes/:id
    if (method === 'DELETE') return deleteQuote(req, id, json)

    return json({ error: 'Method not allowed' }, 405)
  }

  // POST /quotes/:id/like  or  DELETE /quotes/:id/like
  if (segments.length === 3 && segments[2] === 'like') {
    const id = segments[1]
    if (method === 'POST') return likeQuote(req, id, json)
    if (method === 'DELETE') return unlikeQuote(req, id, json)
    return json({ error: 'Method not allowed' }, 405)
  }

  return json({ error: 'Not found' }, 404)
}

// ── GET /quotes ───────────────────────────────────────────────────────────────
async function getQuotes(req: Request, url: URL, json: JsonFn): Promise<Response> {
  const isPublic = url.searchParams.get('public') === 'true'
  const limit = Math.max(parseInt(url.searchParams.get('limit') ?? '20', 10), 1)

  if (isPublic) {
    // Public quotes — no auth needed
    const supabase = anonClient()
    const { data, error } = await supabase
      .from('quotes')
      .select(QUOTE_SELECT)
      .eq('is_public', true)
      .order('like_count', { ascending: false })
      .limit(limit)

    if (error) return json({ error: error.message }, 500)
    return json((data ?? []).map(formatQuote))
  }

  // Private: return only the authenticated user's quotes
  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  const { data, error } = await client
    .from('quotes')
    .select(QUOTE_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return json({ error: error.message }, 500)
  return json((data ?? []).map(formatQuote))
}

// ── POST /quotes ──────────────────────────────────────────────────────────────
async function createQuote(req: Request, json: JsonFn): Promise<Response> {
  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  let body: { mediaId?: number; quoteText?: string; pageNumber?: number; isPublic?: boolean }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  if (!body.mediaId || !body.quoteText) {
    return json({ error: 'mediaId and quoteText are required' }, 400)
  }
  if (body.quoteText.length > 500) {
    return json({ error: 'quoteText must be 500 characters or fewer' }, 400)
  }

  const { data, error } = await client
    .from('quotes')
    .insert({
      user_id: userId,
      media_id: body.mediaId,
      quote_text: body.quoteText,
      page_number: body.pageNumber ?? null,
      is_public: body.isPublic ?? false,
    })
    .select(QUOTE_SELECT)
    .single()

  if (error) {
    if (error.code === '23503') return json({ error: 'Media not found' }, 404)
    return json({ error: error.message }, 500)
  }

  return json(formatQuote(data), 201)
}

// ── PUT /quotes/:id ───────────────────────────────────────────────────────────
async function updateQuote(req: Request, idStr: string, json: JsonFn): Promise<Response> {
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return json({ error: 'Invalid quote ID' }, 400)

  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  let body: { quoteText?: string; isPublic?: boolean }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.quoteText !== undefined) {
    if (body.quoteText.length > 500) return json({ error: 'quoteText must be 500 characters or fewer' }, 400)
    patch.quote_text = body.quoteText
  }
  if (body.isPublic !== undefined) patch.is_public = body.isPublic

  const { data, error } = await client
    .from('quotes')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select(QUOTE_SELECT)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return json({ error: 'Quote not found' }, 404)
    return json({ error: error.message }, 500)
  }

  return json(formatQuote(data))
}

// ── DELETE /quotes/:id ────────────────────────────────────────────────────────
async function deleteQuote(req: Request, idStr: string, json: JsonFn): Promise<Response> {
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return json({ error: 'Invalid quote ID' }, 400)

  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  const { error } = await client
    .from('quotes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return json({ error: error.message }, 500)

  return new Response(null, { status: 204 })
}

// ── POST /quotes/:id/like ─────────────────────────────────────────────────────
async function likeQuote(req: Request, idStr: string, json: JsonFn): Promise<Response> {
  const quoteId = parseInt(idStr, 10)
  if (isNaN(quoteId)) return json({ error: 'Invalid quote ID' }, 400)

  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  const { error } = await client
    .from('quote_likes')
    .insert({ quote_id: quoteId, user_id: userId })

  if (error) {
    // Duplicate like — already liked, treat as success
    if (error.code === '23505') return new Response(null, { status: 200, headers: CORS_HEADERS })
    if (error.code === '23503') return json({ error: 'Quote not found' }, 404)
    return json({ error: error.message }, 500)
  }

  // like_count updated automatically by trigger
  return new Response(null, { status: 201, headers: CORS_HEADERS })
}

// ── DELETE /quotes/:id/like ───────────────────────────────────────────────────
async function unlikeQuote(req: Request, idStr: string, json: JsonFn): Promise<Response> {
  const quoteId = parseInt(idStr, 10)
  if (isNaN(quoteId)) return json({ error: 'Invalid quote ID' }, 400)

  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  const { error } = await client
    .from('quote_likes')
    .delete()
    .eq('quote_id', quoteId)
    .eq('user_id', userId)

  if (error) return json({ error: error.message }, 500)

  // like_count decremented automatically by trigger
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

// ── Formatter ─────────────────────────────────────────────────────────────────
function formatQuote(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    mediaId: row.media_id,
    quoteText: row.quote_text,
    pageNumber: row.page_number,
    isPublic: row.is_public,
    likeCount: row.like_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    media: row.media ? formatMedia(row.media as Record<string, unknown>) : null,
  }
}
