"use client"

import { useState } from "react"
import { Bot, Zap, CheckCircle2, Play, RefreshCw, AlertTriangle, ShieldCheck } from "lucide-react"
import api from "../../services/api"
import { useRpaStatus, formatRun } from "../../hooks/useRpaStatus"

const rpaTasks = [
  {
    id: "rpa-01",
    name: "Robô de Emissão & Sincronização de Pedidos",
    description: "Captura pedidos do app mobile e balcão, enviando automaticamente para a fila de preparo e módulo financeiro.",
    frequency: "A cada 30 min",
  },
  {
    id: "rpa-02",
    name: "Robô de Baixa Automática & Alerta de Estoque",
    description: "Calcula a dedução de insumos com base nas receitas técnicas e emite alertas caso o estoque atinja nível crítico.",
    frequency: "A cada 1 hora",
  },
  {
    id: "rpa-03",
    name: "Robô de Conciliação Financeira & Fechamento",
    description: "Agrupa os lançamentos de Pix, Cartão e Dinheiro, gerando os relatórios de DRE e fluxo de caixa diário.",
    frequency: "Diário (Fim do turno)",
  },
]

export default function RpaPage() {
  const [runningId, setRunningId] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState("")
  const [errorNotice, setErrorNotice] = useState("")
  const rpa = useRpaStatus()

  const triggerRpa = async (id: string, name: string) => {
    setRunningId(id)
    setSuccessNotice("")
    setErrorNotice("")
    try {
      const res = await api.post("/core/rpa/execute/", { task_id: id })
      const d = res.data
      setSuccessNotice(`Robô executado: ${d.mensagem} (${d.tempo_ms} ms). Evidência registrada na auditoria.`)
      setTimeout(() => setSuccessNotice(""), 8000)
      rpa.refresh()
    } catch (err: any) {
      setErrorNotice(err.response?.data?.detail || `Falha ao executar a rotina "${name}".`)
      setTimeout(() => setErrorNotice(""), 8000)
    } finally {
      setRunningId(null)
    }
  }

  return (
    <div className="flex flex-col space-y-6 p-6 bg-zinc-950 text-zinc-100 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50 flex items-center gap-2">
            <Bot className="h-6 w-6 text-yellow-400" />
            Central de Automação &amp; RPA
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Painel de controle dos robôs de automação de processos da Lanchonete &amp; Pastelaria.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/30 px-3 py-1 text-xs font-bold text-green-400">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            Motor RPA Online
          </span>
        </div>
      </div>

      {successNotice && (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 flex items-center gap-3 text-xs text-green-400 animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="font-semibold">{successNotice}</span>
        </div>
      )}

      {errorNotice && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-3 text-xs text-red-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="font-semibold">{errorNotice}</span>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900 p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Rotinas Ativas</span>
            <Zap className="h-4 w-4 text-yellow-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-zinc-100">3 de 3</p>
          <p className="mt-1 text-xs font-medium text-green-400">100% de disponibilidade</p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900 p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Execuções Hoje</span>
            <RefreshCw className="h-4 w-4 text-yellow-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-zinc-100">{rpa.runsToday}</p>
          <p className="mt-1 text-xs font-medium text-zinc-400">Registradas na trilha de auditoria</p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900 p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Última Execução</span>
            <ShieldCheck className="h-4 w-4 text-yellow-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-zinc-100">{formatRun(rpa.lastRun)}</p>
          <p className="mt-1 text-xs font-medium text-green-400">Execução manual (sem agendador)</p>
        </div>
      </div>

      {/* Lista de Robôs */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
          Robôs de Automação em Operação
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {rpaTasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900 p-5 transition-all hover:border-yellow-400/40"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400/10 text-yellow-400 font-bold text-xs">
                    <Bot className="h-4 w-4" />
                  </span>
                  <h3 className="font-bold text-sm text-zinc-100">{task.name}</h3>
                  <span className="rounded-full bg-green-500/10 border border-green-500/30 px-2 py-0.5 text-xs font-bold text-green-400">
                    Ativo
                  </span>
                </div>
                <p className="text-xs text-zinc-400">{task.description}</p>
                <div className="flex flex-wrap gap-4 pt-1 text-xs text-zinc-500">
                  <span>Frequência recomendada: <strong className="text-zinc-300 font-medium">{task.frequency}</strong></span>
                  <span>Última execução: <strong className="text-zinc-300 font-medium">{formatRun(rpa.lastRunOf(task.id))}</strong></span>
                  <span>Execuções registradas: <strong className="text-zinc-300 font-medium">{rpa.countOf(task.id)}</strong></span>
                </div>
              </div>

              <div className="w-full md:w-auto">
                <button
                  onClick={() => triggerRpa(task.id, task.name)}
                  disabled={runningId === task.id}
                  className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl border border-yellow-400/60 bg-yellow-400/10 px-4 py-2.5 text-xs font-bold text-yellow-400 hover:bg-yellow-400 hover:text-zinc-950 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {runningId === task.id ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Executando...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>Executar Agora</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
