"use server"

import { prisma } from "@/lib/prisma"

import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function getStudents() {
    const session = await getServerSession(authOptions)
    const isKomite = session?.user.role === "KOMITE"

    return await prisma.user.findMany({
        where: {
            role: "SANTRI",
        },
        select: {
            id: true,
            name: true,
            username: !isKomite,
        },
        orderBy: {
            name: "asc",
        },
    })
}
