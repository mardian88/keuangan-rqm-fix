"use server"

import { supabaseAdmin } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"
import { toLocalISOString } from "@/lib/date-utils"

// Helper function to check for existing monthly transaction (SPP or KAS)
async function checkExistingMonthlyTransaction(
    studentId: string,
    date: Date,
    transactionType: 'SPP' | 'KAS'
): Promise<boolean> {
    // Get start and end of the month for the given date
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)

    // Debug logging
    console.log(`Checking ${transactionType} duplicate for Student: ${studentId}, Date: ${date.toISOString()}`)

    // For SPP: Check if student has installment status (bypass validation)
    if (transactionType === 'SPP') {
        const { data: installmentSettings } = await supabaseAdmin
            .from('SppInstallmentSettings')
            .select('studentId')
            .eq('studentId', studentId)
            .eq('isActive', true)
            .single()

        if (installmentSettings) {
            console.log('Bypassing SPP check: Student has active installment')
            return false
        }
    }

    // Fetch all categories to find matching codes
    const { data: categories } = await supabaseAdmin
        .from('TransactionCategory')
        .select('code, name')
        .eq('type', 'INCOME')

    let transactionCodes: string[] = []

    if (transactionType === 'SPP') {
        transactionCodes = categories
            ?.filter(c => c.code === 'SPP' || c.code === 'CICILAN_SPP' || c.name.toLowerCase().includes('spp'))
            .map(c => c.code) || ['SPP']
    } else if (transactionType === 'KAS') {
        transactionCodes = categories
            ?.filter(c => c.code === 'KAS' || c.code === 'UANG_KAS' || c.name.toLowerCase().includes('kas'))
            .map(c => c.code) || ['KAS', 'UANG_KAS']
    }

    // Check for existing transaction in this month
    const { data: existingTransactions, error } = await supabaseAdmin
        .from('Transaction')
        .select('id, date, amount, type')
        .eq('studentId', studentId)
        .in('type', transactionCodes)
        .gte('date', startOfMonth.toISOString())
        .lte('date', endOfMonth.toISOString())
        .limit(1)

    if (error) {
        console.error(`Error checking ${transactionType} duplicate:`, error)
    }

    const hasDuplicate = existingTransactions && existingTransactions.length > 0
    console.log('Duplicate check result:', { transactionType, hasDuplicate, count: existingTransactions?.length })

    return hasDuplicate || false
}

// ... existing imports ...
// We need to fetch transactions to calculate balance, or reuse existing pattern.
// Let's add the helper first.

export async function getStudentSavingsBalance(studentId: string) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    // Get all savings transactions
    const { data: transactions, error } = await supabaseAdmin
        .from('Transaction')
        .select(`
            amount,
            type,
            TransactionCategory!inner (
                type,
                name
            )
        `)
        .eq('studentId', studentId)

    if (error) {
        console.error('Error fetching savings balance:', error)
        return 0
    }

    // Logic: 
    // INCOME + "TABUNGAN" (or similar category) -> Add
    // EXPENSE + "PENARIKAN" (or similar) -> Subtract
    // Actually, we should rely on category type.
    // INCOME = Add, EXPENSE = Subtract. 
    // Filter by categories related to Tabungan? 
    // The user said "Tabungan" flow adds, "Pengambilan Tabungan" reduces.
    // Let's assume any transaction with category name containing "Tabungan" affects the balance.
    // OR simpler: specific known codes "TABUNGAN" (Income) and "PENARIKAN_TABUNGAN" (Expense).
    // Let's map it based on the actual data we see. 
    // For now, let's filter purely by the category codes or strict names if possible.
    // Users might create custom categories.

    let balance = 0
    transactions?.forEach((txn: any) => {
        const catName = txn.TransactionCategory.name.toLowerCase()
        const catType = txn.TransactionCategory.type // INCOME or EXPENSE

        // Strict check on code 'TABUNGAN' or name 'Tabungan' might be safer for Income
        // But for Expense it's definitely only if it's a withdrawal.

        // Let's stick to the common sense: "Tabungan" related stuff.
        if (catName.includes("tabungan")) {
            if (catType === "INCOME") {
                balance += txn.amount
            } else if (catType === "EXPENSE") {
                balance -= txn.amount
            }
        }
    })

    return balance
}

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

    // Fetch Category Details for Dynamic Validation
    const { data: category, error: catError } = await supabaseAdmin
        .from('TransactionCategory')
        .select('code, name, type, requiresHandover')
        .eq('code', data.type)
        .single()

    if (catError || !category) {
        console.error('Category fetch error:', catError)
        throw new Error("Kategori transaksi tidak valid")
    }

    console.log('Transaction validation - Category:', category.code, category.name)

    // Dynamic Actor Validation
    const catNameLower = category.name.toLowerCase()

    // Determine if this is SPP or KAS transaction
    const isSppTransaction = category.code === 'SPP' || category.code === 'CICILAN_SPP' || catNameLower.includes('spp')
    const isKasTransaction = category.code === 'KAS' || category.code === 'UANG_KAS' || catNameLower.includes('kas')

    console.log('Transaction type check:', { isSppTransaction, isKasTransaction, code: category.code, name: category.name })

    // 1. Student Selection Validation for SPP and KAS
    if (isSppTransaction || isKasTransaction) {
        if (!data.studentId) {
            const transactionName = isSppTransaction ? 'SPP' : 'Uang Kas'
            throw new Error(`Transaksi ${transactionName} wajib memilih Santri`)
        }
    }

    // 2. Monthly Duplicate Validation for SPP (CRITICAL - Must run BEFORE creating transaction)
    if (isSppTransaction && data.studentId) {
        console.log('Checking SPP duplicate for student:', data.studentId, 'date:', data.date)
        const hasDuplicate = await checkExistingMonthlyTransaction(data.studentId, data.date, 'SPP')
        console.log('SPP Duplicate check result:', hasDuplicate)
        if (hasDuplicate) {
            throw new Error("Santri sudah memiliki transaksi SPP di bulan ini. Gunakan fitur cicilan SPP jika ingin menyicil.")
        }
    }

    // 3. Monthly Duplicate Validation for KAS
    if (isKasTransaction && data.studentId) {
        console.log('Checking KAS duplicate for student:', data.studentId, 'date:', data.date)
        const hasDuplicate = await checkExistingMonthlyTransaction(data.studentId, data.date, 'KAS')
        console.log('KAS Duplicate check result:', hasDuplicate)
        if (hasDuplicate) {
            throw new Error("Santri sudah memiliki transaksi Uang Kas di bulan ini.")
        }
    }

    // 4. Other Santri-related categories
    if (catNameLower.includes("santri") || category.code === "TABUNGAN") {
        if (!data.studentId) {
            throw new Error(`Transaksi untuk kategori "${category.name}" wajib menyertakan data Santri.`)
        }
    }

    // 5. Guru Validation
    if (catNameLower.includes("guru") || category.code === "MUKAFAAH") {
        if (!data.teacherId) {
            throw new Error(`Transaksi untuk kategori "${category.name}" wajib menyertakan data Guru.`)
        }
    }

    // 3. Update Description with Name if empty (Optional polish, user asked "sematkan nama")
    // If description is empty/default, maybe append name? 
    // But data.description might be set by user. Let's strictly validate first.

    // 4. Savings Withdrawal Balance Check
    // If it's an expense and related to Tabungan withdrawal
    // We check code "PENARIKAN_TABUNGAN" or if name has "tabungan" and type is EXPENSE (and not admin fee etc?)
    // User specifically mentioned "pengambilan tabungan".
    if (category.type === "EXPENSE" && catNameLower.includes("tabungan") && data.studentId) {
        // Double check it's not some admin fee. Usually "Penarikan" or "Pengambilan".
        // Let's assume any Expense Tabungan is a withdrawal for now unless stated otherwise.

        const currentBalance = await getStudentSavingsBalance(data.studentId)
        console.log(`Checking withdrawal balance. Student: ${data.studentId}, Current: ${currentBalance}, Request: ${data.amount}`)

        if (currentBalance < data.amount) {
            const formattedBalance = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(currentBalance)
            throw new Error(`Saldo tabungan tidak mencukupi untuk penarikan ini. Saldo saat ini: ${formattedBalance}`)
        }
    }

    // Handover logic: 
    // 1. Only ADMIN can create handover transactions
    // 2. Category must have requiresHandover = true
    // 3. Fallback: KAS and TABUNGAN always require handover for backward compatibility
    const defaultHandoverTypes = ["TABUNGAN", "KAS"]
    const categoryRequiresHandover = category.requiresHandover ?? defaultHandoverTypes.includes(data.type)
    const isHandover = session.user.role === "ADMIN" && categoryRequiresHandover

    // ... insert logic ...
    const { error } = await supabaseAdmin
        .from('Transaction')
        .insert({
            type: data.type,
            amount: data.amount,
            description: data.description,
            date: toLocalISOString(data.date),
            studentId: data.studentId,
            teacherId: data.teacherId,
            creatorId: session.user.id,
            isHandover: isHandover,
            handoverStatus: isHandover ? "PENDING" : "NONE",
        })

    if (error) {
        console.error('Error creating transaction:', error)
        throw new Error('Failed to create transaction')
    }

    revalidatePath("/admin")
    revalidatePath("/admin/transactions")
}
