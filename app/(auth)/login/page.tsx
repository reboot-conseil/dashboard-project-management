"use client"

import { Suspense, useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

function LoginForm() {
  const searchParams = useSearchParams()
  const raw = searchParams.get("callbackUrl") ?? "/"
  const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      setError("Email ou mot de passe incorrect.")
    } else {
      // Set default dashboard view based on role
      try {
        const session = await getSession()
        const role = session?.user?.role
        if (role === "CONSULTANT") {
          localStorage.setItem("dashboard-active-view", JSON.stringify("consultants"))
        } else if (role === "ADMIN") {
          localStorage.setItem("dashboard-active-view", JSON.stringify("strategique"))
        } else {
          localStorage.setItem("dashboard-active-view", JSON.stringify("operationnel"))
        }
      } catch (_) { /* ignore */ }
      window.location.href = callbackUrl
    }
  }

  async function handleMicrosoft() {
    await signIn("microsoft-entra-id", { callbackUrl: callbackUrl })
  }

  return (
    <>
      {/* Bouton Microsoft SSO */}
      <button
        type="button"
        onClick={handleMicrosoft}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm font-medium text-foreground"
      >
        <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
          <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
          <rect x="12" y="1" width="10" height="10" fill="#7FBA00"/>
          <rect x="1" y="12" width="10" height="10" fill="#00A4EF"/>
          <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
        </svg>
        Se connecter avec Microsoft
      </button>

      {/* Séparateur */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs text-muted-foreground">
          <span className="px-3 bg-card">ou</span>
        </div>
      </div>

    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@entreprise.com" required autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Se connecter
      </Button>
    </form>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">PM Dashboard</CardTitle>
          <CardDescription>Connectez-vous pour accéder à votre espace</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-40 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
