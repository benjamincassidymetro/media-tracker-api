import { requireAuth } from './supabase.ts'
import { formatMedia } from './media.ts'

type JsonFn = (body: unknown, status?: number) => Response

const PRIORITY_SELECT =
  '*, user_media:user_media(media_id, status, media:media(id, media_type, title, author, director, cover_url, published_year, average_rating, rating_count, genres))'

export async function handlePriorities(
  req: Request,
  segments: string[],
  method: string,
  _url: URL,
  json: JsonFn,
): Promise<Response> {
  // GET /priorities
  if (segments.length === 1 && method === 'GET') {
    return getPriorities(req, json)
  }

  // PUT /priorities
  if (segments.length === 1 && method === 'PUT') {
    return upsertPriority(req, json)
  }

  if (segments.length === 1) return json({ error: 'Method not allowed' }, 405)
  return json({ error: 'Not found' }, 404)
}

// ── GET /priorities ───────────────────────────────────────────────────────────
async function getPriorities(req: Request, json: JsonFn): Promise<Response> {
  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  const { data, error } = await client
    .from('want_to_priorities')
    .select(PRIORITY_SELECT)
    .eq('user_id', userId)
    .order('order_index', { ascending: true })

  if (error) return json({ error: error.message }, 500)

  return json((data ?? []).map(formatPriority))
}

// ── PUT /priorities ───────────────────────────────────────────────────────────
async function upsertPriority(req: Request, json: JsonFn): Promise<Response> {
  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  let body: {
    mediaId?: number
    priority?: number
    orderIndex?: number
    estimatedTimeHours?: number
    notes?: string
  }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  if (!body.mediaId) return json({ error: 'mediaId is required' }, 400)
  if (body.priority != null && ![1, 2, 3].includes(body.priority)) {
    return json({ error: 'priority must be 1 (High), 2 (Medium), or 3 (Low)' }, 400)
  }

  // Resolve user_media_id from the user's library
  const { data: um, error: umErr } = await client
    .from('user_media')
    .select('id')
    .eq('user_id', userId)
    .eq('media_id', body.mediaId)
    .single()

  if (umErr || !um) {
    return json({ error: 'Media not found in library. Add it with status want_to first.' }, 404)
  }

  const patch: Record<string, unknown> = {
    user_id: userId,
    user_media_id: um.id,
    updated_at: new Date().toISOString(),
  }
  if (body.priority != null) patch.priority = body.priority
  if (body.orderIndex != null) patch.order_index = body.orderIndex
  if (body.estimatedTimeHours != null) patch.estimated_time_hours = body.estimatedTimeHours
  if (body.notes !== undefined) patch.notes = body.notes

  const { data, error } = await client
    .from('want_to_priorities')
    .upsert(patch, { onConflict: 'user_id,user_media_id' })
    .select(PRIORITY_SELECT)
    .single()

  if (error) return json({ error: error.message }, 500)

  return json(formatPriority(data))
}

// ── Formatter ─────────────────────────────────────────────────────────────────
function formatPriority(row: Record<string, unknown>) {
  const um = row.user_media as Record<string, unknown> | null
  return {
    id: row.id,
    mediaId: um?.media_id ?? null,
    priority: row.priority,
    orderIndex: row.order_index,
    estimatedTimeHours: row.estimated_time_hours,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    media: um?.media ? formatMedia(um.media as Record<string, unknown>) : null,
  }
}
