import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSantriHistory } from "@/actions/santri"
import { getActiveAnnouncements } from "@/actions/announcement"
import { getMyInstallmentData } from "@/actions/santri-spp"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Megaphone, Wallet, History } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export default async function SantriDashboardPage() {
    const { transactions, currentTabungan } = await getSantriHistory()
    const announcements = await getActiveAnnouncements("SANTRI")

    const currentYear = new Date().getFullYear()
    const installmentData = await getMyInstallmentData(currentYear)

    return (
        <div className="space-y-4 md:space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-emerald-900">Dashboard Santri</h1>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Ringkasan</TabsTrigger>
                    <TabsTrigger value="spp">SPP & Cicilan</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-3">
                        <Card className="bg-emerald-50 border-emerald-200">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs md:text-sm font-medium text-emerald-800">Saldo Tabungan Saya</CardTitle>
                                <Wallet className="h-4 w-4 text-emerald-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl md:text-2xl font-bold text-emerald-900">Rp {currentTabungan.toLocaleString('id-ID')}</div>
                            </CardContent>
                        </Card>
                    </div>

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

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base md:text-lg">Riwayat Transaksi Terakhir</CardTitle>
                            <History className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {transactions.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Belum ada riwayat transaksi.</p>
                                ) : (
                                    <div className="overflow-x-auto w-full">
                                        <div className="inline-block min-w-full align-middle">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 text-gray-700 font-medium">
                                                    <tr>
                                                        <th className="p-2 md:p-3 text-xs md:text-sm">Tanggal</th>
                                                        <th className="p-2 md:p-3 text-xs md:text-sm">Jenis</th>
                                                        <th className="p-2 md:p-3 text-xs md:text-sm">Jumlah</th>
                                                        <th className="p-2 md:p-3 text-xs md:text-sm hidden md:table-cell">Keterangan</th>
                                                        <th className="p-2 md:p-3 text-xs md:text-sm hidden lg:table-cell">Pencatat</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {transactions.map((t) => (
                                                        <tr key={t.id} className="hover:bg-gray-50/50">
                                                            <td className="p-2 md:p-3 text-xs md:text-sm">{format(t.date, "dd MMM yyyy", { locale: id })}</td>
                                                            <td className="p-2 md:p-3">
                                                                <Badge variant="outline" className="text-xs">{t.type}</Badge>
                                                            </td>
                                                            <td className="p-2 md:p-3 font-medium text-xs md:text-sm">
                                                                {["PENARIKAN_TABUNGAN"].includes(t.type) ? (
                                                                    <span className="text-red-600">- Rp {t.amount.toLocaleString('id-ID')}</span>
                                                                ) : (
                                                                    <span className="text-green-600">+ Rp {t.amount.toLocaleString('id-ID')}</span>
                                                                )}
                                                            </td>
                                                            <td className="p-2 md:p-3 text-xs md:text-sm text-muted-foreground hidden md:table-cell">{t.description || "-"}</td>
                                                            <td className="p-2 md:p-3 text-xs text-muted-foreground hidden lg:table-cell">
                                                                {t.creator.name} ({t.creator.role})
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="spp">
                    <Card>
                        <CardHeader>
                            <CardTitle>Status Pembayaran SPP Tahun {currentYear}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!installmentData ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    Fitur cicilan SPP belum diaktifkan untuk akun Anda.
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {installmentData.monthlyData.map((month) => (
                                            <Card key={month.month} className={cn(
                                                "border-l-4",
                                                month.status === 'paid' ? "border-l-emerald-500 bg-emerald-50/50" :
                                                    month.status === 'partial' ? "border-l-yellow-500 bg-yellow-50/50" :
                                                        "border-l-red-500 bg-red-50/50"
                                            )}>
                                                <CardContent className="pt-4">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="font-semibold text-lg capitalize">
                                                            {format(new Date(currentYear, month.month, 1), 'MMMM', { locale: id })}
                                                        </h3>
                                                        <Badge variant={
                                                            month.status === 'paid' ? "default" :
                                                                month.status === 'partial' ? "secondary" : "destructive"
                                                        }>
                                                            {month.status === 'paid' ? "Lunas" :
                                                                month.status === 'partial' ? "Sebagian" : "Belum Lunas"}
                                                        </Badge>
                                                    </div>
                                                    <div className="space-y-1 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Tagihan:</span>
                                                            <span>Rp {month.defaultAmount.toLocaleString('id-ID')}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Terbayar:</span>
                                                            <span className="font-medium text-emerald-600">Rp {month.totalPaid.toLocaleString('id-ID')}</span>
                                                        </div>
                                                        <div className="flex justify-between border-t pt-1 mt-1">
                                                            <span className="text-muted-foreground">Sisa:</span>
                                                            <span className="font-bold text-red-600">Rp {month.remaining.toLocaleString('id-ID')}</span>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
