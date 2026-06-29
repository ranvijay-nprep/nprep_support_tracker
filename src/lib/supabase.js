import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://fsngfqiqxlgvdqdvccmu.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbmdmcWlxeGxndmRxZHZjY211Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzOTk0MzIsImV4cCI6MjA5Nzk3NTQzMn0.VOWiYYTkaza-LK0QwCBOA05y57MmSslqIhy8EuVt2dM'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
