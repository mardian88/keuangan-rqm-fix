"use server"

import { prisma } from "@/lib/prisma"
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

    return await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            username: true,
            role: true,
            createdAt: true,
        }
    })
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
        await prisma.user.create({
            data: {
                name: data.name,
                username: data.username,
                password: hashedPassword,
                role: data.role,
            },
        })
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

    await prisma.user.delete({
        where: { id: userId },
    })
    revalidatePath("/admin/settings")
}
