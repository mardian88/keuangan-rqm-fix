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
    FileText,
    X,
    Database,
    ChevronDown,
    ChevronRight
} from "lucide-react"
import { signOut } from "next-auth/react"
import { useState } from "react"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    onClose?: () => void
}

export function AdminSidebar({ className, onClose }: SidebarProps) {
    const pathname = usePathname()
    const [isDataMenuOpen, setIsDataMenuOpen] = useState(
        pathname.includes("/admin/santri") || pathname.includes("/admin/guru")
    )

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
            href: "/admin/cicilan",
            label: "Cicilan",
            icon: CreditCard,
            active: pathname === "/admin/cicilan",
        },
        {
            href: "/admin/handover",
            label: "Serah Terima",
            icon: HandCoins,
            active: pathname === "/admin/handover",
        },
        {
            href: "/admin/laporan-transaksi",
            label: "Laporan Transaksi",
            icon: FileText,
            active: pathname === "/admin/laporan-transaksi",
        },
        {
            href: "/admin/monitoring",
            label: "Monitoring",
            icon: BarChart3,
            active: pathname === "/admin/monitoring",
        },
    ]

    const dataSubRoutes = [
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
    ]

    const bottomRoutes = [
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
                        {/* Main Routes */}
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

                        {/* Data Parent Menu */}
                        <div>
                            <Button
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={() => setIsDataMenuOpen(!isDataMenuOpen)}
                            >
                                <Database className="mr-2 h-4 w-4" />
                                Data
                                {isDataMenuOpen ? (
                                    <ChevronDown className="ml-auto h-4 w-4" />
                                ) : (
                                    <ChevronRight className="ml-auto h-4 w-4" />
                                )}
                            </Button>

                            {/* Data Sub-menu */}
                            {isDataMenuOpen && (
                                <div className="ml-4 mt-1 space-y-1">
                                    {dataSubRoutes.map((route) => (
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
                            )}
                        </div>

                        {/* Bottom Routes */}
                        {bottomRoutes.map((route) => (
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
