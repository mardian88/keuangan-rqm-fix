import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jiipbznncfhmyseoaxqw.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppaXBiem5uY2ZobXlzZW9heHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MzEyODcsImV4cCI6MjA4MDUwNzI4N30.NP-HzG-HFFznnIaeIPqv0gddSr9qcVKa3f9_nqh5Rj0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
