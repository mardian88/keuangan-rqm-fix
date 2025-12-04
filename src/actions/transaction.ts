"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"

export async function createTransaction(data: {
    type: string
    amount: number
    description?: string
    studentId?: string
    teacherId?: string
    date: Date
}) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "KOMITE")) {
        throw new Error("Unauthorized")
    }

    // Determine if this transaction requires handover
    // Fetch category to check type
    const category = await prisma.transactionCategory.findUnique({
        where: { code: data.type }
    })

    // If category not found (e.g. SPP might not be in DB if hardcoded in some places, but we seeded it),
    // Fallback to checking if it's a known income type
    const knownIncomeTypes = ["SPP", "KAS", "TABUNGAN", "PEMASUKAN_LAIN"]
    // Handover logic: Only TABUNGAN and KAS (Income) collected by ADMIN need handover.
    // SPP and other incomes do NOT need handover.
    const handoverTypes = ["TABUNGAN", "KAS"]
    const isHandover = session.user.role === "ADMIN" && handoverTypes.includes(data.type)

    await prisma.transaction.create({
        data: {
            type: data.type,
            amount: data.amount,
            description: data.description,
            date: data.date,
            studentId: data.studentId,
            teacherId: data.teacherId,
            creatorId: session.user.id,
            isHandover: isHandover,
            handoverStatus: isHandover ? "PENDING" : "NONE",
        },
    })

    revalidatePath("/admin")
    revalidatePath("/admin/transactions")
}
