"use server"

import { supabaseAdmin } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { hash } from "bcryptjs"
import { revalidatePath } from "next/cache"

export async function getUsersByRole(role: "SANTRI" | "GURU") {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const { data, error } = await supabaseAdmin
        .from('User')
        .select(`
            id,
            name,
            username,
            role,
            parentName,
            subject,
            isActive,
            halaqah:halaqahId (id, name),
            shift:shiftId (id, name),
            createdAt
        `)
        .eq('role', role)
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching users by role:', error)
        throw new Error('Failed to fetch users')
    }

    return data
}

export async function createSantriOrGuru(data: {
    name: string
    username: string
    password?: string
    role: "SANTRI" | "GURU"
    parentName?: string
    subject?: string
    halaqahId?: string
    shiftId?: string
    isActive?: boolean
}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const password = data.password || data.username
    const hashedPassword = await hash(password, 10)

    try {
        const { error } = await supabaseAdmin
            .from('User')
            .insert({
                name: data.name,
                username: data.username,
                password: hashedPassword,
                role: data.role,
                parentName: data.parentName,
                subject: data.subject,
                halaqahId: data.halaqahId,
                shiftId: data.shiftId,
                isActive: data.isActive ?? true,
            })

        if (error) {
            console.error("Error creating user:", error)
            console.error('Error details:', JSON.stringify(error, null, 2))
            console.error('Attempted to insert:', {
                username: data.username,
                role: data.role,
                halaqahId: data.halaqahId,
                shiftId: data.shiftId
            })

            // Check for specific error types
            if (error.code === '23505') {
                // Unique constraint violation
                return { success: false, error: `Username/NIS/NIP "${data.username}" sudah digunakan` }
            } else if (error.message?.includes('null value')) {
                return { success: false, error: `Error: ${error.message}` }
            } else {
                return { success: false, error: `Gagal membuat user: ${error.message || 'Unknown error'}` }
            }
        }

        revalidatePath(`/admin/${data.role.toLowerCase()}`)
        return { success: true }
    } catch (error) {
        console.error("Error creating user:", error)
        return { success: false, error: "Username/NIS/NIP already exists" }
    }
}

export async function createBulkUsers(users: Array<{
    name: string
    username: string
    password?: string
    role: "SANTRI" | "GURU"
    parentName?: string
    subject?: string
    halaqahId?: string
    shiftId?: string
    isActive?: boolean
}>) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const results = { success: 0, failed: 0, errors: [] as string[] }

    for (const user of users) {
        try {
            const password = user.password || user.username
            const hashedPassword = await hash(password, 10)

            const { error } = await supabaseAdmin
                .from('User')
                .insert({
                    name: user.name,
                    username: user.username,
                    password: hashedPassword,
                    role: user.role,
                    parentName: user.parentName,
                    subject: user.subject,
                    halaqahId: user.halaqahId,
                    shiftId: user.shiftId,
                    isActive: user.isActive ?? true,
                })

            if (error) {
                throw new Error(error.message)
            }

            results.success++
        } catch (error: any) {
            results.failed++
            results.errors.push(`${user.username}: ${error.message}`)
        }
    }

    revalidatePath(`/admin/santri`)
    revalidatePath(`/admin/guru`)
    return results
}

export async function deleteUserById(userId: string, role: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const { error } = await supabaseAdmin
        .from('User')
        .delete()
        .eq('id', userId)

    if (error) {
        console.error('Error deleting user:', error)
        throw new Error('Failed to delete user')
    }

    revalidatePath(`/admin/${role.toLowerCase()}`)
}

export async function toggleUserActive(userId: string, isActive: boolean) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const { error } = await supabaseAdmin
        .from('User')
        .update({ isActive })
        .eq('id', userId)

    if (error) {
        console.error('Error toggling user active:', error)
        throw new Error('Failed to update user status')
    }

    revalidatePath(`/admin/santri`)
    revalidatePath(`/admin/guru`)
}

export async function updateSantriOrGuru(userId: string, data: {
    name: string
    username: string
    parentName?: string
    subject?: string
    halaqahId?: string
    shiftId?: string
}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    try {
        const { error } = await supabaseAdmin
            .from('User')
            .update({
                name: data.name,
                username: data.username,
                parentName: data.parentName,
                subject: data.subject,
                halaqahId: data.halaqahId || null,
                shiftId: data.shiftId || null,
            })
            .eq('id', userId)

        if (error) {
            console.error("Error updating user:", error)
            return { success: false, error: "Username/NIS/NIP already exists" }
        }

        revalidatePath(`/admin/santri`)
        revalidatePath(`/admin/guru`)
        return { success: true }
    } catch (error) {
        console.error("Error updating user:", error)
        return { success: false, error: "Username/NIS/NIP already exists" }
    }
}
