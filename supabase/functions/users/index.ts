import { handleAuthError, requireAuth } from '../_shared/auth.ts'
import { corsResponse } from '../_shared/cors.ts'
import { errorResponse } from '../_shared/response.ts'
import { isValidUUID } from '../_shared/validate.ts'

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsResponse()

  const url = new URL(req.url)
  // Strip the function prefix: /functions/v1/users/...
  const parts = url.pathname.replace(/^\/functions\/v1\//, '').split('/')
  const [, segment, subResource] = parts // parts[0] = 'users'

  try {
    // POST /users — no auth required
    if (req.method === 'POST' && segment === undefined) {
      // TODO: handleCreateUser(req)
      return errorResponse(501, 'Not implemented.')
    }

    // All other routes require auth
    const { userId } = await requireAuth(req)

    if (segment === 'me') {
      if (req.method === 'GET') {
        // TODO: handleGetMe(userId)
        return errorResponse(501, 'Not implemented.')
      }
      if (req.method === 'PUT') {
        // TODO: handleUpdateMe(req, userId)
        return errorResponse(501, 'Not implemented.')
      }
      return errorResponse(405, 'Method not allowed.')
    }

    if (segment === 'search') {
      if (req.method === 'GET') {
        // TODO: handleUserSearch(req, url.searchParams, userId)
        return errorResponse(501, 'Not implemented.')
      }
      return errorResponse(405, 'Method not allowed.')
    }

    // Dynamic segment — must be a valid UUID
    if (!segment || !isValidUUID(segment)) {
      return errorResponse(404, 'Not found.')
    }
    const targetUserId = segment

    if (subResource === undefined) {
      if (req.method === 'GET') {
        // TODO: handleGetUserById(targetUserId, userId)
        return errorResponse(501, 'Not implemented.')
      }
      return errorResponse(405, 'Method not allowed.')
    }

    if (subResource === 'followers') {
      if (req.method === 'GET') {
        // TODO: handleGetFollowers(targetUserId, url.searchParams, userId)
        return errorResponse(501, 'Not implemented.')
      }
      return errorResponse(405, 'Method not allowed.')
    }

    if (subResource === 'following') {
      if (req.method === 'GET') {
        // TODO: handleGetFollowing(targetUserId, url.searchParams, userId)
        return errorResponse(501, 'Not implemented.')
      }
      if (req.method === 'POST') {
        // TODO: handleFollow(targetUserId, userId)
        return errorResponse(501, 'Not implemented.')
      }
      if (req.method === 'DELETE') {
        // TODO: handleUnfollow(targetUserId, userId)
        return errorResponse(501, 'Not implemented.')
      }
      return errorResponse(405, 'Method not allowed.')
    }

    if (subResource === 'activity') {
      if (req.method === 'GET') {
        // TODO: handleUserActivity(targetUserId, url.searchParams)
        return errorResponse(501, 'Not implemented.')
      }
      return errorResponse(405, 'Method not allowed.')
    }

    if (subResource === 'library') {
      if (req.method === 'GET') {
        // TODO: handleUserLibrary(targetUserId, url.searchParams)
        return errorResponse(501, 'Not implemented.')
      }
      return errorResponse(405, 'Method not allowed.')
    }

    return errorResponse(404, 'Not found.')
  } catch (err) {
    return handleAuthError(err)
  }
})
