"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Calendar as CalendarIcon, Download, Loader2, FileText, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { getKomiteReports } from "@/actions/komite-reports"
import * as XLSX from "xlsx"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

export default function KomiteReportsPage() {
    const now = new Date()
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
    const [selectedYear, setSelectedYear] = useState(now.getFullYear())
    const [isLoading, setIsLoading] = useState(false)
    const [data, setData] = useState<{
        pemasukanLain: any[]
        pengeluaranKomite: any[]
        kasSantri: any[]
        tabunganSantri: any[]
    }>({
        pemasukanLain: [],
        pengeluaranKomite: [],
        kasSantri: [],
        tabunganSantri: []
    })

    // Generate years array (current year ± 5 years)
    const years = Array.from({ length: 11 }, (_, i) => now.getFullYear() - 5 + i)

    useEffect(() => {
        loadData()
    }, [selectedMonth, selectedYear])

    async function loadData() {
        setIsLoading(true)
        try {
            // Calculate start and end of selected month
            const startDate = new Date(selectedYear, selectedMonth, 1)
            const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59)

            const result = await getKomiteReports(startDate, endDate)
            setData(result)
        } catch (error) {
            console.error("Failed to load reports:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handlePreviousMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11)
            setSelectedYear(selectedYear - 1)
        } else {
            setSelectedMonth(selectedMonth - 1)
        }
    }

    const handleNextMonth = () => {
        if (selectedMonth === 11) {
            setSelectedMonth(0)
            setSelectedYear(selectedYear + 1)
        } else {
            setSelectedMonth(selectedMonth + 1)
        }
    }

    const exportToExcel = (categoryData: any[], fileName: string, title: string) => {
        const rows = categoryData.map(item => ({
            Tanggal: format(new Date(item.date), "dd/MM/yyyy", { locale: id }),
            "Jenis Transaksi": item.type,
            "Nama Santri": item.student?.name || "-",
            "Jumlah": item.amount,
            "Keterangan": item.description || "-",
            "Dicatat Oleh": `${item.creator.name} (${item.creator.role})`
        }))

        const worksheet = XLSX.utils.json_to_sheet(rows)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan")
        XLSX.writeFile(workbook, `${fileName}_${format(new Date(), "yyyyMMdd")}.xlsx`)
    }

    const exportAll = () => {
        const workbook = XLSX.utils.book_new()

        const categories = [
            { data: data.pemasukanLain, name: "Pemasukan Lain" },
            { data: data.pengeluaranKomite, name: "Pengeluaran Komite" },
            { data: data.kasSantri, name: "Kas Santri" },
            { data: data.tabunganSantri, name: "Tabungan Santri" }
        ]

        categories.forEach(cat => {
            const rows = cat.data.map(item => ({
                Tanggal: format(new Date(item.date), "dd/MM/yyyy", { locale: id }),
                "Jenis Transaksi": item.type,
                "Nama Santri": item.student?.name || "-",
                "Jumlah": item.amount,
                "Keterangan": item.description || "-",
                "Dicatat Oleh": `${item.creator.name} (${item.creator.role})`
            }))
            const worksheet = XLSX.utils.json_to_sheet(rows)
            XLSX.utils.book_append_sheet(workbook, worksheet, cat.name)
        })

        XLSX.writeFile(workbook, `Laporan_Lengkap_Komite_${format(new Date(), "yyyyMMdd")}.xlsx`)
    }

    const calculateTotal = (items: any[]) => {
        return items.reduce((sum, item) => {
            // For Tabungan, check if it's withdrawal (negative effect on balance, but here we might just want volume)
            // Or should we sum net?
            // Usually reports show total volume.
            // Let's show net for Tabungan?
            if (item.type === "PENARIKAN_TABUNGAN" || item.type === "PENGELUARAN_KOMITE") {
                return sum - item.amount
            }
            return sum + item.amount
        }, 0)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-emerald-900">Laporan Keuangan</h1>
                    <p className="text-sm text-muted-foreground">Laporan transaksi komite, kas, dan tabungan santri</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handlePreviousMonth}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <Select
                        value={selectedMonth.toString()}
                        onValueChange={(value) => setSelectedMonth(parseInt(value))}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTHS.map((month, idx) => (
                                <SelectItem key={idx} value={idx.toString()}>
                                    {month}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={selectedYear.toString()}
                        onValueChange={(value) => setSelectedYear(parseInt(value))}
                    >
                        <SelectTrigger className="w-[100px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(year => (
                                <SelectItem key={year} value={year.toString()}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleNextMonth}
                        disabled={selectedYear === now.getFullYear() && selectedMonth === now.getMonth()}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>

                    <Button onClick={exportAll} className="bg-emerald-600 hover:bg-emerald-700">
                        <Download className="mr-2 h-4 w-4" /> Export Semua
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="kas_santri" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
                    <TabsTrigger value="kas_santri" className="py-2">Kas Santri</TabsTrigger>
                    <TabsTrigger value="tabungan_santri" className="py-2">Tabungan Santri</TabsTrigger>
                    <TabsTrigger value="pemasukan_lain" className="py-2">Pemasukan Lain</TabsTrigger>
                    <TabsTrigger value="pengeluaran_komite" className="py-2">Pengeluaran</TabsTrigger>
                </TabsList>

                {Object.entries({
                    kas_santri: { data: data.kasSantri, title: "Laporan Kas Santri", file: "Laporan_Kas_Santri" },
                    tabungan_santri: { data: data.tabunganSantri, title: "Laporan Tabungan Santri", file: "Laporan_Tabungan_Santri" },
                    pemasukan_lain: { data: data.pemasukanLain, title: "Laporan Pemasukan Lain", file: "Laporan_Pemasukan_Lain" },
                    pengeluaran_komite: { data: data.pengeluaranKomite, title: "Laporan Pengeluaran Komite", file: "Laporan_Pengeluaran_Komite" }
                }).map(([key, config]) => (
                    <TabsContent key={key} value={key}>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>{config.title}</CardTitle>
                                    <CardDescription>
                                        Total: <span className="font-bold text-emerald-700">Rp {calculateTotal(config.data).toLocaleString('id-ID')}</span>
                                        {" • "}{config.data.length} Transaksi
                                    </CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => exportToExcel(config.data, config.file, config.title)}>
                                    <FileText className="mr-2 h-4 w-4" /> Export Excel
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="flex justify-center p-8">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Tanggal</TableHead>
                                                    <TableHead>Nama Santri</TableHead>
                                                    <TableHead>Jenis</TableHead>
                                                    <TableHead>Keterangan</TableHead>
                                                    <TableHead className="text-right">Jumlah</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {config.data.map((item: any) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>{format(new Date(item.date), "dd MMM yyyy", { locale: id })}</TableCell>
                                                        <TableCell>{item.student?.name || "-"}</TableCell>
                                                        <TableCell><Badge variant="outline">{item.type}</Badge></TableCell>
                                                        <TableCell>{item.description || "-"}</TableCell>
                                                        <TableCell className={cn(
                                                            "text-right font-medium",
                                                            ["PENGELUARAN_KOMITE", "PENARIKAN_TABUNGAN"].includes(item.type) ? "text-red-600" : "text-green-600"
                                                        )}>
                                                            {["PENGELUARAN_KOMITE", "PENARIKAN_TABUNGAN"].includes(item.type) ? "-" : "+"}
                                                            Rp {item.amount.toLocaleString('id-ID')}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {config.data.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                            Tidak ada data pada periode ini
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}
