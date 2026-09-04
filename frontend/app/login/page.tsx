"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { ChefHat, Lock, User, ArrowRight, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"

import { useAuth } from "@/hooks/useAuth"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setErrorMessage("Preencha usuário e senha.")
      return
    }

    setLoading(true)
    setErrorMessage("")

    try {
      const result = await login(username.trim(), password.trim())
      if (result.success) {
        router.push("/")
      } else {
        setErrorMessage(result.error || "Credenciais inválidas. Verifique seu usuário e senha.")
      }
    } catch (err: any) {
      console.error("Falha de autenticação:", err)
      setErrorMessage("Erro ao conectar ao servidor de autenticação.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 px-4 py-12 text-zinc-100">
      <div className="relative w-full max-w-md">
        {/* Glow effect behind form */}
        <div className="absolute -top-10 left-1/2 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-yellow-400/10 blur-3xl" />

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-xl">
          {/* Logo and Header */}
          <div className="flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-zinc-950 shadow-xl shadow-yellow-400/20 mb-4">
              <ChefHat className="h-8 w-8" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-zinc-50">
              Lanchonete &amp; Pastelaria
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              ERP de Gestão, PDV, KDS e Automação
            </p>
          </div>

          {errorMessage && (
            <div className="mt-6 flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
                Usuário ou E-mail
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  required
                  autoFocus
                  placeholder="Ex: admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 pl-10 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-10 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-yellow-400"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-6 h-12 w-full rounded-2xl bg-yellow-400 text-sm font-black text-zinc-950 shadow-lg shadow-yellow-400/20 hover:bg-yellow-300 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Validando Acesso...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>

          {/* Helper credential notice */}
          <div className="mt-6 border-t border-zinc-800/80 pt-4 text-center">
            <p className="text-[11px] text-zinc-500">
              Ambiente Seguro. Acesso inicial: <span className="font-mono text-zinc-300 font-bold">admin</span> / <span className="font-mono text-zinc-300 font-bold">admin</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
