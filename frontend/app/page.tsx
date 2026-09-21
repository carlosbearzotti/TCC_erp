"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  Target,
  Filter,
  Calendar,
  Layers,
  PieChart as PieIcon,
  BarChart3,
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { fetcher } from "@/services/api";
import { Header } from "@/components/dashboard/Header";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { CriticalStock } from "@/components/dashboard/CriticalStock";
import { InventoryControl } from "@/components/dashboard/InventoryControl";
import { RecentEntries } from "@/components/dashboard/RecentEntries";
import { RpaRoutines } from "@/components/dashboard/RpaRoutines";

interface MetricasData {
  periodo: string;
  total_faturamento: number;
  total_pedidos: number;
  ticket_medio: number;
  meta_faturamento: number;
  faturamento_mes_atual: number;
  progresso_meta_percentual: number;
  vendas_por_canal: { tipo_atendimento: string; quantidade: number; total: string | number }[];
  vendas_por_pagamento: { payment_method: string; quantidade: number; total: string | number }[];
  serie_temporal: { data: string; total: number; pedidos: number }[];
}

interface Insumo {
  id: number;
  nome: string;
  quantidade_atual: number | string;
  estoque_minimo: number | string;
}

const COLORS_CANAL = ["#eab308", "#3b82f6", "#10b981", "#a855f7"];

export default function DashboardPage() {
  const [periodo, setPeriodo] = useState<"hoje" | "7dias" | "mes_atual" | "mes_passado">("mes_atual");

  const { data: metricas, isLoading } = useSWR<MetricasData>(
    `/core/metricas/?periodo=${periodo}`,
    fetcher,
    { refreshInterval: 15000 }
  );

  const { data: insumos } = useSWR<Insumo[]>("/inventory/insumos/", fetcher);

  const criticalStockCount = (Array.isArray(insumos) ? insumos : []).filter(
    (i) => Number(i.quantidade_atual) <= Number(i.estoque_minimo)
  ).length;

  const totalRevenue = metricas?.total_faturamento || 0;
  const totalOrdersCount = metricas?.total_pedidos || 0;
  const avgTicket = metricas?.ticket_medio || 0;
  const metaFaturamento = metricas?.meta_faturamento || 10000;
  const faturamentoMesAtual = metricas?.faturamento_mes_atual || 0;
  const progressoMeta = metricas?.progresso_meta_percentual || 0;

  const dynamicKpiCards = [
    {
      title: "Total Vendas",
      value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalRevenue),
      icon: DollarSign,
      iconClassName: "text-yellow-400",
      footer: {
        text: periodo === "hoje" ? "Vendas de hoje" : `Período: ${periodo}`,
        className: "text-green-400 font-semibold",
      },
    },
    {
      title: "Pedidos Realizados",
      value: String(totalOrdersCount),
      icon: ShoppingBag,
      iconClassName: "text-yellow-400",
      footer: {
        text: `${totalOrdersCount} pedidos no período`,
        className: "text-zinc-400",
      },
    },
    {
      title: "Ticket Médio",
      value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(avgTicket),
      icon: TrendingUp,
      iconClassName: "text-yellow-400",
      footer: {
        text: "Média calculada por venda",
        className: "text-zinc-400",
      },
    },
    {
      title: "Estoque Crítico",
      value: `${criticalStockCount} itens`,
      icon: AlertTriangle,
      iconClassName: criticalStockCount > 0 ? "text-red-400" : "text-yellow-400",
      footer: {
        text: criticalStockCount > 0 ? "Reposição imediata" : "Estoque regular",
        className: criticalStockCount > 0 ? "text-red-400 font-bold" : "text-green-400",
      },
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <Header />

      <main className="space-y-6 p-6 lg:p-8">
        {/* Barra de Filtro de Período e Metas */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-yellow-400" />
              Visão Geral &amp; Métricas Analíticas
            </h2>
            <p className="text-xs text-zinc-400">
              Acompanhamento de faturamento, desempenho por canal e metas operacionais.
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 p-1">
            <button
              onClick={() => setPeriodo("hoje")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                periodo === "hoje"
                  ? "bg-yellow-400 text-zinc-950 shadow-md font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriodo("7dias")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                periodo === "7dias"
                  ? "bg-yellow-400 text-zinc-950 shadow-md font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Últimos 7 dias
            </button>
            <button
              onClick={() => setPeriodo("mes_atual")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                periodo === "mes_atual"
                  ? "bg-yellow-400 text-zinc-950 shadow-md font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => setPeriodo("mes_passado")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                periodo === "mes_passado"
                  ? "bg-yellow-400 text-zinc-950 shadow-md font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Mês Passado
            </button>
          </div>
        </div>

        {/* Card de Meta de Faturamento Mensal (Issue #74) */}
        <div className="rounded-2xl border border-yellow-400/20 bg-gradient-to-r from-zinc-900 via-zinc-900 to-yellow-950/20 p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-yellow-400" />
                <span className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                  Meta de Faturamento Mensal
                </span>
                <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-xs font-bold text-yellow-400">
                  {progressoMeta}% atingido
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Faturamento acumulado no mês corrente em direção à meta configurada.
              </p>
            </div>

            <div className="text-right">
              <div className="text-lg font-extrabold font-mono text-zinc-100">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(faturamentoMesAtual)}{" "}
                <span className="text-xs font-normal text-zinc-400">
                  / {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(metaFaturamento)}
                </span>
              </div>
            </div>
          </div>

          {/* Barra de Progresso da Meta */}
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-zinc-800 border border-zinc-700/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-700 shadow-sm"
              style={{ width: `${Math.min(progressoMeta, 100)}%` }}
            />
          </div>
        </div>

        {/* Grid de KPIs Principais */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {dynamicKpiCards.map((card) => (
            <KpiCard key={card.title} {...card} />
          ))}
        </div>

        {/* Gráficos Analíticos com Recharts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico 1: Evolução de Faturamento Diário */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-100 mb-1 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-yellow-400" />
              Evolução do Faturamento no Período
            </h3>
            <p className="text-xs text-zinc-400 mb-4">Total faturado por dia (R$)</p>

            <div className="h-64 w-full">
              {Array.isArray(metricas?.serie_temporal) && metricas.serie_temporal.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricas.serie_temporal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="data" stroke="#71717a" fontSize={11} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={11} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "12px" }}
                      formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, "Faturamento"]}
                    />
                    <Bar dataKey="total" fill="#eab308" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                  Carregando dados da série temporal...
                </div>
              )}
            </div>
          </div>

          {/* Gráfico 2: Vendas por Canal de Atendimento */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-100 mb-1 flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-yellow-400" />
                Vendas por Canal
              </h3>
              <p className="text-xs text-zinc-400 mb-4">Mesa, Balcão, Delivery e Retirada</p>
            </div>

            <div className="h-48 w-full">
              {Array.isArray(metricas?.vendas_por_canal) && metricas.vendas_por_canal.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metricas.vendas_por_canal}
                      dataKey="quantidade"
                      nameKey="tipo_atendimento"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {metricas.vendas_por_canal.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_CANAL[index % COLORS_CANAL.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "12px" }}
                      formatter={(val: any, name: any) => [`${val} pedidos`, `Canal: ${name}`]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                  Sem dados por canal no período
                </div>
              )}
            </div>

            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
              {(Array.isArray(metricas?.vendas_por_canal) ? metricas.vendas_por_canal : []).map((canal, idx) => (
                <div key={canal.tipo_atendimento} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: COLORS_CANAL[idx % COLORS_CANAL.length] }}
                  />
                  <span className="capitalize text-zinc-300">
                    {canal.tipo_atendimento}: <strong>{canal.quantidade}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Seções Operacionais Existentes */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RecentOrders />
          <CriticalStock />
        </div>

        <InventoryControl />
        <RecentEntries />
        <RpaRoutines />
      </main>
    </div>
  );
}