"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import { getSantriMonthlyPaymentStatus, getSantriTabunganData, getSantriSppData } from "@/actions/santri-monitoring"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"

const MONTHS = [
    "DES", "JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV"
]

const MONTH_INDICES = [11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export default function SantriMonitoringPage() {
    const [kasData, setKasData] = useState<any>(null)
    const [tabunganData, setTabunganData] = useState<any>(null)
    const [sppData, setSppData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [selectedYear, setSelectedYear] = useState(2025)

    useEffect(() => {
        loadData()
    }, [selectedYear])

    async function loadData() {
        try {
            setIsLoading(true)
            const [kas, tabungan, spp] = await Promise.all([
                getSantriMonthlyPaymentStatus(selectedYear),
                getSantriTabunganData(),
                getSantriSppData(selectedYear)
            ])
            setKasData(kas)
            setTabunganData(tabungan)
            setSppData(spp)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-4 md:space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-emerald-900">Monitoring Keuangan</h1>
                <p className="text-sm text-muted-foreground">Pantau status pembayaran kas dan saldo tabungan Anda</p>
            </div>

            <Tabs defaultValue="kas" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-emerald-100">
                    <TabsTrigger value="spp" className="data-[state=active]:bg-white data-[state=active]:text-emerald-900">SPP</TabsTrigger>
                    <TabsTrigger value="kas" className="data-[state=active]:bg-white data-[state=active]:text-emerald-900">Kas</TabsTrigger>
                    <TabsTrigger value="tabungan" className="data-[state=active]:bg-white data-[state=active]:text-emerald-900">Tabungan</TabsTrigger>
                </TabsList>

                {/* SPP TAB */}
                <TabsContent value="spp" className="space-y-4">
                    <Card className="border-emerald-100">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-emerald-900">Status Pembayaran SPP</CardTitle>
                            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                                <SelectTrigger className="w-[100px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[2024, 2025, 2026, 2027].map(year => (
                                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="sticky left-0 bg-background z-10 min-w-[150px] md:min-w-[200px] text-xs md:text-sm">Nama Santri</TableHead>
                                                <TableHead className="text-center min-w-[50px] md:min-w-[60px] text-xs md:text-sm">NIS</TableHead>
                                                {MONTHS.map((month, idx) => (
                                                    <TableHead key={idx} className="text-center min-w-[40px] md:min-w-[60px] text-xs md:text-sm">
                                                        {month}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="sticky left-0 bg-background z-10 font-medium text-xs md:text-sm">
                                                    {kasData?.name}
                                                </TableCell>
                                                <TableCell className="text-center text-xs md:text-sm text-muted-foreground">
                                                    {kasData?.nis}
                                                </TableCell>
                                                {MONTH_INDICES.map((monthIdx, idx) => {
                                                    if (sppData?.type === 'installment') {
                                                        const monthData = sppData.monthlyData.find((d: any) => d.month === monthIdx)
                                                        const status = monthData?.status || 'unpaid'
                                                        let bgClass = 'bg-red-500' // Default unpaid (Red)

                                                        if (status === 'paid') {
                                                            bgClass = 'bg-green-500' // Paid (Green)
                                                        } else if (status === 'partial') {
                                                            bgClass = 'bg-amber-500' // Partial (Amber)
                                                        }

                                                        return (
                                                            <TableCell key={idx}>
                                                                <div className="flex justify-center">
                                                                    <div className={`w-3 h-3 rounded-full ${bgClass}`} />
                                                                </div>
                                                            </TableCell>
                                                        )
                                                    } else {
                                                        // Regular SPP view
                                                        const isPaid = sppData?.sppByMonth?.[monthIdx]
                                                        return (
                                                            <TableCell key={idx} className="text-center p-4">
                                                                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${isPaid ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                                                                    {isPaid ? "✓" : "-"}
                                                                </div>
                                                            </TableCell>
                                                        )
                                                    }
                                                })}
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                    {sppData?.type === 'installment' ? (
                                        <div className="mt-4 flex gap-4 text-sm justify-center">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                <span>Lunas</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                                <span>Sebagian</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                <span>Belum Bayar</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-4 flex gap-4 text-sm justify-center">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                                                <span>Lunas</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full bg-gray-100 border border-gray-200"></div>
                                                <span>Belum Bayar</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* KAS TAB */}
                <TabsContent value="kas" className="space-y-4">
                    <Card className="border-emerald-100">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-emerald-900">Status Pembayaran Kas</CardTitle>
                            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                                <SelectTrigger className="w-[100px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[2024, 2025, 2026, 2027].map(year => (
                                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                                </div>
                            ) : kasData ? (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-emerald-50 hover:bg-emerald-50">
                                                {MONTHS.map((month, idx) => (
                                                    <TableHead key={idx} className="text-center text-emerald-900 font-semibold">{month}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                {MONTH_INDICES.map((monthIdx, idx) => (
                                                    <TableCell key={idx} className="text-center p-4">
                                                        <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${kasData.kasByMonth[monthIdx] ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                                                            {kasData.kasByMonth[monthIdx] ? "✓" : "-"}
                                                        </div>
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                    <div className="mt-4 flex gap-4 text-sm justify-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                                            <span>Lunas</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full bg-gray-100 border border-gray-200"></div>
                                            <span>Belum Bayar</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">Gagal memuat data</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TABUNGAN TAB */}
                <TabsContent value="tabungan" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none shadow-lg md:col-span-1">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-emerald-50 text-sm font-medium">Saldo Tabungan Anda</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {isLoading ? "..." : `Rp ${tabunganData?.saldoTabungan.toLocaleString('id-ID')}`}
                                </div>
                                <p className="text-emerald-100 text-xs mt-1">Total saldo tersimpan</p>
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-2 border-emerald-100">
                            <CardHeader>
                                <CardTitle className="text-emerald-900">Riwayat Transaksi Tabungan</CardTitle>
                                <CardDescription>Setoran dan penarikan tabungan</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="flex justify-center p-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-emerald-50 hover:bg-emerald-50">
                                                    <TableHead className="text-emerald-900">Tanggal</TableHead>
                                                    <TableHead className="text-emerald-900">Jenis</TableHead>
                                                    <TableHead className="text-emerald-900">Keterangan</TableHead>
                                                    <TableHead className="text-right text-emerald-900">Jumlah</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {tabunganData?.transactions.map((t: any) => (
                                                    <TableRow key={t.id}>
                                                        <TableCell>{format(new Date(t.date), "dd MMM yyyy", { locale: id })}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={t.type === "TABUNGAN" ? "border-emerald-500 text-emerald-700 bg-emerald-50" : "border-amber-500 text-amber-700 bg-amber-50"}>
                                                                {t.type === "TABUNGAN" ? "Setoran" : "Penarikan"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">{t.description || "-"}</TableCell>
                                                        <TableCell className={`text-right font-medium ${t.type === "TABUNGAN" ? "text-emerald-600" : "text-red-600"}`}>
                                                            {t.type === "TABUNGAN" ? "+" : "-"} Rp {t.amount.toLocaleString('id-ID')}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {tabunganData?.transactions.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                            Belum ada transaksi tabungan
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
