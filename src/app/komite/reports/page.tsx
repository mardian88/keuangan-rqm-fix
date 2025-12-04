"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Calendar as CalendarIcon, Download, Loader2, FileText } from "lucide-react"
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

export default function KomiteReportsPage() {
    const [date, setDate] = useState<{ from: Date; to: Date } | undefined>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
    })
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

    useEffect(() => {
        if (date?.from && date?.to) {
            loadData()
        }
    }, [date])

    async function loadData() {
        if (!date?.from || !date?.to) return
        setIsLoading(true)
        try {
            const result = await getKomiteReports(date.from, date.to)
            setData(result)
        } catch (error) {
            console.error("Failed to load reports:", error)
        } finally {
            setIsLoading(false)
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
                <div className="flex gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-[260px] justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (
                                    date.to ? (
                                        <>
                                            {format(date.from, "dd MMM yyyy", { locale: id })} -{" "}
                                            {format(date.to, "dd MMM yyyy", { locale: id })}
                                        </>
                                    ) : (
                                        format(date.from, "dd MMM yyyy", { locale: id })
                                    )
                                ) : (
                                    <span>Pilih rentang tanggal</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={(range: any) => setDate(range)}
                                numberOfMonths={2}
                                locale={id}
                            />
                        </PopoverContent>
                    </Popover>
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
