import { requireAuth, CORS_HEADERS } from './supabase.ts'
import { formatMedia } from './media.ts'

type JsonFn = (body: unknown, status?: number) => Response

const MEDIA_JOIN = 'id, media_type, title, author, director, cover_url, published_year, average_rating, rating_count, genres'

export async function handleLibrary(
  req: Request,
  segments: string[],
  method: string,
  url: URL,
  json: JsonFn,
): Promise<Response> {
  // GET /library
  if (segments.length === 1 && method === 'GET') {
    return getLibrary(req, url, json)
  }

  // POST /library
  if (segments.length === 1 && method === 'POST') {
    return addToLibrary(req, json)
  }

  // PUT /library/:mediaId
  if (segments.length === 2 && method === 'PUT') {
    return updateLibraryItem(req, segments[1], json)
  }

  // DELETE /library/:mediaId
  if (segments.length === 2 && method === 'DELETE') {
    return removeFromLibrary(req, segments[1], json)
  }

  if (segments.length === 2) return json({ error: 'Method not allowed' }, 405)
  return json({ error: 'Not found' }, 404)
}

// ── GET /library ──────────────────────────────────────────────────────────────
async function getLibrary(req: Request, url: URL, json: JsonFn): Promise<Response> {
  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  const status = url.searchParams.get('status')
  const limit = Math.max(parseInt(url.searchParams.get('limit') ?? '20', 10), 1)
  const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10), 0)

  let q = client
    .from('user_media')
    .select(`*, media:media(${MEDIA_JOIN})`, { count: 'exact' })
    .eq('user_id', userId)

  if (status) q = q.eq('status', status)

  q = q.range(offset, offset + limit - 1).order('added_at', { ascending: false })

  const { data, count, error } = await q
  if (error) return json({ error: error.message }, 500)

  return json({
    data: (data ?? []).map(formatLibraryItem),
    total: count ?? 0,
  })
}

// ── POST /library ─────────────────────────────────────────────────────────────
async function addToLibrary(req: Request, json: JsonFn): Promise<Response> {
  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  let body: { mediaId?: number; status?: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  if (!body.mediaId || !body.status) {
    return json({ error: 'mediaId and status are required' }, 400)
  }
  if (!['want_to', 'reading', 'finished'].includes(body.status)) {
    return json({ error: 'status must be want_to, reading, or finished' }, 400)
  }

  const now = new Date().toISOString()
  const insert: Record<string, unknown> = {
    user_id: userId,
    media_id: body.mediaId,
    status: body.status,
  }
  if (body.status === 'reading') insert.started_at = now
  if (body.status === 'finished') {
    insert.started_at = now
    insert.finished_at = now
  }

  const { data, error } = await client
    .from('user_media')
    .insert(insert)
    .select(`*, media:media(${MEDIA_JOIN})`)
    .single()

  if (error) {
    if (error.code === '23505') return json({ error: 'Media already in library' }, 409)
    if (error.code === '23503') return json({ error: 'Media not found' }, 404)
    return json({ error: error.message }, 500)
  }

  return json(formatLibraryItem(data), 201)
}

// ── PUT /library/:mediaId ─────────────────────────────────────────────────────
async function updateLibraryItem(req: Request, mediaIdStr: string, json: JsonFn): Promise<Response> {
  const mediaId = parseInt(mediaIdStr, 10)
  if (isNaN(mediaId)) return json({ error: 'Invalid media ID' }, 400)

  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  let body: { status?: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  if (!body.status) return json({ error: 'status is required' }, 400)
  if (!['want_to', 'reading', 'finished'].includes(body.status)) {
    return json({ error: 'status must be want_to, reading, or finished' }, 400)
  }

  const patch: Record<string, unknown> = {
    status: body.status,
    updated_at: new Date().toISOString(),
  }
  if (body.status === 'reading') patch.started_at = new Date().toISOString()
  if (body.status === 'finished') patch.finished_at = new Date().toISOString()

  const { data, error } = await client
    .from('user_media')
    .update(patch)
    .eq('user_id', userId)
    .eq('media_id', mediaId)
    .select(`*, media:media(${MEDIA_JOIN})`)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return json({ error: 'Library item not found' }, 404)
    return json({ error: error.message }, 500)
  }

  return json(formatLibraryItem(data))
}

// ── DELETE /library/:mediaId ──────────────────────────────────────────────────
async function removeFromLibrary(req: Request, mediaIdStr: string, json: JsonFn): Promise<Response> {
  const mediaId = parseInt(mediaIdStr, 10)
  if (isNaN(mediaId)) return json({ error: 'Invalid media ID' }, 400)

  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  const { error } = await client
    .from('user_media')
    .delete()
    .eq('user_id', userId)
    .eq('media_id', mediaId)

  if (error) return json({ error: error.message }, 500)

  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

// ── Formatter ─────────────────────────────────────────────────────────────────
function formatLibraryItem(row: Record<string, unknown>) {
  return {
    userId: row.user_id,
    mediaId: row.media_id,
    status: row.status,
    addedAt: row.added_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    updatedAt: row.updated_at,
    media: row.media ? formatMedia(row.media as Record<string, unknown>) : null,
  }
}
