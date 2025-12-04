"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    LayoutDashboard,
    Wallet,
    Settings,
    LogOut,
    Banknote,
    HandCoins,
    User,
    Users,
    BarChart3,
    CreditCard,
    Megaphone,
    X
} from "lucide-react"
import { signOut } from "next-auth/react"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    onClose?: () => void
}

export function AdminSidebar({ className, onClose }: SidebarProps) {
    const pathname = usePathname()

    const routes = [
        {
            href: "/admin",
            label: "Dashboard",
            icon: LayoutDashboard,
            active: pathname === "/admin",
        },
        {
            href: "/admin/transactions",
            label: "Input Transaksi",
            icon: Wallet,
            active: pathname === "/admin/transactions",
        },
        {
            href: "/admin/expenditure",
            label: "Pengeluaran",
            icon: Banknote,
            active: pathname === "/admin/expenditure",
        },
        {
            href: "/admin/handover",
            label: "Serah Terima",
            icon: HandCoins,
            active: pathname === "/admin/handover",
        },
        {
            href: "/admin/monitoring",
            label: "Monitoring",
            icon: BarChart3,
            active: pathname === "/admin/monitoring",
        },
        {
            href: "/admin/cicilan",
            label: "Cicilan SPP",
            icon: CreditCard,
            active: pathname === "/admin/cicilan",
        },
        {
            href: "/admin/santri",
            label: "Data Santri",
            icon: User,
            active: pathname === "/admin/santri",
        },
        {
            href: "/admin/guru",
            label: "Data Guru",
            icon: Users,
            active: pathname === "/admin/guru",
        },
        {
            href: "/admin/announcements",
            label: "Pengumuman",
            icon: Megaphone,
            active: pathname === "/admin/announcements",
        },
        {
            href: "/admin/settings",
            label: "Pengaturan",
            icon: Settings,
            active: pathname === "/admin/settings",
        },
    ]

    return (
        <div className={cn("pb-12 min-h-screen border-r bg-white md:bg-gray-100/40 relative shadow-lg md:shadow-none", className)}>
            {/* Mobile Close Button */}
            {onClose && (
                <div className="flex items-center justify-between p-4 border-b bg-green-600 text-white md:hidden">
                    <h2 className="text-lg font-semibold">Menu Admin</h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-green-700">
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            )}

            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight hidden md:block">
                        Admin RQM
                    </h2>
                    <div className="space-y-1">
                        {routes.map((route) => (
                            <Button
                                key={route.href}
                                variant={route.active ? "default" : "ghost"}
                                className={cn(
                                    "w-full justify-start",
                                    route.active && "bg-green-600 hover:bg-green-700 text-white"
                                )}
                                asChild
                                onClick={onClose}
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
