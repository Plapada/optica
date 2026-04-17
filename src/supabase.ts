import { createClient } from '@supabase/supabase-js'

// Valores padrão hardcoded — anon key é pública por design.
// Env vars sobrescrevem se definidas (para desenvolvimento local).
const DEFAULT_URL = 'https://wfymppgbztripnwgddwo.supabase.co'
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmeW1wcGdienRyaXBud2dkZHdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjgxMjUsImV4cCI6MjA5MTM0NDEyNX0.GWa-wfPx5PCFqzPLrYLgK8nWIooga80mWmN04O4lngM'

const url = (import.meta.env.VITE_SUPABASE_URL as string) || DEFAULT_URL
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_ANON_KEY

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true }
})
