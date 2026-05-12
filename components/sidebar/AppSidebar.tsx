"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { BookOpen, BarChart3, Settings, LogOut, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/client"
import { ThemeToggle } from "./ThemeToggle"

const navItems = [
  { label: "יומן סווינג", href: "/swing", icon: BookOpen },
  { label: "תיק השקעות", href: "/portfolio", icon: BarChart3 },
  { label: "הגדרות", href: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success("התנתקת בהצלחה")
    router.push("/login")
    router.refresh()
  }

  return (
    <Sidebar side="right" collapsible="icon">

      {/* ── Branding ── */}
      <SidebarHeader className="px-3 pt-5 pb-3">
        <div className="flex items-center gap-3 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full shrink-0"
            style={{
              backgroundColor: "rgba(255,226,111,0.15)",
              border: "1.5px solid rgba(255,226,111,0.45)",
            }}
          >
            <ShieldCheck className="h-[18px] w-[18px]" style={{ color: "#ffe26f" }} />
          </div>
          <div className="overflow-hidden group-data-[collapsible=icon]:hidden">
            <p className="font-bold text-[14px] leading-tight text-slate-900 dark:text-white truncate">
              ביטחון בשוק ההון
            </p>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight tracking-wide">
              סווינג מומנטום
            </p>
          </div>
        </div>
        <SidebarSeparator className="mt-4 group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent className="px-2 py-2">
        <SidebarMenu className="gap-0.5">
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                render={<Link href={item.href} />}
                isActive={pathname === item.href}
                tooltip={item.label}
                size="lg"
                className="rounded-xl font-semibold gap-3 text-[15px] text-slate-700 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      {/* ── Footer: theme toggle + sign out ── */}
      <SidebarFooter className="px-2 py-3 gap-1">
        <SidebarSeparator className="mb-2" />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Sign out */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="התנתקות"
              className="rounded-xl font-medium text-slate-500 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/70 dark:hover:bg-rose-950/30 gap-3"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              <span>התנתקות</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

    </Sidebar>
  )
}
