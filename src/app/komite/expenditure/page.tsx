"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { CurrencyInput } from "@/components/ui/currency-input"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Check, ChevronsUpDown } from "lucide-react"
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
import { useToast } from "@/contexts/toast-context"
import { createTransaction } from "@/actions/transaction"
import { getTransactionCategories } from "@/actions/categories"
import { getStudents } from "@/actions/user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const formSchema = z.object({
    type: z.string().min(1, "Tipe pengeluaran harus dipilih"),
    amount: z.coerce.number().min(1, "Jumlah harus lebih dari 0"),
    description: z.string().min(1, "Keterangan harus diisi"),
    date: z.date(),
    studentId: z.string().optional(),
}).refine((data) => {
    if (data.type === "PENARIKAN_TABUNGAN") {
        return !!data.studentId
    }
    // For other types, description must be at least 15 chars
    if (data.type !== "PENARIKAN_TABUNGAN" && data.description.length < 15) {
        return false
    }
    return true
}, {
    message: "Keterangan minimal 15 karakter untuk jenis pengeluaran ini",
    path: ["description"],
}).refine((data) => {
    if (data.type === "PENARIKAN_TABUNGAN") {
        return !!data.studentId
    }
    return true
}, {
    message: "Santri harus dipilih untuk penarikan tabungan",
    path: ["studentId"],
})

export default function KomiteExpenditurePage() {
    const { showToast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [categories, setCategories] = useState<any[]>([])
    const [students, setStudents] = useState<{ id: string; name: string }[]>([])
    const [openStudent, setOpenStudent] = useState(false)

    useEffect(() => {
        getTransactionCategories("KOMITE", "EXPENSE").then(setCategories)
        getStudents().then(setStudents)
    }, [])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            amount: 0,
            date: new Date(),
            description: "",
            studentId: undefined,
        },
    })

    const type = form.watch("type")
    const studentId = form.watch("studentId")

    // Find selected category to check for keywords
    const selectedCategory = categories.find(c => c.code === type)

    // Check if we should show student select
    // Logic: Explicit "tabungan" types OR name contains "santri"
    const showStudentSelect = selectedCategory && (
        selectedCategory.code === "PENARIKAN_TABUNGAN" ||
        selectedCategory.name.toLowerCase().includes("santri") ||
        selectedCategory.name.toLowerCase().includes("tabungan")
    )

    useEffect(() => {
        // Auto-fill description if Penarikan Tabungan
        if (showStudentSelect && studentId && selectedCategory?.code === "PENARIKAN_TABUNGAN") {
            const student = students.find(s => s.id === studentId)
            if (student) {
                form.setValue("description", `Penarikan Tabungan ${student.name}`)
            }
        }
    }, [type, studentId, students, form, showStudentSelect, selectedCategory])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        // Client-side validation for "Lainnya"
        if (selectedCategory && (
            selectedCategory.name.toLowerCase().includes("lainnya") ||
            selectedCategory.name.toLowerCase().includes("other")
        )) {
            if (values.description.length < 20) {
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
                studentId: undefined,
            })
            showToast("Pengeluaran berhasil disimpan", "success")
        } catch (error: any) {
            console.error(error)
            // Show backend error if any (e.g. balance insufficient)
            showToast(error.message || "Gagal menyimpan pengeluaran", "error")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Input Pengeluaran (Komite)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Jenis Pengeluaran</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih jenis pengeluaran" />
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
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[300px] p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Cari santri..." />
                                                        <CommandList>
                                                            <CommandEmpty>Santri tidak ditemukan.</CommandEmpty>
                                                            <CommandGroup>
                                                                {students.map((student) => (
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
                                        <FormLabel>Keterangan</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Keterangan pengeluaran..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    "Simpan Pengeluaran"
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
