"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Play, RefreshCw } from "lucide-react";

interface Routine {
  id: string;
  name: string;
  lastRun: string;
  status: "Sucesso" | "Executando" | "Pendente";
}

export function RpaRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([
    { id: "1", name: "Sincronizar pedidos do PDV", lastRun: "Hoje às 10:15", status: "Sucesso" },
    { id: "2", name: "Atualizar estoque e baixa de insumos", lastRun: "Hoje às 10:20", status: "Sucesso" },
    { id: "3", name: "Emitir relatório e fechamento diário", lastRun: "Hoje às 10:30", status: "Sucesso" },
    { id: "4", name: "Conciliação bancária de pagamentos", lastRun: "Hoje às 10:40", status: "Sucesso" },
  ]);

  const [selectedRoutine, setSelectedRoutine] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleExecute = () => {
    if (!selectedRoutine) return;
    setIsRunning(true);
    setMessage(null);

    setTimeout(() => {
      const nowTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setRoutines((prev) =>
        prev.map((r) =>
          r.name === selectedRoutine
            ? { ...r, lastRun: `Hoje às ${nowTime}`, status: "Sucesso" }
            : r
        )
      );
      setIsRunning(false);
      setMessage(`Rotina "${selectedRoutine}" executada com sucesso!`);
      setTimeout(() => setMessage(null), 4000);
    }, 1200);
  };

  return (
    <section className="flex h-full flex-col rounded-2xl border border-zinc-800/60 bg-zinc-900">
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 className="text-base font-semibold text-zinc-100">
          Automação (RPA) - Rotinas
        </h2>
        <Link
          href="/rpa"
          className="flex items-center gap-1 text-xs font-medium text-yellow-400 transition-colors hover:text-yellow-300"
        >
          Ver central RPA
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <ul className="mt-4 space-y-2 px-5">
        {routines.map((routine) => (
          <li
            key={routine.id}
            className="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-950/50 px-4 py-3 transition-colors hover:border-zinc-700"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-100">
                {routine.name}
              </p>
              <p className="text-xs text-zinc-500">{routine.lastRun}</p>
            </div>
            <span className="text-xs font-semibold text-green-400">
              {routine.status}
            </span>
          </li>
        ))}
      </ul>

      {message && (
        <div className="mx-5 mt-3 rounded-xl border border-green-500/20 bg-green-500/10 p-2.5 text-center text-xs font-medium text-green-400 animate-in fade-in duration-200">
          {message}
        </div>
      )}

      <div className="mt-auto border-t border-zinc-800/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Execução Manual de Rotinas
        </p>
        <div className="mt-3 flex gap-2">
          <select
            aria-label="Selecionar rotina"
            value={selectedRoutine}
            onChange={(e) => setSelectedRoutine(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 outline-none transition-colors focus:border-yellow-400"
          >
            <option value="" disabled>
              Selecionar rotina...
            </option>
            {routines.map((routine) => (
              <option key={routine.id} value={routine.name}>
                {routine.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedRoutine || isRunning}
            onClick={handleExecute}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-yellow-400/70 bg-yellow-400/10 px-4 py-2 text-sm font-semibold text-yellow-400 transition-all hover:bg-yellow-400 hover:text-zinc-950 hover:shadow-lg hover:shadow-yellow-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Executar
          </button>
        </div>
      </div>
    </section>
  );
}