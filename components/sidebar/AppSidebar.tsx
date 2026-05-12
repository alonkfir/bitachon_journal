"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { BookOpen, BarChart3, Settings, LogOut } from "lucide-react"
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

      {/* ── Brand header ── */}
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-3 min-w-0 px-1">
          {/* Logo mark with brand yellow */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ backgroundColor: "#ffe26f" }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path
                d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2z"
                fill="currentColor"
                className="text-slate-900"
              />
            </svg>
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="font-bold text-slate-900 dark:text-slate-100 text-[15px] leading-tight truncate">
              יומן הביטחון
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 leading-tight mt-0.5">
              מסחר חכם
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* ── Navigation ── */}
      <SidebarContent className="px-2 py-3">
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
