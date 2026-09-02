"use client";

import useSWR from "swr";
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  Clock, 
  AlertTriangle 
} from "lucide-react";
import { fetcher } from "@/services/api";
import { Header } from "@/components/dashboard/Header";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { CriticalStock } from "@/components/dashboard/CriticalStock";
import { InventoryControl } from "@/components/dashboard/InventoryControl";
import { RecentEntries } from "@/components/dashboard/RecentEntries";
import { RpaRoutines } from "@/components/dashboard/RpaRoutines";
import { DailyReport } from "@/components/dashboard/DailyReport";

interface Order {
  id: number
  total: string | number
  status: string
  created_at: string
}

interface Insumo {
  id: number
  nome: string
  quantidade_atual: number | string
  estoque_minimo: number | string
}

export default function DashboardPage() {
  const { data: orders } = useSWR<Order[]>("/orders/", fetcher);
  const { data: insumos } = useSWR<Insumo[]>("/inventory/insumos/", fetcher);

  // Cálculos de KPIs em tempo real
  const validOrders = (orders || []).filter((o) => o.status !== "cancelado");
  const totalRevenue = validOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalOrdersCount = validOrders.length;
  const avgTicket = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
  const inPrepCount = (orders || []).filter(
    (o) => o.status === "em_preparo" || o.status === "confirmado" || o.status === "criado"
  ).length;
  const criticalStockCount = (insumos || []).filter(
    (i) => Number(i.quantidade_atual) <= Number(i.estoque_minimo)
  ).length;

  const dynamicKpiCards = [
    {
      title: "Total Vendas",
      value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalRevenue),
      icon: DollarSign,
      iconClassName: "text-yellow-400",
      footer: {
        text: "+100% faturamento",
        className: "text-green-400 font-semibold",
      },
    },
    {
      title: "Pedidos Realizados",
      value: String(totalOrdersCount),
      icon: ShoppingBag,
      iconClassName: "text-yellow-400",
      footer: {
        text: `${totalOrdersCount} registrados`,
        className: "text-zinc-400",
      },
    },
    {
      title: "Ticket Médio",
      value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(avgTicket),
      icon: TrendingUp,
      iconClassName: "text-yellow-400",
      footer: {
        text: "Média por pedido",
        className: "text-zinc-400",
      },
    },
    {
      title: "Em Preparo",
      value: String(inPrepCount),
      icon: Clock,
      iconClassName: "text-yellow-400",
      footer: {
        text: `${inPrepCount} na cozinha`,
        className: inPrepCount > 0 ? "text-yellow-400 font-semibold" : "text-zinc-500",
      },
    },
    {
      title: "Estoque Crítico",
      value: `${criticalStockCount} itens`,
      icon: AlertTriangle,
      iconClassName: criticalStockCount > 0 ? "text-red-400" : "text-yellow-400",
      footer: {
        text: criticalStockCount > 0 ? "Requer reposição urgente" : "Estoque normal",
        className: criticalStockCount > 0 ? "text-red-400 font-bold" : "text-green-400",
      },
    },
  ];

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-zinc-950 text-zinc-100">
      <Header />

      <div className="mx-auto w-full max-w-[1600px] flex-1 space-y-6 px-6 pb-10">
        {/* 5 KPI Cards Superiores Dinâmicos */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {dynamicKpiCards.map((kpi) => (
            <KpiCard key={kpi.title} {...kpi} />
          ))}
        </section>

        {/* Linha 1: Pedidos Recentes + Estoque Crítico */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <RecentOrders />
          </div>
          <div className="xl:col-span-4">
            <CriticalStock />
          </div>
        </section>

        {/* Linha 2: Controle de Estoque + Entradas Recentes + Rotinas RPA */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <InventoryControl />
          </div>
          <div className="xl:col-span-4">
            <RecentEntries />
          </div>
          <div className="xl:col-span-4">
            <RpaRoutines />
          </div>
        </section>

        {/* Linha 3: Relatório Diário com Gráfico de Área Suave Dourada */}
        <section>
          <DailyReport />
        </section>
      </div>
    </div>
  );
}