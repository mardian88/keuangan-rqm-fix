"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function getSantriHistory() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "SANTRI") {
        return {
            transactions: [],
            currentTabungan: 0
        }
    }

    const transactions = await prisma.transaction.findMany({
        where: {
            studentId: session.user.id,
        },
        orderBy: {
            date: "desc",
        },
        include: {
            creator: {
                select: {
                    name: true,
                    role: true
                }
            }
        }
    })

    // Calculate totals
    const totalTabungan = transactions
        .filter(t => t.type === "TABUNGAN")
        .reduce((acc, curr) => acc + curr.amount, 0)

    const totalPenarikan = transactions
        .filter(t => t.type === "PENARIKAN_TABUNGAN")
        .reduce((acc, curr) => acc + curr.amount, 0)

    const currentTabungan = totalTabungan - totalPenarikan

    return {
        transactions,
        currentTabungan
    }
}
