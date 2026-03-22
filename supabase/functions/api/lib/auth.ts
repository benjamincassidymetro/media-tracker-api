import { anonClient, serviceClient } from './supabase.ts'

type JsonFn = (body: unknown, status?: number) => Response

export async function handleAuth(
  req: Request,
  segments: string[],
  method: string,
  _url: URL,
  json: JsonFn,
): Promise<Response> {
  const action = segments[1] // 'signup' | 'login' | 'refresh'

  // POST /auth/signup
  if (action === 'signup' && method === 'POST') {
    let body: { email?: string; password?: string; username?: string; displayName?: string }
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

    const { email, password, username, displayName } = body
    if (!email || !password || !username || !displayName) {
      return json({ error: 'email, password, username, and displayName are required' }, 400)
    }
    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters' }, 400)
    }

    const anon = anonClient()
    const { data, error } = await anon.auth.signUp({ email, password })
    if (error) {
      const status = error.message?.toLowerCase().includes('already') ? 409 : 400
      return json({ error: error.message }, status)
    }

    // Update public.users profile created by trigger with the supplied username/displayName
    if (data.user) {
      const svc = serviceClient()
      await svc
        .from('users')
        .update({ username, display_name: displayName })
        .eq('id', data.user.id)
    }

    return json(
      {
        accessToken: data.session?.access_token ?? null,
        refreshToken: data.session?.refresh_token ?? null,
        user: formatUser(data.user),
      },
      201,
    )
  }

  // POST /auth/login
  if (action === 'login' && method === 'POST') {
    let body: { email?: string; password?: string }
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

    const { email, password } = body
    if (!email || !password) {
      return json({ error: 'email and password are required' }, 400)
    }

    const anon = anonClient()
    const { data, error } = await anon.auth.signInWithPassword({ email, password })
    if (error) return json({ error: 'Invalid email or password' }, 401)

    // Fetch public profile for richer response
    const { data: profile } = await anon.from('users').select('*').eq('id', data.user.id).single()

    return json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: profile ? formatProfile(profile) : formatUser(data.user),
    })
  }

  // POST /auth/refresh
  if (action === 'refresh' && method === 'POST') {
    let body: { refreshToken?: string }
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

    if (!body.refreshToken) return json({ error: 'refreshToken is required' }, 400)

    const anon = anonClient()
    const { data, error } = await anon.auth.refreshSession({ refresh_token: body.refreshToken })
    if (error || !data.session) return json({ error: 'Invalid refresh token' }, 401)

    return json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: formatUser(data.user),
    })
  }

  return json({ error: 'Not found' }, 404)
}

function formatUser(user: { id: string; email?: string } | null) {
  if (!user) return null
  return { id: user.id, email: user.email }
}

export function formatProfile(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  }
}
