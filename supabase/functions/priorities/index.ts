import { handleAuthError, requireAuth } from '../_shared/auth.ts'
import { corsResponse } from '../_shared/cors.ts'
import { db } from '../_shared/db.ts'
import { errorResponse, jsonResponse } from '../_shared/response.ts'
import { formatPriority, type DbPriority } from '../_shared/types.ts'

const MAX_PRIORITIES = 5

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsResponse()

  let authUserId: string
  try {
    ;({ userId: authUserId } = await requireAuth(req))
  } catch (err) {
    return handleAuthError(err)
  }

  // GET /priorities
  if (req.method === 'GET') {
    const { data, error } = await db
      .from('priorities')
      .select('*, media(*)')
      .eq('user_id', authUserId)
      .order('order_index', { ascending: true })

    if (error) {
      console.error(error)
      return errorResponse(500, 'Something went wrong. Please try again.')
    }

    return jsonResponse((data ?? []).map((r) => formatPriority(r as DbPriority)))
  }

  // PUT /priorities (upsert)
  if (req.method === 'PUT') {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return errorResponse(400, 'Invalid JSON body.')
    }

    const { mediaId, priority, orderIndex, estimatedTimeHours, notes } = body as {
      estimatedTimeHours?: number
      mediaId?: number
      notes?: string
      orderIndex?: number
      priority?: number
    }

    if (!mediaId) return errorResponse(400, 'mediaId is required.')

    // Check if this is a new item (not already in priorities)
    const { data: existing } = await db
      .from('priorities')
      .select('media_id')
      .eq('user_id', authUserId)
      .eq('media_id', mediaId)
      .maybeSingle()

    if (!existing) {
      // Count current priorities before inserting a new one
      const { count, error: countError } = await db
        .from('priorities')
        .select('media_id', { count: 'exact', head: true })
        .eq('user_id', authUserId)

      if (countError) {
        console.error(countError)
        return errorResponse(500, 'Something went wrong. Please try again.')
      }

      if ((count ?? 0) >= MAX_PRIORITIES) {
        return errorResponse(
          400,
          'You can have at most 5 priority items. Remove one before adding another.',
        )
      }
    }

    const { data, error } = await db
      .from('priorities')
      .upsert(
        {
          user_id: authUserId,
          media_id: mediaId,
          priority: priority ?? 2,
          order_index: orderIndex ?? 0,
          estimated_time_hours: estimatedTimeHours ?? null,
          notes: notes ?? null,
        },
        { onConflict: 'user_id,media_id' },
      )
      .select('*, media(*)')
      .single()

    if (error) {
      console.error(error)
      return errorResponse(500, 'Something went wrong. Please try again.')
    }

    return jsonResponse(formatPriority(data as DbPriority))
  }

  return errorResponse(405, 'Method not allowed.')
})
