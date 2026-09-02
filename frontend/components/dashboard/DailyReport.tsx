"use client";

import useSWR from "swr";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetcher } from "@/services/api";

interface Order {
  id: number
  total: string | number
  status: string
  created_at: string
}

export function DailyReport() {
  const { data: orders, isLoading } = useSWR<Order[]>("/orders/", fetcher);

  const validOrders = (orders || []).filter((o) => o.status !== "cancelado");

  const totalRevenue = validOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalOrders = validOrders.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Montagem do gráfico diário a partir dos pedidos reais
  const timeBuckets: Record<string, number> = {
    "08:00": 0,
    "10:00": 0,
    "12:00": 0,
    "14:00": 0,
    "16:00": 0,
    "18:00": 0,
    "20:00": 0,
    "22:00": 0,
  };

  validOrders.forEach((order) => {
    if (!order.created_at) return;
    const hour = new Date(order.created_at).getHours();
    if (hour < 10) timeBuckets["08:00"] += Number(order.total);
    else if (hour < 12) timeBuckets["10:00"] += Number(order.total);
    else if (hour < 14) timeBuckets["12:00"] += Number(order.total);
    else if (hour < 16) timeBuckets["14:00"] += Number(order.total);
    else if (hour < 18) timeBuckets["16:00"] += Number(order.total);
    else if (hour < 20) timeBuckets["18:00"] += Number(order.total);
    else if (hour < 22) timeBuckets["20:00"] += Number(order.total);
    else timeBuckets["22:00"] += Number(order.total);
  });

  const chartData = Object.entries(timeBuckets).map(([time, value]) => ({
    time,
    value,
  }));

  const todayStr = new Date().toLocaleDateString("pt-BR");

  return (
    <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 pt-5">
        <h2 className="text-base font-semibold text-zinc-100">
          Relatório Financeiro Diário
        </h2>
        <span className="text-xs font-medium text-zinc-500">{todayStr}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[240px_1fr]">
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/50 px-4 py-3">
            <dt className="text-xs text-zinc-500">Receita Total</dt>
            <dd className="mt-1 text-lg font-bold text-zinc-50">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalRevenue)}
            </dd>
            <dd className="text-xs font-medium text-green-400">
              {totalOrders} pedidos realizados
            </dd>
          </div>

          <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/50 px-4 py-3">
            <dt className="text-xs text-zinc-500">Ticket Médio</dt>
            <dd className="mt-1 text-lg font-bold text-zinc-50">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(avgTicket)}
            </dd>
            <dd className="text-xs font-medium text-yellow-400">
              Média por comanda
            </dd>
          </div>
        </dl>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#facc15" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#facc15" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fill: "#71717a", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={45}
                tickFormatter={(value: number) =>
                  value === 0 ? "0" : value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "0.75rem",
                  fontSize: "0.75rem",
                  color: "#f4f4f5",
                }}
                labelStyle={{ color: "#a1a1aa" }}
                cursor={{ stroke: "#3f3f46", strokeDasharray: "3 3" }}
                formatter={(value: number) => [`R$ ${Number(value).toFixed(2)}`, "Faturamento"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#facc15"
                strokeWidth={2.5}
                fill="url(#goldArea)"
                dot={{ fill: "#facc15", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#facc15" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}