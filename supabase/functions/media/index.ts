import { handleAuthError, requireAuth } from '../_shared/auth.ts'
import { corsResponse } from '../_shared/cors.ts'
import { db } from '../_shared/db.ts'
import { decodeCursor, errorResponse, jsonResponse, paginatedResponse } from '../_shared/response.ts'
import { formatMedia, formatMediaDetail, type DbMedia } from '../_shared/types.ts'

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsResponse()
  if (req.method !== 'GET') return errorResponse(405, 'Method not allowed.', 'METHOD_NOT_ALLOWED')

  const url = new URL(req.url)
  const [segment] = url.pathname
    .replace(/^(?:\/functions\/v1)?\/media/, '')
    .split('/')
    .filter(Boolean)

  try {
    await requireAuth(req)
  } catch (err) {
    return handleAuthError(err)
  }

  // GET /media/{id}
  if (segment !== undefined) {
    const mediaId = parseInt(segment, 10)
    if (isNaN(mediaId)) return errorResponse(404, 'Not found.', 'NOT_FOUND')

    const { data, error } = await db.from('media').select('*').eq('id', mediaId).single()
    if (error || !data) return errorResponse(404, 'Media item not found.', 'MEDIA_NOT_FOUND')

    return jsonResponse(formatMediaDetail(data as DbMedia))
  }

  // GET /media — search + filter + cursor pagination
  const query = url.searchParams.get('query')
  const typeFilter = url.searchParams.get('type')
  const genreFilter = url.searchParams.get('genre')
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100)
  const after = url.searchParams.get('after')

  let qb = db.from('media').select('*').order('id', { ascending: true }).limit(limit + 1)

  if (query) {
    qb = qb.or(
      [
        `title.ilike.%${query}%`,
        `author.ilike.%${query}%`,
        `director.ilike.%${query}%`,
        `creator.ilike.%${query}%`,
      ].join(','),
    )
  }
  if (typeFilter) qb = qb.eq('media_type', typeFilter)
  if (genreFilter) qb = qb.contains('genres', [genreFilter])

  if (after) {
    const cursor = decodeCursor(after)
    qb = qb.gt('id', cursor.id as number)
  }

  const { data, error } = await qb
  if (error) {
    console.error(error)
    return errorResponse(500, 'Something went wrong. Please try again.', 'DATABASE_ERROR')
  }

  const rows = (data ?? []) as DbMedia[]
  return paginatedResponse(
    rows.slice(0, limit).map(formatMedia),
    limit,
    (last) => ({ id: (last as ReturnType<typeof formatMedia>).id }),
  )
})
