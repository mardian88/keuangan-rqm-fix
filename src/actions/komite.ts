"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function getKomiteStats() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "KOMITE") {
        return {
            currentBalance: 0,
            pendingAtAdmin: 0,
            totalIncome: 0,
            totalExpense: 0
        }
    }

    // Fetch all transaction categories to determine types dynamically
    const categories = await prisma.transactionCategory.findMany({
        where: { isActive: true }
    })

    const incomeCodes = categories
        .filter(c => c.type === "INCOME")
        .map(c => c.code)

    const expenseCodes = categories
        .filter(c => c.type === "EXPENSE")
        .map(c => c.code)

    // 1. Funds actually held by Komite (Handover = COMPLETED or Created by Komite)

    // A. Income from Admin (Handover Completed)
    const incomeFromAdmin = await prisma.transaction.aggregate({
        where: {
            creator: { role: "ADMIN" },
            handoverStatus: "COMPLETED",
        },
        _sum: { amount: true },
    })

    // B. Income direct by Komite
    const incomeByKomite = await prisma.transaction.aggregate({
        where: {
            creator: { role: "KOMITE" },
            type: { in: incomeCodes },
        },
        _sum: { amount: true },
    })

    // C. Expenses by Komite
    const expensesByKomite = await prisma.transaction.aggregate({
        where: {
            creator: { role: "KOMITE" },
            type: { in: expenseCodes },
        },
        _sum: { amount: true },
    })

    // D. Pending at Admin (Informational)
    const pendingAtAdmin = await prisma.transaction.aggregate({
        where: {
            creator: { role: "ADMIN" },
            handoverStatus: "PENDING",
        },
        _sum: { amount: true },
    })

    const totalIncome = (incomeFromAdmin._sum.amount || 0) + (incomeByKomite._sum.amount || 0)
    const totalExpense = (expensesByKomite._sum.amount || 0)
    const currentBalance = totalIncome - totalExpense

    return {
        currentBalance,
        pendingAtAdmin: pendingAtAdmin._sum.amount || 0,
        totalIncome,
        totalExpense
    }
}

export async function getKomiteRecentTransactions() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "KOMITE") {
        return []
    }

    // Get last 15 transactions visible to Komite
    const transactions = await prisma.transaction.findMany({
        where: {
            OR: [
                { creator: { role: "KOMITE" } },
                {
                    creator: { role: "ADMIN" },
                    handoverStatus: "COMPLETED"
                }
            ]
        },
        orderBy: { date: "desc" },
        take: 15,
        include: {
            creator: {
                select: {
                    name: true,
                    role: true
                }
            },
            student: {
                select: {
                    name: true
                }
            }
        }
    })

    // Fetch categories to map types
    const categories = await prisma.transactionCategory.findMany({
        select: { code: true, type: true }
    })

    const categoryMap = new Map(categories.map(c => [c.code, c.type]))

    // Enhance transactions with category type (INCOME/EXPENSE)
    return transactions.map(t => ({
        ...t,
        categoryType: categoryMap.get(t.type) || "INCOME" // Default to INCOME if not found (fallback)
    }))
}
