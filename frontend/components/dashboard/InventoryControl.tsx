"use client";

import Link from "next/link";
import useSWR from "swr";
import { ArrowRight, RefreshCw } from "lucide-react";
import { fetcher } from "@/services/api";
import { StatusBadge, type BadgeTone } from "./StatusBadge";

interface Insumo {
  id: number
  nome: string
  unidade_medida: string
  quantidade_atual: number | string
  estoque_minimo: number | string
}

export function InventoryControl() {
  const { data: insumos, isLoading } = useSWR<Insumo[]>("/inventory/insumos/", fetcher);

  const displayItems = (insumos || []).slice(0, 5);

  return (
    <section className="flex h-full flex-col rounded-2xl border border-zinc-800/60 bg-zinc-900">
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 className="text-base font-semibold text-zinc-100">
          Controle de Estoque
        </h2>
        <Link
          href="/inventory"
          className="flex items-center gap-1 text-xs font-medium text-yellow-400 transition-colors hover:text-yellow-300"
        >
          Ver todos
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto px-1">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3 font-medium">Insumo</th>
              <th className="px-4 py-3 font-medium">Atual</th>
              <th className="px-4 py-3 font-medium">Mínimo</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 text-xs">
                  <RefreshCw className="inline-block h-4 w-4 animate-spin text-yellow-400 mr-2" />
                  Carregando estoque...
                </td>
              </tr>
            ) : displayItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 text-xs">
                  Nenhum insumo cadastrado no estoque ainda.
                </td>
              </tr>
            ) : (
              displayItems.map((item) => {
                const current = Number(item.quantidade_atual);
                const min = Number(item.estoque_minimo);
                
                let label = "Normal";
                let tone: BadgeTone = "green";

                if (current <= min && current > min * 0.5) {
                  label = "Baixo";
                  tone = "yellow";
                } else if (current <= min * 0.5) {
                  label = "Crítico";
                  tone = "red";
                }

                return (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-800/60 transition-colors last:border-0 hover:bg-zinc-800/40"
                  >
                    <td className="px-4 py-3 text-zinc-100 font-medium">{item.nome}</td>
                    <td className="px-4 py-3 text-zinc-200 font-bold">{current} {item.unidade_medida}</td>
                    <td className="px-4 py-3 text-zinc-500">{min} {item.unidade_medida}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={label} tone={tone} />
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