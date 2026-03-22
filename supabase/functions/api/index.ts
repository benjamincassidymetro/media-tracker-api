import { handleAuth } from './lib/auth.ts'
import { handleMedia } from './lib/media.ts'
import { handleLibrary } from './lib/library.ts'
import { handleReviews } from './lib/reviews.ts'
import { handleSocial } from './lib/social.ts'
import { handleGoals } from './lib/goals.ts'
import { handleQuotes } from './lib/quotes.ts'
import { handlePriorities } from './lib/priorities.ts'
import { CORS_HEADERS } from './lib/supabase.ts'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

function extractPath(url: URL): string {
  // Strip the function-name prefix so callers get a clean path like /auth/signup
  // URL patterns: /functions/v1/api/auth/signup  OR  /api/auth/signup
  const raw = url.pathname
  const match = raw.match(/\/api(\/.*)?$/)
  return match ? (match[1] || '/') : raw
}

function docsJson(url: URL) {
  const base = `${url.origin}${url.pathname.replace(/\/docs$/, '')}`
  return {
    name: 'Media Tracker API',
    description: 'Supabase Edge Function API for the Media Tracker course',
    version: '1.0',
    routes: [
      { path: '/auth/signup', method: 'POST', summary: 'Create a new user account' },
      { path: '/auth/login', method: 'POST', summary: 'Authenticate user, returns access + refresh token' },
      { path: '/auth/refresh', method: 'POST', summary: 'Exchange refresh token for new access token' },
      { path: '/media', method: 'GET', summary: 'Search media items (query, type, genre, etc.)' },
      { path: '/media/:id', method: 'GET', summary: 'Get a media item by ID' },
      { path: '/users/me', method: 'GET', summary: 'Get own profile' },
      { path: '/users/me', method: 'PUT', summary: 'Update own profile' },
      { path: '/library', method: 'GET/POST', summary: 'Manage logged-in user library' },
      { path: '/reviews', method: 'GET/POST', summary: 'List and create reviews' },
      { path: '/activity', method: 'GET', summary: 'Get activity feed' },
      { path: '/followers', method: 'GET/POST/DELETE', summary: 'Manage follower relationships' },
      { path: '/goals', method: 'GET/POST', summary: 'Manage reading goals' },
      { path: '/quotes', method: 'GET/POST', summary: 'Manage quotes and quote likes' },
      { path: '/priorities', method: 'GET/PUT', summary: 'Manage want-to media priorities' },
      { path: '/docs', method: 'GET', summary: 'API introspection endpoint' },
    ],
    sample: {
      docs: `${base}/docs`,
      getMedia: `${base}/media?query=harry&limit=5`,
      signup: `${base}/auth/signup`,
    },
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Pre-flight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const url = new URL(req.url)
  const path = extractPath(url)
  const method = req.method
  const segments = path.split('/').filter(Boolean) // e.g. ['auth', 'signup']

  try {
    // ── Authentication ───────────────────────────────────────────────────
    if (segments[0] === 'auth') {
      return await handleAuth(req, segments, method, url, json)
    }

    // ── Media ────────────────────────────────────────────────────────────
    if (segments[0] === 'media') {
      return await handleMedia(req, segments, method, url, json)
    }

    // ── Users ────────────────────────────────────────────────────────────
    if (segments[0] === 'users') {
      return await handleMedia(req, segments, method, url, json)
    }

    // ── Library ──────────────────────────────────────────────────────────
    if (segments[0] === 'library') {
      return await handleLibrary(req, segments, method, url, json)
    }

    // ── Reviews ──────────────────────────────────────────────────────────
    if (segments[0] === 'reviews') {
      return await handleReviews(req, segments, method, url, json)
    }

    // ── Social: activity + followers ─────────────────────────────────────
    if (segments[0] === 'activity' || segments[0] === 'followers') {
      return await handleSocial(req, segments, method, url, json)
    }

    // ── Goals ────────────────────────────────────────────────────────────
    if (segments[0] === 'goals') {
      return await handleGoals(req, segments, method, url, json)
    }

    // ── Quotes ───────────────────────────────────────────────────────────
    if (segments[0] === 'quotes') {
      return await handleQuotes(req, segments, method, url, json)
    }

    // ── Docs ─────────────────────────────────────────────────────────────
    if (segments[0] === 'docs' && method === 'GET') {
      return json(docsJson(url))
    }

    // ── Priorities ───────────────────────────────────────────────────────
    if (segments[0] === 'priorities') {
      return await handlePriorities(req, segments, method, url, json)
    }

    return json({ error: 'Not found' }, 404)
  } catch (err) {
    // requireAuth throws a Response directly for 401 errors
    if (err instanceof Response) return err
    console.error('[api]', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
