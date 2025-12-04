"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"

export async function getAnnouncements() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    return await prisma.announcement.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            createdBy: {
                select: {
                    name: true
                }
            }
        }
    })
}

export async function getActiveAnnouncements(role: "KOMITE" | "SANTRI") {
    const session = await getServerSession(authOptions)
    if (!session) {
        return []
    }

    const whereClause = role === "KOMITE"
        ? { isActive: true, showToKomite: true }
        : { isActive: true, showToSantri: true }

    return await prisma.announcement.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            title: true,
            content: true,
            createdAt: true
        }
    })
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
        await prisma.announcement.create({
            data: {
                title: data.title,
                content: data.content,
                showToKomite: data.showToKomite,
                showToSantri: data.showToSantri,
                createdById: session.user.id
            }
        })
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
        await prisma.announcement.update({
            where: { id },
            data: {
                title: data.title,
                content: data.content,
                showToKomite: data.showToKomite,
                showToSantri: data.showToSantri,
                isActive: data.isActive
            }
        })
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

    await prisma.announcement.delete({
        where: { id }
    })
    revalidatePath("/admin/announcements")
    revalidatePath("/komite")
    revalidatePath("/santri")
}
