"use server"

import { supabaseAdmin } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"

// Helper function to check if student can pay SPP (not duplicate in current month)
// Returns true if SAFE to pay, false if duplicate exists and no installment plan
async function canPaySpp(studentId: string, date: Date): Promise<boolean> {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)

    // Check installment status
    const { data: installmentSettings } = await supabaseAdmin
        .from('SppInstallmentSettings')
        .select('studentId')
        .eq('studentId', studentId)
        .eq('isActive', true)
        .single()

    if (installmentSettings) return true // Bypass if installment active

    // Check existing transaction
    const { data: existingTransactions } = await supabaseAdmin
        .from('Transaction')
        .select('id')
        .eq('studentId', studentId)
        .eq('type', 'SPP')
        .gte('date', startOfMonth.toISOString())
        .lte('date', endOfMonth.toISOString())
        .limit(1)

    return !existingTransactions || existingTransactions.length === 0
}

export async function createMassTransaction(data: {
    type: string
    amount: number
    description?: string
    studentIds: string[]
    date: Date
}) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "KOMITE")) {
        throw new Error("Unauthorized")
    }

    if (data.studentIds.length === 0) {
        throw new Error("No students selected")
    }

    let studentsToProcess = data.studentIds

    // SPP Validation for Mass Transaction
    if (data.type === 'SPP') {
        const validStudents: string[] = []
        for (const studentId of data.studentIds) {
            const isSafe = await canPaySpp(studentId, data.date)
            if (isSafe) {
                validStudents.push(studentId)
            }
        }

        if (validStudents.length === 0) {
            throw new Error("Semua santri yang dipilih sudah membayar SPP bulan ini (atau tidak memiliki status cicilan).")
        }

        if (validStudents.length < data.studentIds.length) {
            // Some students were filtered out
            console.log(`Filtered out ${data.studentIds.length - validStudents.length} students due to duplicate SPP`)
        }

        studentsToProcess = validStudents
    }

    // Determine if this transaction requires handover based on category settings
    const { data: category } = await supabaseAdmin
        .from('TransactionCategory')
        .select('code, type, requiresHandover')
        .eq('code', data.type)
        .single()

    // Handover logic: same as single transaction
    const defaultHandoverTypes = ["TABUNGAN", "KAS"]
    const categoryRequiresHandover = category?.requiresHandover ?? defaultHandoverTypes.includes(data.type)
    const isHandover = session.user.role === "ADMIN" && categoryRequiresHandover

    // Create transactions for valid students
    const transactions = studentsToProcess.map((studentId) => ({
        type: data.type,
        amount: data.amount,
        description: data.description,
        date: data.date.toISOString(),
        studentId: studentId,
        creatorId: session.user.id,
        isHandover: isHandover,
        handoverStatus: isHandover ? "PENDING" : "NONE",
    }))

    const { error } = await supabaseAdmin
        .from('Transaction')
        .insert(transactions)

    if (error) {
        console.error('Error creating mass transactions:', error)
        throw new Error('Failed to create mass transactions')
    }

    revalidatePath("/admin")
    revalidatePath("/admin/transactions")
    revalidatePath("/komite/transactions")

    // Return result info
    return {
        success: true,
        processed: studentsToProcess.length,
        skipped: data.studentIds.length - studentsToProcess.length
    }
}
