"use server"

import { supabaseAdmin } from "@/lib/db"

export async function getGurus() {
    const { data, error } = await supabaseAdmin
        .from('User')
        .select('id, name, username')
        .eq('role', 'GURU')
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching gurus:', error)
        throw new Error('Failed to fetch gurus')
    }

    return data
}
