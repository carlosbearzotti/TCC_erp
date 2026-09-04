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
import { useAuth, Role } from "@/hooks/useAuth";
import { Can } from "@/components/Can";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  highlight?: boolean;
  roles?: Role[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Pedidos (PDV)", href: "/orders", icon: ClipboardList, roles: ["administrador", "atendente"] },
  { label: "Gestão do Balcão", href: "/gestao", icon: Receipt, roles: ["administrador", "atendente"] },
  { label: "Cozinha (KDS)", href: "/cozinha", icon: ChefHat, roles: ["administrador", "cozinheiro"] },
  { label: "Cardápio / Catálogo", href: "/catalog", icon: UtensilsCrossed, roles: ["administrador"] },
  { label: "Estoque", href: "/inventory", icon: Package, roles: ["administrador", "cozinheiro"] },
  { label: "Equipe & Auditoria", href: "/equipe", icon: Users, roles: ["administrador"] },
  { label: "App do Cliente (Mobile)", href: "/cliente", icon: Smartphone, highlight: true },
  { label: "App do Entregador (Mobile)", href: "/entregador", icon: Bike, highlight: true, roles: ["administrador", "entregador"] },
  { label: "Automação (RPA)", href: "/rpa", icon: Bot, roles: ["administrador"] },
  { label: "Configurações", href: "/settings", icon: Settings, roles: ["administrador"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

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
        {navItems.map(({ label, href, icon: Icon, highlight, roles }) => {
          const isActive = pathname === href;
          const content = (
            <Link
              key={label}
              href={href}
              className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${isActive
                  ? "border-l-4 border-yellow-400 bg-zinc-950 text-yellow-400 font-semibold shadow-inner"
                  : highlight
                    ? "border-l-4 border-transparent text-amber-300 hover:bg-amber-400/10 hover:text-amber-200"
                    : "border-l-4 border-transparent text-zinc-400 hover:bg-zinc-950/60 hover:text-zinc-100"
                }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4 w-4 shrink-0 ${isActive
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

          if (roles && roles.length > 0) {
            return (
              <Can key={label} roles={roles}>
                {content}
              </Can>
            );
          }

          return content;
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

        {user && (
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/80 p-2 px-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-yellow-400 text-xs font-black text-zinc-950 uppercase">
              {user.username.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-semibold text-zinc-200">{user.username}</p>
              <p className="truncate text-[10px] font-medium text-yellow-400 capitalize">{user.role}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs font-semibold text-zinc-400 transition-all hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair da Conta
        </button>
      </div>
    </aside>
  );
}