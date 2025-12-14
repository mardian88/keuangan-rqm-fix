"use server"

import { supabaseAdmin } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"

export async function getTransactionCategories(role: "ADMIN" | "KOMITE", type?: "INCOME" | "EXPENSE") {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    let query = supabaseAdmin
        .from('TransactionCategory')
        .select('*')
        .eq('isActive', true)

    if (role === "KOMITE") {
        query = query.eq('showToKomite', true)
    } else if (role === "ADMIN") {
        query = query.eq('showToAdmin', true)
    }

    if (type) {
        query = query.eq('type', type)
    }

    const { data, error } = await query.order('name', { ascending: true })

    if (error) {
        console.error('Error fetching categories:', error)
        throw new Error('Failed to fetch categories')
    }

    return data
}

export async function getAllCategories() {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "KOMITE")) {
        throw new Error("Unauthorized")
    }

    const { data, error } = await supabaseAdmin
        .from('TransactionCategory')
        .select('*')
        .order('createdAt', { ascending: false })

    if (error) {
        console.error('Error fetching all categories:', error)
        throw new Error('Failed to fetch categories')
    }

    return data
}

export async function createCategory(data: {
    name: string
    type: "INCOME" | "EXPENSE"
    showToKomite: boolean
    showToAdmin: boolean
    requiresHandover?: boolean
    defaultAmount?: number
}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized")

    // Generate code from name (uppercase, replace spaces with underscores)
    const code = data.name.toUpperCase().replace(/\s+/g, "_")

    const { error } = await supabaseAdmin
        .from('TransactionCategory')
        .insert({
            ...data,
            code,
            isSystem: false,
            requiresHandover: data.requiresHandover ?? false,
            defaultAmount: data.defaultAmount ?? 0
        })

    if (error) {
        console.error('Error creating category:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        console.error('Attempted to insert:', { name: data.name, code, type: data.type })
        throw new Error(`Failed to create category: ${error.message || 'Unknown error'}`)
    }

    revalidatePath("/admin/settings/categories")
}

export async function updateCategory(id: string, data: {
    name: string
    showToKomite: boolean
    showToAdmin: boolean
    isActive: boolean
    requiresHandover?: boolean
    defaultAmount?: number
}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized")

    const { data: category, error: fetchError } = await supabaseAdmin
        .from('TransactionCategory')
        .select('*')
        .eq('id', id)
        .single()

    if (fetchError || !category) throw new Error("Category not found")

    // If system category, prevent renaming if needed, but here we allow renaming display name
    // but maybe we should keep code same.

    const { error } = await supabaseAdmin
        .from('TransactionCategory')
        .update(data)
        .eq('id', id)

    if (error) {
        console.error('Error updating category:', error)
        throw new Error('Failed to update category')
    }

    revalidatePath("/admin/settings/categories")
}

export async function deleteCategory(id: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized")

    const { data: category, error: fetchError } = await supabaseAdmin
        .from('TransactionCategory')
        .select('*')
        .eq('id', id)
        .single()

    if (fetchError || !category) throw new Error("Category not found")

    if (category.isSystem) {
        throw new Error("Cannot delete system category")
    }

    const { error } = await supabaseAdmin
        .from('TransactionCategory')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting category:', error)
        throw new Error('Failed to delete category')
    }

    revalidatePath("/admin/settings/categories")
}
