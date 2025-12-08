"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Loader2, Plus, Settings, Trash2 } from "lucide-react"
import {
    getAllStudentsForInstallment,
    enableInstallmentForStudent,
    disableInstallmentForStudent,
    getStudentInstallmentData,
    recordInstallmentPayment,
    updateDefaultSppAmount,
    deleteInstallmentPayment
} from "@/actions/installment"
import { CurrencyInput } from "@/components/ui/currency-input"
import { useToast } from "@/contexts/toast-context"

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

type Student = {
    id: string
    name: string
    username: string
    halaqah: { name: string }[] | null
    sppInstallmentSettings: {
        id: string
        defaultAmount: number
        isActive: boolean
    }[] | null
}

type MonthlyData = {
    month: number
    defaultAmount: number
    totalPaid: number
    remaining: number
    status: 'paid' | 'partial' | 'unpaid'
    payments: Payment[]
}

type Payment = {
    id: string
    amount: number
    date: Date
    description: string | null
    createdBy: { name: string }
}

export default function CicilanPage() {
    const [students, setStudents] = useState<Student[]>([])
    const [selectedStudent, setSelectedStudent] = useState<string>("")
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [availableYears, setAvailableYears] = useState<number[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
    const [defaultAmount, setDefaultAmount] = useState(0)

    const [showEnableDialog, setShowEnableDialog] = useState(false)
    const [showPaymentDialog, setShowPaymentDialog] = useState(false)
    const [showSettingsDialog, setShowSettingsDialog] = useState(false)

    const [enableAmount, setEnableAmount] = useState<number>(0)
    const [paymentMonth, setPaymentMonth] = useState<number>(0)
    const [paymentAmount, setPaymentAmount] = useState<number>(0)
    const [paymentDescription, setPaymentDescription] = useState("")
    const [newDefaultAmount, setNewDefaultAmount] = useState<number>(0)

    const { showToast } = useToast()

    useEffect(() => {
        loadStudents()
        initializeYears()
    }, [])

    useEffect(() => {
        if (selectedStudent) {
            loadInstallmentData()
        }
    }, [selectedStudent, selectedYear])

    function initializeYears() {
        const currentYear = new Date().getFullYear()
        const years = []
        for (let i = currentYear - 2; i <= currentYear + 5; i++) {
            years.push(i)
        }
        setAvailableYears(years)
    }

    async function loadStudents() {
        try {
            setIsLoading(true)
            const data = await getAllStudentsForInstallment()
            setStudents(data)
        } catch (error) {
            console.error(error)
            showToast("Gagal memuat data santri", "error")
        } finally {
            setIsLoading(false)
        }
    }

    async function loadInstallmentData() {
        try {
            setIsLoading(true)
            const data = await getStudentInstallmentData(selectedStudent, selectedYear)

            if (data) {
                setMonthlyData(data.monthlyData)
                setDefaultAmount(data.settings.defaultAmount)
            } else {
                setMonthlyData([])
                setDefaultAmount(0)
            }
        } catch (error) {
            console.error(error)
            showToast("Gagal memuat data cicilan", "error")
        } finally {
            setIsLoading(false)
        }
    }

    async function handleEnableInstallment() {
        try {
            if (!enableAmount || enableAmount <= 0) {
                showToast("Nominal SPP tidak valid", "error")
                return
            }

            await enableInstallmentForStudent(selectedStudent, enableAmount)
            showToast("Fitur cicilan berhasil diaktifkan", "success")

            setShowEnableDialog(false)
            setEnableAmount(0)
            await loadStudents()
            await loadInstallmentData()
        } catch (error) {
            console.error(error)
            showToast("Gagal mengaktifkan cicilan", "error")
        }
    }

    async function handleRecordPayment() {
        try {
            if (!paymentAmount || paymentAmount <= 0) {
                showToast("Nominal pembayaran tidak valid", "error")
                return
            }

            await recordInstallmentPayment(
                selectedStudent,
                selectedYear,
                paymentMonth,
                paymentAmount,
                paymentDescription || undefined
            )

            showToast("Pembayaran berhasil dicatat", "success")

            setShowPaymentDialog(false)
            setPaymentAmount(0)
            setPaymentDescription("")
            await loadInstallmentData()
        } catch (error) {
            console.error(error)
            showToast("Gagal mencatat pembayaran", "error")
        }
    }

    async function handleUpdateDefaultAmount() {
        try {
            if (!newDefaultAmount || newDefaultAmount <= 0) {
                showToast("Nominal SPP tidak valid", "error")
                return
            }

            await updateDefaultSppAmount(selectedStudent, newDefaultAmount)
            showToast("Nominal SPP berhasil diperbarui", "success")

            setShowSettingsDialog(false)
            setNewDefaultAmount(0)
            await loadInstallmentData()
        } catch (error) {
            console.error(error)
            showToast("Gagal memperbarui nominal SPP", "error")
        }
    }

    async function handleDeletePayment(paymentId: string) {
        if (!confirm("Yakin ingin menghapus pembayaran ini?")) return

        try {
            await deleteInstallmentPayment(paymentId)
            showToast("Pembayaran berhasil dihapus", "success")
            await loadInstallmentData()
        } catch (error) {
            console.error(error)
            showToast("Gagal menghapus pembayaran", "error")
        }
    }

    async function handleDisableInstallment() {
        if (!confirm("Yakin ingin menonaktifkan cicilan untuk santri ini? Pastikan bulan berjalan sudah lunas.")) return

        try {
            await disableInstallmentForStudent(selectedStudent)
            showToast("Fitur cicilan berhasil dinonaktifkan", "success")
            await loadStudents()
            await loadInstallmentData()
        } catch (error: any) {
            console.error(error)
            const message = error.message || "Gagal menonaktifkan cicilan"
            showToast("Gagal menonaktifkan cicilan", "error", message)
        }
    }

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const selectedStudentData = students.find(s => s.id === selectedStudent)
    const hasInstallmentEnabled = selectedStudentData?.sppInstallmentSettings?.[0]?.isActive

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Cicilan SPP</h1>
                <p className="text-muted-foreground">Kelola pembayaran SPP dengan sistem cicilan</p>
            </div>

            {/* Student Selection */}
            <Card>
                <CardHeader>
                    <CardTitle>Pilih Santri</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <Label>Santri</Label>
                            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih santri..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map(student => (
                                        <SelectItem key={student.id} value={student.id}>
                                            {student.name} ({student.username})
                                            {student.sppInstallmentSettings?.[0]?.isActive && " ✓"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedStudent && !hasInstallmentEnabled && (
                            <Button onClick={() => setShowEnableDialog(true)}>
                                Aktifkan Cicilan
                            </Button>
                        )}

                        {selectedStudent && hasInstallmentEnabled && (
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => {
                                    setNewDefaultAmount(defaultAmount)
                                    setShowSettingsDialog(true)
                                }}>
                                    <Settings className="h-4 w-4 mr-2" />
                                    Pengaturan
                                </Button>
                                <Button variant="destructive" onClick={handleDisableInstallment}>
                                    Nonaktifkan Cicilan
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {selectedStudent && hasInstallmentEnabled && (
                <>
                    {/* Year Selector */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <Label>Tahun:</Label>
                                <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                                    <SelectTrigger className="w-[150px]">
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
                                <div className="text-sm text-muted-foreground">
                                    Nominal SPP: <span className="font-semibold">{formatRupiah(defaultAmount)}</span>
                                </div>
                                <Button onClick={() => setShowPaymentDialog(true)} className="ml-auto">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Catat Pembayaran
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Monthly Blocks */}
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="animate-spin h-8 w-8" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {monthlyData.map((data) => (
                                <Card key={data.month} className={`
                                    ${data.status === 'paid' ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}
                                    ${data.status === 'partial' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : ''}
                                    ${data.status === 'unpaid' ? 'border-red-500 bg-red-50 dark:bg-red-950' : ''}
                                `}>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg flex items-center justify-between">
                                            {MONTHS[data.month]}
                                            <div className={`w-4 h-4 rounded-full ${data.status === 'paid' ? 'bg-green-500' :
                                                data.status === 'partial' ? 'bg-yellow-500' :
                                                    'bg-red-500'
                                                }`} />
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Total SPP:</span>
                                                <span className="font-medium">{formatRupiah(data.defaultAmount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Sudah Bayar:</span>
                                                <span className="font-medium text-green-600">{formatRupiah(data.totalPaid)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Sisa:</span>
                                                <span className="font-semibold text-red-600">{formatRupiah(data.remaining)}</span>
                                            </div>
                                        </div>

                                        {data.payments.length > 0 && (
                                            <div className="pt-2 border-t">
                                                <div className="text-xs text-muted-foreground mb-1">Riwayat:</div>
                                                {data.payments.map(payment => (
                                                    <div key={payment.id} className="text-xs flex justify-between items-center py-1">
                                                        <span>{formatRupiah(payment.amount)}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0"
                                                            onClick={() => handleDeletePayment(payment.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Enable Installment Dialog */}
            <Dialog open={showEnableDialog} onOpenChange={setShowEnableDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Aktifkan Cicilan SPP</DialogTitle>
                        <DialogDescription>
                            Masukkan nominal SPP default per bulan untuk {selectedStudentData?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Nominal SPP per Bulan</Label>
                            <CurrencyInput
                                value={enableAmount}
                                onValueChange={setEnableAmount}
                                placeholder="Masukkan nominal..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEnableDialog(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleEnableInstallment}>
                            Aktifkan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Dialog */}
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Catat Pembayaran</DialogTitle>
                        <DialogDescription>
                            Catat pembayaran cicilan SPP untuk {selectedStudentData?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Bulan</Label>
                            <Select value={paymentMonth.toString()} onValueChange={(val) => setPaymentMonth(parseInt(val))}>
                                <SelectTrigger>
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
                        </div>
                        <div>
                            <Label>Nominal Pembayaran</Label>
                            <CurrencyInput
                                value={paymentAmount}
                                onValueChange={setPaymentAmount}
                                placeholder="Masukkan nominal..."
                            />
                        </div>
                        <div>
                            <Label>Keterangan (Opsional)</Label>
                            <Input
                                value={paymentDescription}
                                onChange={(e) => setPaymentDescription(e.target.value)}
                                placeholder="Keterangan..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleRecordPayment}>
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Settings Dialog */}
            <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pengaturan Cicilan</DialogTitle>
                        <DialogDescription>
                            Ubah nominal SPP default untuk {selectedStudentData?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Nominal SPP per Bulan</Label>
                            <CurrencyInput
                                value={newDefaultAmount}
                                onValueChange={setNewDefaultAmount}
                                placeholder="Masukkan nominal..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleUpdateDefaultAmount}>
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
