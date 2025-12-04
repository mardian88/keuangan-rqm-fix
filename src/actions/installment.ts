"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function enableInstallmentForStudent(studentId: string, defaultAmount: number) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    // Check if student exists and is a SANTRI
    const student = await prisma.user.findUnique({
        where: { id: studentId, role: "SANTRI" }
    })

    if (!student) {
        throw new Error("Student not found")
    }

    // Create or update installment settings
    const settings = await prisma.sppInstallmentSettings.upsert({
        where: { studentId },
        create: {
            studentId,
            defaultAmount,
            isActive: true
        },
        update: {
            defaultAmount,
            isActive: true
        }
    })

    return settings
}

export async function disableInstallmentForStudent(studentId: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const settings = await prisma.sppInstallmentSettings.update({
        where: { studentId },
        data: { isActive: false }
    })

    return settings
}

export async function updateDefaultSppAmount(studentId: string, amount: number) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const settings = await prisma.sppInstallmentSettings.update({
        where: { studentId },
        data: { defaultAmount: amount }
    })

    return settings
}

export async function recordInstallmentPayment(
    studentId: string,
    year: number,
    month: number,
    amount: number,
    description?: string
) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    // Verify student has installment enabled
    const settings = await prisma.sppInstallmentSettings.findUnique({
        where: { studentId, isActive: true }
    })

    if (!settings) {
        throw new Error("Installment not enabled for this student")
    }

    const payment = await prisma.sppInstallmentPayment.create({
        data: {
            studentId,
            year,
            month,
            amount,
            description,
            createdById: session.user.id
        }
    })

    return payment
}

export async function getStudentInstallmentData(studentId: string, year: number) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && (session.user.role !== "SANTRI" || session.user.id !== studentId))) {
        throw new Error("Unauthorized")
    }

    // Get settings
    const settings = await prisma.sppInstallmentSettings.findUnique({
        where: { studentId, isActive: true }
    })

    if (!settings) {
        return null
    }

    // Get all payments for the year
    const payments = await prisma.sppInstallmentPayment.findMany({
        where: {
            studentId,
            year
        },
        orderBy: [
            { month: 'asc' },
            { createdAt: 'asc' }
        ],
        include: {
            createdBy: {
                select: {
                    name: true
                }
            }
        }
    })

    // Calculate monthly totals
    const monthlyData = Array.from({ length: 12 }, (_, month) => {
        const monthPayments = payments.filter(p => p.month === month)
        const totalPaid = monthPayments.reduce((sum, p) => sum + p.amount, 0)
        const remaining = settings.defaultAmount - totalPaid
        const status = (remaining <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid') as 'paid' | 'partial' | 'unpaid'

        return {
            month,
            defaultAmount: settings.defaultAmount,
            totalPaid,
            remaining: Math.max(0, remaining),
            status,
            payments: monthPayments
        }
    })

    return {
        settings,
        monthlyData,
        allPayments: payments
    }
}

export async function getInstallmentEnabledStudents() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const students = await prisma.user.findMany({
        where: {
            role: "SANTRI",
            isActive: true,
            sppInstallmentSettings: {
                isActive: true
            }
        },
        select: {
            id: true,
            name: true,
            username: true,
            halaqah: {
                select: {
                    name: true
                }
            },
            sppInstallmentSettings: {
                select: {
                    defaultAmount: true
                }
            }
        },
        orderBy: { name: 'asc' }
    })

    return students
}

export async function getAllStudentsForInstallment() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const students = await prisma.user.findMany({
        where: {
            role: "SANTRI",
            isActive: true
        },
        select: {
            id: true,
            name: true,
            username: true,
            halaqah: {
                select: {
                    name: true
                }
            },
            sppInstallmentSettings: {
                select: {
                    id: true,
                    defaultAmount: true,
                    isActive: true
                }
            }
        },
        orderBy: { name: 'asc' }
    })

    return students
}

export async function deleteInstallmentPayment(paymentId: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const payment = await prisma.sppInstallmentPayment.delete({
        where: { id: paymentId }
    })

    return payment
}
