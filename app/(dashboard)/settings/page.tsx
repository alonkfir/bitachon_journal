"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { LogOut, Shield, Info, FileText, Lock } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function SettingsPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      setEmail(data.user?.email ?? null)
    }
    getUser()
  }, [])

  async function handleSignOut() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success("התנתקת בהצלחה")
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">הגדרות</h1>
        <p className="text-slate-500 text-sm mt-1">ניהול החשבון שלך</p>
      </div>

      {/* Account */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            פרטי חשבון
          </CardTitle>
          <CardDescription>המידע המשויך לחשבון שלך</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-600">אימייל</span>
            <span className="text-sm font-medium text-slate-800 dir-ltr">
              {email ?? "טוען..."}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-600">סטטוס חשבון</span>
            <Badge className="bg-emerald-100 text-emerald-700 border-0">פעיל</Badge>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-slate-500" />
            אודות
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>
            <span className="font-semibold">יומן הביטחון</span> — כלי מסחר מקצועי לתלמידי
            קורס הביטחון בשוק ההון.
          </p>
          <div className="rounded-lg bg-slate-50 p-4 space-y-2">
            <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-2">
              פורמולות מתמטיות
            </p>
            <p><span className="font-mono text-xs bg-slate-200 px-1 rounded">R</span> = (מחיר כניסה − סטופ לוס) × כמות</p>
            <p><span className="font-mono text-xs bg-slate-200 px-1 rounded">רווח/הפסד</span> = ((יציאה − כניסה) × כמות) − עמלות</p>
            <p><span className="font-mono text-xs bg-slate-200 px-1 rounded">RRR</span> = (יעד − כניסה) ÷ (כניסה − סטופ)</p>
            <p><span className="font-mono text-xs bg-slate-200 px-1 rounded">Win Rate</span> = עסקאות מוצלחות ÷ עסקאות סגורות × 100</p>
            <p><span className="font-mono text-xs bg-slate-200 px-1 rounded">Profit Factor</span> = סך רווחים ÷ |סך הפסדים|</p>
          </div>
        </CardContent>
      </Card>

      {/* Legal */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-slate-500" />
            מסמכים משפטיים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link
            href="/privacy"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary transition-colors py-1"
          >
            <Lock className="h-4 w-4" />
            מדיניות פרטיות
          </Link>
          <Separator />
          <Link
            href="/terms"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary transition-colors py-1"
          >
            <FileText className="h-4 w-4" />
            תנאי שימוש
          </Link>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Card className="border-0 shadow-sm bg-white border-rose-100">
        <CardHeader>
          <CardTitle className="text-base text-rose-600 flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            יציאה מהחשבון
          </CardTitle>
          <CardDescription>תצא ממכשיר זה</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleSignOut}
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-700"
          >
            {loading ? "מתנתק..." : "התנתקות"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
