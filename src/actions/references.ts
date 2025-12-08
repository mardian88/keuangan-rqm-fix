"use server"

import { supabaseAdmin } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"

// --- Halaqah ---

export async function getHalaqahs() {
    const { data, error } = await supabaseAdmin
        .from('Halaqah')
        .select('*')
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching halaqahs:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        throw new Error('Failed to fetch halaqahs')
    }

    return data
}

export async function createHalaqah(name: string) {
    const session = await getServerSession(authOptions)

    // Debug logging
    console.log('Session in createHalaqah:', session)
    console.log('User role:', session?.user?.role)

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized - Please logout and login again to refresh your session")
    }

    const { error } = await supabaseAdmin
        .from('Halaqah')
        .insert({ name })

    if (error) {
        console.error('Error creating halaqah:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        console.error('Attempted to insert:', { name })
        throw new Error(`Failed to create halaqah: ${error.message || 'Unknown error'}`)
    }

    revalidatePath("/admin/settings")
}

export async function deleteHalaqah(id: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized")

    const { error } = await supabaseAdmin
        .from('Halaqah')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting halaqah:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        throw new Error(`Failed to delete halaqah: ${error.message || 'Unknown error'}`)
    }

    revalidatePath("/admin/settings")
}

// --- Shift ---

export async function getShifts() {
    const { data, error } = await supabaseAdmin
        .from('Shift')
        .select('*')
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching shifts:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        throw new Error('Failed to fetch shifts')
    }

    return data
}

export async function createShift(name: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized")

    const { error } = await supabaseAdmin
        .from('Shift')
        .insert({ name })

    if (error) {
        console.error('Error creating shift:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        console.error('Attempted to insert:', { name })
        throw new Error(`Failed to create shift: ${error.message || 'Unknown error'}`)
    }

    revalidatePath("/admin/settings")
}

export async function deleteShift(id: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized")

    const { error } = await supabaseAdmin
        .from('Shift')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting shift:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        throw new Error(`Failed to delete shift: ${error.message || 'Unknown error'}`)
    }

    revalidatePath("/admin/settings")
}
