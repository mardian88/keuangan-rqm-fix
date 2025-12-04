"use client"

import { useEffect, useState } from "react"
import { getHandoverStats, performHandover } from "@/actions/handover"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowRight } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function HandoverPage() {
    const [stats, setStats] = useState<{
        totalPending: number
        byType: Record<string, number>
        count: number
    } | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(true)

    useEffect(() => {
        loadStats()
    }, [])

    async function loadStats() {
        setIsFetching(true)
        try {
            const data = await getHandoverStats()
            setStats(data)
        } catch (error) {
            console.error(error)
        } finally {
            setIsFetching(false)
        }
    }

    async function handleHandover() {
        setIsLoading(true)
        try {
            await performHandover()
            await loadStats() // Reload to show 0
            alert("Dana berhasil diserahkan ke Komite")
        } catch (error) {
            console.error(error)
            alert("Gagal melakukan serah terima")
        } finally {
            setIsLoading(false)
        }
    }

    if (isFetching) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
    }

    if (!stats) return <div>Error loading stats</div>

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Serah Terima Dana</h1>
                <p className="text-muted-foreground">
                    Kelola penyerahan dana dari Admin ke Komite. Dana yang diinput Admin (Kas/Tabungan) statusnya "Tertahan" sampai diserahkan di sini.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                        <CardTitle className="text-blue-900">Total Dana Tertahan</CardTitle>
                        <CardDescription className="text-blue-700">
                            Dana fisik yang ada di Admin saat ini
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-blue-900">
                            Rp {stats.totalPending.toLocaleString('id-ID')}
                        </div>
                        <p className="mt-2 text-sm text-blue-700">
                            {stats.count} transaksi belum diserahkan
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Rincian Dana</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {Object.entries(stats.byType).map(([type, amount]) => (
                            <div key={type} className="flex justify-between items-center border-b pb-2 last:border-0">
                                <span className="font-medium">{type}</span>
                                <span>Rp {amount.toLocaleString('id-ID')}</span>
                            </div>
                        ))}
                        {Object.keys(stats.byType).length === 0 && (
                            <p className="text-muted-foreground text-sm">Tidak ada dana tertahan.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Aksi Serah Terima</CardTitle>
                    <CardDescription>
                        Klik tombol di bawah ini jika Anda (Admin) sudah menyerahkan uang fisik kepada Komite.
                        Status dana akan berpindah kepemilikan ke Komite.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                size="lg"
                                className="w-full sm:w-auto"
                                disabled={stats.totalPending === 0 || isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                )}
                                Serahkan Dana ke Komite
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Konfirmasi Serah Terima</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Apakah Anda yakin ingin menyerahkan semua dana sebesar <b>Rp {stats.totalPending.toLocaleString('id-ID')}</b> ke Komite?
                                    Tindakan ini akan mengubah status dana menjadi milik Komite.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={handleHandover}>Ya, Serahkan</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        </div>
    )
}
