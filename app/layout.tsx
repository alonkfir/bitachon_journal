import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

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

export const metadata: Metadata = {
  title: "יומן הביטחון | Security Journal",
  description: "כלי המסחר המקצועי לתלמידי קורס הביטחון בשוק ההון",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
    shortcut: "/icon.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={googleSans.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <TooltipProvider>
          {children}
          <Toaster richColors position="bottom-left" />
        </TooltipProvider>
      </body>
    </html>
  )
}
