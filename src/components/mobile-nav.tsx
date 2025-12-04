"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

interface MobileNavProps {
    children: React.ReactNode
    title: string
}

export function MobileNav({ children, title }: MobileNavProps) {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()

    useEffect(() => {
        setOpen(false)
    }, [pathname])

    return (
        <div className="md:hidden flex items-center p-4 border-b bg-white sticky top-0 z-50">
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Menu className="h-6 w-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64">
                    <SheetTitle className="sr-only">{title}</SheetTitle>
                    {children}
                </SheetContent>
            </Sheet>
            <span className="ml-4 font-semibold text-lg text-emerald-900">{title}</span>
        </div>
    )
}
