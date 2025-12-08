import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { getKomiteStats, getKomiteMonthlyStats, getKomiteRecentTransactions } from "@/actions/komite"
import { getActiveAnnouncements } from "@/actions/announcement"
import { Megaphone, TrendingUp, TrendingDown, FileText } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { MobileFloatingAction } from "@/components/mobile-fab"
import { MobileLogoutButton } from "@/components/mobile-logout"

export default async function KomiteDashboardPage() {
    const stats = await getKomiteStats()
    const monthlyStats = await getKomiteMonthlyStats()
    const announcements = await getActiveAnnouncements("KOMITE")
    const recentTransactions = await getKomiteRecentTransactions()
    const user = await getServerSession(authOptions)

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-emerald-900">
                        Assalamu'alaikum, {user?.user?.name?.split(' ')[0]} 👋
                    </h1>
                    <p className="text-muted-foreground">Dashboard Komite & Laporan Keuangan</p>
                </div>
                <Link href="/komite/reports" className="w-full md:w-auto">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-md w-full md:w-auto">
                        <FileText className="mr-2 h-4 w-4" />
                        Lihat Laporan Lengkap
                    </Button>
                </Link>
            </div>

            <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-emerald-50 border-emerald-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium text-emerald-800">Saldo Operasional</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl md:text-2xl font-bold text-emerald-900">Rp {stats.operationalBalance.toLocaleString('id-ID')}</div>
                        <p className="text-xs text-emerald-700">Kas + Pemasukan Lainnya (Non-SPP, Non-Tabungan)</p>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium text-blue-800">Saldo Tabungan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl md:text-2xl font-bold text-blue-900">Rp {stats.savingsBalance.toLocaleString('id-ID')}</div>
                        <p className="text-xs text-blue-700">Dana titipan santri</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">Pemasukan Bulan Ini</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <div className="text-xl md:text-2xl font-bold text-green-600">+ Rp {monthlyStats.current.totalIncome.toLocaleString('id-ID')}</div>
                            {monthlyStats.percentageChange.income !== 0 && (
                                <div className={`text-xs font-medium flex items-center gap-0.5 ${monthlyStats.percentageChange.income > 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {monthlyStats.percentageChange.income > 0 ? (
                                        <TrendingUp className="h-3 w-3" />
                                    ) : (
                                        <TrendingDown className="h-3 w-3" />
                                    )}
                                    {Math.abs(monthlyStats.percentageChange.income)}%
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">vs bulan lalu</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">Pengeluaran Bulan Ini</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <div className="text-xl md:text-2xl font-bold text-red-600">- Rp {monthlyStats.current.totalExpense.toLocaleString('id-ID')}</div>
                            {monthlyStats.percentageChange.expense !== 0 && (
                                <div className={`text-xs font-medium flex items-center gap-0.5 ${monthlyStats.percentageChange.expense > 0 ? 'text-red-600' : 'text-green-600'
                                    }`}>
                                    {monthlyStats.percentageChange.expense > 0 ? (
                                        <TrendingUp className="h-3 w-3" />
                                    ) : (
                                        <TrendingDown className="h-3 w-3" />
                                    )}
                                    {Math.abs(monthlyStats.percentageChange.expense)}%
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">vs bulan lalu</p>
                    </CardContent>
                </Card>
            </div>

            {stats.pendingAtAdmin > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 md:p-4 rounded-r">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            {/* Icon could go here */}
                        </div>
                        <div className="ml-3">
                            <p className="text-xs md:text-sm text-yellow-700">
                                <span className="font-bold">Info:</span> Terdapat dana sebesar <span className="font-bold">Rp {stats.pendingAtAdmin.toLocaleString('id-ID')}</span> yang masih berada di tangan Admin dan belum diserahkan.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Announcements Section */}
            {announcements.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-emerald-600" />
                        <h2 className="text-lg md:text-xl font-semibold text-emerald-900">Pengumuman</h2>
                    </div>
                    <div className="grid gap-3 md:gap-4">
                        {announcements.map((announcement: any) => (
                            <Card key={announcement.id} className="border-l-4 border-l-emerald-500">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <CardTitle className="text-base md:text-lg">{announcement.title}</CardTitle>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {format(new Date(announcement.createdAt), "d MMM yyyy", { locale: id })}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{announcement.content}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Transactions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base md:text-lg">Transaksi Terbaru</CardTitle>
                    <CardDescription>15 transaksi terakhir</CardDescription>
                </CardHeader>
                <CardContent>
                    <>
                        {/* Mobile View (Cards) */}
                        <div className="md:hidden space-y-4">
                            {recentTransactions.slice(0, 5).map((t) => (
                                <div key={t.id} className="flex items-center justify-between p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className={`flex h-9 w-9 items-center justify-center rounded-full border ${(t as any).categoryType === "EXPENSE"
                                            ? 'bg-red-100 border-red-200'
                                            : 'bg-emerald-100 border-emerald-200'
                                            }`}>
                                            {(t as any).categoryType === "EXPENSE" ? (
                                                <TrendingDown className="h-5 w-5 text-red-600" />
                                            ) : (
                                                <TrendingUp className="h-5 w-5 text-emerald-600" />
                                            )}
                                        </div>
                                        <div className="grid gap-1">
                                            <p className="text-sm font-medium leading-none">
                                                {t.type}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(t.date, "dd MMM yyyy", { locale: id })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`text-sm font-bold ${(t as any).categoryType === "EXPENSE" ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {(t as any).categoryType === "EXPENSE" ? '-' : '+'} Rp {t.amount.toLocaleString('id-ID')}
                                    </div>
                                </div>
                            ))}
                            {recentTransactions.length === 0 && (
                                <div className="text-center text-muted-foreground text-sm py-8">
                                    Belum ada transaksi
                                </div>
                            )}
                        </div>

                        {/* Desktop View (Table) */}
                        <div className="hidden md:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Jenis</TableHead>
                                        <TableHead>Jumlah</TableHead>
                                        <TableHead>Keterangan</TableHead>
                                        <TableHead>Dicatat Oleh</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentTransactions.map((t) => (
                                        <TableRow key={t.id}>
                                            <TableCell>{format(t.date, "dd MMM yyyy", { locale: id })}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{t.type}</Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {(t as any).categoryType === "EXPENSE" ? (
                                                    <span className="text-red-600">- Rp {t.amount.toLocaleString('id-ID')}</span>
                                                ) : (
                                                    <span className="text-green-600">+ Rp {t.amount.toLocaleString('id-ID')}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{t.description || "-"}</TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {t.creator.name} ({t.creator.role})
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {recentTransactions.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                                                Belum ada transaksi
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                </CardContent>
            </Card>
            <MobileFloatingAction role="KOMITE" />
            <MobileLogoutButton />
        </div>
    )
}
