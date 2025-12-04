"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function getStudentMonitoring() {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "KOMITE")) {
        throw new Error("Unauthorized")
    }

    const students = await prisma.user.findMany({
        where: { role: "SANTRI", isActive: true },
        select: {
            id: true,
            name: true,
            username: true,
            halaqah: { select: { name: true } },
            shift: { select: { name: true } },
            studentTransactions: {
                select: {
                    type: true,
                    amount: true,
                    date: true,
                }
            }
        },
        orderBy: { name: "asc" }
    })

    const isKomite = session.user.role === "KOMITE"

    return students.map(student => {
        const transactions = student.studentTransactions

        // Calculate SPP payments
        const sppTransactions = transactions.filter(t => t.type === "SPP")
        const totalSPP = sppTransactions.reduce((sum, t) => sum + t.amount, 0)
        const lastSPPDate = sppTransactions.length > 0
            ? sppTransactions.sort((a, b) => b.date.getTime() - a.date.getTime())[0].date
            : null

        // Calculate KAS payments
        const kasTransactions = transactions.filter(t => t.type === "KAS")
        const totalKas = kasTransactions.reduce((sum, t) => sum + t.amount, 0)

        // Calculate Tabungan balance
        const tabunganIn = transactions.filter(t => t.type === "TABUNGAN").reduce((sum, t) => sum + t.amount, 0)
        const tabunganOut = transactions.filter(t => t.type === "PENARIKAN_TABUNGAN").reduce((sum, t) => sum + t.amount, 0)
        const saldoTabungan = tabunganIn - tabunganOut

        return {
            id: student.id,
            name: student.name,
            nis: isKomite ? "" : student.username,
            halaqah: student.halaqah?.name || "-",
            shift: student.shift?.name || "-",
            totalSPP,
            lastSPPDate,
            totalKas,
            saldoTabungan,
        }
    })
}

export async function getMonthlyPaymentStatus(year: number) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "KOMITE")) {
        throw new Error("Unauthorized")
    }

    const students = await prisma.user.findMany({
        where: { role: "SANTRI", isActive: true },
        select: {
            id: true,
            name: true,
            username: true,
            halaqahId: true,
            halaqah: { select: { id: true, name: true } },
            studentTransactions: {
                where: {
                    OR: [
                        { type: "SPP" },
                        { type: "KAS" }
                    ],
                    date: {
                        gte: new Date(`${year}-01-01`),
                        lte: new Date(`${year}-12-31`)
                    }
                },
                select: {
                    type: true,
                    date: true,
                }
            },
            sppInstallmentSettings: {
                select: {
                    defaultAmount: true,
                    isActive: true
                }
            },
            sppInstallmentPayments: {
                where: {
                    year: year
                },
                select: {
                    month: true,
                    amount: true
                }
            }
        },
        orderBy: { name: "asc" }
    })

    const isKomite = session.user.role === "KOMITE"

    return students.map(student => {
        const sppByMonth: Record<number, boolean> = {}
        const kasByMonth: Record<number, boolean> = {}

        // Check if student has installment enabled
        const hasInstallment = student.sppInstallmentSettings?.isActive

        if (hasInstallment && student.sppInstallmentSettings) {
            // For installment students, check if total payments >= default amount
            const defaultAmount = student.sppInstallmentSettings.defaultAmount

            for (let month = 0; month < 12; month++) {
                const monthPayments = student.sppInstallmentPayments.filter(p => p.month === month)
                const totalPaid = monthPayments.reduce((sum, p) => sum + p.amount, 0)
                sppByMonth[month] = totalPaid >= defaultAmount
            }
        } else {
            // For non-installment students, use regular transaction check
            student.studentTransactions.forEach(transaction => {
                const month = transaction.date.getMonth()
                if (transaction.type === "SPP") {
                    sppByMonth[month] = true
                }
            })
        }

        // KAS always uses regular transactions
        student.studentTransactions.forEach(transaction => {
            const month = transaction.date.getMonth()
            if (transaction.type === "KAS") {
                kasByMonth[month] = true
            }
        })

        return {
            id: student.id,
            name: student.name,
            nis: isKomite ? "" : student.username,
            halaqahId: student.halaqahId,
            halaqah: student.halaqah?.name || "-",
            sppByMonth,
            kasByMonth,
        }
    })
}


export async function getHalaqahList() {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "KOMITE")) {
        throw new Error("Unauthorized")
    }

    const halaqahs = await prisma.halaqah.findMany({
        orderBy: { name: "asc" }
    })

    return halaqahs
}

export async function getTabunganBalances() {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "KOMITE")) {
        throw new Error("Unauthorized")
    }

    const students = await prisma.user.findMany({
        where: { role: "SANTRI", isActive: true },
        select: {
            id: true,
            name: true,
            username: true,
            halaqahId: true,
            halaqah: { select: { name: true } },
            studentTransactions: {
                where: {
                    OR: [
                        { type: "TABUNGAN" },
                        { type: "PENARIKAN_TABUNGAN" }
                    ]
                },
                select: {
                    type: true,
                    amount: true,
                }
            }
        },
        orderBy: { name: "asc" }
    })

    const isKomite = session.user.role === "KOMITE"

    return students.map(student => {
        const tabunganIn = student.studentTransactions
            .filter(t => t.type === "TABUNGAN")
            .reduce((sum, t) => sum + t.amount, 0)
        const tabunganOut = student.studentTransactions
            .filter(t => t.type === "PENARIKAN_TABUNGAN")
            .reduce((sum, t) => sum + t.amount, 0)
        const saldoTabungan = tabunganIn - tabunganOut

        return {
            id: student.id,
            name: student.name,
            nis: isKomite ? "" : student.username,
            halaqahId: student.halaqahId,
            halaqah: student.halaqah?.name || "-",
            saldoTabungan,
        }
    })
}
