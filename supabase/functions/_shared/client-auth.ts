import bcryptjs from 'npm:bcryptjs@^2'

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
    return { ok: false, response: errorResponse(401, 'Invalid client credentials.') }
  }

  const hash = data.client_secret_hash as string
  const match = await bcryptjs.compare(clientSecret, hash)
  console.log(`[${tag}] secret compare`, { clientId, match, hashPrefix: hash.slice(0, 7) })

  if (!match) {
    return { ok: false, response: errorResponse(401, 'Invalid client credentials.') }
  }

  return { ok: true }
}
