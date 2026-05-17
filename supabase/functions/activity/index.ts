import { handleAuthError, requireAuth } from '../_shared/auth.ts'
import { corsResponse } from '../_shared/cors.ts'
import { errorResponse } from '../_shared/response.ts'

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsResponse()
  if (req.method !== 'GET') return errorResponse(405, 'Method not allowed.')

  const url = new URL(req.url)

  try {
    const { userId } = await requireAuth(req)
    // TODO: handleGetActivityFeed(userId, url.searchParams)
    return errorResponse(501, 'Not implemented.')
  } catch (err) {
    return handleAuthError(err)
  }
})
