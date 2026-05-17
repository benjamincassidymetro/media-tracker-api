import { handleAuthError, requireAuth } from '../_shared/auth.ts'
import { corsResponse } from '../_shared/cors.ts'
import { errorResponse } from '../_shared/response.ts'

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsResponse()

  const url = new URL(req.url)
  const parts = url.pathname.replace(/^\/functions\/v1\//, '').split('/')
  const [, segment, subResource] = parts // parts[0] = 'quotes'

  try {
    const { userId } = await requireAuth(req)

    if (segment === undefined) {
      if (req.method === 'GET') {
        // TODO: handleGetQuotes(userId, url.searchParams)
        return errorResponse(501, 'Not implemented.')
      }
      if (req.method === 'POST') {
        // TODO: handleCreateQuote(req, userId)
        return errorResponse(501, 'Not implemented.')
      }
      return errorResponse(405, 'Method not allowed.')
    }

    const quoteId = parseInt(segment, 10)
    if (isNaN(quoteId)) return errorResponse(404, 'Not found.')

    if (subResource === 'likes') {
      if (req.method === 'POST') {
        // TODO: handleLikeQuote(quoteId, userId)
        return errorResponse(501, 'Not implemented.')
      }
      if (req.method === 'DELETE') {
        // TODO: handleUnlikeQuote(quoteId, userId)
        return errorResponse(501, 'Not implemented.')
      }
      return errorResponse(405, 'Method not allowed.')
    }

    if (req.method === 'PUT') {
      // TODO: handleUpdateQuote(req, quoteId, userId)
      return errorResponse(501, 'Not implemented.')
    }
    if (req.method === 'DELETE') {
      // TODO: handleDeleteQuote(quoteId, userId)
      return errorResponse(501, 'Not implemented.')
    }
    return errorResponse(405, 'Method not allowed.')
  } catch (err) {
    return handleAuthError(err)
  }
})
