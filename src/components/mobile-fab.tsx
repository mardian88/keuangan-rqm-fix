"use client"

import { Plus, Wallet, ArrowRightLeft, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface MobileFloatingActionProps {
    role: "ADMIN" | "KOMITE"
}

export function MobileFloatingAction({ role }: MobileFloatingActionProps) {
    const pathname = usePathname()

    // Don't show on transaction pages to avoid clutter/confusion
    if (pathname.includes("/transactions") || pathname.includes("/expenditure")) {
        return null
    }

    const basePath = role === "ADMIN" ? "/admin" : "/komite"

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    size="icon"
                    className="fixed bottom-4 right-4 z-50 md:hidden h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-xl border-4 border-white/20 transition-all duration-300 hover:scale-110 active:scale-90 hover:shadow-2xl hover:-rotate-12"
                >
                    <Plus className="h-6 w-6 text-white" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mb-2">
                <DropdownMenuItem asChild>
                    <Link href={`${basePath}/transactions`} className="flex items-center cursor-pointer">
                        <Wallet className="mr-2 h-4 w-4" />
                        <span>Pemasukan</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={`${basePath}/expenditure`} className="flex items-center cursor-pointer">
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                        <span>Pengeluaran</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={`${basePath}/transactions?open=mass`} className="flex items-center cursor-pointer">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Input Masal</span>
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
