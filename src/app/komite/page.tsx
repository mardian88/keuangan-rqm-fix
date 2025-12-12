"use client"

import { useState, useEffect } from "react"
import { getCategoryBalances, CategoryBalance } from "@/actions/category-balance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronDown, ChevronUp, Wallet2, AlertCircle, ArrowUpRight, ArrowDownRight, DollarSign } from "lucide-react"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/contexts/toast-context"
import { MobileFloatingAction } from "@/components/mobile-fab"
import { MobileLogoutButton } from "@/components/mobile-logout"

export default function KomiteDashboardPage() {
    const [categories, setCategories] = useState<CategoryBalance[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
    const { showToast } = useToast()

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setIsLoading(true)
        try {
            const data = await getCategoryBalances()
            setCategories(data)
        } catch (error: any) {
            console.error("Failed to load category balances:", error)
            showToast(error.message || "Gagal memuat data saldo kategori", "error")
        } finally {
            setIsLoading(false)
        }
    }

    function toggleExpanded(code: string) {
        const newExpanded = new Set(expandedCategories)
        if (newExpanded.has(code)) {
            newExpanded.delete(code)
        } else {
            newExpanded.add(code)
        }
        setExpandedCategories(newExpanded)
    }

    function getBalanceStatus(category: CategoryBalance) {
        if (category.type === "INCOME") {
            return category.balance > 0 ? "positive" : "neutral"
        } else {
            return "expense"
        }
    }

    function getUtilizationPercentage(category: CategoryBalance) {
        if (category.type === "INCOME") {
            if (category.totalIncome === 0) return 0
            return Math.round((category.totalExpense / category.totalIncome) * 100)
        } else {
            return 100
        }
    }

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    function getCardGradient(category: CategoryBalance) {
        const status = getBalanceStatus(category)
        if (status === "positive") {
            return "bg-gradient-to-br from-emerald-50 via-white to-green-50"
        }
        if (status === "expense") {
            return "bg-gradient-to-br from-rose-50 via-white to-red-50"
        }
        return "bg-gradient-to-br from-gray-50 via-white to-slate-50"
    }

    function getBalanceGradient(category: CategoryBalance) {
        if (category.balance > 0) {
            return "bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent"
        }
        if (category.balance < 0) {
            return "bg-gradient-to-r from-rose-600 to-red-500 bg-clip-text text-transparent"
        }
        return "text-gray-600"
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse"></div>
                    <Loader2 className="h-12 w-12 animate-spin text-emerald-600 relative z-10" />
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">Memuat data kategori...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 md:space-y-8 pb-20 md:pb-6">
            {/* Header with gradient - Mobile optimized */}
            <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-6 md:p-8 shadow-2xl">
                <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 md:gap-3 mb-2">
                        <div className="p-2 md:p-3 bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl">
                            <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-white" />
                        </div>
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">Dashboard</h1>
                    </div>
                    <p className="text-emerald-50 text-xs md:text-sm lg:text-base">
                        Pantau pemasukan dan pengeluaran untuk setiap kategori transaksi secara real-time
                    </p>
                </div>
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-white/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 md:w-48 md:h-48 bg-teal-400/10 rounded-full blur-2xl"></div>
            </div>

            {categories.length === 0 ? (
                <Card className="border-none shadow-xl">
                    <CardContent className="flex flex-col items-center justify-center py-12 md:py-16">
                        <div className="p-3 md:p-4 bg-gray-100 rounded-full mb-3 md:mb-4">
                            <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-gray-400" />
                        </div>
                        <p className="text-base md:text-lg font-medium text-gray-600">Tidak ada kategori aktif</p>
                        <p className="text-xs md:text-sm text-muted-foreground">Kategori akan muncul di sini setelah dibuat</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {categories.map((category) => {
                        const isExpanded = expandedCategories.has(category.code)
                        const utilization = getUtilizationPercentage(category)

                        return (
                            <Card
                                key={category.code}
                                className={cn(
                                    "group overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1",
                                    getCardGradient(category)
                                )}
                            >
                                <CardHeader className="pb-3 md:pb-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={cn(
                                                    "p-1.5 md:p-2 rounded-lg transition-transform group-hover:scale-110",
                                                    category.type === "INCOME"
                                                        ? "bg-emerald-100 text-emerald-600"
                                                        : "bg-rose-100 text-rose-600"
                                                )}>
                                                    <Wallet2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                                </div>
                                                <Badge
                                                    variant={category.type === "INCOME" ? "default" : "destructive"}
                                                    className="text-[10px] md:text-xs font-medium shadow-sm px-1.5 md:px-2"
                                                >
                                                    {category.type === "INCOME" ? "Pemasukan" : "Pengeluaran"}
                                                </Badge>
                                            </div>
                                            <CardTitle className="text-base md:text-lg font-bold text-gray-800 leading-tight">
                                                {category.name}
                                            </CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 md:space-y-5">
                                    {/* Income and Expense with modern cards */}
                                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                                        <div className="bg-white/60 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-3 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-1 md:gap-1.5 mb-1 md:mb-1.5">
                                                <div className="p-0.5 md:p-1 bg-emerald-100 rounded">
                                                    <ArrowUpRight className="h-2.5 w-2.5 md:h-3 md:w-3 text-emerald-600" />
                                                </div>
                                                <span className="text-[10px] md:text-xs font-medium text-gray-600">Masuk</span>
                                            </div>
                                            <p className="font-bold text-xs md:text-sm text-emerald-600 truncate">
                                                {formatCurrency(category.totalIncome)}
                                            </p>
                                        </div>
                                        <div className="bg-white/60 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-3 border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-1 md:gap-1.5 mb-1 md:mb-1.5">
                                                <div className="p-0.5 md:p-1 bg-rose-100 rounded">
                                                    <ArrowDownRight className="h-2.5 w-2.5 md:h-3 md:w-3 text-rose-600" />
                                                </div>
                                                <span className="text-[10px] md:text-xs font-medium text-gray-600">Keluar</span>
                                            </div>
                                            <p className="font-bold text-xs md:text-sm text-rose-600 truncate">
                                                {formatCurrency(category.totalExpense)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Balance with gradient */}
                                    <div className="relative bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl p-3 md:p-4 border border-gray-100 shadow-md">
                                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/50 to-transparent rounded-xl md:rounded-2xl"></div>
                                        <div className="relative z-10">
                                            <p className="text-[10px] md:text-xs font-medium text-gray-500 mb-1 md:mb-1.5">Saldo Saat Ini</p>
                                            <p className={cn(
                                                "text-2xl md:text-3xl font-black tracking-tight",
                                                getBalanceGradient(category)
                                            )}>
                                                {formatCurrency(category.balance)}
                                            </p>
                                            <div className="flex items-center gap-1 mt-1.5 md:mt-2">
                                                <div className={cn(
                                                    "h-1.5 w-1.5 md:h-2 md:w-2 rounded-full animate-pulse",
                                                    category.balance > 0 ? "bg-emerald-500" : category.balance < 0 ? "bg-rose-500" : "bg-gray-400"
                                                )}></div>
                                                <span className="text-[10px] md:text-xs text-gray-500">
                                                    {category.transactionCount} transaksi
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Utilization Progress */}
                                    {category.type === "INCOME" && category.totalIncome > 0 && (
                                        <div className="space-y-1.5 md:space-y-2 bg-white/40 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-3 border border-gray-100">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] md:text-xs font-medium text-gray-600">Penggunaan Dana</span>
                                                <span className={cn(
                                                    "text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 rounded-full",
                                                    utilization > 80 ? "bg-rose-100 text-rose-700" :
                                                        utilization > 50 ? "bg-amber-100 text-amber-700" :
                                                            "bg-emerald-100 text-emerald-700"
                                                )}>
                                                    {utilization}%
                                                </span>
                                            </div>
                                            <div className="relative">
                                                <Progress
                                                    value={utilization}
                                                    className="h-2 md:h-2.5 bg-gray-200"
                                                />
                                                <div className={cn(
                                                    "absolute inset-0 h-2 md:h-2.5 rounded-full opacity-50 blur-sm",
                                                    utilization > 80 ? "bg-rose-400" :
                                                        utilization > 50 ? "bg-amber-400" :
                                                            "bg-emerald-400"
                                                )} style={{ width: `${utilization}%` }}></div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Transaction History Toggle */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-between hover:bg-white/60 transition-all group/btn h-8 md:h-9"
                                        onClick={() => toggleExpanded(category.code)}
                                    >
                                        <span className="text-[10px] md:text-xs font-medium">
                                            {isExpanded ? "Sembunyikan" : "Lihat"} History
                                        </span>
                                        <div className="flex items-center gap-1.5 md:gap-2">
                                            <Badge variant="outline" className="text-[10px] md:text-xs px-1 md:px-1.5">
                                                {category.transactionCount}
                                            </Badge>
                                            {isExpanded ?
                                                <ChevronUp className="h-3.5 w-3.5 md:h-4 md:w-4 transition-transform group-hover/btn:scale-110" /> :
                                                <ChevronDown className="h-3.5 w-3.5 md:h-4 md:w-4 transition-transform group-hover/btn:scale-110" />
                                            }
                                        </div>
                                    </Button>

                                    {/* Transaction History with animation */}
                                    {isExpanded && (
                                        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg md:rounded-xl p-3 md:p-4 max-h-60 md:max-h-72 overflow-y-auto space-y-2 md:space-y-3 animate-in slide-in-from-top-2 duration-300">
                                            {category.recentTransactions.length === 0 ? (
                                                <div className="text-center py-6 md:py-8">
                                                    <div className="p-2 md:p-3 bg-gray-100 rounded-full inline-block mb-1.5 md:mb-2">
                                                        <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-gray-400" />
                                                    </div>
                                                    <p className="text-[10px] md:text-xs text-muted-foreground">Belum ada transaksi</p>
                                                </div>
                                            ) : (
                                                category.recentTransactions.map((txn, idx) => {
                                                    const runningBalance = category.recentTransactions
                                                        .slice(0, idx + 1)
                                                        .reduce((sum, t) => {
                                                            if (t.transactionType === "INCOME") {
                                                                return sum + t.amount
                                                            } else {
                                                                return sum - t.amount
                                                            }
                                                        }, 0)

                                                    return (
                                                        <div
                                                            key={txn.id}
                                                            className="group/item bg-gradient-to-r from-white to-gray-50 rounded-md md:rounded-lg p-2 md:p-3 border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all duration-200"
                                                        >
                                                            <div className="flex justify-between items-start gap-2 md:gap-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                                                                        <p className="text-[10px] md:text-xs font-semibold text-gray-700">
                                                                            {format(new Date(txn.date), "dd MMM yyyy", { locale: localeId })}
                                                                        </p>
                                                                        <Badge
                                                                            variant={txn.transactionType === "INCOME" ? "default" : "destructive"}
                                                                            className="text-[8px] md:text-[10px] px-1 md:px-1.5 py-0"
                                                                        >
                                                                            {txn.transactionType === "INCOME" ? "IN" : "OUT"}
                                                                        </Badge>
                                                                    </div>
                                                                    {txn.description && (
                                                                        <p className="text-[10px] md:text-xs text-gray-600 truncate mb-0.5">{txn.description}</p>
                                                                    )}
                                                                    {txn.studentName && (
                                                                        <p className="text-[10px] md:text-xs text-gray-500">{txn.studentName}</p>
                                                                    )}
                                                                </div>
                                                                <div className="text-right flex-shrink-0">
                                                                    <p className={cn(
                                                                        "text-xs md:text-sm font-bold mb-0.5 md:mb-1",
                                                                        txn.transactionType === "INCOME" ? "text-emerald-600" : "text-rose-600"
                                                                    )}>
                                                                        {txn.transactionType === "INCOME" ? "+" : "-"}
                                                                        {formatCurrency(txn.amount).replace("Rp", "").trim()}
                                                                    </p>
                                                                    <div className="inline-flex items-center gap-0.5 md:gap-1 bg-gray-100 rounded-full px-1.5 md:px-2 py-0.5">
                                                                        <span className="text-[8px] md:text-[10px] text-gray-500">Saldo:</span>
                                                                        <span className="text-[8px] md:text-[10px] font-semibold text-gray-700">
                                                                            {formatCurrency(runningBalance).replace("Rp", "").trim()}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
            <MobileFloatingAction role="KOMITE" />
            <MobileLogoutButton />
        </div>
    )
}
