"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { CurrencyInput } from "@/components/ui/currency-input"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { CalendarIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { createTransaction } from "@/actions/transaction"
import { getTransactionCategories } from "@/actions/categories"
import { getStudents } from "@/actions/user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/contexts/toast-context"

import { createMassTransaction } from "@/actions/mass-transaction"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Users, Check, ChevronsUpDown } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

const targetTypes = ["TABUNGAN", "KAS", "UANG_KAS", "KAS_MASUK", "PENARIKAN_TABUNGAN"]

const formSchema = z.object({
    type: z.string().min(1, "Tipe transaksi harus dipilih"),
    amount: z.coerce.number().min(1, "Jumlah harus lebih dari 0"),
    description: z.string().optional(),
    date: z.date(),
    studentId: z.string().optional(),
}).refine((data) => {
    if (targetTypes.includes(data.type)) {
        return !!data.studentId
    }
    // For other types, description must be at least 15 chars
    if (data.description && data.description.length < 15) {
        return false
    }
    return true
}, {
    message: "Keterangan minimal 15 karakter untuk jenis transaksi ini",
    path: ["description"],
}).refine((data) => {
    if (targetTypes.includes(data.type)) {
        return !!data.studentId
    }
    return true
}, {
    message: "Santri harus dipilih untuk jenis transaksi ini",
    path: ["studentId"],
})

const massFormSchema = z.object({
    type: z.string().min(1, "Tipe transaksi harus dipilih"),
    amount: z.coerce.number().min(1, "Jumlah harus lebih dari 0"),
    description: z.string().optional(),
    studentIds: z.array(z.string()).min(1, "Minimal pilih 1 santri"),
    date: z.date(),
}).refine((data) => {
    // For mass input, we assume it's mostly for Tabungan/Kas which don't need long description
    // But if they select something else (if allowed), we might need validation.
    // However, Komite mass input is specifically for Tabungan/Kas as per request.
    return true
})

import { useSearchParams } from "next/navigation"

export default function KomiteTransactionPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [students, setStudents] = useState<{ id: string; name: string }[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [openStudent, setOpenStudent] = useState(false)
    const [isMassInputOpen, setIsMassInputOpen] = useState(false)
    const { showToast } = useToast()
    const searchParams = useSearchParams()

    useEffect(() => {
        getStudents().then(setStudents)
        getTransactionCategories("KOMITE", "INCOME").then(setCategories)

        if (searchParams.get("open") === "mass") {
            setIsMassInputOpen(true)
        }
    }, [searchParams])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            amount: 0,
            date: new Date(),
            description: "",
            type: "", // Initialize with empty string to match schema
            studentId: undefined,
        },
    })

    const massForm = useForm<z.infer<typeof massFormSchema>>({
        resolver: zodResolver(massFormSchema) as any,
        defaultValues: {
            amount: 0,
            date: new Date(),
            description: "",
            type: "",
            studentIds: [],
        },
    })

    const type = form.watch("type")
    // Show student select for specific system categories that require it
    const showStudentSelect = targetTypes.includes(type)

    // Clear studentId if type changes to something that doesn't require it? 
    // Maybe better not to force clear to avoid UX annoyance, but validation handles it.

    const selectedCategory = categories.find(c => c.code === type)

    async function onSubmit(values: z.infer<typeof formSchema>) {
        // Client-side validation for "Lainnya"
        if (selectedCategory && (
            selectedCategory.name.toLowerCase().includes("lainnya") ||
            selectedCategory.name.toLowerCase().includes("other")
        )) {
            if (!values.description || values.description.length < 20) {
                form.setError("description", {
                    type: "manual",
                    message: "Untuk kategori ini, keterangan wajib minimal 20 karakter."
                })
                return
            }
        }

        setIsLoading(true)
        try {
            await createTransaction(values)
            form.reset({
                amount: 0,
                date: new Date(),
                description: "",
                type: values.type,
                studentId: undefined, // Fixed: don't pass studentId if not needed, or let form check it
            })
            showToast("Transaksi berhasil disimpan", "success")
        } catch (error: any) {
            console.error(error)
            showToast(error.message || "Gagal menyimpan transaksi", "error")
        } finally {
            setIsLoading(false)
        }
    }

    async function onMassSubmit(values: z.infer<typeof massFormSchema>) {
        setIsLoading(true)
        try {
            await createMassTransaction(values)
            massForm.reset({
                amount: 0,
                date: new Date(),
                description: "",
                type: values.type,
                studentIds: [],
            })
            setIsMassInputOpen(false)
            showToast("Transaksi masal berhasil disimpan", "success")
        } catch (error) {
            console.error(error)
            showToast("Gagal menyimpan transaksi masal", "error")
        } finally {
            setIsLoading(false)
        }
    }

    const toggleStudentSelection = (studentId: string) => {
        const currentSelection = massForm.getValues("studentIds")
        if (currentSelection.includes(studentId)) {
            massForm.setValue("studentIds", currentSelection.filter(id => id !== studentId))
        } else {
            massForm.setValue("studentIds", [...currentSelection, studentId])
        }
    }

    const selectAllStudents = () => {
        const currentSelection = massForm.getValues("studentIds")
        if (currentSelection.length === students.length) {
            massForm.setValue("studentIds", [])
        } else {
            massForm.setValue("studentIds", students.map(s => s.id))
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex justify-end">
                <Dialog open={isMassInputOpen} onOpenChange={setIsMassInputOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Users className="h-4 w-4" />
                            Input Masal (Tabungan/Kas)
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Input Transaksi Masal</DialogTitle>
                        </DialogHeader>
                        <Form {...massForm}>
                            <form onSubmit={massForm.handleSubmit(onMassSubmit)} className="space-y-6">
                                <FormField
                                    control={massForm.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Jenis Transaksi</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Pilih jenis transaksi" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {categories
                                                        .filter(cat => targetTypes.includes(cat.code)) // Filter only Tabungan/Kas/etc for mass input
                                                        .map((cat) => (
                                                            <SelectItem key={cat.id} value={cat.code}>
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
                                    control={massForm.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Jumlah per Santri (Rp)</FormLabel>
                                            <FormControl>
                                                <CurrencyInput
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    placeholder="Masukkan jumlah"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={massForm.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Tanggal</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "d MMMM yyyy", { locale: id })
                                                            ) : (
                                                                <span>Pick a date</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) =>
                                                            date > new Date() || date < new Date("1900-01-01")
                                                        }
                                                        initialFocus
                                                        locale={id}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={massForm.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Keterangan (Opsional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Catatan tambahan..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <FormLabel>Pilih Santri ({massForm.watch("studentIds").length} dipilih)</FormLabel>
                                        <Button type="button" variant="ghost" size="sm" onClick={selectAllStudents}>
                                            {massForm.watch("studentIds").length === students.length ? "Batal Pilih Semua" : "Pilih Semua"}
                                        </Button>
                                    </div>
                                    <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {students.map((student) => (
                                            <div key={student.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`mass-${student.id}`}
                                                    checked={massForm.watch("studentIds").includes(student.id)}
                                                    onCheckedChange={() => toggleStudentSelection(student.id)}
                                                />
                                                <label
                                                    htmlFor={`mass-${student.id}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                >
                                                    {student.name}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    <FormMessage>{massForm.formState.errors.studentIds?.message}</FormMessage>
                                </div>

                                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        "Simpan Transaksi Masal"
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Input Pemasukan (Tabungan & Kas)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Jenis Transaksi</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih jenis transaksi" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categories.map((cat) => (
                                                    <SelectItem key={cat.id} value={cat.code}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {showStudentSelect && (
                                <FormField
                                    control={form.control}
                                    name="studentId"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Nama Santri</FormLabel>
                                            <Popover open={openStudent} onOpenChange={setOpenStudent}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            className={cn(
                                                                "w-full justify-between",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value
                                                                ? students.find(
                                                                    (student) => student.id === field.value
                                                                )?.name
                                                                : "Pilih santri"}
                                                            <Loader2 className={cn("ml-2 h-4 w-4 shrink-0 opacity-50", openStudent ? "animate-spin" : "hidden")} />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[300px] p-0">
                                                    <div className="p-2">
                                                        <Input
                                                            placeholder="Cari santri..."
                                                            className="mb-2"
                                                            onChange={(e) => {
                                                                // Simple client-side filtering or implement server search
                                                            }}
                                                        />
                                                        <div className="max-h-[200px] overflow-y-auto">
                                                            {students.map((student) => (
                                                                <div
                                                                    key={student.id}
                                                                    className={cn(
                                                                        "cursor-pointer p-2 hover:bg-gray-100 rounded-sm text-sm",
                                                                        student.id === field.value ? "bg-gray-100 font-medium" : ""
                                                                    )}
                                                                    onClick={() => {
                                                                        form.setValue("studentId", student.id)
                                                                        setOpenStudent(false)
                                                                    }}
                                                                >
                                                                    {student.name}
                                                                </div>
                                                            ))}
                                                            {students.length === 0 && <div className="text-sm text-muted-foreground p-2">Tidak ada data santri.</div>}
                                                        </div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Jumlah (Rp)</FormLabel>
                                        <FormControl>
                                            <CurrencyInput
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                placeholder="Masukkan jumlah"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Tanggal</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, "d MMMM yyyy", { locale: id })
                                                        ) : (
                                                            <span>Pilih tanggal</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) =>
                                                        date > new Date() || date < new Date("1900-01-01")
                                                    }
                                                    initialFocus
                                                    locale={id}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Keterangan</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Catatan..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    "Simpan Transaksi"
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
