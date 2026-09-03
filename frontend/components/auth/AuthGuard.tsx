"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"

const PUBLIC_ROUTES = ["/login", "/cliente"]

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if route is public
    const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))

    if (isPublic) {
      setIsAuthenticated(true)
      return
    }

    // Check token in localStorage
    const token = localStorage.getItem("access_token")
    if (!token) {
      setIsAuthenticated(false)
      router.push("/login")
    } else {
      setIsAuthenticated(true)
    }
  }, [pathname, router])

  // While determining auth on protected routes, show subtle loading
  if (isAuthenticated === null) {
    const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
    if (isPublic) {
      return <>{children}</>
    }

    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-yellow-400" />
          <span className="text-xs font-semibold">Carregando ambiente seguro...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated && !PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return null
  }

  return <>{children}</>
}
