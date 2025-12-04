import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { getKomiteStats, getKomiteRecentTransactions } from "@/actions/komite"
import { getActiveAnnouncements } from "@/actions/announcement"
import { Megaphone } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { MobileFloatingAction } from "@/components/mobile-fab"

export default async function KomiteDashboardPage() {
    const stats = await getKomiteStats()
    const announcements = await getActiveAnnouncements("KOMITE")
    const recentTransactions = await getKomiteRecentTransactions()

    return (
        <div className="space-y-4 md:space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-emerald-900">Dashboard Komite</h1>

            <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-3">
                <Card className="bg-emerald-50 border-emerald-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium text-emerald-800">Saldo Aktif (Komite)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl md:text-2xl font-bold text-emerald-900">Rp {stats.currentBalance.toLocaleString('id-ID')}</div>
                        <p className="text-xs text-emerald-700">Dana siap pakai</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">Total Pemasukan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl md:text-2xl font-bold text-green-600">+ Rp {stats.totalIncome.toLocaleString('id-ID')}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">Total Pengeluaran</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl md:text-2xl font-bold text-red-600">- Rp {stats.totalExpense.toLocaleString('id-ID')}</div>
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
                    <div className="overflow-x-auto w-full">
                        <div className="inline-block min-w-full align-middle">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs md:text-sm">Tanggal</TableHead>
                                        <TableHead className="text-xs md:text-sm">Jenis</TableHead>
                                        <TableHead className="text-xs md:text-sm">Jumlah</TableHead>
                                        <TableHead className="text-xs md:text-sm hidden md:table-cell">Keterangan</TableHead>
                                        <TableHead className="text-xs md:text-sm hidden lg:table-cell">Dicatat Oleh</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentTransactions.map((t) => (
                                        <TableRow key={t.id}>
                                            <TableCell className="text-xs md:text-sm">{format(t.date, "dd MMM yyyy", { locale: id })}</TableCell>
                                            <TableCell className="text-xs md:text-sm">
                                                <Badge variant="outline" className="text-xs">{t.type}</Badge>
                                            </TableCell>
                                            <TableCell className="text-xs md:text-sm font-medium">
                                                {(t as any).categoryType === "EXPENSE" ? (
                                                    <span className="text-red-600">- Rp {t.amount.toLocaleString('id-ID')}</span>
                                                ) : (
                                                    <span className="text-green-600">+ Rp {t.amount.toLocaleString('id-ID')}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs md:text-sm text-muted-foreground hidden md:table-cell">{t.description || "-"}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
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
                    </div>
                </CardContent>
            </Card>
            <MobileFloatingAction role="KOMITE" />
        </div>
    )
}
