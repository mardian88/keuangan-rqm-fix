"use client"

import { AdminSidebar } from "@/components/admin-sidebar"
import { Menu } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 border-b bg-white sticky top-0 z-40">
                <h1 className="text-lg font-bold">Admin RQM</h1>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(true)}
                >
                    <Menu className="h-6 w-6" />
                </Button>
            </div>

            {/* Desktop Sidebar */}
            <div className="w-full md:w-64 flex-none hidden md:block">
                <AdminSidebar />
            </div>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <div className="fixed inset-y-0 left-0 w-64 z-50 md:hidden">
                        <AdminSidebar onClose={() => setSidebarOpen(false)} />
                    </div>
                </>
            )}

            {/* Main Content */}
            <div className="flex-1 p-4 md:p-8 bg-white">
                {children}
            </div>
        </div>
    )
}
