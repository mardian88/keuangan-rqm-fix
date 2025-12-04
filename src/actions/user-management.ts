"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { hash } from "bcryptjs"
import { revalidatePath } from "next/cache"

export async function getUsersByRole(role: "SANTRI" | "GURU") {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    return await prisma.user.findMany({
        where: { role },
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            username: true,
            role: true,
            parentName: true,
            subject: true,
            isActive: true,
            halaqah: { select: { id: true, name: true } },
            shift: { select: { id: true, name: true } },
            createdAt: true,
        }
    })
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
        await prisma.user.create({
            data: {
                name: data.name,
                username: data.username,
                password: hashedPassword,
                role: data.role,
                parentName: data.parentName,
                subject: data.subject,
                halaqahId: data.halaqahId,
                shiftId: data.shiftId,
                isActive: data.isActive ?? true,
            },
        })
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

            await prisma.user.create({
                data: {
                    name: user.name,
                    username: user.username,
                    password: hashedPassword,
                    role: user.role,
                    parentName: user.parentName,
                    subject: user.subject,
                    halaqahId: user.halaqahId,
                    shiftId: user.shiftId,
                    isActive: user.isActive ?? true,
                },
            })
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

    await prisma.user.delete({
        where: { id: userId },
    })
    revalidatePath(`/admin/${role.toLowerCase()}`)
}

export async function toggleUserActive(userId: string, isActive: boolean) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    await prisma.user.update({
        where: { id: userId },
        data: { isActive },
    })
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
        await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                username: data.username,
                parentName: data.parentName,
                subject: data.subject,
                halaqahId: data.halaqahId || null,
                shiftId: data.shiftId || null,
            },
        })
        revalidatePath(`/admin/santri`)
        revalidatePath(`/admin/guru`)
        return { success: true }
    } catch (error) {
        console.error("Error updating user:", error)
        return { success: false, error: "Username/NIS/NIP already exists" }
    }
}
