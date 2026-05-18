import { createClient } from '@supabase/supabase-js'

import { api, CLIENT_ID, CLIENT_SECRET } from './client.ts'

// Local dev defaults — safe to hardcode (same values committed in mise.toml)
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

let seq = 0

export function uniqueEmail(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${++seq}@test.invalid`
}

export type TestUser = {
  id: string
  email: string
  username: string
  password: string
  accessToken: string
  refreshToken: string
}

export async function createTestUser(prefix = 'test'): Promise<TestUser> {
  const email = uniqueEmail(prefix)
  const password = 'Testing123!'
  const username = `u${Date.now()}${seq}`

  const regRes = await api('/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      username,
      displayName: username,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    }),
  })

  if (!regRes.ok) {
    const body = await regRes.text()
    throw new Error(`createTestUser registration failed ${regRes.status}: ${body}`)
  }

  const user = (await regRes.json()) as { id: string; username: string }

  const tokRes = await api('/tokens', {
    method: 'POST',
    body: JSON.stringify({
      grantType: 'password',
      email,
      password,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    }),
  })

  if (!tokRes.ok) {
    const body = await tokRes.text()
    throw new Error(`createTestUser token fetch failed ${tokRes.status}: ${body}`)
  }

  const { accessToken, refreshToken } = (await tokRes.json()) as {
    accessToken: string
    refreshToken: string
  }

  return { id: user.id, email, username: user.username, password, accessToken, refreshToken }
}

export async function deleteUser(userId: string): Promise<void> {
  await admin.auth.admin.deleteUser(userId)
}

/** Return the first media item of the given type from the DB (requires a valid token). */
export async function getTestMediaId(
  token: string,
  type: 'book' | 'movie' | 'show' = 'movie',
): Promise<number> {
  const res = await api(`/media?type=${type}`, { token })
  if (!res.ok) throw new Error(`getTestMediaId failed: ${res.status}`)
  const items = (await res.json()) as { id: number }[]
  if (!items.length) throw new Error(`No media of type "${type}" found in DB — check seed.sql`)
  return items[0].id
}
