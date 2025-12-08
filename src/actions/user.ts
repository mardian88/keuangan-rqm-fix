"use server"

import { supabaseAdmin } from "@/lib/db"

import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function getStudents() {
    const session = await getServerSession(authOptions)
    const isKomite = session?.user.role === "KOMITE"

    let query = supabaseAdmin
        .from('User')
        .select('id, name, username')
        .eq('role', 'SANTRI')
        .order('name', { ascending: true })

    const { data, error } = await query

    if (error) {
        console.error('Error fetching students:', error)
        throw new Error('Failed to fetch students')
    }

    // If Komite, remove username from results
    if (isKomite) {
        return data.map(({ id, name }) => ({ id, name, username: '' }))
    }

    return data
}

export async function getStudentsWithInstallmentStatus() {
    const session = await getServerSession(authOptions)
    const isKomite = session?.user.role === "KOMITE"

    const { data, error } = await supabaseAdmin
        .from('User')
        .select(`
            id,
            name,
            username,
            sppInstallmentSettings:SppInstallmentSettings (
                isActive
            )
        `)
        .eq('role', 'SANTRI')
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching students with installment status:', error)
        throw new Error('Failed to fetch students')
    }

    // Transform data to include hasActiveInstallment flag
    const students = data.map((student: any) => ({
        id: student.id,
        name: student.name,
        username: isKomite ? '' : student.username,
        hasActiveInstallment: student.sppInstallmentSettings?.[0]?.isActive || false
    }))

    return students
}
