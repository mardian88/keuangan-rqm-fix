"use server"

import { supabaseAdmin } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function enableInstallmentForStudent(studentId: string, defaultAmount: number) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    // Check if student exists and is a SANTRI
    const { data: student } = await supabaseAdmin
        .from('User')
        .select('id')
        .eq('id', studentId)
        .eq('role', 'SANTRI')
        .single()

    if (!student) {
        throw new Error("Student not found")
    }

    // Check if settings exist
    const { data: existing } = await supabaseAdmin
        .from('SppInstallmentSettings')
        .select('*')
        .eq('studentId', studentId)
        .single()

    let settings
    if (existing) {
        // Update
        const { data, error } = await supabaseAdmin
            .from('SppInstallmentSettings')
            .update({
                defaultAmount,
                isActive: true
            })
            .eq('studentId', studentId)
            .select()
            .single()

        if (error) throw new Error(error.message)
        settings = data
    } else {
        // Create
        const { data, error } = await supabaseAdmin
            .from('SppInstallmentSettings')
            .insert({
                studentId,
                defaultAmount,
                isActive: true
            })
            .select()
            .single()

        if (error) throw new Error(error.message)
        settings = data
    }

    return settings
}

export async function disableInstallmentForStudent(studentId: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    // Get current month and year
    const now = new Date()
    const currentMonth = now.getMonth() // 0-11
    const currentYear = now.getFullYear()

    // Get installment settings
    const { data: settings } = await supabaseAdmin
        .from('SppInstallmentSettings')
        .select('*')
        .eq('studentId', studentId)
        .eq('isActive', true)
        .single()

    if (!settings) {
        throw new Error("Installment settings not found or already inactive")
    }

    // Get payments for current month
    const { data: payments } = await supabaseAdmin
        .from('SppInstallmentPayment')
        .select('amount')
        .eq('studentId', studentId)
        .eq('year', currentYear)
        .eq('month', currentMonth)

    const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0
    const remaining = settings.defaultAmount - totalPaid

    // Validate: current month must be fully paid
    if (remaining > 0) {
        throw new Error(`Tidak dapat menonaktifkan cicilan. Bulan berjalan masih memiliki sisa pembayaran sebesar Rp ${remaining.toLocaleString('id-ID')}. Harap lunasi terlebih dahulu.`)
    }

    // Deactivate installment
    const { data, error } = await supabaseAdmin
        .from('SppInstallmentSettings')
        .update({ isActive: false })
        .eq('studentId', studentId)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data
}

export async function updateDefaultSppAmount(studentId: string, amount: number) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const { data, error } = await supabaseAdmin
        .from('SppInstallmentSettings')
        .update({ defaultAmount: amount })
        .eq('studentId', studentId)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data
}

export async function recordInstallmentPayment(
    studentId: string,
    year: number,
    month: number,
    amount: number,
    description?: string
) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    // Verify student has installment enabled
    const { data: settings } = await supabaseAdmin
        .from('SppInstallmentSettings')
        .select('*')
        .eq('studentId', studentId)
        .eq('isActive', true)
        .single()

    if (!settings) {
        throw new Error("Installment not enabled for this student")
    }

    const { data, error } = await supabaseAdmin
        .from('SppInstallmentPayment')
        .insert({
            studentId,
            year,
            month,
            amount,
            description,
            createdById: session.user.id
        })
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data
}

export async function getStudentInstallmentData(studentId: string, year: number) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && (session.user.role !== "SANTRI" || session.user.id !== studentId))) {
        throw new Error("Unauthorized")
    }

    // Get settings
    const { data: settings } = await supabaseAdmin
        .from('SppInstallmentSettings')
        .select('*')
        .eq('studentId', studentId)
        .eq('isActive', true)
        .single()

    if (!settings) {
        return null
    }

    // Get all payments for the year
    const { data: payments } = await supabaseAdmin
        .from('SppInstallmentPayment')
        .select(`
            *,
            createdBy:createdById (
                name
            )
        `)
        .eq('studentId', studentId)
        .eq('year', year)
        .order('month', { ascending: true })
        .order('createdAt', { ascending: true })

    // Calculate monthly totals
    const monthlyData = Array.from({ length: 12 }, (_, month) => {
        const monthPayments = payments?.filter(p => p.month === month) || []
        const totalPaid = monthPayments.reduce((sum, p) => sum + p.amount, 0)
        const remaining = settings.defaultAmount - totalPaid
        const status = (remaining <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid') as 'paid' | 'partial' | 'unpaid'

        return {
            month,
            defaultAmount: settings.defaultAmount,
            totalPaid,
            remaining: Math.max(0, remaining),
            status,
            payments: monthPayments
        }
    })

    return {
        settings,
        monthlyData,
        allPayments: payments || []
    }
}

export async function getInstallmentEnabledStudents() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const { data: students } = await supabaseAdmin
        .from('User')
        .select(`
            id,
            name,
            username,
            halaqah:halaqahId (
                name
            ),
            sppInstallmentSettings:SppInstallmentSettings!inner (
                defaultAmount
            )
        `)
        .eq('role', 'SANTRI')
        .eq('isActive', true)
        .eq('sppInstallmentSettings.isActive', true)
        .order('name', { ascending: true })

    return students || []
}

export async function getAllStudentsForInstallment() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const { data: students } = await supabaseAdmin
        .from('User')
        .select(`
            id,
            name,
            username,
            halaqah:halaqahId (
                name
            ),
            sppInstallmentSettings:SppInstallmentSettings (
                id,
                defaultAmount,
                isActive
            )
        `)
        .eq('role', 'SANTRI')
        .eq('isActive', true)
        .order('name', { ascending: true })

    return students || []
}

export async function deleteInstallmentPayment(paymentId: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const { data, error } = await supabaseAdmin
        .from('SppInstallmentPayment')
        .delete()
        .eq('id', paymentId)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data
}
