import { handleAuthError, requireAuth } from '../_shared/auth.ts'
import { validateClientCredentials } from '../_shared/client-auth.ts'
import { corsResponse } from '../_shared/cors.ts'
import { db } from '../_shared/db.ts'
import { decodeCursor, errorResponse, jsonResponse, paginatedResponse } from '../_shared/response.ts'
import {
  formatActivity,
  formatLibraryItem,
  formatUser,
  type DbActivity,
  type DbLibraryItem,
  type DbUser,
} from '../_shared/types.ts'
import { isValidUUID } from '../_shared/validate.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fetch a user profile with an is_following boolean for the given viewer. */
async function fetchUserWithFollowing(
  targetId: string,
  viewerId: string,
): Promise<DbUser | null> {
  const { data, error } = await db
    .from('users')
    .select('*, is_following:follows!inner(follower_id)')
    .eq('id', targetId)
    .eq('follows.follower_id', viewerId)
    .maybeSingle()

  if (error) {
    // Fallback: fetch user without the join, set is_following = false
    const { data: user } = await db.from('users').select('*').eq('id', targetId).single()
    if (!user) return null
    return { ...(user as DbUser), is_following: false }
  }

  if (!data) {
    // User exists but viewer doesn't follow — try plain select
    const { data: user } = await db.from('users').select('*').eq('id', targetId).single()
    if (!user) return null
    return { ...(user as DbUser), is_following: false }
  }

  return { ...(data as DbUser), is_following: true }
}

/** Batch check which users from a list the viewer follows. */
async function addIsFollowing(users: DbUser[], viewerId: string): Promise<DbUser[]> {
  if (users.length === 0) return []
  const ids = users.map((u) => u.id)
  const { data: myFollows } = await db
    .from('follows')
    .select('followee_id')
    .eq('follower_id', viewerId)
    .in('followee_id', ids)
  const followingSet = new Set((myFollows ?? []).map((f) => f.followee_id as string))
  return users.map((u) => ({ ...u, is_following: followingSet.has(u.id) }))
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleCreateUser(req: Request): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return errorResponse(400, 'Invalid JSON body.')
  }

  const { email, password, username, displayName, clientId, clientSecret } = body as {
    clientId?: string
    clientSecret?: string
    displayName?: string
    email?: string
    password?: string
    username?: string
  }

  if (!email || !password || !username || !displayName || !clientId || !clientSecret) {
    return errorResponse(400, 'email, password, username, displayName, clientId, and clientSecret are required.')
  }

  const clientAuth = await validateClientCredentials(clientId, clientSecret, 'users')
  if (!clientAuth.ok) return clientAuth.response

  // Create auth user
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError) {
    if (authError.message.includes('already')) {
      return errorResponse(409, 'An account with this email already exists.')
    }
    console.error(authError)
    return errorResponse(500, 'Something went wrong. Please try again.')
  }

  const userId = authData.user.id

  // Insert public profile
  const { data: profile, error: profileError } = await db
    .from('users')
    .insert({ id: userId, email, username, display_name: displayName })
    .select()
    .single()

  if (profileError) {
    // Roll back auth user to avoid orphaned auth records
    await db.auth.admin.deleteUser(userId)
    if (profileError.code === '23505') {
      return errorResponse(409, 'This username or email is already taken.')
    }
    console.error(profileError)
    return errorResponse(500, 'Something went wrong. Please try again.')
  }

  return jsonResponse(formatUser(profile as DbUser), 201)
}

async function handleGetMe(authUserId: string): Promise<Response> {
  const { data, error } = await db.from('users').select('*').eq('id', authUserId).single()
  if (error || !data) return errorResponse(404, 'User not found.')
  // isFollowing intentionally omitted for own profile
  return jsonResponse(formatUser(data as DbUser))
}

async function handleUpdateMe(req: Request, authUserId: string): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return errorResponse(400, 'Invalid JSON body.')
  }

  const { displayName, username, bio, avatarUrl } = body as {
    avatarUrl?: string
    bio?: string
    displayName?: string
    username?: string
  }

  const updates: Record<string, unknown> = {}
  if (displayName !== undefined) updates.display_name = displayName
  if (username !== undefined) updates.username = username
  if (bio !== undefined) updates.bio = bio
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl

  const { data, error } = await db
    .from('users')
    .update(updates)
    .eq('id', authUserId)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return errorResponse(409, 'This username is already taken.')
    console.error(error)
    return errorResponse(500, 'Something went wrong. Please try again.')
  }

  return jsonResponse(formatUser(data as DbUser))
}

async function handleUserSearch(
  url: URL,
  authUserId: string,
): Promise<Response> {
  const query = url.searchParams.get('query')
  if (!query) return errorResponse(400, 'query parameter is required.')

  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100)
  const after = url.searchParams.get('after')

  let qb = db
    .from('users')
    .select('*')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .order('id', { ascending: true })
    .limit(limit + 1)

  if (after) {
    const cursor = decodeCursor(after)
    qb = qb.gt('id', cursor.id as string)
  }

  const { data, error } = await qb
  if (error) {
    console.error(error)
    return errorResponse(500, 'Something went wrong. Please try again.')
  }

  const rows = (data ?? []) as DbUser[]
  const withFollowing = await addIsFollowing(rows.slice(0, limit), authUserId)

  return paginatedResponse(
    withFollowing.map((u) => formatUser(u, authUserId)),
    limit,
    (last) => ({ id: (last as ReturnType<typeof formatUser>).id }),
  )
}

async function handleGetUserById(targetId: string, authUserId: string): Promise<Response> {
  const user = await fetchUserWithFollowing(targetId, authUserId)
  if (!user) return errorResponse(404, 'User not found.')
  return jsonResponse(formatUser(user, authUserId))
}

async function handleGetFollowers(
  targetId: string,
  url: URL,
  authUserId: string,
): Promise<Response> {
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100)
  const after = url.searchParams.get('after')

  let qb = db
    .from('follows')
    .select('follower_id, created_at')
    .eq('followee_id', targetId)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (after) {
    const cursor = decodeCursor(after)
    qb = qb.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},follower_id.lt.${cursor.follower_id})`,
    )
  }

  const { data: followRows, error } = await qb
  if (error) {
    console.error(error)
    return errorResponse(500, 'Something went wrong. Please try again.')
  }

  const page = (followRows ?? []).slice(0, limit)
  const ids = page.map((r) => r.follower_id as string)

  const { data: users } = await db.from('users').select('*').in('id', ids)
  const profileMap = new Map((users ?? []).map((u) => [u.id as string, u as DbUser]))

  const withFollowing = await addIsFollowing(
    ids.map((id) => profileMap.get(id)!).filter(Boolean),
    authUserId,
  )
  const followingMap = new Map(withFollowing.map((u) => [u.id, u]))

  const ordered = ids
    .map((id) => followingMap.get(id))
    .filter((u): u is DbUser => u !== undefined)

  return paginatedResponse(
    ordered.map((u) => formatUser(u, authUserId)),
    limit,
    (last) => {
      const row = page[ordered.indexOf(last as DbUser)]
      return { created_at: row.created_at, follower_id: (last as DbUser).id }
    },
  )
}

async function handleGetFollowing(
  targetId: string,
  url: URL,
  authUserId: string,
): Promise<Response> {
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100)
  const after = url.searchParams.get('after')

  let qb = db
    .from('follows')
    .select('followee_id, created_at')
    .eq('follower_id', targetId)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (after) {
    const cursor = decodeCursor(after)
    qb = qb.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},followee_id.lt.${cursor.followee_id})`,
    )
  }

  const { data: followRows, error } = await qb
  if (error) {
    console.error(error)
    return errorResponse(500, 'Something went wrong. Please try again.')
  }

  const page = (followRows ?? []).slice(0, limit)
  const ids = page.map((r) => r.followee_id as string)

  const { data: users } = await db.from('users').select('*').in('id', ids)
  const profileMap = new Map((users ?? []).map((u) => [u.id as string, u as DbUser]))

  const withFollowing = await addIsFollowing(
    ids.map((id) => profileMap.get(id)!).filter(Boolean),
    authUserId,
  )
  const followingMap = new Map(withFollowing.map((u) => [u.id, u]))
  const ordered = ids
    .map((id) => followingMap.get(id))
    .filter((u): u is DbUser => u !== undefined)

  return paginatedResponse(
    ordered.map((u) => formatUser(u, authUserId)),
    limit,
    (last) => {
      const row = page[ordered.indexOf(last as DbUser)]
      return { created_at: row.created_at, followee_id: (last as DbUser).id }
    },
  )
}

async function handleFollow(targetId: string, authUserId: string): Promise<Response> {
  if (targetId === authUserId) return errorResponse(400, 'You cannot follow yourself.')

  const { error } = await db
    .from('follows')
    .insert({ follower_id: authUserId, followee_id: targetId })

  if (error) {
    if (error.code === '23505') return errorResponse(409, 'You are already following this user.')
    if (error.code === '23514') return errorResponse(400, 'You cannot follow yourself.')
    console.error(error)
    return errorResponse(500, 'Something went wrong. Please try again.')
  }

  return new Response(null, { status: 204 })
}

async function handleUnfollow(targetId: string, authUserId: string): Promise<Response> {
  await db
    .from('follows')
    .delete()
    .eq('follower_id', authUserId)
    .eq('followee_id', targetId)
  return new Response(null, { status: 204 })
}

async function handleUserActivity(targetId: string, url: URL): Promise<Response> {
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '10', 10), 100)
  const after = url.searchParams.get('after')

  let qb = db
    .from('activity')
    .select('*, user:users(*), media(*)')
    .eq('user_id', targetId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  if (after) {
    const cursor = decodeCursor(after)
    qb = qb.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
    )
  }

  const { data, error } = await qb
  if (error) {
    console.error(error)
    return errorResponse(500, 'Something went wrong. Please try again.')
  }

  const rows = (data ?? []) as DbActivity[]
  return paginatedResponse(
    rows.slice(0, limit).map(formatActivity),
    limit,
    (last) => {
      const row = last as ReturnType<typeof formatActivity>
      return { created_at: row.createdAt, id: row.id }
    },
  )
}

async function handleUserLibrary(targetId: string, url: URL): Promise<Response> {
  const statusFilter = url.searchParams.get('status')
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100)
  const after = url.searchParams.get('after')

  let qb = db
    .from('library_items')
    .select('*, media(*)')
    .eq('user_id', targetId)
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

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsResponse()

  const url = new URL(req.url)
  const [segment, subResource] = url.pathname
    .replace(/^(?:\/functions\/v1)?\/users/, '')
    .split('/')
    .filter(Boolean)

  // POST /users — no auth required
  if (req.method === 'POST' && segment === undefined) {
    return handleCreateUser(req)
  }

  // All other routes require auth
  let authUserId: string
  try {
    ;({ userId: authUserId } = await requireAuth(req))
  } catch (err) {
    return handleAuthError(err)
  }

  // /users/me
  if (segment === 'me') {
    if (req.method === 'GET') return handleGetMe(authUserId)
    if (req.method === 'PUT') return handleUpdateMe(req, authUserId)
    return errorResponse(405, 'Method not allowed.')
  }

  // /users/search
  if (segment === 'search') {
    if (req.method === 'GET') return handleUserSearch(url, authUserId)
    return errorResponse(405, 'Method not allowed.')
  }

  // /users/{id} — segment must be a valid UUID
  if (!segment || !isValidUUID(segment)) return errorResponse(404, 'Not found.')
  const targetUserId = segment

  if (subResource === undefined) {
    if (req.method === 'GET') return handleGetUserById(targetUserId, authUserId)
    return errorResponse(405, 'Method not allowed.')
  }

  if (subResource === 'followers') {
    if (req.method === 'GET') return handleGetFollowers(targetUserId, url, authUserId)
    return errorResponse(405, 'Method not allowed.')
  }

  if (subResource === 'following') {
    if (req.method === 'GET') return handleGetFollowing(targetUserId, url, authUserId)
    if (req.method === 'POST') return handleFollow(targetUserId, authUserId)
    if (req.method === 'DELETE') return handleUnfollow(targetUserId, authUserId)
    return errorResponse(405, 'Method not allowed.')
  }

  if (subResource === 'activity') {
    if (req.method === 'GET') return handleUserActivity(targetUserId, url)
    return errorResponse(405, 'Method not allowed.')
  }

  if (subResource === 'library') {
    if (req.method === 'GET') return handleUserLibrary(targetUserId, url)
    return errorResponse(405, 'Method not allowed.')
  }

  return errorResponse(404, 'Not found.')
})
