import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { BarChart3, BookOpen, Shield, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex flex-col">
      {/* Navbar */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl text-slate-800">יומן הביטחון</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
              כניסה
            </Link>
            <Link href="/register" className={cn(buttonVariants({ variant: "default" }))}>
              הרשמה
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="container mx-auto px-6 py-28 text-center flex-1">
        <Badge className="mb-6 text-sm px-4 py-1" variant="secondary">
          קורס הביטחון בשוק ההון
        </Badge>
        <h1 className="text-5xl font-bold text-slate-900 mb-6 leading-tight">
          יומן המסחר
          <br />
          <span className="text-primary">המקצועי שלך</span>
        </h1>
        <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          עקוב אחר עסקאות הסווינג שלך, נהל את תיק ההשקעות שלך ושפר את ביצועי
          המסחר עם כלים מקצועיים המבוססים על מדדי ביצועים אמיתיים.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/register"
            className={cn(buttonVariants({ size: "lg" }), "px-8 text-base")}
          >
            התחל עכשיו — חינם
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "text-base")}
          >
            כניסה לחשבון
          </Link>
        </div>
      </main>

      {/* Features */}
      <section className="container mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-8 text-center">
              <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">יומן סווינג</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                תיעוד מדויק של כל עסקה עם חישוב אוטומטי של RRR, סיכון ורווח/הפסד
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-8 text-center">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">תיק השקעות</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                ויזואליזציה ברורה של פיזור התיק לפי מגזרים עם תרשים עוגה אינטראקטיבי
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-8 text-center">
              <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">מדדי ביצועים</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Win Rate, Profit Factor ו-Total Risk מחושבים לפי הסטנדרטים המקצועיים
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8 text-center text-sm text-slate-400">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-primary" />
          <span>יומן הביטחון &copy; {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <Link href="/privacy" className="hover:text-slate-600 transition-colors">מדיניות פרטיות</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-slate-600 transition-colors">תנאי שימוש</Link>
        </div>
      </footer>
    </div>
  )
}
