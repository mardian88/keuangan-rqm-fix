"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { startOfDay, endOfDay } from "date-fns"

export type ReportCategory = "PEMASUKAN_LAIN" | "PENGELUARAN_KOMITE" | "KAS_SANTRI" | "TABUNGAN_SANTRI"

export async function getKomiteReports(startDate: Date, endDate: Date) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "KOMITE") {
        throw new Error("Unauthorized")
    }

    const start = startOfDay(startDate)
    const end = endOfDay(endDate)

    const transactions = await prisma.transaction.findMany({
        where: {
            date: {
                gte: start,
                lte: end,
            },
            OR: [
                { creator: { role: "KOMITE" } },
                {
                    creator: { role: "ADMIN" },
                    handoverStatus: "COMPLETED"
                }
            ]
        },
        include: {
            creator: {
                select: { name: true, role: true }
            },
            student: {
                select: { name: true }
            }
        },
        orderBy: {
            date: "desc"
        }
    })

    // Map username to nis for frontend consistency (hidden for Komite)
    const mappedTransactions = transactions.map(t => ({
        ...t,
        student: t.student ? { ...t.student, nis: "" } : null
    }))

    // Categorize transactions
    const pemasukanLain = mappedTransactions.filter(t => t.type === "PEMASUKAN_LAIN")
    const pengeluaranKomite = mappedTransactions.filter(t => t.type === "PENGELUARAN_KOMITE")
    const kasSantri = mappedTransactions.filter(t => t.type === "KAS" && t.studentId)
    const tabunganSantri = mappedTransactions.filter(t =>
        (t.type === "TABUNGAN" || t.type === "PENARIKAN_TABUNGAN") && t.studentId
    )

    return {
        pemasukanLain,
        pengeluaranKomite,
        kasSantri,
        tabunganSantri
    }
}
