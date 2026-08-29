import { createClient } from '@supabase/supabase-js'

// Server-only client — uses the secret key, bypasses RLS.
// NEVER import this file in a component that runs in the browser.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}