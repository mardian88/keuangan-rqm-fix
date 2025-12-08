"use client"

import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"
import { useToast } from "@/contexts/toast-context"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useState } from "react"

export function MobileLogoutButtonSantri() {
    const { showToast } = useToast()
    const [showConfirm, setShowConfirm] = useState(false)

    const handleLogout = async () => {
        try {
            await signOut({ callbackUrl: "/login" })
            showToast("Berhasil keluar dari aplikasi", "success")
        } catch (error) {
            showToast("Terjadi kesalahan saat keluar", "error")
        }
    }

    return (
        <>
            <Button
                size="icon"
                variant="destructive"
                className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden h-14 w-14 rounded-full shadow-xl border-4 border-white/20 transition-all duration-300 hover:scale-110 active:scale-90 hover:shadow-2xl"
                onClick={() => setShowConfirm(true)}
            >
                <LogOut className="h-6 w-6" />
            </Button>

            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Keluar</AlertDialogTitle>
                        <AlertDialogDescription>
                            Yakin akan keluar dari aplikasi ini?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700">
                            Ya, Keluar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
