"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Pencil, Trash2, Filter, X, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { getFilteredTransactions, updateTransaction, deleteTransaction, bulkDeleteTransactions } from "@/actions/reports"
import { getAllCategories } from "@/actions/categories"
import { useToast } from "@/contexts/toast-context"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"

const editFormSchema = z.object({
    type: z.string().min(1, "Kategori harus dipilih"),
    amount: z.number().min(1, "Nominal harus lebih dari 0"),
    description: z.string().optional(),
    date: z.string(),
})

export default function TransactionReportPage() {
    const [transactions, setTransactions] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [editingTransaction, setEditingTransaction] = useState<any>(null)
    const [totalPages, setTotalPages] = useState(1)
    const [currentPage, setCurrentPage] = useState(1)
    const { showToast } = useToast()

    // Selection states
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Filter states
    const [showFilters, setShowFilters] = useState(false)
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("")
    const [typeFilter, setTypeFilter] = useState("")
    const [creatorRoleFilter, setCreatorRoleFilter] = useState("")
    const [searchQuery, setSearchQuery] = useState("")

    const editForm = useForm<z.infer<typeof editFormSchema>>({
        resolver: zodResolver(editFormSchema),
        defaultValues: {
            type: "",
            amount: 0,
            description: "",
            date: new Date().toISOString().split('T')[0],
        },
    })

    useEffect(() => {
        loadCategories()
        loadTransactions()
        // Clear selection when filters or page changes
        setSelectedIds(new Set())
    }, [currentPage, startDate, endDate, categoryFilter, typeFilter, creatorRoleFilter, searchQuery])

    async function loadCategories() {
        try {
            const data = await getAllCategories()
            setCategories(data)
        } catch (error) {
            console.error(error)
        }
    }

    async function loadTransactions() {
        try {
            setIsLoading(true)
            const result = await getFilteredTransactions({
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                categoryCode: categoryFilter || undefined,
                type: (typeFilter as "INCOME" | "EXPENSE") || undefined,
                creatorRole: (creatorRoleFilter as "ADMIN" | "KOMITE") || undefined,
                searchQuery: searchQuery || undefined,
                page: currentPage,
                pageSize: 20,
            })
            setTransactions(result.transactions)
            setTotalPages(result.totalPages)
        } catch (error) {
            console.error(error)
            showToast("Gagal memuat transaksi", "error")
        } finally {
            setIsLoading(false)
        }
    }

    function openEditDialog(transaction: any) {
        setEditingTransaction(transaction)
        editForm.reset({
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description || "",
            date: transaction.date.split('T')[0],
        })
        setIsEditDialogOpen(true)
    }

    async function onEditSubmit(values: z.infer<typeof editFormSchema>) {
        try {
            await updateTransaction(editingTransaction.id, {
                type: values.type,
                amount: values.amount,
                description: values.description,
                date: new Date(values.date),
            })
            showToast("Transaksi berhasil diperbarui", "success")
            setIsEditDialogOpen(false)
            setEditingTransaction(null)
            loadTransactions()
        } catch (error) {
            console.error(error)
            showToast("Gagal memperbarui transaksi", "error")
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return

        try {
            await deleteTransaction(id)
            showToast("Transaksi berhasil dihapus", "success")
            loadTransactions()
        } catch (error: any) {
            showToast(error.message || "Gagal menghapus transaksi", "error")
        }
    }

    async function handleBulkDelete() {
        const count = selectedIds.size
        if (count === 0) return

        if (!confirm(`Apakah Anda yakin ingin menghapus ${count} transaksi yang dipilih?`)) return

        try {
            await bulkDeleteTransactions(Array.from(selectedIds))
            showToast(`${count} transaksi berhasil dihapus`, "success")
            setSelectedIds(new Set())
            loadTransactions()
        } catch (error: any) {
            showToast(error.message || "Gagal menghapus transaksi", "error")
        }
    }

    function toggleSelectAll() {
        if (selectedIds.size === transactions.length && transactions.length > 0) {
            // Deselect all
            setSelectedIds(new Set())
        } else {
            // Select all on current page
            setSelectedIds(new Set(transactions.map(t => t.id)))
        }
    }

    function toggleSelectTransaction(id: string) {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    function clearFilters() {
        setStartDate("")
        setEndDate("")
        setCategoryFilter("")
        setTypeFilter("")
        setCreatorRoleFilter("")
        setSearchQuery("")
        setCurrentPage(1)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Laporan Transaksi</h1>
                    <p className="text-muted-foreground">Kelola dan lihat semua transaksi dengan filter lengkap</p>
                </div>
                <div className="flex gap-2">
                    {selectedIds.size > 0 && (
                        <Button
                            variant="destructive"
                            onClick={handleBulkDelete}
                        >
                            <Trash className="mr-2 h-4 w-4" />
                            Hapus {selectedIds.size} Terpilih
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                        <Filter className="mr-2 h-4 w-4" />
                        {showFilters ? "Sembunyikan Filter" : "Tampilkan Filter"}
                    </Button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tanggal Mulai</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tanggal Akhir</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Kategori</label>
                            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value === "ALL" ? "" : value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Semua Kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Semua Kategori</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.code} value={cat.code}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tipe</label>
                            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value === "ALL" ? "" : value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Semua Tipe" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Semua Tipe</SelectItem>
                                    <SelectItem value="INCOME">Pemasukan</SelectItem>
                                    <SelectItem value="EXPENSE">Pengeluaran</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Dibuat Oleh</label>
                            <Select value={creatorRoleFilter} onValueChange={(value) => setCreatorRoleFilter(value === "ALL" ? "" : value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Semua Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Semua Role</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="KOMITE">Komite</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari nama santri..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <Button variant="outline" onClick={clearFilters}>
                            <X className="mr-2 h-4 w-4" />
                            Reset Filter
                        </Button>
                    </div>
                </div>
            )
            }

            {/* Transaction Table */}
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">
                                <Checkbox
                                    checked={transactions.length > 0 && selectedIds.size === transactions.length}
                                    onCheckedChange={toggleSelectAll}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Kategori</TableHead>
                            <TableHead>Tipe</TableHead>
                            <TableHead>Nominal</TableHead>
                            <TableHead>Keterangan</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>Dibuat Oleh</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : transactions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                    Tidak ada transaksi.
                                </TableCell>
                            </TableRow>
                        ) : (
                            transactions.map((txn) => (
                                <TableRow
                                    key={txn.id}
                                    className="md:cursor-default cursor-pointer"
                                    onClick={(e) => {
                                        // Only trigger on mobile (screen width < 768px)
                                        // Don't trigger if clicking checkbox or action buttons
                                        const target = e.target as HTMLElement
                                        if (window.innerWidth < 768 &&
                                            !target.closest('input[type="checkbox"]') &&
                                            !target.closest('button')) {
                                            openEditDialog(txn)
                                        }
                                    }}
                                >
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={selectedIds.has(txn.id)}
                                            onCheckedChange={() => toggleSelectTransaction(txn.id)}
                                            aria-label={`Select transaction ${txn.id}`}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(txn.date), "dd MMM yyyy", { locale: localeId })}
                                    </TableCell>
                                    <TableCell>{txn.TransactionCategory?.name || txn.type}</TableCell>
                                    <TableCell>
                                        <Badge variant={txn.TransactionCategory?.type === "INCOME" ? "default" : "destructive"}>
                                            {txn.TransactionCategory?.type === "INCOME" ? "Pemasukan" : "Pengeluaran"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-semibold">
                                        {formatCurrency(txn.amount)}
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate">
                                        {txn.description || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {txn.User?.name || txn.Teacher?.name || "-"}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {txn.Creator?.name || "-"}
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(txn)} className="hidden md:inline-flex">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50 hidden md:inline-flex"
                                                onClick={() => handleDelete(txn.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {
                totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Halaman {currentPage} dari {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                )
            }

            {/* Floating Delete Button for Mobile */}
            {selectedIds.size > 0 && (
                <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                    <Button
                        variant="destructive"
                        size="lg"
                        onClick={handleBulkDelete}
                        className="shadow-lg"
                    >
                        <Trash className="mr-2 h-5 w-5" />
                        Hapus {selectedIds.size} Terpilih
                    </Button>
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Transaksi</DialogTitle>
                        <DialogDescription>
                            Ubah detail transaksi
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                            <FormField
                                control={editForm.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kategori</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih kategori" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categories.map((cat) => (
                                                    <SelectItem key={cat.code} value={cat.code}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nominal</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Keterangan</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tanggal</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="submit">Simpan Perubahan</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div >
    )
}
