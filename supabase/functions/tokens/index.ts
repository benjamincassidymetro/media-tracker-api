import { createClient } from 'npm:@supabase/supabase-js@^2'
import bcryptjs from 'npm:bcryptjs@^2'
import * as jose from 'npm:jose@^5'

import { corsResponse } from '../_shared/cors.ts'
import { db } from '../_shared/db.ts'
import { errorResponse, jsonResponse } from '../_shared/response.ts'
import { formatUser, type DbUser } from '../_shared/types.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const JWT_SECRET = Deno.env.get('SUPABASE_JWT_SECRET')!

// Used only for password verification — anon key is sufficient
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

async function validateClientCredentials(clientId: string, clientSecret: string): Promise<boolean> {
  const { data } = await db
    .from('oauth_clients')
    .select('client_secret_hash')
    .eq('client_id', clientId)
    .single()
  if (!data) return false
  return bcryptjs.compare(clientSecret, data.client_secret_hash as string)
}

async function issueAccessToken(userId: string, email: string): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET)
  return new jose.SignJWT({ email, role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(secret)
}

async function issueRefreshToken(userId: string, clientId: string): Promise<string> {
  const rawBytes = crypto.getRandomValues(new Uint8Array(32))
  const token = btoa(String.fromCharCode(...rawBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await db
    .from('refresh_tokens')
    .insert({ user_id: userId, client_id: clientId, token_hash: tokenHash, expires_at: expiresAt })
  if (error) throw error

  return token
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsResponse()
  if (req.method !== 'POST') return errorResponse(405, 'Method not allowed.')

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return errorResponse(400, 'Invalid JSON body.')
  }

  const { grantType, clientId, clientSecret } = body as {
    clientId?: string
    clientSecret?: string
    grantType?: string
  }

  if (!clientId || !clientSecret) {
    return errorResponse(401, 'Client credentials required.')
  }
  const clientValid = await validateClientCredentials(clientId, clientSecret)
  if (!clientValid) return errorResponse(401, 'Invalid client credentials.')

  // -------------------------------------------------------------------------
  // Password grant
  // -------------------------------------------------------------------------
  if (grantType === 'password') {
    const { email, password } = body as { email?: string; password?: string }
    if (!email || !password) return errorResponse(400, 'email and password are required.')

    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    })
    if (authError || !authData.user) {
      return errorResponse(401, 'Invalid email or password.')
    }

    const userId = authData.user.id
    const { data: profile, error: profileError } = await db
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (profileError || !profile) {
      return errorResponse(500, 'Something went wrong. Please try again.')
    }

    const accessToken = await issueAccessToken(userId, authData.user.email!)
    const refreshToken = await issueRefreshToken(userId, clientId)

    return jsonResponse({
      accessToken,
      refreshToken,
      user: formatUser(profile as DbUser),
    })
  }

  // -------------------------------------------------------------------------
  // Refresh token grant
  // -------------------------------------------------------------------------
  if (grantType === 'refreshToken') {
    const { refreshToken: rawToken } = body as { refreshToken?: string }
    if (!rawToken) return errorResponse(400, 'refreshToken is required.')

    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken))
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const { data: tokenRow, error: tokenError } = await db
      .from('refresh_tokens')
      .select('id, user_id')
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (tokenError || !tokenRow) return errorResponse(401, 'Invalid or expired refresh token.')

    // Revoke old token immediately (single-use rotation)
    await db
      .from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', tokenRow.id)

    const userId = tokenRow.user_id as string
    const { data: profile, error: profileError } = await db
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (profileError || !profile) {
      return errorResponse(500, 'Something went wrong. Please try again.')
    }

    const accessToken = await issueAccessToken(userId, (profile as DbUser).email)
    const newRefreshToken = await issueRefreshToken(userId, clientId)

    return jsonResponse({
      accessToken,
      refreshToken: newRefreshToken,
      user: formatUser(profile as DbUser),
    })
  }

  return errorResponse(400, 'Invalid grantType. Must be "password" or "refreshToken".')
})
