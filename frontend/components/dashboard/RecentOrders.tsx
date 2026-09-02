"use client";

import Link from "next/link";
import useSWR from "swr";
import { ArrowRight, RefreshCw } from "lucide-react";
import { fetcher } from "@/services/api";
import { StatusBadge, type BadgeTone } from "./StatusBadge";

interface OrderItem {
  id: number
  produto: number
  quantidade: number
  preco_unitario: string | number
  subtotal: string | number
}

interface Order {
  id: number
  status: string
  total: string | number
  payment_method: string
  created_at: string
  cliente?: number | null
  itens?: OrderItem[]
}

const orderStatusTone: Record<string, BadgeTone> = {
  "em_preparo": "yellow",
  "confirmado": "yellow",
  "criado": "yellow",
  "pronto": "blue",
  "entregue": "green",
  "cancelado": "red",
};

const statusLabels: Record<string, string> = {
  "criado": "Criado",
  "confirmado": "Confirmado",
  "em_preparo": "Em preparo",
  "pronto": "Pronto",
  "entregue": "Concluído",
  "cancelado": "Cancelado",
};

export function RecentOrders() {
  const { data: orders, isLoading } = useSWR<Order[]>("/orders/", fetcher);

  const displayOrders = (orders || []).slice(0, 6);

  return (
    <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900">
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 className="text-base font-semibold text-zinc-100">
          Pedidos Recentes
        </h2>
        <Link
          href="/orders"
          className="flex items-center gap-1 text-xs font-medium text-yellow-400 transition-colors hover:text-yellow-300"
        >
          Ver todos
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-5 py-3 font-medium">ID</th>
              <th className="px-5 py-3 font-medium">Horário / Data</th>
              <th className="px-5 py-3 font-medium">Forma de Pagamento</th>
              <th className="px-5 py-3 font-medium">Qtd. Itens</th>
              <th className="px-5 py-3 font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-zinc-500 text-xs">
                  <RefreshCw className="inline-block h-4 w-4 animate-spin text-yellow-400 mr-2" />
                  Carregando pedidos...
                </td>
              </tr>
            ) : displayOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-zinc-500 text-xs">
                  Nenhum pedido registrado no sistema ainda.
                </td>
              </tr>
            ) : (
              displayOrders.map((order) => {
                const dateStr = order.created_at
                  ? new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                  : "--:--";

                return (
                  <tr
                    key={order.id}
                    className="border-b border-zinc-800/60 transition-colors last:border-0 hover:bg-zinc-800/40"
                  >
                    <td className="px-5 py-3.5 font-medium text-yellow-400">
                      #{order.id}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-300">{dateStr}</td>
                    <td className="px-5 py-3.5 text-zinc-300 capitalize">{order.payment_method || "Outros"}</td>
                    <td className="px-5 py-3.5 text-zinc-400">
                      {order.itens?.reduce((sum, i) => sum + i.quantidade, 0) || 1} itens
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-zinc-100">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(order.total))}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        label={statusLabels[order.status] || order.status}
                        tone={orderStatusTone[order.status] || "yellow"}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}