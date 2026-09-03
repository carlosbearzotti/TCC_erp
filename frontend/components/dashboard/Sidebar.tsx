"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Package,
  Smartphone,
  Bot,
  Settings,
  ChefHat,
  Zap,
  LogOut,
  Receipt,
  Users,
  Bike,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Pedidos (PDV)", href: "/orders", icon: ClipboardList },
  { label: "Gestão do Balcão", href: "/gestao", icon: Receipt },
  { label: "Cozinha (KDS)", href: "/cozinha", icon: ChefHat },
  { label: "Cardápio / Catálogo", href: "/catalog", icon: UtensilsCrossed },
  { label: "Estoque", href: "/inventory", icon: Package },
  { label: "Equipe & Auditoria", href: "/equipe", icon: Users },
  { label: "App do Cliente (Mobile)", href: "/cliente", icon: Smartphone, highlight: true },
  { label: "App do Entregador", href: "/entregador", icon: Bike, highlight: true },
  { label: "Automação (RPA)", href: "/rpa", icon: Bot },
  { label: "Configurações", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return null;
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-zinc-800/60 bg-zinc-900">
      <div className="flex items-center gap-3 border-b border-zinc-800/60 px-5 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-zinc-950 shadow-lg shadow-yellow-400/20">
          <ChefHat className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight text-yellow-400">
            Lanchonete
          </p>
          <p className="text-xs font-medium text-zinc-400">& Pastelaria</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ label, href, icon: Icon, highlight }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "border-l-4 border-yellow-400 bg-zinc-950 text-yellow-400 font-semibold shadow-inner"
                  : highlight
                  ? "border-l-4 border-transparent text-amber-300 hover:bg-amber-400/10 hover:text-amber-200"
                  : "border-l-4 border-transparent text-zinc-400 hover:bg-zinc-950/60 hover:text-zinc-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive
                      ? "text-yellow-400"
                      : highlight
                      ? "text-amber-400"
                      : "text-zinc-500 transition-colors group-hover:text-zinc-300"
                  }`}
                />
                <span>{label}</span>
              </div>
              {highlight && (
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  App
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800/60 p-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Status do RPA
            </p>
            <Zap className="h-4 w-4 text-yellow-400" />
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
            </span>
            <span className="text-sm font-semibold text-green-400">Ativo & Operacional</span>
          </div>

          <dl className="mt-2.5 space-y-1 text-xs">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Última execução</dt>
              <dd className="text-zinc-300 font-medium">Hoje às 10:15</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Próxima execução</dt>
              <dd className="text-zinc-300 font-medium">Hoje às 10:45</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => alert("Robô RPA disparado com sucesso! Sincronizando notas e pedidos...")}
            className="mt-3 w-full rounded-xl border border-yellow-400/60 bg-yellow-400/10 px-3 py-2 text-xs font-semibold text-yellow-400 transition-all hover:bg-yellow-400 hover:text-zinc-950 hover:shadow-lg hover:shadow-yellow-400/20"
          >
            Executar RPA agora
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              localStorage.removeItem("access_token");
              localStorage.removeItem("refresh_token");
              window.location.href = "/login";
            }
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-xs font-semibold text-zinc-400 transition-all hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair da Conta
        </button>
      </div>
    </aside>
  );
}