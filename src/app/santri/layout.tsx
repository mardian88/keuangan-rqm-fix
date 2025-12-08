import { SantriSidebar } from "@/components/santri-sidebar"
import { MobileNav } from "@/components/mobile-nav"

export default function SantriLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            {/* Desktop Sidebar */}
            <div className="w-64 flex-none hidden md:block">
                <SantriSidebar />
            </div>

            {/* Mobile Header */}
            <MobileNav title="Santri RQM">
                <SantriSidebar className="min-h-0 h-full border-none" />
            </MobileNav>

            <div className="flex-1 p-4 md:p-8 bg-white overflow-x-hidden pb-20 md:pb-8">
                {children}
            </div>
        </div>
    )
}
