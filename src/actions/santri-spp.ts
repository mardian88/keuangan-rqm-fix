"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getStudentInstallmentData } from "./installment"

export async function getMyInstallmentData(year: number) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "SANTRI") {
        return null
    }

    // Reuse the existing logic but pass the current user's ID
    return getStudentInstallmentData(session.user.id, year)
}
