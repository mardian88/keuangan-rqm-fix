"use server"

import { supabaseAdmin } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function getStudentMonitoring() {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "KOMITE")) {
        throw new Error("Unauthorized")
    }

    const { data: students } = await supabaseAdmin
        .from('User')
        .select(`
            id,
            name,
            username,
            halaqah:halaqahId (name),
            shift:shiftId (name)
        `)
        .eq('role', 'SANTRI')
        .eq('isActive', true)
        .order('name', { ascending: true })

    if (!students) return []

    const isKomite = session.user.role === "KOMITE"

    // Get all transactions for these students
    const studentIds = students.map(s => s.id)
    const { data: allTransactions } = await supabaseAdmin
        .from('Transaction')
        .select('studentId, type, amount, date')
        .in('studentId', studentIds)

    // Group transactions by student
    const transactionsByStudent = new Map<string, any[]>()
    allTransactions?.forEach(t => {
        if (!transactionsByStudent.has(t.studentId)) {
            transactionsByStudent.set(t.studentId, [])
        }
        transactionsByStudent.get(t.studentId)!.push(t)
    })

    return students.map(student => {
        const transactions = transactionsByStudent.get(student.id) || []

        // Calculate SPP payments
        const sppTransactions = transactions.filter(t => t.type === "SPP")
        const totalSPP = sppTransactions.reduce((sum, t) => sum + t.amount, 0)
        const lastSPPDate = sppTransactions.length > 0
            ? sppTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
            : null

        // Calculate KAS payments
        const kasTransactions = transactions.filter(t => t.type === "KAS")
        const totalKas = kasTransactions.reduce((sum, t) => sum + t.amount, 0)

        // Calculate Tabungan balance
        const tabunganIn = transactions.filter(t => t.type === "TABUNGAN").reduce((sum, t) => sum + t.amount, 0)
        const tabunganOut = transactions.filter(t => t.type === "PENARIKAN_TABUNGAN").reduce((sum, t) => sum + t.amount, 0)
        const saldoTabungan = tabunganIn - tabunganOut

        return {
            id: student.id,
            name: student.name,
            nis: isKomite ? "" : student.username,
            halaqah: student.halaqah?.name || "-",
            shift: student.shift?.name || "-",
            totalSPP,
            lastSPPDate,
            totalKas,
            saldoTabungan,
        }
    })
}

export async function getMonthlyPaymentStatus(year: number) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "KOMITE")) {
        throw new Error("Unauthorized")
    }

    const { data: students } = await supabaseAdmin
        .from('User')
        .select(`
            id,
            name,
            username,
            halaqahId,
            halaqah:halaqahId (id, name)
        `)
        .eq('role', 'SANTRI')
        .eq('isActive', true)
        .order('name', { ascending: true })

    if (!students) return []

    const isKomite = session.user.role === "KOMITE"

    // Get all transactions for the year
    const studentIds = students.map(s => s.id)
    // Better: Fetch all transactions for the student in that year that MIGHT be relevant.
    // Or better yet, fetch categories first, find ALL separate codes, then query.

    // 1. Fetch Categories to find all checking codes
    const { data: categories } = await supabaseAdmin
        .from('TransactionCategory')
        .select('code, name')
        .eq('type', 'INCOME') // SPP/Kas are income

    const sppCodes = categories
        ?.filter(c => c.code === 'SPP' || c.code === 'CICILAN_SPP' || c.name.toLowerCase().includes('spp'))
        .map(c => c.code) || ['SPP']

    const kasCodes = categories
        ?.filter(c => c.code === 'KAS' || c.code === 'UANG_KAS' || c.name.toLowerCase().includes('kas') || c.name.toLowerCase().includes('uang kas'))
        .map(c => c.code) || ['KAS', 'UANG_KAS']

    // Combined codes for query
    const targetCodes = [...new Set([...sppCodes, ...kasCodes])]

    // 2. Fetch Transactions
    const { data: allTransactions } = await supabaseAdmin
        .from('Transaction')
        .select('studentId, type, date')
        .in('studentId', studentIds)
        .in('type', targetCodes)
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)

    // Get installment settings and payments
    const { data: installmentSettings } = await supabaseAdmin
        .from('SppInstallmentSettings')
        .select('studentId, defaultAmount, isActive')
        .in('studentId', studentIds)
        .eq('isActive', true)

    const { data: installmentPayments } = await supabaseAdmin
        .from('SppInstallmentPayment')
        .select('studentId, month, amount')
        .in('studentId', studentIds)
        .eq('year', year)

    // Group data by student
    const transactionsByStudent = new Map<string, any[]>()
    allTransactions?.forEach(t => {
        if (!transactionsByStudent.has(t.studentId)) {
            transactionsByStudent.set(t.studentId, [])
        }
        transactionsByStudent.get(t.studentId)!.push(t)
    })

    const settingsByStudent = new Map<string, any>()
    installmentSettings?.forEach(s => {
        settingsByStudent.set(s.studentId, s)
    })

    const paymentsByStudent = new Map<string, any[]>()
    installmentPayments?.forEach(p => {
        if (!paymentsByStudent.has(p.studentId)) {
            paymentsByStudent.set(p.studentId, [])
        }
        paymentsByStudent.get(p.studentId)!.push(p)
    })

    return students.map(student => {
        const sppByMonth: Record<number, boolean> = {}
        const kasByMonth: Record<number, boolean> = {}

        // Check if student has installment enabled
        const settings = settingsByStudent.get(student.id)
        const hasInstallment = settings?.isActive

        if (hasInstallment && settings) {
            // For installment students, check if total payments >= default amount
            const defaultAmount = settings.defaultAmount
            const payments = paymentsByStudent.get(student.id) || []

            for (let month = 0; month < 12; month++) {
                const monthPayments = payments.filter(p => p.month === month)
                const totalPaid = monthPayments.reduce((sum, p) => sum + p.amount, 0)
                sppByMonth[month] = totalPaid >= defaultAmount
            }
        } else {
            // For non-installment students, use regular transaction check
            const transactions = transactionsByStudent.get(student.id) || []
            transactions.forEach(transaction => {
                const month = new Date(transaction.date).getMonth()
                // Use dynamic code check
                if (sppCodes.includes(transaction.type)) {
                    sppByMonth[month] = true
                }
            })
        }

        // KAS always uses regular transactions
        const transactions = transactionsByStudent.get(student.id) || []
        transactions.forEach(transaction => {
            const month = new Date(transaction.date).getMonth()
            if (kasCodes.includes(transaction.type)) {
                kasByMonth[month] = true
            }
        })

        return {
            id: student.id,
            name: student.name,
            nis: isKomite ? "" : student.username,
            halaqahId: student.halaqahId,
            halaqah: student.halaqah?.name || "-",
            sppByMonth,
            kasByMonth,
        }
    })
}


export async function getHalaqahList() {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "KOMITE")) {
        throw new Error("Unauthorized")
    }

    const { data: halaqahs } = await supabaseAdmin
        .from('Halaqah')
        .select('*')
        .order('name', { ascending: true })

    return halaqahs || []
}

export async function getTabunganBalances() {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "KOMITE")) {
        throw new Error("Unauthorized")
    }

    const { data: students } = await supabaseAdmin
        .from('User')
        .select(`
            id,
            name,
            username,
            halaqahId,
            halaqah:halaqahId (name)
        `)
        .eq('role', 'SANTRI')
        .eq('isActive', true)
        .order('name', { ascending: true })

    if (!students) return []

    const isKomite = session.user.role === "KOMITE"

    // Get all tabungan transactions
    const studentIds = students.map(s => s.id)
    const { data: allTransactions } = await supabaseAdmin
        .from('Transaction')
        .select('studentId, type, amount')
        .in('studentId', studentIds)
        .in('type', ['TABUNGAN', 'PENARIKAN_TABUNGAN'])

    // Group by student
    const transactionsByStudent = new Map<string, any[]>()
    allTransactions?.forEach(t => {
        if (!transactionsByStudent.has(t.studentId)) {
            transactionsByStudent.set(t.studentId, [])
        }
        transactionsByStudent.get(t.studentId)!.push(t)
    })

    return students.map(student => {
        const transactions = transactionsByStudent.get(student.id) || []
        const tabunganIn = transactions
            .filter(t => t.type === "TABUNGAN")
            .reduce((sum, t) => sum + t.amount, 0)
        const tabunganOut = transactions
            .filter(t => t.type === "PENARIKAN_TABUNGAN")
            .reduce((sum, t) => sum + t.amount, 0)
        const saldoTabungan = tabunganIn - tabunganOut

        return {
            id: student.id,
            name: student.name,
            nis: isKomite ? "" : student.username,
            halaqahId: student.halaqahId,
            halaqah: student.halaqah?.name || "-",
            saldoTabungan,
        }
    })
}
