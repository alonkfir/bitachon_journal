import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration"
import { ThemeProvider } from "@/components/providers/ThemeProvider"

const googleSans = localFont({
  src: [
    {
      path: "../public/fonts/GoogleSans-Variable.ttf",
      style: "normal",
      weight: "100 900",
    },
    {
      path: "../public/fonts/GoogleSans-Variable-Italic.ttf",
      style: "italic",
      weight: "100 900",
    },
  ],
  variable: "--font-google-sans",
  display: "swap",
  preload: true,
})

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: "יומן הביטחון | Security Journal",
  description: "כלי המסחר המקצועי לתלמידי קורס הביטחון בשוק ההון",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ביטחון",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={googleSans.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <ServiceWorkerRegistration />
          <TooltipProvider>
            {children}
            <Toaster richColors position="bottom-left" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
