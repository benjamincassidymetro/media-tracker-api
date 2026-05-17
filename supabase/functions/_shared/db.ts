import { createClient } from '@supabase/supabase-js'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

// Service role client — bypasses RLS. Used for all Edge Function database operations.
// Never expose this client or its key to end users.
export const db = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
})
