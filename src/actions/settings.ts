"use server"

import { supabaseAdmin } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { hash } from "bcryptjs"
import { revalidatePath } from "next/cache"

export async function getUsers() {
    const session = await getServerSession(authOptions)

    // Debug logging
    console.log('Session in getUsers:', session)
    console.log('User role:', session?.user?.role)

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized - Please logout and login again to refresh your session")
    }

    const { data, error } = await supabaseAdmin
        .from('User')
        .select('id, name, username, role, createdAt')
        .order('createdAt', { ascending: false })

    if (error) {
        console.error('Error fetching users:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        throw new Error('Failed to fetch users')
    }

    return data || []
}

export async function createUser(data: {
    name: string
    username: string
    password: string
    role: "ADMIN" | "KOMITE" | "SANTRI"
}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const hashedPassword = await hash(data.password, 10)

    try {
        const { error } = await supabaseAdmin
            .from('User')
            .insert({
                name: data.name,
                username: data.username,
                password: hashedPassword,
                role: data.role,
            })

        if (error) {
            console.error("Error creating user:", error)
            return { success: false, error: "Username already exists or other error" }
        }

        revalidatePath("/admin/settings")
        return { success: true }
    } catch (error) {
        console.error("Error creating user:", error)
        return { success: false, error: "Username already exists or other error" }
    }
}

export async function deleteUser(userId: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    if (userId === session.user.id) {
        throw new Error("Cannot delete yourself")
    }

    const { error } = await supabaseAdmin
        .from('User')
        .delete()
        .eq('id', userId)

    if (error) {
        console.error('Error deleting user:', error)
        throw new Error('Failed to delete user')
    }

    revalidatePath("/admin/settings")
}
