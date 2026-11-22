"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Play, RefreshCw } from "lucide-react";
import api from "../../services/api";
import { apiErrorMessage } from "@/lib/errors";
import { useRpaStatus, formatRun } from "../../hooks/useRpaStatus";

// Mesmos robôs da central RPA (/rpa); a execução e o histórico vêm do backend.
const ROTINAS = [
  { id: "rpa-01", name: "Sincronização de pedidos" },
  { id: "rpa-02", name: "Alerta de estoque crítico" },
  { id: "rpa-03", name: "Conciliação do caixa do dia" },
];

export function RpaRoutines() {
  const rpa = useRpaStatus();
  const [selected, setSelected] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const handleExecute = async () => {
    if (!selected) return;
    const nome = ROTINAS.find((r) => r.id === selected)?.name ?? selected;
    setIsRunning(true);
    setMessage(null);
    try {
      const res = await api.post("/core/rpa/execute/", { task_id: selected });
      setMessage({ ok: true, text: `${nome}: ${res.data?.mensagem ?? "executado"}.` });
      rpa.refresh();
    } catch (err: any) {
      setMessage({ ok: false, text: apiErrorMessage(err, `Falha ao executar "${nome}".`) });
    } finally {
      setIsRunning(false);
      setTimeout(() => setMessage(null), 6000);
    }
  };

  return (
    <section className="flex h-full flex-col">
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
        <h2 className="text-3xl text-ink">
          Automação (RPA) - Rotinas
        </h2>
        <Link
          href="/rpa"
          className="flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent"
        >
          Ver central RPA
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <ul className="mt-4 space-y-2 px-5">
        {ROTINAS.map((routine) => {
          const last = rpa.lastRunOf(routine.id);
          return (
            <li
              key={routine.id}
              className="flex items-center gap-3 rounded-xl border border-line/60 bg-canvas/50 px-4 py-3 transition-colors hover:border-line"
            >
              {last ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              ) : (
                <Clock className="h-5 w-5 shrink-0 text-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {routine.name}
                </p>
                <p className="text-xs text-muted">Última execução: {formatRun(last)}</p>
              </div>
              <span className={`text-xs font-semibold ${last ? "text-success" : "text-muted"}`}>
                {last ? `${rpa.countOf(routine.id)}x` : "Pendente"}
              </span>
            </li>
          );
        })}
      </ul>

      {message && (
        <div
          role="status"
          className={`mx-5 mt-3 flex items-center justify-center gap-2 rounded-xl border p-2.5 text-center text-xs font-medium ${
            message.ok
              ? "border-success/20 bg-success/10 text-success"
              : "border-danger/20 bg-danger/10 text-danger"
          }`}
        >
          {!message.ok && <AlertTriangle className="h-4 w-4 shrink-0" />}
          {message.text}
        </div>
      )}

      <div className="mt-auto border-t border-line/60 p-5">
        <p className="text-xs font-semibold text-soft">
          Execução Manual de Rotinas
        </p>
        <div className="mt-3 flex gap-2">
          <select
            aria-label="Selecionar rotina"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-soft outline-none transition-colors focus:border-accent"
          >
            <option value="" disabled>
              Selecionar rotina...
            </option>
            {ROTINAS.map((routine) => (
              <option key={routine.id} value={routine.id}>
                {routine.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selected || isRunning}
            onClick={handleExecute}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-accent/70 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-ink disabled:cursor-not-allowed disabled:opacity-50"
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
