import { handleAuthError, requireAuth } from '../_shared/auth.ts'
import { corsResponse } from '../_shared/cors.ts'
import { errorResponse } from '../_shared/response.ts'

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsResponse()
  if (req.method !== 'GET') return errorResponse(405, 'Method not allowed.')

  const url = new URL(req.url)
  const parts = url.pathname.replace(/^\/functions\/v1\//, '').split('/')
  const [, segment] = parts // parts[0] = 'media'

  try {
    await requireAuth(req)

    if (segment === undefined) {
      // TODO: handleGetMedia(url.searchParams)
      return errorResponse(501, 'Not implemented.')
    }

    const mediaId = parseInt(segment, 10)
    if (isNaN(mediaId)) return errorResponse(404, 'Not found.')

    // TODO: handleGetMediaById(mediaId)
    return errorResponse(501, 'Not implemented.')
  } catch (err) {
    return handleAuthError(err)
  }
})
