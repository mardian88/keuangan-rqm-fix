"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"

export async function getTransactionCategories(role: "ADMIN" | "KOMITE", type?: "INCOME" | "EXPENSE") {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const whereClause: any = { isActive: true }

    if (role === "KOMITE") {
        whereClause.showToKomite = true
    } else if (role === "ADMIN") {
        whereClause.showToAdmin = true
    }

    if (type) {
        whereClause.type = type
    }

    return await prisma.transactionCategory.findMany({
        where: whereClause,
        orderBy: { name: "asc" }
    })
}

export async function getAllCategories() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized")

    return await prisma.transactionCategory.findMany({
        orderBy: { createdAt: "desc" }
    })
}

export async function createCategory(data: {
    name: string
    type: "INCOME" | "EXPENSE"
    showToKomite: boolean
    showToAdmin: boolean
}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized")

    // Generate code from name (uppercase, replace spaces with underscores)
    const code = data.name.toUpperCase().replace(/\s+/g, "_")

    await prisma.transactionCategory.create({
        data: {
            ...data,
            code,
            isSystem: false
        }
    })

    revalidatePath("/admin/settings/categories")
}

export async function updateCategory(id: string, data: {
    name: string
    showToKomite: boolean
    showToAdmin: boolean
    isActive: boolean
}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized")

    const category = await prisma.transactionCategory.findUnique({ where: { id } })
    if (!category) throw new Error("Category not found")

    // If system category, prevent renaming if needed, but here we allow renaming display name
    // but maybe we should keep code same.

    await prisma.transactionCategory.update({
        where: { id },
        data
    })

    revalidatePath("/admin/settings/categories")
}

export async function deleteCategory(id: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized")

    const category = await prisma.transactionCategory.findUnique({ where: { id } })
    if (!category) throw new Error("Category not found")

    if (category.isSystem) {
        throw new Error("Cannot delete system category")
    }

    await prisma.transactionCategory.delete({ where: { id } })
    revalidatePath("/admin/settings/categories")
}
