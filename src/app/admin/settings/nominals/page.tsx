"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"
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
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
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
import { getAllCategories, updateCategory } from "@/actions/categories"
import { useToast } from "@/contexts/toast-context"
import { CurrencyInput } from "@/components/ui/currency-input"

const formSchema = z.object({
    categoryId: z.string().min(1, "Kategori harus dipilih"),
    amount: z.number().min(1, "Nominal harus lebih dari 0"),
})

export default function NominalSettingsPage() {
    const [categories, setCategories] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const { showToast } = useToast()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            categoryId: "",
            amount: 0,
        },
    })

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const data = await getAllCategories()
            setCategories(data)
        } catch (error) {
            console.error(error)
            showToast("Gagal memuat data", "error")
        } finally {
            setIsLoading(false)
        }
    }

    // Filter categories that have a default amount set
    const activeNominals = categories.filter(c => c.defaultAmount && c.defaultAmount > 0)
    // Filter categories available for selection (those without active nominal, unless editing)
    const availableCategories = categories.filter(c =>
        (!c.defaultAmount || c.defaultAmount === 0) || (editingId && c.id === editingId)
    )

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            // We use the existing updateCategory action
            // We need to fetch the existing category data to preserve other fields?
            // updateCategory takes partial data but the implementation calls .update({...data})
            // Let's check updateCategory implementation in actions/categories.ts
            // It does .update(data), so it might overwrite other fields if not provided?
            // Wait, the action signature is specific about arguments. 
            // It takes (id, data: {name, showToKomite...})
            // I need to make sure I pass all required fields or update the action to be partial.

            // Looking at the action again (from step 607):
            // export async function updateCategory(id: string, data: { name: string, showToKomite: boolean... })
            // It requires all fields! This is a problem.
            // I should find the category first to get its current values.

            const category = categories.find(c => c.id === values.categoryId)
            if (!category) throw new Error("Category not found")

            await updateCategory(values.categoryId, {
                name: category.name,
                showToKomite: category.showToKomite,
                showToAdmin: category.showToAdmin,
                isActive: true,
                requiresHandover: category.requiresHandover,
                defaultAmount: values.amount
            })

            showToast("Nominal berhasil disimpan", "success")
            setIsDialogOpen(false)
            setEditingId(null)
            form.reset()
            loadData()
        } catch (error: any) {
            console.error(error)
            showToast(`Gagal menyimpan: ${error.message}`, "error")
        }
    }

    async function handleDelete(category: any) {
        if (!confirm(`Hapus default nominal untuk ${category.name}?`)) return

        try {
            await updateCategory(category.id, {
                name: category.name,
                showToKomite: category.showToKomite,
                showToAdmin: category.showToAdmin,
                isActive: true,
                requiresHandover: category.requiresHandover,
                defaultAmount: 0 // Set to 0 to remove
            })
            showToast("Default nominal berhasil dihapus", "success")
            loadData()
        } catch (error: any) {
            showToast(`Gagal menghapus: ${error.message}`, "error")
        }
    }

    const openEditDialog = (category: any) => {
        setEditingId(category.id)
        form.reset({
            categoryId: category.id,
            amount: category.defaultAmount || 0,
        })
        setIsDialogOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">Atur Nominal Transaksi</h2>
                    <p className="text-muted-foreground text-sm">Tentukan nominal default (lock) untuk kategori tertentu (misal: SPP).</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) {
                        setEditingId(null)
                        form.reset()
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Tambah Nominal
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? "Edit Nominal" : "Tambah Nominal Baru"}</DialogTitle>
                            <DialogDescription>
                                Pilih kategori dan tentukan nominal defaultnya. Nominal ini akan terkunci saat input transaksi.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="categoryId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Kategori</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                disabled={!!editingId} // Lock category selection when editing
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Pilih kategori" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {editingId ? (
                                                        // When editing, only show the current category
                                                        categories.filter(c => c.id === editingId).map(c => (
                                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                        ))
                                                    ) : (
                                                        // When creating, show categories without active nominals + current selection (if any)
                                                        // (Actually just all categories but maybe filtered for UX? Let's show all for simplicity but prioritize unused)
                                                        categories.map((cat) => (
                                                            <SelectItem key={cat.id} value={cat.id} disabled={cat.defaultAmount > 0}>
                                                                {cat.name} {cat.defaultAmount > 0 ? "(Sudah diatur)" : ""}
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nominal (Rp)</FormLabel>
                                            <FormControl>
                                                <CurrencyInput
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    placeholder="Masukkan nominal"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Nominal yang akan otomatis terisi dan terkunci.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="submit">Simpan</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Kategori</TableHead>
                            <TableHead>Jenis</TableHead>
                            <TableHead className="text-right">Nominal Default (Lock)</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : activeNominals.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    Belum ada pengaturan nominal. Klik "Tambah Nominal" untuk membuat baru.
                                </TableCell>
                            </TableRow>
                        ) : (
                            activeNominals.map((cat) => (
                                <TableRow key={cat.id}>
                                    <TableCell className="font-medium">{cat.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={cat.type === "INCOME" ? "default" : "destructive"}>
                                            {cat.type === "INCOME" ? "Pemasukan" : "Pengeluaran"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold">
                                        Rp {new Intl.NumberFormat("id-ID").format(cat.defaultAmount)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(cat)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(cat)}>
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
        </div>
    )
}
