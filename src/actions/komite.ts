"use server"

import { supabaseAdmin } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function getKomiteStats() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "KOMITE") {
        return {
            currentBalance: 0, // Fallback for types
            operationalBalance: 0,
            savingsBalance: 0,
            pendingAtAdmin: 0,
            totalIncome: 0,
            totalExpense: 0
        }
    }

    // Fetch all transaction categories to determine types dynamically
    const { data: categories } = await supabaseAdmin
        .from('TransactionCategory')
        .select('code, type, name') // Added name for keyword check
        .eq('isActive', true)

    const incomeCodes = categories?.filter(c => c.type === "INCOME").map(c => c.code) || []
    const expenseCodes = categories?.filter(c => c.type === "EXPENSE").map(c => c.code) || []

    // Helper to check if a transaction type is related to Savings
    const isSavings = (code: string) => {
        const cat = categories?.find(c => c.code === code)
        if (!cat) return false
        const name = cat.name.toLowerCase()
        return code === 'TABUNGAN' || code === 'PENARIKAN_TABUNGAN' || name.includes('tabungan')
    }

    // Helper to check if a transaction type is SPP
    const isSpp = (code: string) => {
        const cat = categories?.find(c => c.code === code)
        if (!cat) return false
        const name = cat.name.toLowerCase()
        return code === 'SPP' || code === 'CICILAN_SPP' || name.includes('spp')
    }

    // 1. Funds actually held by Komite (Handover = COMPLETED or Created by Komite)

    // A. Income from Admin (Handover Completed)
    const { data: adminTransactions } = await supabaseAdmin
        .from('Transaction')
        .select('amount, type, creator:creatorId(role)')
        .eq('creator.role', 'ADMIN')
        .eq('handoverStatus', 'COMPLETED')

    // B. Income direct by Komite
    const { data: komiteIncomeTransactions } = await supabaseAdmin
        .from('Transaction')
        .select('amount, type, creator:creatorId(role)')
        .eq('creator.role', 'KOMITE')
        .in('type', incomeCodes)

    // C. Expenses by Komite
    const { data: komiteExpenseTransactions } = await supabaseAdmin
        .from('Transaction')
        .select('amount, type, creator:creatorId(role)')
        .eq('creator.role', 'KOMITE')
        .in('type', expenseCodes)

    // D. Pending at Admin (Informational)
    const { data: pendingTransactions } = await supabaseAdmin
        .from('Transaction')
        .select('amount, creator:creatorId(role)')
        .eq('creator.role', 'ADMIN')
        .eq('handoverStatus', 'PENDING')

    // Calculate Splits

    // Savings Components
    const savIncomeAdmin = adminTransactions?.filter(t => isSavings(t.type)).reduce((sum, t) => sum + t.amount, 0) || 0
    const savIncomeKomite = komiteIncomeTransactions?.filter(t => isSavings(t.type)).reduce((sum, t) => sum + t.amount, 0) || 0
    const savExpenseKomite = komiteExpenseTransactions?.filter(t => isSavings(t.type)).reduce((sum, t) => sum + t.amount, 0) || 0

    const savingsBalance = (savIncomeAdmin + savIncomeKomite) - savExpenseKomite

    // Operational Components (Exclude both Tabungan AND SPP)
    // Only include: Uang Kas + Other Income that Komite actually manages
    const opIncomeAdmin = adminTransactions?.filter(t => !isSavings(t.type) && !isSpp(t.type)).reduce((sum, t) => sum + t.amount, 0) || 0
    const opIncomeKomite = komiteIncomeTransactions?.filter(t => !isSavings(t.type) && !isSpp(t.type)).reduce((sum, t) => sum + t.amount, 0) || 0
    const opExpenseKomite = komiteExpenseTransactions?.filter(t => !isSavings(t.type)).reduce((sum, t) => sum + t.amount, 0) || 0

    const operationalBalance = (opIncomeAdmin + opIncomeKomite) - opExpenseKomite

    // Totals for display (Include all income types for total statistics)
    const totalIncome = (opIncomeAdmin + savIncomeAdmin) + (opIncomeKomite + savIncomeKomite)
    const totalExpense = opExpenseKomite + savExpenseKomite

    const pendingAtAdmin = pendingTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0

    return {
        currentBalance: operationalBalance,
        operationalBalance,
        savingsBalance,
        pendingAtAdmin,
        totalIncome,
        totalExpense
    }
}

export async function getKomiteMonthlyStats() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "KOMITE") {
        return {
            current: { operationalBalance: 0, savingsBalance: 0, totalIncome: 0, totalExpense: 0 },
            previous: { operationalBalance: 0, savingsBalance: 0, totalIncome: 0, totalExpense: 0 },
            percentageChange: { income: 0, expense: 0, operational: 0, savings: 0 }
        }
    }

    // Current month range
    const now = new Date()
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Previous month range
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousStart = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1)
    const previousEnd = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0, 23, 59, 59)

    // Helper to calculate stats for a date range
    const calculateStatsForPeriod = async (startDate: Date, endDate: Date) => {
        const { data: categories } = await supabaseAdmin
            .from('TransactionCategory')
            .select('code, type, name')
            .eq('isActive', true)

        const incomeCodes = categories?.filter(c => c.type === "INCOME").map(c => c.code) || []
        const expenseCodes = categories?.filter(c => c.type === "EXPENSE").map(c => c.code) || []

        const isSavings = (code: string) => {
            const cat = categories?.find(c => c.code === code)
            if (!cat) return false
            const name = cat.name.toLowerCase()
            return code === 'TABUNGAN' || code === 'PENARIKAN_TABUNGAN' || name.includes('tabungan')
        }

        const isSpp = (code: string) => {
            const cat = categories?.find(c => c.code === code)
            if (!cat) return false
            const name = cat.name.toLowerCase()
            return code === 'SPP' || code === 'CICILAN_SPP' || name.includes('spp')
        }

        const { data: adminTransactions } = await supabaseAdmin
            .from('Transaction')
            .select('amount, type, date')
            .eq('handoverStatus', 'COMPLETED')
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())

        const { data: komiteIncomeTransactions } = await supabaseAdmin
            .from('Transaction')
            .select('amount, type, date, creator:creatorId(role)')
            .eq('creator.role', 'KOMITE')
            .in('type', incomeCodes)
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())

        const { data: komiteExpenseTransactions } = await supabaseAdmin
            .from('Transaction')
            .select('amount, type, date, creator:creatorId(role)')
            .eq('creator.role', 'KOMITE')
            .in('type', expenseCodes)
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())

        const savIncomeAdmin = adminTransactions?.filter(t => isSavings(t.type)).reduce((sum, t) => sum + t.amount, 0) || 0
        const savIncomeKomite = komiteIncomeTransactions?.filter(t => isSavings(t.type)).reduce((sum, t) => sum + t.amount, 0) || 0
        const savExpenseKomite = komiteExpenseTransactions?.filter(t => isSavings(t.type)).reduce((sum, t) => sum + t.amount, 0) || 0
        const savingsBalance = (savIncomeAdmin + savIncomeKomite) - savExpenseKomite

        const opIncomeAdmin = adminTransactions?.filter(t => !isSavings(t.type) && !isSpp(t.type)).reduce((sum, t) => sum + t.amount, 0) || 0
        const opIncomeKomite = komiteIncomeTransactions?.filter(t => !isSavings(t.type) && !isSpp(t.type)).reduce((sum, t) => sum + t.amount, 0) || 0
        const opExpenseKomite = komiteExpenseTransactions?.filter(t => !isSavings(t.type)).reduce((sum, t) => sum + t.amount, 0) || 0
        const operationalBalance = (opIncomeAdmin + opIncomeKomite) - opExpenseKomite

        const totalIncome = (opIncomeAdmin + savIncomeAdmin) + (opIncomeKomite + savIncomeKomite)
        const totalExpense = opExpenseKomite + savExpenseKomite

        return { operationalBalance, savingsBalance, totalIncome, totalExpense }
    }

    const current = await calculateStatsForPeriod(currentStart, currentEnd)
    const previous = await calculateStatsForPeriod(previousStart, previousEnd)

    // Calculate percentage changes
    const calculatePercentage = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0
        return Math.round(((current - previous) / previous) * 100)
    }

    const percentageChange = {
        income: calculatePercentage(current.totalIncome, previous.totalIncome),
        expense: calculatePercentage(current.totalExpense, previous.totalExpense),
        operational: calculatePercentage(current.operationalBalance, previous.operationalBalance),
        savings: calculatePercentage(current.savingsBalance, previous.savingsBalance)
    }

    return {
        current,
        previous,
        percentageChange
    }
}

export async function getKomiteRecentTransactions() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "KOMITE") {
        return []
    }

    // Get last 15 transactions visible to Komite
    // Supabase doesn't support complex OR with nested conditions easily, so we'll fetch and filter
    const { data: transactions } = await supabaseAdmin
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
        .limit(100) // Fetch more to filter

    // Filter transactions visible to Komite
    const visibleTransactions = transactions?.filter(t =>
        t.creator?.role === "KOMITE" ||
        (t.creator?.role === "ADMIN" && t.handoverStatus === "COMPLETED")
    ).slice(0, 15) || []

    // Fetch categories to map types
    const { data: categories } = await supabaseAdmin
        .from('TransactionCategory')
        .select('code, type')

    const categoryMap = new Map(categories?.map(c => [c.code, c.type]) || [])

    // Enhance transactions with category type (INCOME/EXPENSE)
    return visibleTransactions.map(t => ({
        ...t,
        categoryType: categoryMap.get(t.type) || "INCOME" // Default to INCOME if not found (fallback)
    }))
}
