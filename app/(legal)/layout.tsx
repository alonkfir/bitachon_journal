import Link from "next/link"
import { Shield } from "lucide-react"

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold text-slate-800">יומן הביטחון</span>
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
            חזרה לדף הבית
          </Link>
        </div>
      </nav>
      <main className="container mx-auto px-6 py-12 max-w-3xl">
        {children}
      </main>
      <footer className="border-t bg-white py-6 text-center text-sm text-slate-400">
        <div className="flex items-center justify-center gap-4">
          <Link href="/privacy" className="hover:text-slate-600 transition-colors">מדיניות פרטיות</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-slate-600 transition-colors">תנאי שימוש</Link>
        </div>
      </footer>
    </div>
  )
}
