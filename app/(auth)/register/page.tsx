"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Shield } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      toast.error("הסיסמה חייבת להכיל לפחות 6 תווים")
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error, data } = await supabase.auth.signUp({ email, password })
    if (error) {
      toast.error("שגיאה בהרשמה: " + error.message)
    } else if (data.session) {
      router.push("/swing")
      router.refresh()
    } else {
      toast.success("נרשמת בהצלחה! בדוק את האימייל שלך לאישור החשבון.")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-slate-800">יומן הביטחון</span>
          </div>
          <p className="text-slate-500 text-sm">יצירת חשבון חדש</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">הרשמה</CardTitle>
            <CardDescription>צור חשבון חינמי ותתחיל לעקוב אחר המסחר שלך</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">סיסמה</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="לפחות 6 תווים"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? "נרשם..." : "יצירת חשבון"}
              </Button>
            </form>
            <p className="mt-5 text-center text-sm text-slate-500">
              כבר יש לך חשבון?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                כניסה
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
