import { handleAuthError, requireAuth } from '../_shared/auth.ts'
import { corsResponse } from '../_shared/cors.ts'
import { db } from '../_shared/db.ts'
import { errorResponse, jsonResponse } from '../_shared/response.ts'
import { formatGoal, type DbGoal } from '../_shared/types.ts'

type FinishedItem = {
  media_id: number
  updated_at: string
  media: { media_type: string } | null
}

function computeCurrentCount(goal: DbGoal, finishedItems: FinishedItem[]): number {
  return finishedItems.filter((item) => {
    const year = new Date(item.updated_at).getFullYear()
    const mediaType = item.media?.media_type
    return year === goal.year && (goal.media_type === 'all' || mediaType === goal.media_type)
  }).length
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsResponse()

  let authUserId: string
  try {
    ;({ userId: authUserId } = await requireAuth(req))
  } catch (err) {
    return handleAuthError(err)
  }

  // GET /goals
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const yearParam = url.searchParams.get('year')

    let qb = db.from('goals').select('*').eq('user_id', authUserId).order('year', { ascending: false })
    if (yearParam) qb = qb.eq('year', parseInt(yearParam, 10))

    const { data: goals, error: goalsError } = await qb
    if (goalsError) {
      console.error(goalsError)
      return errorResponse(500, 'Something went wrong. Please try again.')
    }

    // Fetch all finished library items for this user (used to compute current_count per goal)
    const { data: finishedItems, error: itemsError } = await db
      .from('library_items')
      .select('media_id, updated_at, media(media_type)')
      .eq('user_id', authUserId)
      .eq('status', 'finished')

    if (itemsError) {
      console.error(itemsError)
      return errorResponse(500, 'Something went wrong. Please try again.')
    }

    const items = (finishedItems ?? []) as FinishedItem[]
    const result = (goals ?? []).map((g) => formatGoal(g as DbGoal, computeCurrentCount(g as DbGoal, items)))

    return jsonResponse(result)
  }

  // POST /goals
  if (req.method === 'POST') {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return errorResponse(400, 'Invalid JSON body.')
    }

    const { year, targetCount, mediaType = 'all' } = body as {
      mediaType?: string
      targetCount?: number
      year?: number
    }

    if (!year || !targetCount) return errorResponse(400, 'year and targetCount are required.')
    if (targetCount < 1) return errorResponse(400, 'targetCount must be at least 1.')

    const { data, error } = await db
      .from('goals')
      .insert({ user_id: authUserId, year, target_count: targetCount, media_type: mediaType })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return errorResponse(409, 'A goal for this year and media type already exists.')
      }
      console.error(error)
      return errorResponse(500, 'Something went wrong. Please try again.')
    }

    return jsonResponse(formatGoal(data as DbGoal, 0), 201)
  }

  return errorResponse(405, 'Method not allowed.')
})
