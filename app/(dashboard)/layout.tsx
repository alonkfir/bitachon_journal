import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/AppSidebar"
import { Separator } from "@/components/ui/separator"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      {/*
        AppSidebar must come BEFORE SidebarInset.
        SidebarProvider renders a RTL flex row (right-to-left).
        First child → placed on the RIGHT (where the fixed sidebar lives).
        Second child (SidebarInset, flex-1) → fills the remaining LEFT space.
        Reversing this order causes the content to be covered by the fixed sidebar.
      */}
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="flex h-14 items-center gap-2 border-b bg-white px-4 sticky top-0 z-10">
          <SidebarTrigger className="-mr-1" />
          <Separator orientation="vertical" className="h-5" />
        </header>
        <main className="p-6 bg-slate-50 min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
