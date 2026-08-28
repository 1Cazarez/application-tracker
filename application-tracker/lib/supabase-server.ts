import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client scoped to a caller's access token. Reads through it are
 * subject to the same RLS policies as the browser client, so a route handler
 * can only see the data its caller can see.
 */
export function createUserClient(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
}

export function getAccessToken(req: Request) {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length)
}
