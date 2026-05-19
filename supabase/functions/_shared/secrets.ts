// Priority order for the HS256 signing secret:
// 1. SUPABASE_JWT_SECRET — injected in production Supabase hosted environment
// 2. EDGE_JWT_SECRET    — injected by `mise run functions:serve` for local hot-reload dev
// 3. SUPABASE_JWKS oct  — Docker edge runtime (supabase start) exposes the JWKS which
//                         contains the symmetric key as a base64url `k` value
function extractOctKeyFromJwks(jwksStr: string): string | undefined {
  try {
    const { keys } = JSON.parse(jwksStr) as { keys: Array<{ kty: string; k?: string }> }
    const octKey = keys?.find((k) => k.kty === 'oct')
    if (!octKey?.k) return undefined
    const b64 = octKey.k.replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return undefined
  }
}

export const jwtSecret: string | undefined =
  Deno.env.get('SUPABASE_JWT_SECRET') ??
  Deno.env.get('EDGE_JWT_SECRET') ??
  (Deno.env.get('SUPABASE_JWKS') ? extractOctKeyFromJwks(Deno.env.get('SUPABASE_JWKS')!) : undefined)
