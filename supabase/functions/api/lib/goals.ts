import { requireAuth } from './supabase.ts'

type JsonFn = (body: unknown, status?: number) => Response

export async function handleGoals(
  req: Request,
  segments: string[],
  method: string,
  url: URL,
  json: JsonFn,
): Promise<Response> {
  // GET /goals
  if (segments.length === 1 && method === 'GET') {
    return getGoals(req, url, json)
  }

  // POST /goals
  if (segments.length === 1 && method === 'POST') {
    return createGoal(req, json)
  }

  if (segments.length === 1) return json({ error: 'Method not allowed' }, 405)
  return json({ error: 'Not found' }, 404)
}

// ── GET /goals ────────────────────────────────────────────────────────────────
async function getGoals(req: Request, url: URL, json: JsonFn): Promise<Response> {
  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  const yearParam = url.searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : undefined

  let q = client
    .from('reading_goals')
    .select('*, achievements:goal_achievements(*)')
    .eq('user_id', userId)

  if (year) q = q.eq('year', year)

  const { data, error } = await q.order('year', { ascending: false })
  if (error) return json({ error: error.message }, 500)

  // Compute currentCount for each goal (filter by media_type client-side when set)
  const enriched = await Promise.all(
    (data ?? []).map(async (goal) => {
      if (goal.media_type) {
        const { data: items } = await client
          .from('user_media')
          .select('media:media(media_type)')
          .eq('user_id', userId)
          .eq('status', 'finished')
          .gte('finished_at', `${goal.year}-01-01T00:00:00Z`)
          .lt('finished_at', `${goal.year + 1}-01-01T00:00:00Z`)

        const count = (items ?? []).filter(
          (i) => (i.media as Record<string, unknown>)?.media_type === goal.media_type,
        ).length
        return formatGoal(goal, count)
      }

      const { count } = await client
        .from('user_media')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'finished')
        .gte('finished_at', `${goal.year}-01-01T00:00:00Z`)
        .lt('finished_at', `${goal.year + 1}-01-01T00:00:00Z`)

      return formatGoal(goal, count ?? 0)
    }),
  )

  return json(enriched)
}

// ── POST /goals ───────────────────────────────────────────────────────────────
async function createGoal(req: Request, json: JsonFn): Promise<Response> {
  const { userId, client } = await requireAuth(req, json).catch((r) => { throw r })

  let body: { year?: number; targetCount?: number; mediaType?: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  if (!body.year || !body.targetCount) {
    return json({ error: 'year and targetCount are required' }, 400)
  }
  if (body.targetCount < 1) return json({ error: 'targetCount must be at least 1' }, 400)

  const mediaType = body.mediaType === 'both' ? null : (body.mediaType ?? null)

  const { data: goal, error } = await client
    .from('reading_goals')
    .insert({
      user_id: userId,
      year: body.year,
      target_count: body.targetCount,
      media_type: mediaType,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') return json({ error: 'Goal already exists for this year/type' }, 409)
    return json({ error: error.message }, 500)
  }

  // Create milestone achievement placeholders
  await client.from('goal_achievements').insert([
    { goal_id: goal.id, milestone: 25 },
    { goal_id: goal.id, milestone: 50 },
    { goal_id: goal.id, milestone: 75 },
    { goal_id: goal.id, milestone: 100 },
  ])

  const { data: full } = await client
    .from('reading_goals')
    .select('*, achievements:goal_achievements(*)')
    .eq('id', goal.id)
    .single()

  return json(formatGoal(full ?? goal, 0), 201)
}

// ── Formatter ─────────────────────────────────────────────────────────────────
function formatGoal(row: Record<string, unknown>, currentCount: number) {
  return {
    id: row.id,
    userId: row.user_id,
    year: row.year,
    targetCount: row.target_count,
    currentCount,
    mediaType: row.media_type,
    createdAt: row.created_at,
    achievements: (row.achievements as Record<string, unknown>[] | undefined ?? []).map((a) => ({
      milestone: a.milestone,
      unlockedAt: a.unlocked_at,
    })),
  }
}
