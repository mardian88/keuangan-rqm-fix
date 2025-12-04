"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"

export async function createMassTransaction(data: {
    type: string
    amount: number
    description?: string
    studentIds: string[]
    date: Date
}) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "KOMITE")) {
        throw new Error("Unauthorized")
    }

    if (data.studentIds.length === 0) {
        throw new Error("No students selected")
    }

    // Handover logic: Only TABUNGAN and KAS (Income) collected by ADMIN need handover.
    // SPP and other incomes do NOT need handover.
    const handoverTypes = ["TABUNGAN", "KAS"]
    const isHandover = session.user.role === "ADMIN" && handoverTypes.includes(data.type)

    // Create transactions in a transaction (database transaction)
    await prisma.$transaction(
        data.studentIds.map((studentId) =>
            prisma.transaction.create({
                data: {
                    type: data.type,
                    amount: data.amount,
                    description: data.description,
                    date: data.date,
                    studentId: studentId,
                    creatorId: session.user.id,
                    isHandover: isHandover,
                    handoverStatus: isHandover ? "PENDING" : "NONE",
                },
            })
        )
    )

    revalidatePath("/admin")
    revalidatePath("/admin/transactions")
    revalidatePath("/komite/transactions")
}
