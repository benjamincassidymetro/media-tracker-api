import { handleAuthError, requireAuth } from '../_shared/auth.ts'
import { corsResponse } from '../_shared/cors.ts'
import { errorResponse } from '../_shared/response.ts'

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const { userId } = await requireAuth(req)

    if (req.method === 'GET') {
      // TODO: handleGetPriorities(userId)
      return errorResponse(501, 'Not implemented.')
    }
    if (req.method === 'PUT') {
      // TODO: handleUpsertPriority(req, userId)
      return errorResponse(501, 'Not implemented.')
    }
    return errorResponse(405, 'Method not allowed.')
  } catch (err) {
    return handleAuthError(err)
  }
})
