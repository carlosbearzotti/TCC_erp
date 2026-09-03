"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import Link from "next/link";
import { 
  CalendarDays, 
  Bell, 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  X 
} from "lucide-react";
import { fetcher } from "@/services/api";

interface Insumo {
  id: number;
  nome: string;
  unidade_medida: string;
  quantidade_atual: number | string;
  estoque_minimo: number | string;
}

interface Order {
  id: number;
  status: string;
  total: string | number;
  created_at: string;
}

interface TurnoResponse {
  ativo: boolean;
  turno: {
    id: number;
    inicio: string;
    duracao_minutos: number;
    saldo_dinheiro: string | number;
  } | null;
}

export function Header() {
  const [currentDateStr, setCurrentDateStr] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingTurno, setLoadingTurno] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sincroniza a data do sistema
  useEffect(() => {
    const today = new Date();
    const formatted = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(today);
    setCurrentDateStr(formatted);
  }, []);

  // Busca dados reais para notificações e turno ativo
  const { data: insumos } = useSWR<Insumo[]>("/inventory/insumos/", fetcher);
  const { data: orders } = useSWR<Order[]>("/orders/", fetcher);
  const { data: turnoData, mutate: mutateTurno } = useSWR<TurnoResponse>(
    "/core/turnos/ativo/",
    fetcher,
    { refreshInterval: 15000 }
  );

  const handleCheckin = async () => {
    try {
      setLoadingTurno(true);
      const { api } = await import("@/services/api");
      await api.post("/core/turnos/checkin/");
      await mutateTurno();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao iniciar turno.");
    } finally {
      setLoadingTurno(false);
    }
  };

  const handleCheckout = async () => {
    if (!confirm("Deseja realmente encerrar o seu turno agora?")) return;
    try {
      setLoadingTurno(true);
      const { api } = await import("@/services/api");
      await api.post("/core/turnos/checkout/");
      await mutateTurno();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao encerrar turno.");
    } finally {
      setLoadingTurno(false);
    }
  };

  // Filtra notificações reais
  const criticalStockItems = (insumos || []).filter(
    (i) => Number(i.quantidade_atual) <= Number(i.estoque_minimo)
  );

  const pendingOrders = (orders || []).filter(
    (o) => o.status === "criado" || o.status === "confirmado" || o.status === "em_preparo"
  );

  const totalNotifications = criticalStockItems.length + pendingOrders.length;

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-6 border-b border-zinc-800/40">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
          Olá, Administrador!{" "}
          <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Bem-vindo ao painel de automação da Lanchonete &amp; Pastelaria
        </p>
      </div>

      <div className="flex items-center gap-3 relative">
        {/* Controle de Ponto / Turno de Trabalho */}
        {turnoData?.ativo ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-400 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span>Turno Ativo ({turnoData.turno?.duracao_minutos || 0}m)</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={loadingTurno}
              className="rounded-xl border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-900/40 transition-colors"
            >
              {loadingTurno ? "Saindo..." : "Encerrar Ponto"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleCheckin}
            disabled={loadingTurno}
            className="flex items-center gap-2 rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-3.5 py-2 text-xs font-bold text-yellow-400 hover:bg-yellow-400 hover:text-zinc-950 transition-all shadow-sm"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{loadingTurno ? "Iniciando..." : "Bater Ponto"}</span>
          </button>
        )}

        {/* Data Real do Sistema */}
        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm font-medium text-zinc-300">
          <CalendarDays className="h-4 w-4 text-yellow-400" />
          <span>{currentDateStr || "--/--/----"}</span>
        </div>

        {/* Botão de Notificações com Dropdown Interativo Real */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notificações"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition-all hover:border-yellow-400/50 hover:bg-zinc-800 focus:outline-none"
          >
            <Bell className="h-[18px] w-[18px]" />
            {totalNotifications > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-400 px-1 text-[10px] font-bold text-zinc-950 shadow-lg shadow-yellow-400/30 animate-pulse">
                {totalNotifications}
              </span>
            )}
          </button>

          {/* Modal / Dropdown de Notificações Reais */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-zinc-800 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-md z-50 animate-in fade-in-50 zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-100">Central de Notificações</h3>
                  {totalNotifications > 0 && (
                    <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
                      {totalNotifications} pendente{totalNotifications > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 max-h-80 overflow-y-auto space-y-2.5">
                {totalNotifications === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-zinc-500 text-xs">
                    <CheckCircle2 className="h-8 w-8 text-green-400 mb-2 opacity-80" />
                    <p className="font-semibold text-zinc-300">Tudo em ordem!</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Nenhum estoque crítico ou pedido pendente no momento.</p>
                  </div>
                ) : (
                  <>
                    {/* Alertas de Estoque Crítico */}
                    {criticalStockItems.map((item) => (
                      <Link
                        key={`stock-${item.id}`}
                        href="/inventory"
                        onClick={() => setShowNotifications(false)}
                        className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs transition-colors hover:border-red-500/40"
                      >
                        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-zinc-100">Estoque Crítico: {item.nome}</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            Restam apenas <span className="text-red-400 font-bold">{item.quantidade_atual} {item.unidade_medida}</span> (Mínimo: {item.estoque_minimo} {item.unidade_medida}).
                          </p>
                        </div>
                      </Link>
                    ))}

                    {/* Alertas de Pedidos na Cozinha */}
                    {pendingOrders.map((order) => (
                      <Link
                        key={`order-${order.id}`}
                        href="/orders"
                        onClick={() => setShowNotifications(false)}
                        className="flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs transition-colors hover:border-yellow-500/40"
                      >
                        <Clock className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-zinc-100">Pedido #{order.id} em Preparo</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            Total: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(order.total))} • Status: {order.status}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar Administrador */}
        <div
          aria-hidden="true"
          className="flex h-10 w-10 select-none items-center justify-center rounded-xl bg-yellow-400 text-xs font-black text-zinc-950 shadow-md shadow-yellow-400/20"
        >
          AD
        </div>
      </div>
    </header>
  );
}