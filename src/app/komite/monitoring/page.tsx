"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
import { Loader2, Search, Plus } from "lucide-react"
import { getMonthlyPaymentStatus, getHalaqahList, getTabunganBalances } from "@/actions/monitoring"

const MONTHS = [
    "DES", "JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV"
]

// Month indices (December = 11, January = 0, etc.)
const MONTH_INDICES = [11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

type StudentPayment = {
    id: string
    name: string
    nis: string
    halaqahId: string | null
    halaqah: string
    sppByMonth: Record<number, boolean>
    kasByMonth: Record<number, boolean>
}

type TabunganData = {
    id: string
    name: string
    nis: string
    halaqahId: string | null
    halaqah: string
    saldoTabungan: number
}

type Halaqah = {
    id: string
    name: string
}

export default function KomiteMonitoringPage() {
    const [paymentData, setPaymentData] = useState<StudentPayment[]>([])
    const [tabunganData, setTabunganData] = useState<TabunganData[]>([])
    const [halaqahs, setHalaqahs] = useState<Halaqah[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const [selectedYear, setSelectedYear] = useState(2025)
    const [availableYears, setAvailableYears] = useState([2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039, 2040])
    const [selectedHalaqah, setSelectedHalaqah] = useState<string>("all")
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        loadData()
    }, [selectedYear])

    async function loadData() {
        try {
            setIsLoading(true)
            const [payments, tabungan, halaqahList] = await Promise.all([
                getMonthlyPaymentStatus(selectedYear),
                getTabunganBalances(),
                getHalaqahList()
            ])
            setPaymentData(payments)
            setTabunganData(tabungan)
            setHalaqahs(halaqahList)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddYear = () => {
        const maxYear = Math.max(...availableYears)
        setAvailableYears([...availableYears, maxYear + 1])
    }

    // Filter data based on halaqah and search
    const filteredPaymentData = paymentData.filter(student => {
        const matchesHalaqah = selectedHalaqah === "all" || student.halaqahId === selectedHalaqah
        const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesHalaqah && matchesSearch
    })

    const filteredTabunganData = tabunganData.filter(student => {
        const matchesHalaqah = selectedHalaqah === "all" || student.halaqahId === selectedHalaqah
        const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesHalaqah && matchesSearch
    })

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const PaymentIndicator = ({ isPaid }: { isPaid: boolean }) => (
        <div className="flex justify-center">
            <div className={`w-3 h-3 rounded-full ${isPaid ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
    )

    return (
        <div className="space-y-4 md:space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-emerald-900">Monitoring Kas & Tabungan</h1>
                <p className="text-sm md:text-base text-muted-foreground">Pantau pembayaran Uang Kas dan Saldo Tabungan per bulan</p>
            </div>

            {/* Filter Controls */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base md:text-lg">Filter</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row md:flex-wrap gap-3 md:gap-4">
                        {/* Year Filter */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Tahun:</label>
                            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableYears.map(year => (
                                        <SelectItem key={year} value={year.toString()}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={handleAddYear} size="sm" variant="outline">
                                <Plus className="h-4 w-4 mr-1" />
                                <span className="hidden md:inline">Tambah Tahun</span>
                            </Button>
                        </div>

                        {/* Halaqah Filter */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Halaqah:</label>
                            <Select value={selectedHalaqah} onValueChange={setSelectedHalaqah}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Halaqah</SelectItem>
                                    {halaqahs.map(halaqah => (
                                        <SelectItem key={halaqah.id} value={halaqah.id}>
                                            {halaqah.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search */}
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari nama..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="max-w-sm"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin h-8 w-8" />
                </div>
            ) : (
                <Tabs defaultValue="kas" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="kas">Uang Kas</TabsTrigger>
                        <TabsTrigger value="tabungan">Tabungan</TabsTrigger>
                    </TabsList>

                    {/* KAS Tab */}
                    <TabsContent value="kas">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base md:text-lg">Monitoring Uang Kas - Tahun {selectedYear}</CardTitle>
                                <CardDescription>Status pembayaran Uang Kas per bulan</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto w-full">
                                    <div className="inline-block min-w-full align-middle">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="sticky left-0 bg-background z-10 min-w-[150px] md:min-w-[200px] text-xs md:text-sm">Nama Santri</TableHead>
                                                    {MONTHS.map((month, idx) => (
                                                        <TableHead key={idx} className="text-center min-w-[40px] md:min-w-[60px] text-xs md:text-sm">
                                                            {month}
                                                        </TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredPaymentData.map((student) => (
                                                    <TableRow key={student.id}>
                                                        <TableCell className="sticky left-0 bg-background z-10 font-medium text-xs md:text-sm">
                                                            {student.name}
                                                        </TableCell>
                                                        {MONTH_INDICES.map((monthIdx, idx) => (
                                                            <TableCell key={idx}>
                                                                <PaymentIndicator isPaid={!!student.kasByMonth[monthIdx]} />
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                                {filteredPaymentData.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={14} className="text-center text-muted-foreground py-8 text-sm">
                                                            Tidak ada data santri.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tabungan Tab */}
                    <TabsContent value="tabungan">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base md:text-lg">Saldo Tabungan Santri</CardTitle>
                                <CardDescription>Saldo tabungan seluruh santri</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto w-full">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs md:text-sm">Nama Santri</TableHead>
                                                <TableHead className="text-xs md:text-sm">Halaqah</TableHead>
                                                <TableHead className="text-right text-xs md:text-sm">Saldo Tabungan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredTabunganData.map((student) => (
                                                <TableRow key={student.id}>
                                                    <TableCell className="text-xs md:text-sm">{student.name}</TableCell>
                                                    <TableCell className="text-xs md:text-sm">{student.halaqah}</TableCell>
                                                    <TableCell className="text-right font-semibold text-xs md:text-sm">
                                                        {formatRupiah(student.saldoTabungan)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {filteredTabunganData.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">
                                                        Tidak ada data santri.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    )
}
