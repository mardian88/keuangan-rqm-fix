"use server"

import { supabaseAdmin } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"

export async function getHandoverStats() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return {
            totalPending: 0,
            byType: {},
            count: 0
        }
    }

    const { data: pendingTransactions, error } = await supabaseAdmin
        .from('Transaction')
        .select('*')
        .eq('isHandover', true)
        .eq('handoverStatus', 'PENDING')

    if (error) {
        console.error('Error fetching handover stats:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        return {
            totalPending: 0,
            byType: {},
            count: 0
        }
    }

    if (!pendingTransactions || pendingTransactions.length === 0) {
        return {
            totalPending: 0,
            byType: {},
            count: 0
        }
    }

    const totalPending = pendingTransactions.reduce((acc, curr) => acc + curr.amount, 0)

    const byType = pendingTransactions.reduce((acc, curr) => {
        acc[curr.type] = (acc[curr.type] || 0) + curr.amount
        return acc
    }, {} as Record<string, number>)

    return {
        totalPending,
        byType,
        count: pendingTransactions.length
    }
}

export async function performHandover() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    // Update all PENDING transactions to COMPLETED
    const { error } = await supabaseAdmin
        .from('Transaction')
        .update({
            handoverStatus: "COMPLETED",
            handoverDate: new Date().toISOString(),
        })
        .eq('isHandover', true)
        .eq('handoverStatus', 'PENDING')

    if (error) {
        console.error('Error performing handover:', error)
        throw new Error('Failed to perform handover')
    }

    revalidatePath("/admin")
    revalidatePath("/admin/handover")
    revalidatePath("/komite")
}
