"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { getHalaqahs, createHalaqah, deleteHalaqah, getShifts, createShift, deleteShift } from "@/actions/references"
import { getUsers, createUser, deleteUser } from "@/actions/settings"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// --- User Management Component (Reused/Refactored) ---
function UserManagement() {
    const [users, setUsers] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const formSchema = z.object({
        name: z.string().min(2, "Nama minimal 2 karakter"),
        username: z.string().min(3, "Username minimal 3 karakter"),
        password: z.string().min(6, "Password minimal 6 karakter"),
        role: z.enum(["ADMIN", "KOMITE", "SANTRI"]),
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: "", username: "", password: "", role: "SANTRI" },
    })

    useEffect(() => { loadUsers() }, [])

    async function loadUsers() {
        try {
            const data = await getUsers()
            setUsers(data)
        } catch (error) { console.error(error) }
        finally { setIsLoading(false) }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            const res = await createUser(values)
            if (res.success) {
                setIsDialogOpen(false)
                form.reset()
                loadUsers()
                alert("User berhasil dibuat")
            } else {
                alert("Gagal: " + res.error)
            }
        } catch (error) { console.error(error) }
        finally { setIsSubmitting(false) }
    }

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Hapus user ${name}?`)) return
        await deleteUser(id)
        loadUsers()
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between">
                <h3 className="text-lg font-medium">Daftar User</h3>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Tambah User</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Tambah User</DialogTitle></DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>Nama</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="username" render={({ field }) => (
                                    <FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="password" render={({ field }) => (
                                    <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="role" render={({ field }) => (
                                    <FormItem><FormLabel>Role</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="SANTRI">Santri</SelectItem>
                                                <SelectItem value="KOMITE">Komite</SelectItem>
                                                <SelectItem value="ADMIN">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage /></FormItem>
                                )} />
                                <Button type="submit" className="w-full" disabled={isSubmitting}>Simpan</Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
            <Table>
                <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Username</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                <TableBody>
                    {users.map(u => (
                        <TableRow key={u.id}>
                            <TableCell>{u.name}</TableCell>
                            <TableCell>{u.username}</TableCell>
                            <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id, u.name)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

// --- Generic List Management (Halaqah & Shift) ---
function ReferenceManagement({
    title,
    fetchFn,
    createFn,
    deleteFn
}: {
    title: string,
    fetchFn: () => Promise<any[]>,
    createFn: (name: string) => Promise<void>,
    deleteFn: (id: string) => Promise<void>
}) {
    const [items, setItems] = useState<any[]>([])
    const [newItem, setNewItem] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => { loadItems() }, [])

    async function loadItems() {
        const data = await fetchFn()
        setItems(data)
    }

    async function handleCreate() {
        if (!newItem.trim()) return
        setIsLoading(true)
        await createFn(newItem)
        setNewItem("")
        await loadItems()
        setIsLoading(false)
    }

    async function handleDelete(id: string) {
        if (!confirm("Hapus item ini?")) return
        await deleteFn(id)
        await loadItems()
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Input
                    placeholder={`Nama ${title} baru...`}
                    value={newItem}
                    onChange={e => setNewItem(e.target.value)}
                />
                <Button onClick={handleCreate} disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    Tambah
                </Button>
            </div>
            <div className="border rounded-md">
                <Table>
                    <TableHeader><TableRow><TableHead>Nama {title}</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {items.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>{item.name}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {items.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Belum ada data.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

import CategoriesSettingsPage from "./categories/page"

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
                <p className="text-muted-foreground">Kelola User, Halaqah, Shift, dan Kategori Transaksi.</p>
            </div>

            <Tabs defaultValue="user" className="w-full">
                <TabsList>
                    <TabsTrigger value="user">Manajemen User</TabsTrigger>
                    <TabsTrigger value="categories">Kategori Transaksi</TabsTrigger>
                    <TabsTrigger value="halaqah">Daftar Halaqah</TabsTrigger>
                    <TabsTrigger value="shift">Daftar Shift</TabsTrigger>
                </TabsList>

                <TabsContent value="user">
                    <Card>
                        <CardHeader><CardTitle>User System</CardTitle><CardDescription>Admin, Komite, dan Santri</CardDescription></CardHeader>
                        <CardContent><UserManagement /></CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="categories">
                    <Card>
                        <CardContent className="pt-6">
                            <CategoriesSettingsPage />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="halaqah">
                    <Card>
                        <CardHeader><CardTitle>Daftar Halaqah</CardTitle><CardDescription>Referensi untuk data santri</CardDescription></CardHeader>
                        <CardContent>
                            <ReferenceManagement
                                title="Halaqah"
                                fetchFn={getHalaqahs}
                                createFn={createHalaqah}
                                deleteFn={deleteHalaqah}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="shift">
                    <Card>
                        <CardHeader><CardTitle>Daftar Shift</CardTitle><CardDescription>Referensi untuk data santri</CardDescription></CardHeader>
                        <CardContent>
                            <ReferenceManagement
                                title="Shift"
                                fetchFn={getShifts}
                                createFn={createShift}
                                deleteFn={deleteShift}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
