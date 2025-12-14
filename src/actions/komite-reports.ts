"use server"

import { supabaseAdmin } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { startOfDay, endOfDay } from "date-fns"
import { toLocalISOString } from "@/lib/date-utils"

export type ReportCategory = "PEMASUKAN_LAIN" | "PENGELUARAN_KOMITE" | "KAS_SANTRI" | "TABUNGAN_SANTRI"

export async function getKomiteReports(startDate: Date, endDate: Date) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "KOMITE") {
        throw new Error("Unauthorized")
    }

    const start = startOfDay(startDate)
    const end = endOfDay(endDate)

    // Fetch all transactions in date range
    const { data: allTransactions } = await supabaseAdmin
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
        .gte('date', start.toISOString())
        .lte('date', end.toISOString())
        .order('date', { ascending: false })

    // Filter for transactions visible to Komite
    const transactions = allTransactions?.filter(t =>
        t.creator?.role === "KOMITE" ||
        (t.creator?.role === "ADMIN" && t.handoverStatus === "COMPLETED")
    ) || []

    // Fetch categories to determine types dynamically
    const { data: categories } = await supabaseAdmin
        .from('TransactionCategory')
        .select('code, type, name')
        .eq('isActive', true)

    // Helper functions to categorize transactions
    const isKas = (code: string) => {
        const cat = categories?.find(c => c.code === code)
        if (!cat) return false
        const name = cat.name.toLowerCase()
        return code === 'KAS' || code === 'UANG_KAS' || name.includes('kas')
    }

    const isTabungan = (code: string) => {
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

    const getTransactionType = (code: string) => {
        const cat = categories?.find(c => c.code === code)
        return cat?.type || 'INCOME'
    }

    // Map username to nis for frontend consistency (hidden for Komite)
    const mappedTransactions = transactions.map(t => ({
        ...t,
        student: t.student ? { ...t.student, nis: "" } : null
    }))

    // Categorize transactions dynamically
    // Kas Santri: KAS transactions with studentId
    const kasSantri = mappedTransactions.filter(t => isKas(t.type) && t.studentId)

    // Tabungan Santri: TABUNGAN transactions with studentId
    const tabunganSantri = mappedTransactions.filter(t => isTabungan(t.type) && t.studentId)

    // Pemasukan Lain: All INCOME except KAS, TABUNGAN, and SPP
    const pemasukanLain = mappedTransactions.filter(t =>
        getTransactionType(t.type) === 'INCOME' &&
        !isKas(t.type) &&
        !isTabungan(t.type) &&
        !isSpp(t.type)
    )

    // Pengeluaran Komite: All EXPENSE transactions (excluding Tabungan withdrawals which are already in tabunganSantri)
    const pengeluaranKomite = mappedTransactions.filter(t =>
        getTransactionType(t.type) === 'EXPENSE' &&
        !isTabungan(t.type)
    )

    return {
        pemasukanLain,
        pengeluaranKomite,
        kasSantri,
        tabunganSantri
    }
}

interface TransactionFiltersKomite {
    startDate?: string
    endDate?: string
    categoryCode?: string
    type?: "INCOME" | "EXPENSE"
    searchQuery?: string
    page?: number
    pageSize?: number
}

export async function getFilteredTransactionsKomite(filters: TransactionFiltersKomite = {}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "KOMITE") {
        throw new Error("Unauthorized")
    }

    const {
        startDate,
        endDate,
        categoryCode,
        type,
        searchQuery,
        page = 1,
        pageSize = 20
    } = filters

    // Fetch all categories to map details and handle type filtering
    const { data: categories } = await supabaseAdmin
        .from('TransactionCategory')
        .select('*')

    const categoryMap = new Map(categories?.map(c => [c.code, c]))

    // Build query
    let query = supabaseAdmin
        .from('Transaction')
        .select(`
            *,
            User:studentId(id, name, username),
            Teacher:teacherId(id, name),
            Creator:creatorId!inner(name, role)
        `, { count: 'exact' })
        .order('date', { ascending: false })

    // Apply filters
    if (startDate) {
        query = query.gte('date', startDate)
    }
    if (endDate) {
        query = query.lte('date', endDate)
    }
    if (categoryCode) {
        query = query.eq('type', categoryCode)
    }

    // Filter by Type (INCOME/EXPENSE)
    if (type && categories) {
        const codesOfType = categories
            .filter(c => c.type === type)
            .map(c => c.code)

        if (codesOfType.length > 0) {
            query = query.in('type', codesOfType)
        } else {
            return {
                transactions: [],
                totalCount: 0,
                page,
                pageSize,
                totalPages: 0
            }
        }
    }

    if (searchQuery) {
        query = query.ilike('description', `%${searchQuery}%`)
    }

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
        console.error('Error fetching filtered transactions:', error)
        throw new Error('Failed to fetch transactions')
    }

    // Filter for transactions visible to Komite
    const visibleTransactions = data?.filter(t =>
        t.Creator?.role === "KOMITE" ||
        (t.Creator?.role === "ADMIN" && t.handoverStatus === "COMPLETED")
    ) || []

    // Enrich data with category details
    const enrichedData = visibleTransactions.map(t => ({
        ...t,
        TransactionCategory: categoryMap.get(t.type) || { name: t.type, type: 'UNKNOWN' }
    }))

    return {
        transactions: enrichedData,
        totalCount: visibleTransactions.length,
        page,
        pageSize,
        totalPages: Math.ceil(visibleTransactions.length / pageSize)
    }
}

export async function updateTransactionKomite(id: string, data: {
    type?: string
    amount?: number
    description?: string
    date?: Date
}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "KOMITE") {
        throw new Error("Unauthorized")
    }

    // Verify transaction belongs to Komite
    const { data: transaction } = await supabaseAdmin
        .from('Transaction')
        .select('*, creator:creatorId(role)')
        .eq('id', id)
        .single()

    const creator = Array.isArray(transaction?.creator) ? transaction.creator[0] : transaction?.creator
    if (!transaction || creator?.role !== "KOMITE") {
        throw new Error("Unauthorized: You can only edit transactions created by Komite")
    }

    const updateData: any = {}
    if (data.type) updateData.type = data.type
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.description !== undefined) updateData.description = data.description
    if (data.date) updateData.date = toLocalISOString(data.date)

    const { error } = await supabaseAdmin
        .from('Transaction')
        .update(updateData)
        .eq('id', id)

    if (error) {
        console.error('Error updating transaction:', error)
        throw new Error('Failed to update transaction')
    }
}

export async function deleteTransactionKomite(id: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "KOMITE") {
        throw new Error("Unauthorized")
    }

    // Verify transaction belongs to Komite
    const { data: transaction } = await supabaseAdmin
        .from('Transaction')
        .select('*, creator:creatorId(role)')
        .eq('id', id)
        .single()

    const creator = Array.isArray(transaction?.creator) ? transaction.creator[0] : transaction?.creator
    if (!transaction || creator?.role !== "KOMITE") {
        throw new Error("Unauthorized: You can only delete transactions created by Komite")
    }

    const { error } = await supabaseAdmin
        .from('Transaction')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting transaction:', error)
        throw new Error('Failed to delete transaction')
    }
}

export async function bulkDeleteTransactionsKomite(ids: string[]) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "KOMITE") {
        throw new Error("Unauthorized")
    }

    if (!ids || ids.length === 0) {
        throw new Error("No transaction IDs provided")
    }

    // Verify all transactions belong to Komite
    const { data: transactions } = await supabaseAdmin
        .from('Transaction')
        .select('id, creator:creatorId(role)')
        .in('id', ids)

    const komiteTransactionIds = transactions
        ?.filter(t => {
            const creator = Array.isArray(t.creator) ? t.creator[0] : t.creator
            return creator?.role === "KOMITE"
        })
        .map(t => t.id) || []

    if (komiteTransactionIds.length === 0) {
        throw new Error("No authorized transactions to delete")
    }

    const { error } = await supabaseAdmin
        .from('Transaction')
        .delete()
        .in('id', komiteTransactionIds)

    if (error) {
        console.error('Error deleting transactions:', error)
        throw new Error('Failed to delete transactions')
    }

    return { success: true, deletedCount: komiteTransactionIds.length }
}
