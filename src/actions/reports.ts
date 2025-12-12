"use server"

import { supabaseAdmin } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"

interface TransactionFilters {
    startDate?: string
    endDate?: string
    categoryCode?: string
    type?: "INCOME" | "EXPENSE"
    searchQuery?: string
    creatorRole?: "ADMIN" | "KOMITE"
    page?: number
    pageSize?: number
}

export async function getFilteredTransactions(filters: TransactionFilters = {}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const {
        startDate,
        endDate,
        categoryCode,
        type,
        searchQuery,
        creatorRole,
        page = 1,
        pageSize = 10
    } = filters

    // Fetch all categories to map details and handle type filtering
    const { data: categories } = await supabaseAdmin
        .from('TransactionCategory')
        .select('*')

    const categoryMap = new Map(categories?.map(c => [c.code, c]))

    // Build query
    // Note: We need to filter by creator role. Since Supabase postgrest doesn't support
    // deep filtering on related tables efficiently in one go without shaping, 
    // we might need to rely on the fact that we can filter if we flattened it or use !inner join.
    // Using !inner on Creator will filter the parent rows.

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
    if (creatorRole) {
        query = query.eq('Creator.role', creatorRole)
    }

    // Filter by Type (INCOME/EXPENSE)
    // Since we don't have a direct FK join, we filter by the 'type' column (which holds category code)
    // being in the list of codes that belong to the requested Type.
    if (type && categories) {
        const codesOfType = categories
            .filter(c => c.type === type)
            .map(c => c.code)

        if (codesOfType.length > 0) {
            query = query.in('type', codesOfType)
        } else {
            // If no categories match the type, return empty result efficiently
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

    // Enrich data with category details
    const enrichedData = data?.map(t => ({
        ...t,
        TransactionCategory: categoryMap.get(t.type) || { name: t.type, type: 'UNKNOWN' }
    })) || []

    return {
        transactions: enrichedData,
        totalCount: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
    }
}

export async function updateTransaction(id: string, data: {
    type?: string
    amount?: number
    description?: string
    date?: Date
}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const updateData: any = {}
    if (data.type) updateData.type = data.type
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.description !== undefined) updateData.description = data.description
    if (data.date) updateData.date = data.date.toISOString()

    const { error } = await supabaseAdmin
        .from('Transaction')
        .update(updateData)
        .eq('id', id)

    if (error) {
        console.error('Error updating transaction:', error)
        throw new Error('Failed to update transaction')
    }

    revalidatePath("/admin/laporan-transaksi")
    revalidatePath("/admin")
}

export async function deleteTransaction(id: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const { error } = await supabaseAdmin
        .from('Transaction')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting transaction:', error)
        throw new Error('Failed to delete transaction')
    }

    revalidatePath("/admin/laporan-transaksi")
    revalidatePath("/admin")
}

export async function bulkDeleteTransactions(ids: string[]) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    if (!ids || ids.length === 0) {
        throw new Error("No transaction IDs provided")
    }

    const { error } = await supabaseAdmin
        .from('Transaction')
        .delete()
        .in('id', ids)

    if (error) {
        console.error('Error deleting transactions:', error)
        throw new Error('Failed to delete transactions')
    }

    revalidatePath("/admin/laporan-transaksi")
    revalidatePath("/admin")

    return { success: true, deletedCount: ids.length }
}
