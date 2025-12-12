"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
import { getMonthlyPaymentStatus, getHalaqahList, getTabunganBalances, getMonitoringCategories, getDynamicCategoryPaymentStatus } from "@/actions/monitoring"

const MONTHS = [
    "DES", "JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV"
]

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

type DynamicCategoryPayment = {
    id: string
    name: string
    nis: string
    halaqahId: string | null
    halaqah: string
    paymentsByMonth: Record<number, boolean>
}

type MonitoringCategory = {
    code: string
    name: string
}

type Halaqah = {
    id: string
    name: string
}

export default function KomiteMonitoringPage() {
    const [paymentData, setPaymentData] = useState<StudentPayment[]>([])
    const [tabunganData, setTabunganData] = useState<TabunganData[]>([])
    const [halaqahs, setHalaqahs] = useState<Halaqah[]>([])
    const [dynamicCategories, setDynamicCategories] = useState<MonitoringCategory[]>([])
    const [dynamicCategoryData, setDynamicCategoryData] = useState<Map<string, DynamicCategoryPayment[]>>(new Map())
    const [isLoading, setIsLoading] = useState(true)

    const [selectedYear, setSelectedYear] = useState(2025)
    const [availableYears, setAvailableYears] = useState([2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039, 2040])
    const [selectedHalaqah, setSelectedHalaqah] = useState<string>("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string>("UANG_KAS")

    useEffect(() => {
        loadData()
    }, [selectedYear])

    async function loadData() {
        try {
            setIsLoading(true)
            const [payments, tabungan, halaqahList, dynamicCats] = await Promise.all([
                getMonthlyPaymentStatus(selectedYear),
                getTabunganBalances(),
                getHalaqahList(),
                getMonitoringCategories()
            ])
            setPaymentData(payments)
            setTabunganData(tabungan)
            setHalaqahs(halaqahList)
            setDynamicCategories(dynamicCats)

            // Load dynamic category data
            const categoryDataMap = new Map<string, DynamicCategoryPayment[]>()
            for (const category of dynamicCats) {
                const data = await getDynamicCategoryPaymentStatus(category.code, selectedYear)
                categoryDataMap.set(category.code, data)
            }
            setDynamicCategoryData(categoryDataMap)
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
        <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-emerald-900">Monitoring Keuangan</h1>
                <p className="text-xs md:text-sm lg:text-base text-muted-foreground">Pantau semua kategori keuangan per bulan</p>
            </div>

            {/* Filter Controls - Mobile Optimized */}
            <Card>
                <CardHeader className="pb-3 md:pb-4">
                    <CardTitle className="text-sm md:text-base lg:text-lg">Filter</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-3 md:gap-4">
                        {/* Row 1: Year and Halaqah */}
                        <div className="grid grid-cols-2 gap-2 md:flex md:flex-row md:flex-wrap md:gap-4">
                            {/* Year Filter */}
                            <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-2">
                                <label className="text-xs md:text-sm font-medium">Tahun:</label>
                                <div className="flex items-center gap-1.5 md:gap-2">
                                    <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                                        <SelectTrigger className="w-full md:w-[120px] h-9 md:h-10 text-xs md:text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableYears.map(year => (
                                                <SelectItem key={year} value={year.toString()} className="text-xs md:text-sm">
                                                    {year}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleAddYear} size="sm" variant="outline" className="h-9 md:h-10 px-2 md:px-3">
                                        <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                        <span className="sr-only md:not-sr-only md:ml-1">Tahun</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Halaqah Filter */}
                            <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-2">
                                <label className="text-xs md:text-sm font-medium">Halaqah:</label>
                                <Select value={selectedHalaqah} onValueChange={setSelectedHalaqah}>
                                    <SelectTrigger className="w-full md:w-[180px] h-9 md:h-10 text-xs md:text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs md:text-sm">Semua Halaqah</SelectItem>
                                        {halaqahs.map(halaqah => (
                                            <SelectItem key={halaqah.id} value={halaqah.id} className="text-xs md:text-sm">
                                                {halaqah.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row 2: Search */}
                        <div className="flex items-center gap-2 w-full">
                            <Search className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                            <Input
                                placeholder="Cari nama santri..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 h-9 md:h-10 text-xs md:text-sm"
                            />
                        </div>

                        {/* Row 3: Category Selector - Full Width on Mobile */}
                        <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-2">
                            <label className="text-xs md:text-sm font-semibold text-emerald-700">Kategori:</label>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="w-full md:w-[220px] h-10 md:h-11 border-2 border-emerald-600 bg-emerald-50 hover:bg-emerald-100 font-semibold text-emerald-900 text-xs md:text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {dynamicCategories.map(cat => (
                                        <SelectItem key={cat.code} value={cat.code} className="font-medium text-xs md:text-sm">
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin h-8 w-8" />
                </div>
            ) : (
                <div className="h-[calc(100vh-24rem)] md:h-[calc(100vh-20rem)] overflow-y-auto">
                    {dynamicCategories.map(category => {
                        if (selectedCategory !== category.code) return null

                        // For Tabungan, show balance view
                        if (category.code === "TABUNGAN") {
                            return (
                                <Card key={category.code} className="border-none shadow-lg">
                                    <CardHeader className="pb-3 md:pb-4">
                                        <CardTitle className="text-sm md:text-base lg:text-lg">Saldo Akhir Tabungan Santri</CardTitle>
                                        <CardDescription className="text-xs md:text-sm">Saldo akhir tabungan seluruh santri</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto w-full -mx-4 md:mx-0">
                                            <div className="inline-block min-w-full px-4 md:px-0">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="text-xs md:text-sm lg:text-base">Nama Santri</TableHead>
                                                            <TableHead className="text-right text-xs md:text-sm lg:text-base">Saldo Akhir</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredTabunganData.map((student) => (
                                                            <TableRow key={student.id}>
                                                                <TableCell className="text-xs md:text-sm lg:text-base">{student.name}</TableCell>
                                                                <TableCell className="text-right font-semibold text-xs md:text-sm lg:text-base">
                                                                    {formatRupiah(student.saldoTabungan)}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {filteredTabunganData.length === 0 && (
                                                            <TableRow>
                                                                <TableCell colSpan={2} className="text-center text-muted-foreground py-8 text-xs md:text-sm">
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
                            )
                        }

                        // For Uang Kas, show monthly payment view
                        if (category.code === "UANG_KAS") {
                            return (
                                <Card key={category.code}>
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
                                                                <TableCell colSpan={13} className="text-center text-muted-foreground py-8 text-sm">
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
                            )
                        }

                        // For other categories, show monthly payment view
                        const categoryData = dynamicCategoryData.get(category.code) || []
                        const filteredData = categoryData.filter(student => {
                            const matchesHalaqah = selectedHalaqah === "all" || student.halaqahId === selectedHalaqah
                            const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase())
                            return matchesHalaqah && matchesSearch
                        })

                        return (
                            <Card key={category.code}>
                                <CardHeader>
                                    <CardTitle className="text-base md:text-lg">Monitoring {category.name} - Tahun {selectedYear}</CardTitle>
                                    <CardDescription>Status pembayaran {category.name} per bulan</CardDescription>
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
                                                    {filteredData.map((student) => (
                                                        <TableRow key={student.id}>
                                                            <TableCell className="sticky left-0 bg-background z-10 font-medium text-xs md:text-sm">
                                                                {student.name}
                                                            </TableCell>
                                                            {MONTH_INDICES.map((monthIdx, idx) => (
                                                                <TableCell key={idx}>
                                                                    <PaymentIndicator isPaid={!!student.paymentsByMonth[monthIdx]} />
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))}
                                                    {filteredData.length === 0 && (
                                                        <TableRow>
                                                            <TableCell colSpan={13} className="text-center text-muted-foreground py-8 text-sm">
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
                        )
                    })}
                </div>
            )}
        </div>
    )
}
