"use client"

import { useEffect, useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Trash2, UserPlus, Search, Upload, Download, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
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
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { getUsersByRole, createSantriOrGuru, deleteUserById, toggleUserActive, createBulkUsers, updateSantriOrGuru } from "@/actions/user-management"
import { useToast } from "@/contexts/toast-context"
import * as XLSX from 'xlsx'

const formSchema = z.object({
    name: z.string().min(2, "Nama minimal 2 karakter"),
    username: z.string().min(3, "NIP minimal 3 karakter"),
    subject: z.string().min(2, "Mata pelajaran wajib diisi"),
})

export default function DataGuruPage() {
    const [users, setUsers] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [search, setSearch] = useState("")
    const [editingUser, setEditingUser] = useState<any>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { showToast } = useToast()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            username: "",
            subject: "",
        },
    })

    useEffect(() => {
        loadUsers()
    }, [])

    async function loadUsers() {
        try {
            const data = await getUsersByRole("GURU")
            setUsers(data)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            const res = await createSantriOrGuru({ ...values, role: "GURU" })
            if (res.success) {
                setIsDialogOpen(false)
                form.reset()
                loadUsers()
                showToast("Guru berhasil ditambahkan", "success")
            } else {
                showToast("Gagal: " + res.error, "error")
            }
        } catch (error) {
            console.error(error)
            showToast("Terjadi kesalahan", "error")
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Hapus data guru ${name}?`)) return
        try {
            await deleteUserById(id, "guru")
            loadUsers()
            showToast("Guru berhasil dihapus", "success")
        } catch (error) {
            showToast("Gagal menghapus", "error")
        }
    }

    function handleEdit(user: any) {
        setEditingUser(user)
        form.setValue("name", user.name)
        form.setValue("username", user.username)
        form.setValue("subject", user.subject || "")
        setIsEditDialogOpen(true)
    }

    async function onEditSubmit(values: z.infer<typeof formSchema>) {
        if (!editingUser) return
        setIsSubmitting(true)
        try {
            const res = await updateSantriOrGuru(editingUser.id, values)
            if (res.success) {
                setIsEditDialogOpen(false)
                form.reset()
                setEditingUser(null)
                loadUsers()
                showToast("Data guru berhasil diperbarui", "success")
            } else {
                showToast("Gagal: " + res.error, "error")
            }
        } catch (error) {
            console.error(error)
            showToast("Terjadi kesalahan", "error")
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleToggleActive(id: string, currentStatus: boolean) {
        try {
            await toggleUserActive(id, !currentStatus)
            loadUsers()
            showToast("Status berhasil diubah", "success")
        } catch (error) {
            showToast("Gagal mengubah status", "error")
        }
    }

    function downloadTemplate() {
        const template = [
            {
                NIP: "19800101",
                "Nama Lengkap": "Ustadz Ahmad",
                "Mata Pelajaran": "Tahfidz",
            }
        ]
        const ws = XLSX.utils.json_to_sheet(template)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Template")
        XLSX.writeFile(wb, "template_guru.xlsx")
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data)
            const worksheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

            const usersToCreate = jsonData.map(row => ({
                name: row["Nama Lengkap"],
                username: row["NIP"],
                subject: row["Mata Pelajaran"],
                role: "GURU" as const,
            }))

            const results = await createBulkUsers(usersToCreate)
            showToast(`Berhasil: ${results.success}, Gagal: ${results.failed}`, results.failed > 0 ? "warning" : "success")
            if (results.errors.length > 0) {
                console.error("Errors:", results.errors)
            }
            loadUsers()
        } catch (error) {
            console.error(error)
            showToast("Gagal mengimport file", "error")
        }

        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Data Guru</h1>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={downloadTemplate}>
                        <Download className="mr-2 h-4 w-4" />
                        <span className="hidden md:inline">Template Excel</span>
                        <span className="md:hidden">Template</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" />
                        <span className="hidden md:inline">Import Excel</span>
                        <span className="md:hidden">Import</span>
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <UserPlus className="mr-2 h-4 w-4" />
                                <span className="hidden md:inline">Tambah Guru</span>
                                <span className="md:hidden">Tambah</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Tambah Guru Baru</DialogTitle>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="username"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>NIP</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="19800101" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nama Lengkap</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Nama Guru" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="subject"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Mata Pelajaran</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Contoh: Tahfidz, Fiqih, dll" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <p className="text-xs text-muted-foreground">Password default sama dengan NIP.</p>
                                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                                        {isSubmitting ? "Menyimpan..." : "Simpan"}
                                    </Button>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Dialog */}
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Data Guru</DialogTitle>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="username"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>NIP</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="19800101" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nama Lengkap</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Nama Guru" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="subject"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Mata Pelajaran</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Contoh: Tahfidz, Fiqih, dll" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                                        {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                                    </Button>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari nama atau NIP..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="animate-spin" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-4 md:mx-0">
                            <div className="inline-block min-w-full align-middle">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-xs md:text-sm">NIP</TableHead>
                                            <TableHead className="text-xs md:text-sm">Nama Lengkap</TableHead>
                                            <TableHead className="text-xs md:text-sm hidden md:table-cell">Mata Pelajaran</TableHead>
                                            <TableHead className="text-xs md:text-sm">Status</TableHead>
                                            <TableHead className="text-right text-xs md:text-sm">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell className="text-xs md:text-sm">{user.username}</TableCell>
                                                <TableCell className="font-medium text-xs md:text-sm">{user.name}</TableCell>
                                                <TableCell className="text-xs md:text-sm hidden md:table-cell">{user.subject || "-"}</TableCell>
                                                <TableCell>
                                                    <Switch
                                                        checked={user.isActive}
                                                        onCheckedChange={() => handleToggleActive(user.id, user.isActive)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 h-8 w-8"
                                                            onClick={() => handleEdit(user)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                                                            onClick={() => handleDelete(user.id, user.name)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredUsers.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-muted-foreground text-sm">
                                                    Tidak ada data guru.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
