"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <div className="relative w-full max-w-md text-center">
        {/* Glow de fundo */}
        <div className="absolute -top-12 left-1/2 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-red-500/10 blur-3xl" />

        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 shadow-xl shadow-red-500/10">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <span className="inline-block rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-400">
            Acesso Restrito (403)
          </span>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-zinc-100">
            Permissão Insuficiente
          </h1>

          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            Seu perfil atual (<span className="font-semibold text-yellow-400">{user?.role || "visitante"}</span>)
            não possui as credenciais necessárias para visualizar este recurso ou módulo.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href={user?.role === "cliente" ? "/cliente" : "/"}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 text-xs font-bold text-zinc-950 shadow-lg shadow-yellow-400/20 transition-all hover:bg-yellow-300"
            >
              <Home className="h-4 w-4" />
              <span>Ir para a Página Inicial</span>
            </Link>

            <button
              type="button"
              onClick={logout}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 text-xs font-semibold text-zinc-400 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              <span>Trocar de Conta</span>
            </button>
          </div>

          <div className="mt-6 border-t border-zinc-800/60 pt-4">
            <p className="text-xs text-zinc-500">
              Caso acredite que isto seja um engano, solicite liberação ao administrador do sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
