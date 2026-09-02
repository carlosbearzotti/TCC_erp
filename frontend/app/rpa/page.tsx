"use client"

import { useState } from "react"
import { Bot, Zap, CheckCircle2, Play, RefreshCw, AlertTriangle, ShieldCheck } from "lucide-react"
import { Button } from "../../components/ui/button"

const rpaTasks = [
  {
    id: "rpa-01",
    name: "Robô de Emissão & Sincronização de Pedidos",
    description: "Captura pedidos do app mobile e balcão, enviando automaticamente para a fila de preparo e módulo financeiro.",
    status: "ativo",
    lastRun: "Hoje às 10:15",
    nextRun: "Hoje às 10:45",
    frequency: "A cada 30 min",
    successRate: "99.8%",
  },
  {
    id: "rpa-02",
    name: "Robô de Baixa Automática & Alerta de Estoque",
    description: "Calcula a dedução de insumos com base nas receitas técnicas e emite alertas caso o estoque atinja nível crítico.",
    status: "ativo",
    lastRun: "Hoje às 10:00",
    nextRun: "Hoje às 11:00",
    frequency: "A cada 1 hora",
    successRate: "100%",
  },
  {
    id: "rpa-03",
    name: "Robô de Conciliação Financeira & Fechamento",
    description: "Agrupa os lançamentos de Pix, Cartão e Dinheiro, gerando os relatórios de DRE e fluxo de caixa diário.",
    status: "ativo",
    lastRun: "Ontem às 23:59",
    nextRun: "Hoje às 23:59",
    frequency: "Diário (Fim do turno)",
    successRate: "99.4%",
  },
]

export default function RpaPage() {
  const [runningId, setRunningId] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState("")

  const triggerRpa = (id: string, name: string) => {
    setRunningId(id)
    setTimeout(() => {
      setRunningId(null)
      setSuccessNotice(`Rotina "${name}" executada com sucesso!`)
      setTimeout(() => setSuccessNotice(""), 4000)
    }, 1500)
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
          <p className="mt-2 text-2xl font-black text-zinc-100">48</p>
          <p className="mt-1 text-xs font-medium text-zinc-400">Sem falhas críticas</p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900 p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Tempo Economizado</span>
            <ShieldCheck className="h-4 w-4 text-yellow-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-zinc-100">~ 4.5 h/dia</p>
          <p className="mt-1 text-xs font-medium text-green-400">Automação de processos</p>
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
                  <span className="rounded-full bg-green-500/10 border border-green-500/30 px-2 py-0.5 text-[10px] font-bold text-green-400">
                    Ativo
                  </span>
                </div>
                <p className="text-xs text-zinc-400">{task.description}</p>
                <div className="flex flex-wrap gap-4 pt-1 text-[11px] text-zinc-500">
                  <span>Frequência: <strong className="text-zinc-300 font-medium">{task.frequency}</strong></span>
                  <span>Última execução: <strong className="text-zinc-300 font-medium">{task.lastRun}</strong></span>
                  <span>Próxima: <strong className="text-zinc-300 font-medium">{task.nextRun}</strong></span>
                  <span>Assertividade: <strong className="text-green-400 font-medium">{task.successRate}</strong></span>
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
