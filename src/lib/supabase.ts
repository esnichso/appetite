import { createBrowserClient } from '@supabase/ssr'

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url || url === 'your_supabase_url') {
    return 'https://placeholder.supabase.co'
  }
  return url
}

function getSupabaseKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key || key === 'your_supabase_anon_key') {
    return 'placeholder-key'
  }
  return key
}

export function createClient() {
  return createBrowserClient(
    getSupabaseUrl(),
    getSupabaseKey()
  )
}
