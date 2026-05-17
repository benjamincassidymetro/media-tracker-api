import { handleAuthError, requireAuth } from '../_shared/auth.ts'
import { corsResponse } from '../_shared/cors.ts'
import { db } from '../_shared/db.ts'
import { decodeCursor, errorResponse, jsonResponse, paginatedResponse } from '../_shared/response.ts'
import { formatLibraryItem, type DbLibraryItem } from '../_shared/types.ts'

type LibraryStatus = 'finished' | 'in_progress' | 'want_to'

const ACTIVITY_TYPE: Partial<Record<LibraryStatus, string>> = {
  finished: 'finished',
  in_progress: 'started',
  want_to: 'added',
}

async function createActivityRecord(
  userId: string,
  mediaId: number,
  status: LibraryStatus,
): Promise<void> {
  const activityType = ACTIVITY_TYPE[status]
  if (!activityType) return
  await db.from('activity').insert({
    user_id: userId,
    activity_type: activityType,
    media_id: mediaId,
  })
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsResponse()

  const url = new URL(req.url)
  const parts = url.pathname.replace(/^\/functions\/v1\//, '').split('/')
  const [, segment] = parts

  let authUserId: string
  try {
    ;({ userId: authUserId } = await requireAuth(req))
  } catch (err) {
    return handleAuthError(err)
  }

  // /library (no segment)
  if (segment === undefined) {
    // GET /library
    if (req.method === 'GET') {
      const statusFilter = url.searchParams.get('status')
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100)
      const after = url.searchParams.get('after')

      let qb = db
        .from('library_items')
        .select('*, media(*)')
        .eq('user_id', authUserId)
        .order('added_at', { ascending: false })
        .order('media_id', { ascending: false })
        .limit(limit + 1)

      if (statusFilter) qb = qb.eq('status', statusFilter)

      if (after) {
        const cursor = decodeCursor(after)
        qb = qb.or(
          `added_at.lt.${cursor.added_at},and(added_at.eq.${cursor.added_at},media_id.lt.${cursor.media_id})`,
        )
      }

      const { data, error } = await qb
      if (error) {
        console.error(error)
        return errorResponse(500, 'Something went wrong. Please try again.')
      }

      const rows = (data ?? []) as DbLibraryItem[]
      return paginatedResponse(
        rows.slice(0, limit).map(formatLibraryItem),
        limit,
        (last) => {
          const row = last as ReturnType<typeof formatLibraryItem>
          return { added_at: row.addedAt, media_id: row.mediaId }
        },
      )
    }

    // POST /library
    if (req.method === 'POST') {
      let body: Record<string, unknown>
      try {
        body = await req.json()
      } catch {
        return errorResponse(400, 'Invalid JSON body.')
      }

      const { mediaId, status } = body as { mediaId?: number; status?: LibraryStatus }
      if (!mediaId || !status) return errorResponse(400, 'mediaId and status are required.')

      const { data, error } = await db
        .from('library_items')
        .insert({ user_id: authUserId, media_id: mediaId, status })
        .select('*, media(*)')
        .single()

      if (error) {
        if (error.code === '23505') {
          return errorResponse(409, 'This item is already in your library.')
        }
        console.error(error)
        return errorResponse(500, 'Something went wrong. Please try again.')
      }

      await createActivityRecord(authUserId, mediaId, status)

      return jsonResponse(formatLibraryItem(data as DbLibraryItem), 201)
    }

    return errorResponse(405, 'Method not allowed.')
  }

  // /library/{mediaId}
  const mediaId = parseInt(segment, 10)
  if (isNaN(mediaId)) return errorResponse(404, 'Not found.')

  // GET /library/{mediaId}
  if (req.method === 'GET') {
    const { data, error } = await db
      .from('library_items')
      .select('*, media(*)')
      .eq('user_id', authUserId)
      .eq('media_id', mediaId)
      .single()

    if (error || !data) return errorResponse(404, 'This media item is not in your library.')
    return jsonResponse(formatLibraryItem(data as DbLibraryItem))
  }

  // PUT /library/{mediaId}
  if (req.method === 'PUT') {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return errorResponse(400, 'Invalid JSON body.')
    }

    const { status } = body as { status?: LibraryStatus }
    if (!status) return errorResponse(400, 'status is required.')

    // Fetch current status to detect change (needed for activity record)
    const { data: current, error: fetchError } = await db
      .from('library_items')
      .select('status')
      .eq('user_id', authUserId)
      .eq('media_id', mediaId)
      .single()

    if (fetchError || !current) return errorResponse(404, 'This media item is not in your library.')

    const { data, error } = await db
      .from('library_items')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', authUserId)
      .eq('media_id', mediaId)
      .select('*, media(*)')
      .single()

    if (error) {
      console.error(error)
      return errorResponse(500, 'Something went wrong. Please try again.')
    }

    // Create activity only when status actually changes (not when setting want_to)
    const oldStatus = current.status as LibraryStatus
    if (status !== oldStatus && status !== 'want_to') {
      await createActivityRecord(authUserId, mediaId, status)
    }

    return jsonResponse(formatLibraryItem(data as DbLibraryItem))
  }

  // DELETE /library/{mediaId}
  if (req.method === 'DELETE') {
    const { error } = await db
      .from('library_items')
      .delete()
      .eq('user_id', authUserId)
      .eq('media_id', mediaId)

    if (error) {
      console.error(error)
      return errorResponse(500, 'Something went wrong. Please try again.')
    }

    return new Response(null, { status: 204 })
  }

  return errorResponse(405, 'Method not allowed.')
})
