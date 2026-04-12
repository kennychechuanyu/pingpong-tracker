import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://ogrhnvzqbgyeedvhvzao.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Bq9wvKHJn07H8jI8y_7G5A_3dj32T3h'

export const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

export const SUPABASE_URL = url
export const SUPABASE_KEY = key
