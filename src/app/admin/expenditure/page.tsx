"use client"

import { useState, useEffect } from "react"
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
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/contexts/toast-context"
import { createTransaction } from "@/actions/transaction"
import { getGurus } from "@/actions/guru"
import { getTransactionCategories } from "@/actions/categories"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"

const formSchema = z.object({
    type: z.string().min(1, "Jenis pengeluaran harus dipilih"),
    amount: z.number().min(1, "Jumlah harus lebih dari 0"),
    description: z.string().min(1, "Keterangan wajib diisi"),
    date: z.date(),
    teacherId: z.string().optional(),
})

export default function ExpenditurePage() {
    const { showToast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [gurus, setGurus] = useState<{ id: string; name: string }[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [openGuru, setOpenGuru] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: 0,
            date: new Date(),
            description: "",
            type: "PENGELUARAN_ADMIN",
        },
    })

    const type = form.watch("type")

    // Find selected category object
    const selectedCategory = categories.find(c => c.code === type)

    // Check if we should show Guru select
    const showGuruSelect = selectedCategory && (
        selectedCategory.code === "MUKAFAAH" ||
        selectedCategory.name.toLowerCase().includes("guru") ||
        selectedCategory.name.toLowerCase().includes("ustadz")
    )

    useEffect(() => {
        getTransactionCategories("ADMIN", "EXPENSE").then(setCategories)
        getGurus().then(setGurus)
    }, [])

    // (Cleaned up duplicate code)

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
            await createTransaction({
                type: values.type,
                amount: values.amount,
                date: values.date,
                description: values.description,
                teacherId: values.teacherId,
            })

            form.reset({
                amount: 0,
                date: new Date(),
                description: "",
                type: "PENGELUARAN_ADMIN",
                teacherId: undefined,
            })
            showToast("Pengeluaran berhasil disimpan", "success")
        } catch (error: any) {
            console.error(error)
            showToast(error.message || "Gagal menyimpan pengeluaran", "error")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Input Pengeluaran (Admin)</CardTitle>
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

                            {showGuruSelect && (
                                <FormField
                                    control={form.control}
                                    name="teacherId"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Nama Guru</FormLabel>
                                            <Popover open={openGuru} onOpenChange={setOpenGuru}>
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
                                                                ? gurus.find(
                                                                    (guru) => guru.id === field.value
                                                                )?.name
                                                                : "Pilih guru"}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[200px] p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Cari guru..." />
                                                        <CommandList>
                                                            <CommandEmpty>Guru tidak ditemukan.</CommandEmpty>
                                                            <CommandGroup>
                                                                {gurus.map((guru) => (
                                                                    <CommandItem
                                                                        value={guru.name}
                                                                        key={guru.id}
                                                                        onSelect={() => {
                                                                            form.setValue("teacherId", guru.id)
                                                                            setOpenGuru(false)
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                guru.id === field.value
                                                                                    ? "opacity-100"
                                                                                    : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {guru.name}
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
