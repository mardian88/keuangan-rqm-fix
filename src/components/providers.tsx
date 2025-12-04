"use client"

import { SessionProvider } from "next-auth/react"
import { ToastProvider } from "@/contexts/toast-context"
import { ToastContainer } from "@/components/ui/toast"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ToastProvider>
                {children}
                <ToastContainer />
            </ToastProvider>
        </SessionProvider>
    )
}
