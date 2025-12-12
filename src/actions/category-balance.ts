"use server"

import { supabaseAdmin } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export interface CategoryBalance {
    code: string
    name: string
    type: "INCOME" | "EXPENSE"
    totalIncome: number
    totalExpense: number
    balance: number
    transactionCount: number
    recentTransactions: CategoryTransaction[]
}

export interface CategoryTransaction {
    id: string
    date: string
    amount: number
    description: string | null
    type: string
    transactionType: "INCOME" | "EXPENSE"
    creatorName: string
    creatorRole: string
    studentName?: string
}

export async function getCategoryBalances() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "KOMITE") {
        throw new Error("Unauthorized")
    }

    // Only show these 3 specific categories
    const allowedCategories = ["INFAQ_BAGI_RAPORT_SANTRI", "TABUNGAN", "UANG_KAS"]

    // Fetch all active categories
    const { data: categories, error: catError } = await supabaseAdmin
        .from('TransactionCategory')
        .select('code, name, type, isActive')
        .eq('isActive', true)
        .in('code', allowedCategories)
        .order('name')

    if (catError) {
        console.error('Error fetching categories:', catError)
        throw new Error('Failed to fetch categories')
    }

    // Fetch all transactions visible to Komite
    const { data: allTransactions, error: txnError } = await supabaseAdmin
        .from('Transaction')
        .select(`
            *,
            creator:creatorId (
                name,
                role
            ),
            student:studentId (
                name
            )
        `)
        .order('date', { ascending: false })

    if (txnError) {
        console.error('Error fetching transactions:', txnError)
        throw new Error('Failed to fetch transactions')
    }

    // Filter for transactions visible to Komite
    const transactions = allTransactions?.filter(t =>
        t.creator?.role === "KOMITE" ||
        (t.creator?.role === "ADMIN" && t.handoverStatus === "COMPLETED")
    ) || []

    // Build category balances
    const categoryBalances: CategoryBalance[] = categories?.map(category => {
        // Get all transactions for this category
        const categoryTransactions = transactions.filter(t => t.type === category.code)

        // Calculate totals based on category type
        let totalIncome = 0
        let totalExpense = 0

        categoryTransactions.forEach(txn => {
            if (category.type === "INCOME") {
                totalIncome += txn.amount
            } else if (category.type === "EXPENSE") {
                totalExpense += txn.amount
            }
        })

        // Map recent transactions (limit to 50 most recent)
        const recentTransactions: CategoryTransaction[] = categoryTransactions
            .slice(0, 50)
            .map(txn => ({
                id: txn.id,
                date: txn.date,
                amount: txn.amount,
                description: txn.description,
                type: txn.type,
                transactionType: category.type,
                creatorName: txn.creator?.name || "Unknown",
                creatorRole: txn.creator?.role || "Unknown",
                studentName: txn.student?.name
            }))

        return {
            code: category.code,
            name: category.name,
            type: category.type,
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense,
            transactionCount: categoryTransactions.length,
            recentTransactions
        }
    }) || []

    // Sort by balance (highest first) and then by name
    return categoryBalances.sort((a, b) => {
        if (b.balance !== a.balance) {
            return b.balance - a.balance
        }
        return a.name.localeCompare(b.name)
    })
}
