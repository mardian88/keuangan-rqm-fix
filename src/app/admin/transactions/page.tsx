"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { CurrencyInput } from "@/components/ui/currency-input"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Check, ChevronsUpDown, Users } from "lucide-react"
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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { createTransaction } from "@/actions/transaction"
import { createMassTransaction } from "@/actions/mass-transaction"
import { getStudentsWithInstallmentStatus } from "@/actions/user"
import { getTransactionCategories } from "@/actions/categories"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"

const formSchema = z.object({
    type: z.string().min(1, "Tipe transaksi harus dipilih"),
    amount: z.coerce.number().min(1, "Jumlah harus lebih dari 0"),
    description: z.string().optional(),
    studentId: z.string().optional(),
    date: z.date(),
}).refine((data) => {
    if (["SPP", "KAS", "TABUNGAN"].includes(data.type)) {
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
})

import { useToast } from "@/contexts/toast-context"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function TransactionContent() {
    const { showToast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [students, setStudents] = useState<{ id: string; name: string; hasActiveInstallment: boolean }[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [openStudent, setOpenStudent] = useState(false)
    const [isMassInputOpen, setIsMassInputOpen] = useState(false)
    const searchParams = useSearchParams()

    useEffect(() => {
        getStudentsWithInstallmentStatus().then(setStudents)
        getTransactionCategories("ADMIN", "INCOME").then(setCategories)

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
            type: "",
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

    // Check if category requires student (SPP, Tabungan, Kas, or any category with "Santri" in name)
    const selectedCategory = categories.find(c => c.code === type)
    const catName = selectedCategory?.name?.toLowerCase() || ""
    const showStudentSelect = ["SPP", "TABUNGAN", "KAS", "UANG_KAS"].includes(type) ||
        catName.includes("spp") ||
        catName.includes("tabungan") ||
        catName.includes("kas") ||
        catName.includes("santri")  // Auto-detect categories with "Santri" in name

    // Filter students based on transaction type
    // For SPP: exclude students with active installments (they should use cicilan page)
    const isSppTransaction = type === 'SPP' || catName.includes('spp')
    const availableStudents = isSppTransaction
        ? students.filter(s => !s.hasActiveInstallment)
        : students

    // Auto-fill and lock amount logic
    useEffect(() => {
        const selectedCat = categories.find(c => c.code === type)
        if (selectedCat?.defaultAmount && selectedCat.defaultAmount > 0) {
            form.setValue("amount", selectedCat.defaultAmount)
        }
    }, [type, categories, form])

    const isAmountLocked = (selectedCategory?.defaultAmount || 0) > 0

    // Mass Form Logic
    const massType = massForm.watch("type")
    useEffect(() => {
        const selectedCat = categories.find(c => c.code === massType)
        if (selectedCat?.defaultAmount && selectedCat.defaultAmount > 0) {
            massForm.setValue("amount", selectedCat.defaultAmount)
        }
    }, [massType, categories, massForm])

    const selectedMassCategory = categories.find(c => c.code === massType)
    const isMassAmountLocked = (selectedMassCategory?.defaultAmount || 0) > 0

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            await createTransaction(values)
            form.reset({
                amount: 0,
                date: new Date(),
                description: "",
                type: values.type,
            })
            // Re-apply default amount if locked, because reset clears it
            if (isAmountLocked) {
                form.setValue("amount", selectedCategory.defaultAmount)
            }
            showToast("Transaksi berhasil disimpan", "success")
        } catch (error: any) {
            console.error(error)
            const message = error.message || "Gagal menyimpan transaksi"
            showToast("Gagal menyimpan transaksi", "error", message)
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
            // Re-apply default amount if locked
            if (isMassAmountLocked) {
                massForm.setValue("amount", selectedMassCategory.defaultAmount)
            }
            setIsMassInputOpen(false)
            showToast("Transaksi masal berhasil disimpan", "success")
        } catch (error: any) {
            console.error(error)
            const message = error.message || "Gagal menyimpan transaksi masal"
            showToast("Gagal menyimpan transaksi", "error", message)
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
                            Input Masal
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
                                                    disabled={isMassAmountLocked}
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
                                                                format(field.value, "PPP")
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

                                <Button type="submit" className="w-full" disabled={isLoading}>
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
                    <CardTitle>Input Transaksi Baru</CardTitle>
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
                                            {isSppTransaction && students.some(s => s.hasActiveInstallment) && (
                                                <p className="text-xs text-muted-foreground">
                                                    Santri dengan cicilan aktif tidak ditampilkan. Gunakan halaman Cicilan untuk input pembayaran mereka.
                                                </p>
                                            )}
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
                                                                ? availableStudents.find(
                                                                    (student) => student.id === field.value
                                                                )?.name
                                                                : "Pilih santri"}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[200px] p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Cari santri..." />
                                                        <CommandList>
                                                            <CommandEmpty>Santri tidak ditemukan.</CommandEmpty>
                                                            <CommandGroup>
                                                                {availableStudents.map((student) => (
                                                                    <CommandItem
                                                                        value={student.name}
                                                                        key={student.id}
                                                                        onSelect={() => {
                                                                            form.setValue("studentId", student.id)
                                                                            setOpenStudent(false)
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                student.id === field.value
                                                                                    ? "opacity-100"
                                                                                    : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {student.name}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
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
                                                disabled={isAmountLocked}
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
                                                            format(field.value, "PPP")
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
                                        <FormLabel>Keterangan (Opsional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Catatan tambahan..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full" disabled={isLoading}>
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

export default function TransactionPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
            <TransactionContent />
        </Suspense>
    )
}
