"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function getSantriMonthlyPaymentStatus(year: number) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "SANTRI") {
        return null
    }

    const studentId = session.user.id

    const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: {
            id: true,
            name: true,
            username: true,
            halaqah: { select: { name: true } },
            studentTransactions: {
                where: {
                    type: "KAS",
                    date: {
                        gte: new Date(`${year}-01-01`),
                        lte: new Date(`${year}-12-31`)
                    }
                },
                select: {
                    date: true,
                }
            }
        }
    })

    if (!student) throw new Error("Student not found")

    const kasByMonth: Record<number, boolean> = {}

    student.studentTransactions.forEach(transaction => {
        const month = transaction.date.getMonth()
        kasByMonth[month] = true
    })

    return {
        id: student.id,
        name: student.name,
        nis: student.username,
        halaqah: student.halaqah?.name || "-",
        kasByMonth,
    }
}

export async function getSantriTabunganData() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "SANTRI") {
        return null
    }

    const studentId = session.user.id

    const transactions = await prisma.transaction.findMany({
        where: {
            studentId: studentId,
            OR: [
                { type: "TABUNGAN" },
                { type: "PENARIKAN_TABUNGAN" }
            ]
        },
        orderBy: { date: "desc" },
        select: {
            id: true,
            date: true,
            type: true,
            amount: true,
            description: true,
        }
    })

    const tabunganIn = transactions
        .filter(t => t.type === "TABUNGAN")
        .reduce((sum, t) => sum + t.amount, 0)
    const tabunganOut = transactions
        .filter(t => t.type === "PENARIKAN_TABUNGAN")
        .reduce((sum, t) => sum + t.amount, 0)
    const saldoTabungan = tabunganIn - tabunganOut

    return {
        saldoTabungan,
        transactions
    }
}

import { getStudentInstallmentData } from "./installment"

export async function getSantriSppData(year: number) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "SANTRI") {
        return null
    }

    const studentId = session.user.id

    try {
        // First try to get installment data
        const installmentData = await getStudentInstallmentData(studentId, year)

        if (installmentData) {
            return {
                type: 'installment',
                ...installmentData
            }
        }

        // If no installment settings, get regular SPP transactions
        const student = await prisma.user.findUnique({
            where: { id: studentId },
            select: {
                studentTransactions: {
                    where: {
                        type: "SPP",
                        date: {
                            gte: new Date(`${year}-01-01`),
                            lte: new Date(`${year}-12-31`)
                        }
                    },
                    select: {
                        date: true,
                    }
                }
            }
        })

        if (!student) return null

        const sppByMonth: Record<number, boolean> = {}
        student.studentTransactions.forEach(transaction => {
            const month = transaction.date.getMonth()
            sppByMonth[month] = true
        })

        return {
            type: 'regular',
            sppByMonth
        }

    } catch (error) {
        console.error("Error fetching SPP data for santri:", error)
        return null
    }
}
