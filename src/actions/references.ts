"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"

// --- Halaqah ---

export async function getHalaqahs() {
    return await prisma.halaqah.findMany({ orderBy: { name: "asc" } })
}

export async function createHalaqah(name: string) {
    const session = await getServerSession(authOptions)

    // Debug logging
    console.log('Session in createHalaqah:', session)
    console.log('User role:', session?.user?.role)

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized - Please logout and login again to refresh your session")
    }

    await prisma.halaqah.create({ data: { name } })
    revalidatePath("/admin/settings")
}

export async function deleteHalaqah(id: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized")

    await prisma.halaqah.delete({ where: { id } })
    revalidatePath("/admin/settings")
}

// --- Shift ---

export async function getShifts() {
    return await prisma.shift.findMany({ orderBy: { name: "asc" } })
}

export async function createShift(name: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized")

    await prisma.shift.create({ data: { name } })
    revalidatePath("/admin/settings")
}

export async function deleteShift(id: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized")

    await prisma.shift.delete({ where: { id } })
    revalidatePath("/admin/settings")
}
