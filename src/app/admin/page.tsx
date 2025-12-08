import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { supabaseAdmin } from "@/lib/db"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    CreditCard,
    Users,
    ArrowRight,
    LayoutDashboard,
    PlusCircle,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    Search
} from "lucide-react"
import { getHandoverStats } from "@/actions/handover"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { MobileFloatingAction } from "@/components/mobile-fab"
import { MobileLogoutButton } from "@/components/mobile-logout"
import { Button } from "@/components/ui/button"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

async function getStats() {
    // Get all categories for mapping
    const { data: categories } = await supabaseAdmin
        .from('TransactionCategory')
        .select('*')

    const categoryMap = new Map(categories?.map(c => [c.code, c]))

    // Get all transactions created by ADMIN only (not handed over)
    // OR transactions that are still pending handover
    const { data: transactions } = await supabaseAdmin
        .from('Transaction')
        .select(`
            *,
            creator:creatorId (
                name,
                role
            ),
            student:studentId (
                name
            )
        `)
        .order('date', { ascending: false })

    // Filter to only include Admin's transactions
    const adminTransactions = transactions?.filter((t: any) => {
        // Only transactions created by ADMIN
        if (t.creator?.role !== 'ADMIN') return false

        // For income that can be handed over (Kas, Tabungan), only count if not completed
        const category = categoryMap.get(t.type)
        const catName = category?.name?.toLowerCase() || ''
        const isKas = t.type === 'KAS' || t.type === 'UANG_KAS' || catName.includes('kas')
        const isTabungan = t.type === 'TABUNGAN' || catName.includes('tabungan')

        // If it's Kas or Tabungan and already handed over, don't count it
        if ((isKas || isTabungan) && t.handoverStatus === 'COMPLETED') {
            return false
        }

        return true
    }) || []

    // Balance Breakdown
    let balanceSPP = 0
    let balanceTabungan = 0 // Pending only
    let balanceKas = 0      // Pending only
    let balanceOthers = 0
    let totalExpenses = 0

    adminTransactions?.forEach((t: any) => {
        // Enrich with category data
        const category = categoryMap.get(t.type)
        const type = t.type
        const catName = category?.name?.toLowerCase() || ''
        const catType = category?.type || t.categoryType
        const handoverStatus = t.handoverStatus

        // Normalization for matching
        const isSPP = type === 'SPP' || type === 'CICILAN_SPP' || catName.includes('spp')
        const isTabungan = type === 'TABUNGAN' || catName.includes('tabungan')
        const isKas = type === 'KAS' || type === 'UANG_KAS' || catName.includes('uang kas') || catName.includes('kas')

        // Determine main type
        const isExpense = type === 'PENGELUARAN' || catType === 'EXPENSE'
        const isIncome = isSPP || isTabungan || isKas || type === 'PEMASUKAN_LAIN' || catType === 'INCOME'

        if (isExpense) {
            totalExpenses += t.amount
        } else if (isIncome) {
            // 1. SPP (Accumulative - Admin manages SPP)
            if (isSPP) {
                balanceSPP += t.amount
            }
            // 2. Tabungan (Only Pending - already filtered above)
            else if (isTabungan) {
                balanceTabungan += t.amount
            }
            // 3. Uang Kas (Only Pending - already filtered above)
            else if (isKas) {
                balanceKas += t.amount
            }
            // 4. Others (Only Admin's, not handed over)
            else {
                balanceOthers += t.amount
            }
        }
    })

    // Total Real Balance (Admin Hand) = SPP + Others + Tabungan(Pending) + Kas(Pending) - Expenses
    // Operational Balance = SPP + Others - Expenses (Real Money owned)
    const operationalBalance = (balanceSPP + balanceOthers) - totalExpenses
    const totalCashOnHand = operationalBalance + balanceTabungan + balanceKas

    // Get recent transactions (last 10) from Admin only
    const recentTransactions = adminTransactions?.slice(0, 10).map((t: any) => {
        const category = categoryMap.get(t.type)
        const type = t.type
        const catName = category?.name?.toLowerCase() || ''
        const isTarget = type === 'TABUNGAN' || type === 'KAS' || type === 'UANG_KAS' || catName.includes('tabungan') || catName.includes('kas')

        return {
            ...t,
            categoryName: category?.name || t.type,
            isHandovered: isTarget && t.handoverStatus === 'COMPLETED'
        }
    }) || []

    // Get all students with their tabungan transactions
    const { data: students } = await supabaseAdmin
        .from('User')
        .select('id, name, username')
        .eq('role', 'SANTRI')
        .eq('isActive', true)

    // Get all tabungan transactions
    const { data: tabunganTransactions } = await supabaseAdmin
        .from('Transaction')
        .select('studentId, amount')
        .eq('type', 'TABUNGAN')

    // Group by student
    const tabunganByStudent = new Map<string, number>()
    tabunganTransactions?.forEach((t: any) => {
        tabunganByStudent.set(t.studentId, (tabunganByStudent.get(t.studentId) || 0) + t.amount)
    })

    const studentsWithBalance = students
        ?.map((student: any) => ({
            id: student.id,
            name: student.name,
            username: student.username,
            balance: tabunganByStudent.get(student.id) || 0
        }))
        .filter((s: any) => s.balance > 0)
        .sort((a: any, b: any) => b.balance - a.balance)
        .slice(0, 5) || []

    // Count active students
    const { count: activeStudents } = await supabaseAdmin
        .from('User')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'SANTRI')
        .eq('isActive', true)

    // Get handover stats
    const handoverStats = await getHandoverStats()

    return {
        balanceSPP,
        balanceTabungan,
        balanceKas,
        balanceOthers,
        totalExpenses,
        operationalBalance,
        totalCashOnHand,
        activeStudents: activeStudents || 0,
        recentTransactions,
        topSavers: studentsWithBalance,
        handoverStats
    }
}

export default async function AdminDashboardPage() {
    const stats = await getStats()
    const session = await getServerSession(authOptions)

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    return (
        <div className="space-y-6 md:space-y-8 pb-20 md:pb-0">
            {/* 1. Header & Greeting */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                        Assalamu'alaikum, {session?.user?.name?.split(' ')[0] || 'Admin'} 👋
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Selamat datang kembali di Dashboard Admin RQM.
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="text-right hidden md:block mr-2">
                        <p className="text-xs text-muted-foreground">Tanggal Hari Ini</p>
                        <p className="font-medium text-sm">{format(new Date(), "d MMMM yyyy", { locale: id })}</p>
                    </div>
                </div>
            </div>

            {/* 2. Alert Dana Tertahan (Refined) */}
            {stats.handoverStats.totalPending > 0 && (
                <Alert className="bg-amber-50 border-amber-200 text-amber-900 shadow-sm">
                    <Wallet className="h-5 w-5 text-amber-600" />
                    <AlertTitle className="ml-2 text-base font-semibold text-amber-800">Perhatian: Dana Tertahan</AlertTitle>
                    <AlertDescription className="ml-2 text-amber-700 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-1">
                        <span>Terdapat dana sebesar <span className="font-bold">{formatRupiah(stats.handoverStats.totalPending)}</span> yang belum diserahkan ke Komite.</span>
                        <Link href="/admin/handover">
                            <Button size="sm" variant="outline" className="bg-white/50 border-amber-300 hover:bg-white hover:text-amber-900 text-xs h-8">
                                Serahkan Sekarang <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                        </Link>
                    </AlertDescription>
                </Alert>
            )}

            {/* 3. Quick Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <Link href="/admin/transactions" className="group">
                    <Card className="hover:shadow-md transition-all cursor-pointer border-slate-200 h-full">
                        <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                            <div className="p-3 rounded-full bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <PlusCircle className="h-6 w-6" />
                            </div>
                            <span className="font-medium text-sm text-slate-700">Input Transaksi</span>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/admin/laporan-transaksi" className="group">
                    <Card className="hover:shadow-md transition-all cursor-pointer border-slate-200 h-full">
                        <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                            <div className="p-3 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <FileText className="h-6 w-6" />
                            </div>
                            <span className="font-medium text-sm text-slate-700">Laporan</span>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/admin/santri" className="group">
                    <Card className="hover:shadow-md transition-all cursor-pointer border-slate-200 h-full">
                        <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                            <div className="p-3 rounded-full bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Users className="h-6 w-6" />
                            </div>
                            <span className="font-medium text-sm text-slate-700">Data Santri</span>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/admin/expenditure" className="group">
                    <Card className="hover:shadow-md transition-all cursor-pointer border-slate-200 h-full">
                        <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                            <div className="p-3 rounded-full bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                <CreditCard className="h-6 w-6" />
                            </div>
                            <span className="font-medium text-sm text-slate-700">Pengeluaran</span>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* 4. Stats Cards (Gradient Style) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

                {/* Saldo Real (Operational) - Highlighted */}
                <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 border-none text-white shadow-lg relative overflow-hidden md:col-span-2 lg:col-span-1 xl:col-span-1">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wallet className="h-32 w-32" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium text-indigo-100">Saldo Operasional (Real)</CardTitle>
                        <Wallet className="h-4 w-4 text-indigo-200" />
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl md:text-3xl font-bold">{formatRupiah(stats.operationalBalance)}</div>
                        <p className="text-xs text-indigo-100 mt-1">Milik Lembaga (Setelah Pengeluaran)</p>
                    </CardContent>
                </Card>

                {/* Total SPP */}
                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-none text-white shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <TrendingUp className="h-24 w-24" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium text-emerald-100">Total Pemasukan SPP</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-emerald-200" />
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold">{formatRupiah(stats.balanceSPP)}</div>
                        <p className="text-xs text-emerald-100 mt-1">Akumulasi</p>
                    </CardContent>
                </Card>

                {/* Tabungan (Pending) */}
                <Card className="bg-white border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 group-hover:text-blue-600">Tabungan (Pending)</CardTitle>
                        <div className="bg-blue-100 p-1.5 rounded-full">
                            <Wallet className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 group-hover:text-blue-700">{formatRupiah(stats.balanceTabungan)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Belum diserahkan ke Komite</p>
                    </CardContent>
                </Card>

                {/* Uang Kas (Pending) */}
                <Card className="bg-white border-slate-200 shadow-sm relative overflow-hidden group hover:border-orange-300 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 group-hover:text-orange-600">Uang Kas (Pending)</CardTitle>
                        <div className="bg-orange-100 p-1.5 rounded-full">
                            <Wallet className="h-4 w-4 text-orange-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 group-hover:text-orange-700">{formatRupiah(stats.balanceKas)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Belum diserahkan ke Komite</p>
                    </CardContent>
                </Card>

                {/* Pengeluaran */}
                <Card className="bg-white border-slate-200 shadow-sm relative overflow-hidden group hover:border-red-300 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 group-hover:text-red-600">Total Pengeluaran</CardTitle>
                        <div className="bg-red-100 p-1.5 rounded-full">
                            <CreditCard className="h-4 w-4 text-red-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 group-hover:text-red-700">{formatRupiah(stats.totalExpenses)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total tercatat</p>
                    </CardContent>
                </Card>

                {/* Saldo Lainnya */}
                <Card className="bg-white border-slate-200 shadow-sm relative overflow-hidden group hover:border-gray-300 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 group-hover:text-gray-600">Pemasukan Lain</CardTitle>
                        <div className="bg-gray-100 p-1.5 rounded-full">
                            <TrendingUp className="h-4 w-4 text-gray-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 group-hover:text-gray-700">{formatRupiah(stats.balanceOthers)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Donasi, Hibah, dll</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Recent Transactions List */}
                <Card className="md:col-span-2 lg:col-span-4 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Transaksi Terakhir</CardTitle>
                            <CardDescription>Aktivitas keuangan terbaru</CardDescription>
                        </div>
                        <Link href="/admin/transactions" className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                            Lihat Semua
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {stats.recentTransactions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <LayoutDashboard className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p>Belum ada transaksi</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {stats.recentTransactions.map((transaction) => {
                                    const handovered = transaction.isHandovered
                                    const isExpense = transaction.type === 'PENGELUARAN'

                                    return (
                                        <div key={transaction.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                                <div className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full ${isExpense ? 'bg-red-100' : handovered ? 'bg-purple-100' : 'bg-emerald-100'
                                                    }`}>
                                                    {isExpense ? (
                                                        <TrendingDown className={`h-5 w-5 ${isExpense ? 'text-red-600' : ''}`} />
                                                    ) : (
                                                        <TrendingUp className={`h-5 w-5 ${handovered ? 'text-purple-600' : 'text-emerald-600'}`} />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                                        {isExpense ? 'Pengeluaran' : transaction.categoryName}
                                                        {handovered && <span className="text-xs font-normal text-purple-600 ml-1 bg-purple-50 px-1.5 py-0.5 rounded-full">Handovered</span>}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {transaction.student?.name || '-'} • {format(new Date(transaction.date), 'd MMM', { locale: id })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`text-sm font-bold flex-shrink-0 ${isExpense ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {isExpense ? '-' : '+'}{formatRupiah(transaction.amount)}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Savers Leaderboard */}
                <Card className="md:col-span-2 lg:col-span-3 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Top Tabungan</CardTitle>
                        <CardDescription>Santri dengan saldo tertinggi</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.topSavers.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p>Belum ada data tabungan</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {stats.topSavers.map((student, index) => (
                                    <div key={student.id} className="flex items-center gap-3">
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm flex-shrink-0 ${index === 0 ? 'bg-yellow-100 text-yellow-700 ring-4 ring-yellow-50' :
                                            index === 1 ? 'bg-slate-200 text-slate-700' :
                                                index === 2 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-slate-100 text-slate-600'
                                            }`}>
                                            {index + 1}
                                        </div>
                                        <Avatar className="h-9 w-9 border border-slate-200">
                                            <AvatarFallback className="bg-slate-50 text-slate-600 text-xs">
                                                {getInitials(student.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">{student.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{student.username}</p>
                                        </div>
                                        <div className="text-sm font-bold text-emerald-600">
                                            {formatRupiah(student.balance)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <MobileFloatingAction role="ADMIN" />
            <MobileLogoutButton />
        </div>
    )
}
