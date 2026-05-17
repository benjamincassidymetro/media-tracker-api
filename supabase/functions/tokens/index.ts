import { corsResponse, CORS_HEADERS } from '../_shared/cors.ts'
import { errorResponse, jsonResponse } from '../_shared/response.ts'

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return corsResponse()
  if (req.method !== 'POST') return errorResponse(405, 'Method not allowed.')

  // TODO: implement POST /tokens (password grant + refresh token grant)
  return new Response(JSON.stringify({ message: 'Not implemented.' }), {
    status: 501,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
