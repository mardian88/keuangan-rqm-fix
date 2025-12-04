import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TrendingUp, Wallet, CreditCard, Users, ArrowRight } from "lucide-react"
import { getHandoverStats } from "@/actions/handover"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { MobileFloatingAction } from "@/components/mobile-fab"

async function getStats() {
    // Get all transactions
    const transactions = await prisma.transaction.findMany({
        include: {
            student: {
                select: {
                    name: true
                }
            }
        },
        orderBy: {
            date: 'desc'
        }
    })

    // Calculate total income (SPP, KAS, TABUNGAN, PEMASUKAN_LAIN)
    // Also include dynamic income categories if needed, but for now relying on types
    // Ideally we should fetch categories to be sure, but let's stick to the known list + dynamic ones if they match
    const totalIncome = transactions
        .filter(t => ['SPP', 'KAS', 'TABUNGAN', 'PEMASUKAN_LAIN'].includes(t.type) || (t as any).categoryType === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0)

    // Calculate total expenses (PENGELUARAN)
    const totalExpenses = transactions
        .filter(t => t.type === 'PENGELUARAN' || (t as any).categoryType === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0)

    // Calculate balance
    const balance = totalIncome - totalExpenses

    // Get recent transactions (last 10)
    const recentTransactions = transactions.slice(0, 10)

    // Get top 5 students by tabungan balance
    const students = await prisma.user.findMany({
        where: {
            role: 'SANTRI',
            isActive: true
        },
        select: {
            id: true,
            name: true,
            username: true,
            studentTransactions: {
                where: {
                    type: 'TABUNGAN'
                },
                select: {
                    amount: true
                }
            }
        }
    })

    const studentsWithBalance = students.map(student => ({
        id: student.id,
        name: student.name,
        username: student.username,
        balance: student.studentTransactions.reduce((sum, t) => sum + t.amount, 0)
    }))
        .filter(s => s.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 5)

    // Count active students
    const activeStudents = await prisma.user.count({
        where: {
            role: 'SANTRI',
            isActive: true
        }
    })

    // Get handover stats
    const handoverStats = await getHandoverStats()

    return {
        totalIncome,
        totalExpenses,
        balance,
        activeStudents,
        recentTransactions,
        topSavers: studentsWithBalance,
        handoverStats
    }
}

export default async function AdminDashboardPage() {
    const stats = await getStats()

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const getTransactionTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'SPP': 'SPP',
            'KAS': 'Uang Kas',
            'TABUNGAN': 'Tabungan',
            'PEMASUKAN_LAIN': 'Pemasukan Lain',
            'PENGELUARAN': 'Pengeluaran'
        }
        return labels[type] || type
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
        <div className="space-y-4 md:space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard Admin</h1>

            {stats.handoverStats.totalPending > 0 && (
                <Alert className="bg-yellow-50 border-yellow-200 text-yellow-900">
                    <Wallet className="h-4 w-4 text-yellow-600" />
                    <AlertTitle className="ml-2 text-yellow-800">Dana Tertahan: {formatRupiah(stats.handoverStats.totalPending)}</AlertTitle>
                    <AlertDescription className="ml-2 text-yellow-700 flex items-center gap-2">
                        <span>Ada dana yang belum diserahkan ke Komite.</span>
                        <Link href="/admin/handover" className="font-medium underline hover:text-yellow-900 inline-flex items-center">
                            Serahkan Sekarang <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                    </AlertDescription>
                </Alert>
            )}

            {/* Stats Cards */}
            <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">Total Pemasukan</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg md:text-2xl font-bold text-green-600">{formatRupiah(stats.totalIncome)}</div>
                        <p className="text-xs text-muted-foreground hidden md:block">SPP, Kas, Tabungan & Lainnya</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">Total Pengeluaran</CardTitle>
                        <CreditCard className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg md:text-2xl font-bold text-red-600">{formatRupiah(stats.totalExpenses)}</div>
                        <p className="text-xs text-muted-foreground hidden md:block">Semua pengeluaran</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">Saldo</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg md:text-2xl font-bold text-blue-600">{formatRupiah(stats.balance)}</div>
                        <p className="text-xs text-muted-foreground hidden md:block">Pemasukan - Pengeluaran</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">Santri Aktif</CardTitle>
                        <Users className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg md:text-2xl font-bold text-purple-600">{stats.activeStudents}</div>
                        <p className="text-xs text-muted-foreground hidden md:block">Total santri aktif</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Recent Transactions */}
                <Card className="md:col-span-2 lg:col-span-4">
                    <CardHeader>
                        <CardTitle className="text-base md:text-lg">Transaksi Terakhir</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.recentTransactions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Belum ada transaksi.</p>
                        ) : (
                            <div className="overflow-x-auto -mx-4 md:mx-0">
                                <div className="inline-block min-w-full align-middle">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs md:text-sm">Tanggal</TableHead>
                                                <TableHead className="text-xs md:text-sm">Jenis</TableHead>
                                                <TableHead className="text-xs md:text-sm">Santri</TableHead>
                                                <TableHead className="text-right text-xs md:text-sm">Nominal</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {stats.recentTransactions.map((transaction) => (
                                                <TableRow key={transaction.id}>
                                                    <TableCell className="text-xs md:text-sm whitespace-nowrap">
                                                        {format(new Date(transaction.date), 'd MMMM yyyy', { locale: id })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${transaction.type === 'PENGELUARAN'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-green-100 text-green-700'
                                                            }`}>
                                                            {getTransactionTypeLabel(transaction.type)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-xs md:text-sm">
                                                        {transaction.student?.name || '-'}
                                                    </TableCell>
                                                    <TableCell className={`text-right font-medium text-xs md:text-sm whitespace-nowrap ${transaction.type === 'PENGELUARAN' ? 'text-red-600' : 'text-green-600'
                                                        }`}>
                                                        {transaction.type === 'PENGELUARAN' ? '-' : '+'}{formatRupiah(transaction.amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Savers */}
                <Card className="md:col-span-2 lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="text-base md:text-lg">Tabungan Terbanyak</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.topSavers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Belum ada data tabungan.</p>
                        ) : (
                            <div className="space-y-3 md:space-y-4">
                                {stats.topSavers.map((student, index) => (
                                    <div key={student.id} className="flex items-center gap-2 md:gap-4">
                                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                                            <div className={`flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full font-bold text-xs md:text-sm flex-shrink-0 ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                index === 1 ? 'bg-gray-100 text-gray-700' :
                                                    index === 2 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-blue-100 text-blue-700'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <Avatar className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0">
                                                <AvatarFallback className="bg-primary/10 text-primary text-xs md:text-sm">
                                                    {getInitials(student.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs md:text-sm font-medium truncate">{student.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{student.username}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xs md:text-sm font-bold text-green-600 whitespace-nowrap">
                                                {formatRupiah(student.balance)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <MobileFloatingAction role="ADMIN" />
        </div>
    )
}
