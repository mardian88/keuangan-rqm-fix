"use server"

import { supabaseAdmin } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function getSantriHistory() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "SANTRI") {
        return {
            transactions: [],
            currentTabungan: 0
        }
    }

    const { data: transactions, error } = await supabaseAdmin
        .from('Transaction')
        .select(`
            *,
            creator:creatorId (
                name,
                role
            )
        `)
        .eq('studentId', session.user.id)
        .order('date', { ascending: false })

    if (error) {
        console.error('Error fetching santri history:', error)
        return {
            transactions: [],
            currentTabungan: 0
        }
    }

    // Calculate totals
    const totalTabungan = transactions
        .filter(t => t.type === "TABUNGAN")
        .reduce((acc, curr) => acc + curr.amount, 0)

    const totalPenarikan = transactions
        .filter(t => t.type === "PENARIKAN_TABUNGAN")
        .reduce((acc, curr) => acc + curr.amount, 0)

    const currentTabungan = totalTabungan - totalPenarikan

    return {
        transactions,
        currentTabungan
    }
}
