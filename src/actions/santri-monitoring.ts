"use server"

import { supabaseAdmin } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getStudentInstallmentData } from "./installment"

export async function getSantriMonthlyPaymentStatus(year: number) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "SANTRI") {
        return null
    }

    const studentId = session.user.id

    const { data: student } = await supabaseAdmin
        .from('User')
        .select(`
            id,
            name,
            username,
            halaqah:halaqahId (name)
        `)
        .eq('id', studentId)
        .single()

    if (!student) throw new Error("Student not found")

    // Get KAS transactions for the year
    const { data: transactions } = await supabaseAdmin
        .from('Transaction')
        .select('date')
        .eq('studentId', studentId)
        .eq('type', 'KAS')
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)

    const kasByMonth: Record<number, boolean> = {}

    transactions?.forEach(transaction => {
        const month = new Date(transaction.date).getMonth()
        kasByMonth[month] = true
    })

    return {
        id: student.id,
        name: student.name,
        nis: student.username,
        halaqah: student.halaqah?.name || "-",
        kasByMonth,
    }
}

export async function getSantriTabunganData() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "SANTRI") {
        return null
    }

    const studentId = session.user.id

    const { data: transactions } = await supabaseAdmin
        .from('Transaction')
        .select('id, date, type, amount, description')
        .eq('studentId', studentId)
        .in('type', ['TABUNGAN', 'PENARIKAN_TABUNGAN'])
        .order('date', { ascending: false })

    const tabunganIn = transactions
        ?.filter(t => t.type === "TABUNGAN")
        .reduce((sum, t) => sum + t.amount, 0) || 0
    const tabunganOut = transactions
        ?.filter(t => t.type === "PENARIKAN_TABUNGAN")
        .reduce((sum, t) => sum + t.amount, 0) || 0
    const saldoTabungan = tabunganIn - tabunganOut

    return {
        saldoTabungan,
        transactions: transactions || []
    }
}

export async function getSantriSppData(year: number) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "SANTRI") {
        return null
    }

    const studentId = session.user.id

    try {
        // First try to get installment data
        const installmentData = await getStudentInstallmentData(studentId, year)

        if (installmentData) {
            return {
                type: 'installment',
                ...installmentData
            }
        }

        // If no installment settings, get regular SPP transactions
        const { data: transactions } = await supabaseAdmin
            .from('Transaction')
            .select('date')
            .eq('studentId', studentId)
            .eq('type', 'SPP')
            .gte('date', `${year}-01-01`)
            .lte('date', `${year}-12-31`)

        const sppByMonth: Record<number, boolean> = {}
        transactions?.forEach(transaction => {
            const month = new Date(transaction.date).getMonth()
            sppByMonth[month] = true
        })

        return {
            type: 'regular',
            sppByMonth
        }

    } catch (error) {
        console.error("Error fetching SPP data for santri:", error)
        return null
    }
}
