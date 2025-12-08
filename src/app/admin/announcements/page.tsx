"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Edit, Trash2, Megaphone } from "lucide-react"
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
    FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/actions/announcement"
import { useToast } from "@/contexts/toast-context"
import { format } from "date-fns"
import { id } from "date-fns/locale"

const formSchema = z.object({
    title: z.string().min(3, "Judul minimal 3 karakter"),
    content: z.string().min(10, "Konten minimal 10 karakter"),
    showToKomite: z.boolean(),
    showToSantri: z.boolean(),
    isActive: z.boolean(),
})

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null)
    const [hasShownError, setHasShownError] = useState(false)
    const { showToast } = useToast()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            content: "",
            showToKomite: false,
            showToSantri: false,
            isActive: true,
        },
    })

    useEffect(() => {
        loadAnnouncements()
    }, [])

    async function loadAnnouncements() {
        try {
            setIsLoading(true)
            const data = await getAnnouncements()
            setAnnouncements(data)
            setHasShownError(false) // Reset error flag on successful load
        } catch (error) {
            console.error(error)
            // Only show toast if we haven't shown an error yet
            if (!hasShownError) {
                showToast("Gagal memuat pengumuman", "error")
                setHasShownError(true)
            }
        } finally {
            setIsLoading(false)
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            const res = await createAnnouncement(values)
            if (res.success) {
                setIsDialogOpen(false)
                form.reset()
                loadAnnouncements()
                showToast("Pengumuman berhasil ditambahkan", "success")
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

    function handleEdit(announcement: any) {
        setEditingAnnouncement(announcement)
        form.setValue("title", announcement.title)
        form.setValue("content", announcement.content)
        form.setValue("showToKomite", announcement.showToKomite)
        form.setValue("showToSantri", announcement.showToSantri)
        form.setValue("isActive", announcement.isActive)
        setIsEditDialogOpen(true)
    }

    async function onEditSubmit(values: z.infer<typeof formSchema>) {
        if (!editingAnnouncement) return
        setIsSubmitting(true)
        try {
            const res = await updateAnnouncement(editingAnnouncement.id, values)
            if (res.success) {
                setIsEditDialogOpen(false)
                form.reset()
                setEditingAnnouncement(null)
                loadAnnouncements()
                showToast("Pengumuman berhasil diperbarui", "success")
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

    async function handleDelete(id: string, title: string) {
        if (!confirm(`Hapus pengumuman "${title}"?`)) return
        try {
            await deleteAnnouncement(id)
            loadAnnouncements()
            showToast("Pengumuman berhasil dihapus", "success")
        } catch (error) {
            showToast("Gagal menghapus", "error")
        }
    }

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pengumuman</h1>
                    <p className="text-sm text-muted-foreground">Kelola pengumuman untuk Komite dan Santri</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            <span className="hidden md:inline">Tambah Pengumuman</span>
                            <span className="md:hidden">Tambah</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Tambah Pengumuman Baru</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Judul</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Judul pengumuman" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="content"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Konten</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Isi pengumuman"
                                                    rows={5}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="showToKomite"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Tampilkan ke Komite</FormLabel>
                                                    <FormDescription className="text-xs">
                                                        Pengumuman akan muncul di dashboard Komite
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
                                        name="showToSantri"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Tampilkan ke Santri</FormLabel>
                                                    <FormDescription className="text-xs">
                                                        Pengumuman akan muncul di dashboard Santri
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
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? "Menyimpan..." : "Simpan"}
                                </Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Edit Pengumuman</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Judul</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Judul pengumuman" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="content"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Konten</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Isi pengumuman"
                                                    rows={5}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="showToKomite"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Tampilkan ke Komite</FormLabel>
                                                    <FormDescription className="text-xs">
                                                        Pengumuman akan muncul di dashboard Komite
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
                                        name="showToSantri"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Tampilkan ke Santri</FormLabel>
                                                    <FormDescription className="text-xs">
                                                        Pengumuman akan muncul di dashboard Santri
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
                                <FormField
                                    control={form.control}
                                    name="isActive"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <FormLabel>Status Aktif</FormLabel>
                                                <FormDescription className="text-xs">
                                                    Nonaktifkan untuk menyembunyikan pengumuman
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
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                                </Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base md:text-lg">Daftar Pengumuman</CardTitle>
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
                                            <TableHead className="text-xs md:text-sm">Judul</TableHead>
                                            <TableHead className="text-xs md:text-sm hidden md:table-cell">Konten</TableHead>
                                            <TableHead className="text-xs md:text-sm">Tampil Ke</TableHead>
                                            <TableHead className="text-xs md:text-sm hidden lg:table-cell">Tanggal</TableHead>
                                            <TableHead className="text-xs md:text-sm">Status</TableHead>
                                            <TableHead className="text-right text-xs md:text-sm">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {announcements.map((announcement) => (
                                            <TableRow key={announcement.id}>
                                                <TableCell className="font-medium text-xs md:text-sm">
                                                    {announcement.title}
                                                </TableCell>
                                                <TableCell className="text-xs md:text-sm hidden md:table-cell max-w-xs truncate">
                                                    {announcement.content}
                                                </TableCell>
                                                <TableCell className="text-xs md:text-sm">
                                                    <div className="flex flex-wrap gap-1">
                                                        {announcement.showToKomite && (
                                                            <Badge variant="outline" className="text-xs">Komite</Badge>
                                                        )}
                                                        {announcement.showToSantri && (
                                                            <Badge variant="outline" className="text-xs">Santri</Badge>
                                                        )}
                                                        {!announcement.showToKomite && !announcement.showToSantri && (
                                                            <span className="text-muted-foreground text-xs">-</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs md:text-sm hidden lg:table-cell">
                                                    {format(new Date(announcement.createdAt), "d MMM yyyy", { locale: id })}
                                                </TableCell>
                                                <TableCell className="text-xs md:text-sm">
                                                    <Badge variant={announcement.isActive ? "default" : "secondary"} className="text-xs">
                                                        {announcement.isActive ? "Aktif" : "Nonaktif"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 h-8 w-8"
                                                            onClick={() => handleEdit(announcement)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                                                            onClick={() => handleDelete(announcement.id, announcement.title)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {announcements.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Megaphone className="h-8 w-8 text-muted-foreground/50" />
                                                        <p>Belum ada pengumuman.</p>
                                                    </div>
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
