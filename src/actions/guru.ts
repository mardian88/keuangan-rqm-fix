"use server"

import { prisma } from "@/lib/prisma"

export async function getGurus() {
    return await prisma.user.findMany({
        where: {
            role: "GURU",
        },
        select: {
            id: true,
            name: true,
            username: true,
        },
        orderBy: {
            name: "asc",
        },
    })
}
