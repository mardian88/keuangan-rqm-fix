"use server"

import { supabaseAdmin } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"

export async function getAnnouncements() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const { data, error } = await supabaseAdmin
        .from('Announcement')
        .select(`
            *,
            createdBy:createdById (
                name
            )
        `)
        .order('createdAt', { ascending: false })

    if (error) {
        console.error('Error fetching announcements:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        throw new Error('Failed to fetch announcements')
    }

    return data
}

export async function getActiveAnnouncements(role: "KOMITE" | "SANTRI") {
    const session = await getServerSession(authOptions)
    if (!session) {
        return []
    }

    let query = supabaseAdmin
        .from('Announcement')
        .select('id, title, content, createdAt')
        .eq('isActive', true)

    if (role === "KOMITE") {
        query = query.eq('showToKomite', true)
    } else {
        query = query.eq('showToSantri', true)
    }

    const { data, error } = await query.order('createdAt', { ascending: false })

    if (error) {
        console.error('Error fetching active announcements:', error)
        return []
    }

    return data
}

export async function createAnnouncement(data: {
    title: string
    content: string
    showToKomite: boolean
    showToSantri: boolean
}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    try {
        const { error } = await supabaseAdmin
            .from('Announcement')
            .insert({
                title: data.title,
                content: data.content,
                showToKomite: data.showToKomite,
                showToSantri: data.showToSantri,
                createdById: session.user.id
            })

        if (error) {
            console.error("Error creating announcement:", error)
            console.error('Error details:', JSON.stringify(error, null, 2))
            console.error('Attempted to insert:', { title: data.title, createdById: session.user.id })
            return { success: false, error: `Failed to create announcement: ${error.message || 'Unknown error'}` }
        }

        revalidatePath("/admin/announcements")
        revalidatePath("/komite")
        revalidatePath("/santri")
        return { success: true }
    } catch (error) {
        console.error("Error creating announcement:", error)
        return { success: false, error: "Failed to create announcement" }
    }
}

export async function updateAnnouncement(id: string, data: {
    title: string
    content: string
    showToKomite: boolean
    showToSantri: boolean
    isActive: boolean
}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    try {
        const { error } = await supabaseAdmin
            .from('Announcement')
            .update({
                title: data.title,
                content: data.content,
                showToKomite: data.showToKomite,
                showToSantri: data.showToSantri,
                isActive: data.isActive
            })
            .eq('id', id)

        if (error) {
            console.error("Error updating announcement:", error)
            console.error('Error details:', JSON.stringify(error, null, 2))
            return { success: false, error: `Failed to update announcement: ${error.message || 'Unknown error'}` }
        }

        revalidatePath("/admin/announcements")
        revalidatePath("/komite")
        revalidatePath("/santri")
        return { success: true }
    } catch (error) {
        console.error("Error updating announcement:", error)
        return { success: false, error: "Failed to update announcement" }
    }
}

export async function deleteAnnouncement(id: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const { error } = await supabaseAdmin
        .from('Announcement')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting announcement:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        throw new Error(`Failed to delete announcement: ${error.message || 'Unknown error'}`)
    }

    revalidatePath("/admin/announcements")
    revalidatePath("/komite")
    revalidatePath("/santri")
}
