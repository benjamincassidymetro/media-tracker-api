import { db } from './db.ts'
import { errorResponse } from './response.ts'

export type ClientAuthResult =
  | { ok: true }
  | { ok: false; response: Response }

export async function validateClientCredentials(
  clientId: string,
  clientSecret: string,
  tag: string,
): Promise<ClientAuthResult> {
  const { data, error } = await db
    .from('oauth_clients')
    .select('client_secret_hash')
    .eq('client_id', clientId)
    .single()

  if (error || !data) {
    console.error(`[${tag}] client lookup failed`, { clientId, error: error?.message ?? 'no row' })
    return { ok: false, response: errorResponse(401, 'Invalid client credentials.', 'INVALID_CLIENT_CREDENTIALS') }
  }

  const match = clientSecret === (data.client_secret_hash as string)
  console.log(`[${tag}] compare`, { clientId, match })

  if (!match) return { ok: false, response: errorResponse(401, 'Invalid client credentials.', 'INVALID_CLIENT_CREDENTIALS') }
  return { ok: true }
}
