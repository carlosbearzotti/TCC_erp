"use client";

import Link from "next/link";
import useSWR from "swr";
import { ArrowRight, RefreshCw } from "lucide-react";
import { fetcher } from "@/services/api";

interface Movimentacao {
  id: number
  insumo: number
  tipo: string
  quantidade: string | number
  motivo: string
  data: string
  responsavel_nome?: string
}

interface Insumo {
  id: number
  nome: string
  unidade_medida: string
}

export function RecentEntries() {
  const { data: movimentacoes, isLoading: loadingMov } = useSWR<Movimentacao[]>("/inventory/movimentacoes/", fetcher);
  const { data: insumos } = useSWR<Insumo[]>("/inventory/insumos/", fetcher);

  const insumosMap = new Map(
    (Array.isArray(insumos) ? insumos : []).map((i) => [i.id, i.nome])
  );

  const entries = (Array.isArray(movimentacoes) ? movimentacoes : [])
    .filter((m) => m.tipo === "entrada")
    .slice(0, 5);

  return (
    <section className="flex h-full flex-col rounded-2xl border border-zinc-800/60 bg-zinc-900">
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 className="text-base font-semibold text-zinc-100">
          Entradas Recentes
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
        <table className="w-full min-w-[380px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3 font-medium">Insumo</th>
              <th className="px-4 py-3 font-medium">Motivo</th>
              <th className="px-4 py-3 font-medium">Qtd.</th>
              <th className="px-4 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {loadingMov ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 text-xs">
                  <RefreshCw className="inline-block h-4 w-4 animate-spin text-yellow-400 mr-2" />
                  Carregando entradas...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 text-xs">
                  Nenhuma entrada de estoque registrada ainda.
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const dateStr = entry.data
                  ? new Date(entry.data).toLocaleDateString("pt-BR")
                  : "--";

                return (
                  <tr
                    key={entry.id}
                    className="border-b border-zinc-800/60 transition-colors last:border-0 hover:bg-zinc-800/40"
                  >
                    <td className="px-4 py-3 text-zinc-100 font-medium">
                      {insumosMap.get(entry.insumo) || `Insumo #${entry.insumo}`}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs truncate max-w-[140px]">{entry.motivo || "Reposição"}</td>
                    <td className="px-4 py-3 text-green-400 font-bold">+{entry.quantidade}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{dateStr}</td>
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