"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Eye, EyeOff } from "lucide-react"

const adminFormSchema = z.object({
    username: z.string().min(1, "Username wajib diisi"),
    password: z.string().min(1, "Password wajib diisi"),
})

const santriFormSchema = z.object({
    nis: z.string().min(1, "NIS wajib diisi"),
})

export default function LoginPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [showPassword, setShowPassword] = useState(false)

    const adminForm = useForm<z.infer<typeof adminFormSchema>>({
        resolver: zodResolver(adminFormSchema),
        defaultValues: {
            username: "",
            password: "",
        },
    })

    const santriForm = useForm<z.infer<typeof santriFormSchema>>({
        resolver: zodResolver(santriFormSchema),
        defaultValues: {
            nis: "",
        },
    })

    async function onAdminSubmit(values: z.infer<typeof adminFormSchema>) {
        setIsLoading(true)
        setError("")

        try {
            const res = await signIn("credentials", {
                username: values.username,
                password: values.password,
                redirect: false,
            })

            if (res?.error) {
                setError("Username atau password salah")
            } else {
                router.push("/")
                router.refresh()
            }
        } catch (error) {
            setError("Terjadi kesalahan")
        } finally {
            setIsLoading(false)
        }
    }

    async function onSantriSubmit(values: z.infer<typeof santriFormSchema>) {
        setIsLoading(true)
        setError("")

        try {
            // For santri, username and password are both NIS
            const res = await signIn("credentials", {
                username: values.nis,
                password: values.nis,
                redirect: false,
            })

            if (res?.error) {
                setError("NIS tidak ditemukan atau tidak aktif")
            } else {
                router.push("/")
                router.refresh()
            }
        } catch (error) {
            setError("Terjadi kesalahan")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 p-4">
            <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        RQM Financial System
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base">
                        Masuk ke dashboard sistem keuangan
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="admin" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="admin">Admin / Komite</TabsTrigger>
                            <TabsTrigger value="santri">Santri</TabsTrigger>
                        </TabsList>

                        {/* Admin/Komite Login */}
                        <TabsContent value="admin">
                            <Form {...adminForm}>
                                <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-4">
                                    <FormField
                                        control={adminForm.control}
                                        name="username"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Username</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="admin atau komite" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={adminForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Password</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            type={showPassword ? "text" : "password"}
                                                            placeholder="••••••••"
                                                            {...field}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                        >
                                                            {showPassword ? (
                                                                <EyeOff className="h-4 w-4" />
                                                            ) : (
                                                                <Eye className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {error && (
                                        <div className="text-sm text-red-500 text-center font-medium bg-red-50 p-2 rounded">
                                            {error}
                                        </div>
                                    )}
                                    <Button
                                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all duration-300"
                                        type="submit"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Masuk...
                                            </>
                                        ) : (
                                            "Masuk"
                                        )}
                                    </Button>
                                </form>
                            </Form>
                        </TabsContent>

                        {/* Santri Login */}
                        <TabsContent value="santri">
                            <Form {...santriForm}>
                                <form onSubmit={santriForm.handleSubmit(onSantriSubmit)} className="space-y-4">
                                    <FormField
                                        control={santriForm.control}
                                        name="nis"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>NIS (Nomor Induk Santri)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Masukkan NIS Anda" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                                <p className="text-xs text-muted-foreground">
                                                    Gunakan NIS Anda untuk masuk ke dashboard
                                                </p>
                                            </FormItem>
                                        )}
                                    />
                                    {error && (
                                        <div className="text-sm text-red-500 text-center font-medium bg-red-50 p-2 rounded">
                                            {error}
                                        </div>
                                    )}
                                    <Button
                                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 transition-all duration-300"
                                        type="submit"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Masuk...
                                            </>
                                        ) : (
                                            "Masuk"
                                        )}
                                    </Button>
                                </form>
                            </Form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
