import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side client with service role for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

// Database helper types
export type DbResult<T> = {
    data: T | null
    error: Error | null
}

// Helper function to handle Supabase errors
export function handleDbError<T>(result: { data: T | null; error: any }): DbResult<T> {
    if (result.error) {
        console.error('Database error:', result.error)
        return {
            data: null,
            error: new Error(result.error.message || 'Database operation failed')
        }
    }
    return {
        data: result.data,
        error: null
    }
}

// Helper to execute queries with error handling
export async function executeQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<T> {
    const result = await queryFn()
    if (result.error) {
        console.error('Database error:', result.error)
        throw new Error(result.error.message || 'Database operation failed')
    }
    return result.data as T
}
