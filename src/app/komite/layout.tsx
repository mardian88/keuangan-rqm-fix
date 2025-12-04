import { KomiteSidebar } from "@/components/komite-sidebar"
import { MobileNav } from "@/components/mobile-nav"

export default function KomiteLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            {/* Desktop Sidebar */}
            <div className="w-64 flex-none hidden md:block">
                <KomiteSidebar />
            </div>

            {/* Mobile Header */}
            <MobileNav title="Komite RQM">
                <KomiteSidebar className="min-h-0 h-full border-none" />
            </MobileNav>

            <div className="flex-1 p-4 md:p-8 bg-white overflow-x-hidden">
                {children}
            </div>
        </div>
    )
}
