import { handleAuthError, requireAuth } from '../_shared/auth.ts'
import { corsResponse } from '../_shared/cors.ts'
import { errorResponse } from '../_shared/response.ts'

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsResponse()

  const url = new URL(req.url)
  const parts = url.pathname.replace(/^\/functions\/v1\//, '').split('/')
  const [, segment] = parts // parts[0] = 'reviews'

  try {
    const { userId } = await requireAuth(req)

    if (segment === undefined) {
      if (req.method === 'GET') {
        // TODO: handleGetReviews(url.searchParams)
        return errorResponse(501, 'Not implemented.')
      }
      if (req.method === 'POST') {
        // TODO: handleCreateReview(req, userId)
        return errorResponse(501, 'Not implemented.')
      }
      return errorResponse(405, 'Method not allowed.')
    }

    const reviewId = parseInt(segment, 10)
    if (isNaN(reviewId)) return errorResponse(404, 'Not found.')

    if (req.method === 'PUT') {
      // TODO: handleUpdateReview(req, reviewId, userId)
      return errorResponse(501, 'Not implemented.')
    }
    if (req.method === 'DELETE') {
      // TODO: handleDeleteReview(reviewId, userId)
      return errorResponse(501, 'Not implemented.')
    }
    return errorResponse(405, 'Method not allowed.')
  } catch (err) {
    return handleAuthError(err)
  }
})
