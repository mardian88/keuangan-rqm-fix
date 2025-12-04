"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"

export async function getHandoverStats() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return {
            totalPending: 0,
            byType: {},
            count: 0
        }
    }

    const pendingTransactions = await prisma.transaction.findMany({
        where: {
            isHandover: true,
            handoverStatus: "PENDING",
        },
    })

    const totalPending = pendingTransactions.reduce((acc, curr) => acc + curr.amount, 0)

    const byType = pendingTransactions.reduce((acc, curr) => {
        acc[curr.type] = (acc[curr.type] || 0) + curr.amount
        return acc
    }, {} as Record<string, number>)

    return {
        totalPending,
        byType,
        count: pendingTransactions.length
    }
}

export async function performHandover() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    // Update all PENDING transactions to COMPLETED
    await prisma.transaction.updateMany({
        where: {
            isHandover: true,
            handoverStatus: "PENDING",
        },
        data: {
            handoverStatus: "COMPLETED",
            handoverDate: new Date(),
        },
    })

    revalidatePath("/admin")
    revalidatePath("/admin/handover")
    revalidatePath("/komite")
}
