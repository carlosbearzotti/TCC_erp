"use client";

import { useEffect, useState } from "react";
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
  ShieldCheck,
  DollarSign,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth, Role } from "@/hooks/useAuth";
import { Can } from "@/components/Can";
import api from "@/services/api";
import { useRpaStatus, formatRun } from "@/hooks/useRpaStatus";
import { useBranding } from "@/hooks/useBranding";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  highlight?: boolean;
  roles?: Role[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["administrador"] },
  { label: "Pedidos (PDV)", href: "/orders", icon: ClipboardList, roles: ["administrador", "atendente"] },
  { label: "Gestão do Balcão", href: "/gestao", icon: Receipt, roles: ["administrador", "atendente"] },
  { label: "Financeiro", href: "/finance", icon: DollarSign, roles: ["administrador"] },
  { label: "Cozinha (KDS)", href: "/cozinha", icon: ChefHat, roles: ["administrador", "cozinheiro"] },
  { label: "Cardápio / Catálogo", href: "/catalog", icon: UtensilsCrossed, roles: ["administrador"] },
  { label: "Estoque", href: "/inventory", icon: Package, roles: ["administrador", "cozinheiro"] },
  { label: "Equipe & Auditoria", href: "/equipe", icon: Users, roles: ["administrador"] },
  { label: "Permissões (RBAC)", href: "/permissoes", icon: ShieldCheck, roles: ["administrador"] },
  { label: "Cardápio do Cliente", href: "/cliente", icon: Smartphone, highlight: true, roles: ["administrador"] },
  { label: "App do Entregador", href: "/entregador", icon: Bike, highlight: true, roles: ["administrador", "entregador"] },
  { label: "Automação (RPA)", href: "/rpa", icon: Bot, roles: ["administrador"] },
  { label: "Configurações", href: "/settings", icon: Settings, roles: ["administrador"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { nome: brandName } = useBranding();
  const [rpaRunning, setRpaRunning] = useState(false);
  const [rpaMsg, setRpaMsg] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("sidebar-collapsed", c ? "0" : "1");
      } catch {}
      return !c;
    });
  };

  const isAdmin = user?.role === "administrador" || user?.role === "superadmin";
  const rpa = useRpaStatus(isAdmin);

  // Esconder sidebar no login, no app do cliente (/cliente) e para os perfis mobile (cliente e entregador)
  if (
    pathname === "/login" ||
    pathname.startsWith("/cliente") ||
    pathname.startsWith("/unauthorized") ||
    user?.role === "cliente" ||
    user?.role === "entregador"
  ) {
    return null;
  }

  const runAllRobots = async () => {
    setRpaRunning(true);
    setRpaMsg("");
    try {
      let alertas = 0;
      for (const id of ["rpa-01", "rpa-02", "rpa-03"]) {
        const res = await api.post("/core/rpa/execute/", { task_id: id });
        alertas += res.data.alertas ?? 0;
      }
      setRpaMsg(`3 robôs executados, ${alertas} alerta(s).`);
      rpa.refresh();
    } catch {
      setRpaMsg("Falha ao executar os robôs.");
    } finally {
      setRpaRunning(false);
    }
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label="Mostrar menu lateral"
        title="Mostrar menu"
        className="fixed left-0 top-1/2 z-40 flex h-14 w-5 -translate-y-1/2 items-center justify-center rounded-r-lg border border-l-0 border-zinc-700 bg-zinc-900 text-zinc-400 shadow-lg transition-all hover:w-7 hover:bg-yellow-400 hover:text-zinc-950"
      >
        <PanelLeftOpen className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <aside className={`flex h-full shrink-0 flex-col border-r border-zinc-800/60 bg-zinc-900 w-64`}>
      <div className={`border-b border-zinc-800/60 py-5 px-5`}>
        <div className={`flex items-center gap-3`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-zinc-950 shadow-lg shadow-yellow-400/20">
            <ChefHat className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-yellow-400" title={brandName}>
              {brandName}
            </p>
            <p className="mt-0.5 text-xs font-medium text-zinc-400">ERP e automação</p>
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Ocultar menu lateral"
            aria-expanded
            title="Ocultar menu"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        {user?.role === "superadmin" && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-purple-500/40 bg-purple-500/15 px-2 py-1 text-xs font-semibold text-purple-300">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" aria-hidden />
            Modo desenvolvedor
          </span>
        )}
      </div>

      <nav className={`flex-1 space-y-1 overflow-y-auto py-4 px-3`}>
        {navItems.map(({ label, href, icon: Icon, highlight, roles }) => {
          const isActive = pathname === href;
          const content = (
            <Link
              key={label}
              href={href}
              className={`group flex items-center justify-between px-3.5 rounded-xl py-2.5 text-sm font-medium transition-all ${isActive
                  ? "border-l-4 border-yellow-400 bg-zinc-950 text-yellow-400 font-semibold shadow-inner"
                  : highlight
                    ? "border-l-4 border-transparent text-amber-300 hover:bg-amber-400/10 hover:text-amber-200"
                    : "border-l-4 border-transparent text-zinc-400 hover:bg-zinc-950/60 hover:text-zinc-100"
                }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Icon
                  className={`h-4 w-4 shrink-0 ${isActive
                      ? "text-yellow-400"
                      : highlight
                        ? "text-amber-400"
                        : "text-zinc-500 transition-colors group-hover:text-zinc-300"
                    }`}
                />
                <span className="whitespace-nowrap">{label}</span>
              </div>
              {highlight && (
                <span className="ml-2 shrink-0 rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
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

      <div className={`border-t border-zinc-800/60 p-4`}>
        <Can roles={["administrador", "superadmin"]}>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Status do RPA
              </p>
              <Zap className="h-4 w-4 text-yellow-400" />
            </div>

            <dl className="mt-2.5 space-y-1 text-xs">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Última execução</dt>
                <dd className="text-zinc-300 font-medium">{formatRun(rpa.lastRun)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Execuções hoje</dt>
                <dd className="text-zinc-300 font-medium">{rpa.runsToday}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={runAllRobots}
              disabled={rpaRunning}
              className="mt-3 w-full rounded-xl border border-yellow-400/60 bg-yellow-400/10 px-3 py-2 text-xs font-semibold text-yellow-400 transition-all hover:bg-yellow-400 hover:text-zinc-950 hover:shadow-lg hover:shadow-yellow-400/20 disabled:opacity-50"
            >
              {rpaRunning ? "Executando..." : "Executar RPA agora"}
            </button>
            {rpaMsg && <p className="mt-2 text-xs text-zinc-400">{rpaMsg}</p>}
          </div>
        </Can>

        {user && (
          <div className={`mt-3 flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/80 p-2 px-3`}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-yellow-400 text-xs font-black text-zinc-950 uppercase">
              {user.username.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-semibold text-zinc-200">{user.username}</p>
              <p className="truncate text-xs font-medium text-yellow-400 capitalize">{user.role}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          aria-label="Sair da conta"
          title="Sair da conta"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs font-semibold text-zinc-400 transition-all hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair da conta
        </button>
      </div>
    </aside>
  );
}