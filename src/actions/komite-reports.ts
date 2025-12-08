"use server"

import { supabaseAdmin } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { startOfDay, endOfDay } from "date-fns"

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
