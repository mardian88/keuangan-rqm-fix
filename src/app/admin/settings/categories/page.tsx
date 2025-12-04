"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Pencil, Trash2, Check, X } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { getAllCategories, createCategory, updateCategory, deleteCategory } from "@/actions/categories"
import { useToast } from "@/contexts/toast-context"

const formSchema = z.object({
    name: z.string().min(2, "Nama kategori minimal 2 karakter"),
    type: z.enum(["INCOME", "EXPENSE"]),
    showToKomite: z.boolean(),
    showToAdmin: z.boolean(),
})

export default function CategoriesSettingsPage() {
    const [categories, setCategories] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<any>(null)
    const { showToast } = useToast()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            type: "INCOME",
            showToKomite: true,
            showToAdmin: true,
        },
    })

    useEffect(() => {
        loadCategories()
    }, [])

    async function loadCategories() {
        try {
            const data = await getAllCategories()
            setCategories(data)
        } catch (error) {
            console.error(error)
            showToast("Gagal memuat kategori", "error")
        } finally {
            setIsLoading(false)
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, {
                    name: values.name,
                    showToKomite: values.showToKomite,
                    showToAdmin: values.showToAdmin,
                    isActive: true // Always active on update for now
                })
                showToast("Kategori berhasil diperbarui", "success")
            } else {
                await createCategory(values)
                showToast("Kategori berhasil dibuat", "success")
            }
            setIsDialogOpen(false)
            setEditingCategory(null)
            form.reset()
            loadCategories()
        } catch (error) {
            console.error(error)
            showToast("Gagal menyimpan kategori", "error")
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Apakah Anda yakin ingin menghapus kategori ini?")) return

        try {
            await deleteCategory(id)
            showToast("Kategori berhasil dihapus", "success")
            loadCategories()
        } catch (error: any) {
            showToast(error.message || "Gagal menghapus kategori", "error")
        }
    }

    const openEditDialog = (category: any) => {
        setEditingCategory(category)
        form.reset({
            name: category.name,
            type: category.type as "INCOME" | "EXPENSE",
            showToKomite: category.showToKomite,
            showToAdmin: category.showToAdmin,
        })
        setIsDialogOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Pengaturan Kategori Transaksi</h1>
                    <p className="text-muted-foreground">Kelola jenis pemasukan dan pengeluaran sistem.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) {
                        setEditingCategory(null)
                        form.reset()
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Tambah Kategori
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingCategory ? "Edit Kategori" : "Tambah Kategori Baru"}</DialogTitle>
                            <DialogDescription>
                                Buat kategori transaksi baru untuk pemasukan atau pengeluaran.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nama Kategori</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Contoh: Donasi, Hibah, dll" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Jenis</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                disabled={!!editingCategory} // Disable type change on edit
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Pilih jenis" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="INCOME">Pemasukan</SelectItem>
                                                    <SelectItem value="EXPENSE">Pengeluaran</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex flex-col gap-4 border p-4 rounded-md">
                                    <FormField
                                        control={form.control}
                                        name="showToKomite"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Tampil di Komite</FormLabel>
                                                    <FormDescription>
                                                        Apakah kategori ini muncul di menu Komite?
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="showToAdmin"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Tampil di Admin</FormLabel>
                                                    <FormDescription>
                                                        Apakah kategori ini muncul di menu Admin?
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
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
                            <TableHead>Nama Kategori</TableHead>
                            <TableHead>Kode</TableHead>
                            <TableHead>Jenis</TableHead>
                            <TableHead className="text-center">Komite</TableHead>
                            <TableHead className="text-center">Admin</TableHead>
                            <TableHead className="text-center">System</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : categories.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    Belum ada kategori.
                                </TableCell>
                            </TableRow>
                        ) : (
                            categories.map((cat) => (
                                <TableRow key={cat.id}>
                                    <TableCell className="font-medium">{cat.name}</TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{cat.code}</TableCell>
                                    <TableCell>
                                        <Badge variant={cat.type === "INCOME" ? "default" : "destructive"}>
                                            {cat.type === "INCOME" ? "Pemasukan" : "Pengeluaran"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {cat.showToKomite ? <Check className="h-4 w-4 mx-auto text-green-500" /> : <X className="h-4 w-4 mx-auto text-red-300" />}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {cat.showToAdmin ? <Check className="h-4 w-4 mx-auto text-green-500" /> : <X className="h-4 w-4 mx-auto text-red-300" />}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {cat.isSystem && <Badge variant="secondary" className="text-xs">System</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(cat)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            {!cat.isSystem && (
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(cat.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
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
