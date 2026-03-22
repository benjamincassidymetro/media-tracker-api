import { anonClient, requireAuth } from './supabase.ts'
import { formatProfile } from './auth.ts'

type JsonFn = (body: unknown, status?: number) => Response

export async function handleMedia(
  req: Request,
  segments: string[],
  method: string,
  url: URL,
  json: JsonFn,
): Promise<Response> {
  // ── /users/me  and  /users/:id ───────────────────────────────────────
  if (segments[0] === 'users') {
    return handleUsers(req, segments, method, json)
  }

  // ── /media ───────────────────────────────────────────────────────────
  // GET /media
  if (segments.length === 1 && method === 'GET') {
    return getMediaList(url, json)
  }

  // GET /media/:id
  if (segments.length === 2 && method === 'GET') {
    return getMediaDetail(segments[1], json)
  }

  return json({ error: 'Not found' }, 404)
}

// ── GET /media ────────────────────────────────────────────────────────────────
async function getMediaList(url: URL, json: JsonFn): Promise<Response> {
  const query = url.searchParams.get('query')
  const type = url.searchParams.get('type')
  const genre = url.searchParams.get('genre')
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '20', 10), 1), 100)
  const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10), 0)

  const supabase = anonClient()
  let q = supabase
    .from('media')
    .select(
      'id, media_type, title, author, director, cover_url, published_year, average_rating, rating_count, genres',
      { count: 'exact' },
    )

  if (query) {
    q = q.or(`title.ilike.%${query}%,author.ilike.%${query}%,director.ilike.%${query}%`)
  }
  if (type && (type === 'book' || type === 'movie')) {
    q = q.eq('media_type', type)
  }
  if (genre) {
    q = q.cs('genres', `{${genre}}`)
  }

  q = q.range(offset, offset + limit - 1).order('average_rating', { ascending: false })

  const { data, count, error } = await q
  if (error) return json({ error: error.message }, 500)

  return json({
    data: (data ?? []).map(formatMedia),
    total: count ?? 0,
    limit,
    offset,
  })
}

// ── GET /media/:id ────────────────────────────────────────────────────────────
async function getMediaDetail(idStr: string, json: JsonFn): Promise<Response> {
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return json({ error: 'Invalid media ID' }, 400)

  const supabase = anonClient()
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return json({ error: 'Media not found' }, 404)
    return json({ error: error.message }, 500)
  }

  return json(formatMediaDetail(data))
}

// ── /users ────────────────────────────────────────────────────────────────────
async function handleUsers(
  req: Request,
  segments: string[],
  method: string,
  json: JsonFn,
): Promise<Response> {
  const sub = segments[1] // 'me' | uuid

  // GET /users/me
  if (sub === 'me' && method === 'GET') {
    const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })
    const { data, error } = await client.from('users').select('*').eq('id', userId).single()
    if (error) return json({ error: error.message }, 500)
    return json(formatProfile(data))
  }

  // PUT /users/me
  if (sub === 'me' && method === 'PUT') {
    const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })
    let body: Record<string, unknown>
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

    const patch: Record<string, unknown> = {}
    if (body.displayName !== undefined) patch.display_name = body.displayName
    if (body.username !== undefined) patch.username = body.username
    if (body.bio !== undefined) patch.bio = body.bio
    if (body.avatarUrl !== undefined) patch.avatar_url = body.avatarUrl

    const { data, error } = await client
      .from('users')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') return json({ error: 'Username already taken' }, 409)
      return json({ error: error.message }, 500)
    }

    return json(formatProfile(data))
  }

  // GET /users/:id
  if (sub && method === 'GET') {
    const supabase = anonClient()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', sub)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return json({ error: 'User not found' }, 404)
      return json({ error: error.message }, 500)
    }

    return json(formatProfile(data))
  }

  return json({ error: 'Not found' }, 404)
}

// ── Formatters ─────────────────────────────────────────────────────────────────
export function formatMedia(row: Record<string, unknown>) {
  return {
    id: row.id,
    mediaType: row.media_type,
    title: row.title,
    author: row.author,
    director: row.director,
    coverUrl: row.cover_url,
    publishedYear: row.published_year,
    averageRating: row.average_rating,
    ratingCount: row.rating_count,
    genres: row.genres,
  }
}

function formatMediaDetail(row: Record<string, unknown>) {
  return {
    ...formatMedia(row),
    description: row.description,
    pageCount: row.page_count,
    runtimeMinutes: row.runtime_minutes,
    isbn: row.isbn,
    reviewCount: row.review_count,
  }
}
