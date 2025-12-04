"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    LayoutDashboard,
    Wallet,
    LogOut,
    Banknote,
    BarChart3,
    FileText
} from "lucide-react"
import { signOut } from "next-auth/react"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function KomiteSidebar({ className }: SidebarProps) {
    const pathname = usePathname()

    const routes = [
        {
            href: "/komite",
            label: "Dashboard",
            icon: LayoutDashboard,
            active: pathname === "/komite",
        },
        {
            href: "/komite/transactions",
            label: "Input Transaksi",
            icon: Wallet,
            active: pathname === "/komite/transactions",
        },
        {
            href: "/komite/expenditure",
            label: "Pengeluaran",
            icon: Banknote,
            active: pathname === "/komite/expenditure",
        },
        {
            href: "/komite/monitoring",
            label: "Monitoring",
            icon: BarChart3,
            active: pathname === "/komite/monitoring",
        },
        {
            href: "/komite/reports",
            label: "Laporan",
            icon: FileText,
            active: pathname === "/komite/reports",
        },
    ]

    return (
        <div className={cn("pb-12 min-h-screen border-r bg-emerald-50/40 relative", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-emerald-900">
                        Komite RQM
                    </h2>
                    <div className="space-y-1">
                        {routes.map((route) => (
                            <Button
                                key={route.href}
                                variant={route.active ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start",
                                    route.active && "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                                )}
                                asChild
                            >
                                <Link href={route.href}>
                                    <route.icon className="mr-2 h-4 w-4" />
                                    {route.label}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="absolute bottom-4 left-0 right-0 px-3">
                <Button
                    variant="outline"
                    className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </div>
        </div>
    )
}
