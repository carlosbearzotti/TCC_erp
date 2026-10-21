"use client"

import { notify, askConfirm } from "@/components/ui/feedback";
import { useEffect, useRef, useState } from "react"
import useSWR, { mutate } from "swr"
import api, { fetcher } from "../../services/api"
import { Button } from "../../components/ui/button"
import { ReceiptPrintModal } from "../../components/orders/ReceiptPrintModal"
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  Flame, 
  RefreshCw, 
  Utensils, 
  Send,
  AlertCircle,
  Hash,
  MapPin,
  Volume2,
  VolumeX,
  Bell,
  Printer,
} from "lucide-react"

interface ItemPreparo {
  id: number
  produto: number
  produto_nome?: string
  quantidade: number
  preco_unitario: number | string
  subtotal: number | string
}

interface EnderecoPreparo {
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
}

interface Preparo {
  id: number
  pedido_id: number
  pedido_status: string
  tipo_atendimento: string
  numero_mesa: string
  numero_comanda: string
  endereco?: EnderecoPreparo | null
  itens: ItemPreparo[]
  total: number | string
  status: "pendente" | "em_preparo" | "pronto" | "entregue"
  entered_at: string
  started_at: string | null
  finished_at: string | null
}

export default function CozinhaKDS() {
  const [filterStatus, setFilterStatus] = useState<string>("todos")
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)
  const [printOrder, setPrintOrder] = useState<Preparo | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const knownIds = useRef<Set<number> | null>(null)
  const audioCtx = useRef<AudioContext | null>(null)
  const soundRef = useRef(true)

  const { data: preparos, error, isLoading, isValidating } = useSWR<Preparo[]>(
    "/preparation/",
    fetcher,
    { refreshInterval: 4000 }
  )

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kds-sound")
      if (saved !== null) {
        setSoundEnabled(saved === "on")
        soundRef.current = saved === "on"
      }
    } catch {}
  }, [])

  const playBell = () => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      if (!Ctx) return
      const ctx = audioCtx.current ?? (audioCtx.current = new Ctx())
      if (ctx.state === "suspended") ctx.resume()
      const now = ctx.currentTime
      // Dois tons harmônicos de sino: 587Hz (Ré5) e 880Hz (Lá5)
      ;[587, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const start = now + i * 0.18
        osc.type = "sine"
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.1)
        osc.connect(gain).connect(ctx.destination)
        osc.start(start)
        osc.stop(start + 1.2)
      })
    } catch (err) {
      console.error("Falha ao tocar alerta sonoro:", err)
    }
  }

  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    soundRef.current = next
    try {
      localStorage.setItem("kds-sound", next ? "on" : "off")
    } catch {}
    if (next) playBell() // também desbloqueia o áudio no navegador
  }

  // Detecta novos pedidos na fila e toca a campainha
  useEffect(() => {
    if (!Array.isArray(preparos)) return
    const current = preparos.filter((p) => p.status === "pendente" || p.status === "em_preparo")
    if (knownIds.current === null) {
      knownIds.current = new Set(preparos.map((p) => p.id))
      return
    }
    const known = knownIds.current
    const hasNew = current.some((p) => !known.has(p.id))
    preparos.forEach((p) => known.add(p.id))
    if (hasNew && soundRef.current) playBell()
  }, [preparos])

  const handleStart = async (id: number) => {
    setActionLoadingId(id)
    try {
      await api.post(`/preparation/${id}/start/`)
      mutate("/preparation/")
    } catch (err: any) {
      console.error("Erro ao iniciar preparo:", err)
      notify("Falha ao iniciar preparo do pedido.")
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleComplete = async (id: number) => {
    setActionLoadingId(id)
    try {
      await api.post(`/preparation/${id}/complete/`)
      mutate("/preparation/")
    } catch (err: any) {
      console.error("Erro ao concluir preparo:", err)
      notify("Falha ao marcar pedido como pronto.")
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeliver = async (id: number) => {
    setActionLoadingId(id)
    try {
      await api.post(`/preparation/${id}/deliver/`)
      mutate("/preparation/")
    } catch (err: any) {
      console.error("Erro ao entregar preparo:", err)
      notify("Falha ao marcar pedido como entregue.")
    } finally {
      setActionLoadingId(null)
    }
  }

  const getTimeElapsed = (dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return "Agora mesmo"
    if (mins === 1) return "1 min atrás"
    return `${mins} min atrás`
  }

  const getMinutesCount = (dateString: string) => {
    return Math.floor((Date.now() - new Date(dateString).getTime()) / 60000)
  }

  const activeOrders = Array.isArray(preparos) ? preparos : []

  const filteredOrders = activeOrders.filter((order) => {
    if (filterStatus === "todos") return true
    return order.status === filterStatus
  })

  const countPendente = activeOrders.filter((p) => p.status === "pendente").length
  const countEmPreparo = activeOrders.filter((p) => p.status === "em_preparo").length
  const countPronto = activeOrders.filter((p) => p.status === "pronto").length

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400 text-zinc-950 shadow-lg shadow-yellow-400/20">
              <ChefHat className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-50 flex items-center gap-2.5">
                KDS — Cozinha &amp; Preparo
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs font-semibold border border-green-500/20">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  Tempo Real
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Fila de produção organizada por ordem cronológica de chegada (FIFO).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status counters */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold bg-zinc-900 border border-zinc-800 rounded-2xl p-1.5">
            <span className="px-3 py-1 rounded-xl bg-zinc-800 text-zinc-300">
              Fila: {activeOrders.length}
            </span>
            <span className="px-3 py-1 rounded-xl bg-zinc-800 text-amber-300">
              Pendentes: {countPendente}
            </span>
            <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-400">
              No Fogo: {countEmPreparo}
            </span>
            <span className="px-3 py-1 rounded-xl bg-green-500/20 text-green-400">
              Prontos: {countPronto}
            </span>
          </div>

          <Button
            variant="outline"
            onClick={toggleSound}
            title={soundEnabled ? "Silenciar alerta sonoro" : "Ativar alerta sonoro"}
            className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-green-400" /> : <VolumeX className="h-4 w-4 text-red-400" />}
          </Button>
          <Button
            variant="outline"
            onClick={playBell}
            className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs"
          >
            <Bell className="h-4 w-4 mr-1.5 text-yellow-400" />
            Testar Som
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => mutate("/preparation/")}
            title="Atualizar fila de preparo"
            disabled={isValidating}
            className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 ${isValidating ? "animate-spin text-yellow-400" : "text-zinc-400"}`} />
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 py-4">
        {[
          { id: "todos", label: "Todos os Pedidos", count: activeOrders.length },
          { id: "pendente", label: "Pendentes", count: countPendente },
          { id: "em_preparo", label: "Em Preparo", count: countEmPreparo },
          { id: "pronto", label: "Prontos p/ Entrega", count: countPronto },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
              filterStatus === tab.id
                ? "bg-yellow-400 text-zinc-950 border-yellow-400 shadow-md shadow-yellow-400/20"
                : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-xs font-extrabold ${
              filterStatus === tab.id ? "bg-zinc-950 text-yellow-400" : "bg-zinc-800 text-zinc-400"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 flex items-center space-x-3 text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-xs">Não foi possível carregar a fila de preparo. Verifique a conexão com o backend.</p>
        </div>
      )}

      {/* Orders Grid */}
      <div className="flex-1 overflow-y-auto pb-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center space-x-3 text-zinc-500">
            <RefreshCw className="h-6 w-6 animate-spin text-yellow-400" />
            <span className="text-sm font-medium">Carregando comandas da cozinha...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 p-8 text-center text-zinc-500">
            <Utensils className="h-12 w-12 text-zinc-700 mb-3" />
            <p className="font-semibold text-zinc-300">Nenhum pedido na fila de preparo</p>
            <p className="text-xs text-zinc-500 mt-1">Quando um pedido for confirmado no PDV, ele aparecerá aqui automaticamente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order, index) => {
              const minutesWaiting = getMinutesCount(order.entered_at)
              const isDelayed = minutesWaiting >= 15
              const isActionLoading = actionLoadingId === order.id

              return (
                <div
                  key={order.id}
                  className={`flex flex-col justify-between rounded-3xl border transition-all shadow-xl ${
                    order.status === "em_preparo"
                      ? "bg-amber-950/20 border-amber-500/40 ring-1 ring-amber-500/20"
                      : order.status === "pronto"
                      ? "bg-green-950/20 border-green-500/40"
                      : "bg-zinc-900/90 border-zinc-800"
                  }`}
                >
                  {/* Top Bar: Comanda & Mesa in big bold display */}
                  <div className="p-4 border-b border-zinc-800/80">
                    <div className="flex items-start justify-between gap-2">
                      {/* Big Comanda & Mesa */}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-yellow-400 text-zinc-950 text-sm font-black shadow-md shadow-yellow-400/20">
                            <Hash className="h-3.5 w-3.5" />
                            {order.numero_comanda || String(order.pedido_id).padStart(4, "0")}
                          </span>
                          <span className="text-xs font-bold text-zinc-400">
                            #{order.pedido_id}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPrintOrder(order)}
                            title="Imprimir comanda"
                            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-yellow-400"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="mt-2 text-xl font-black text-zinc-100 tracking-tight flex items-center gap-1.5">
                          {order.numero_mesa || (order.tipo_atendimento === "balcao" ? "Balcão" : "Mesa")}
                        </div>
                      </div>

                      {/* Status & Arrival badge */}
                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                            order.status === "em_preparo"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : order.status === "pronto"
                              ? "bg-green-500/20 text-green-300 border border-green-500/30"
                              : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                          }`}
                        >
                          {order.status === "em_preparo"
                            ? "Em Preparo"
                            : order.status === "pronto"
                            ? "Pronto"
                            : "Pendente"}
                        </span>
                        <div
                          className={`flex items-center gap-1 text-xs font-semibold ${
                            isDelayed ? "text-red-400 font-bold animate-pulse" : "text-zinc-400"
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          <span>{getTimeElapsed(order.entered_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Address Block */}
                  {order.tipo_atendimento === "delivery" && order.endereco && (
                    <div className="mx-4 mt-3 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2 animate-in fade-in duration-200">
                      <MapPin className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-bold text-amber-300 block">Endereço de Entrega:</span>
                        <p className="truncate font-medium">{order.endereco.logradouro}, {order.endereco.numero} {order.endereco.complemento ? `(${order.endereco.complemento})` : ""}</p>
                        <p className="text-xs text-amber-300/80">{order.endereco.bairro} • {order.endereco.cidade}/{order.endereco.uf} (CEP: {order.endereco.cep})</p>
                      </div>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="p-4 flex-1 space-y-2.5 overflow-y-auto max-h-56">
                    {order.itens && order.itens.length > 0 ? (
                      order.itens.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/60"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-yellow-400/20 text-yellow-400 font-black text-xs border border-yellow-400/30">
                              {item.quantidade}x
                            </span>
                            <span className="text-xs font-bold text-zinc-200 truncate">
                              {item.produto_nome || `Item #${item.produto}`}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-zinc-500 italic">Pedido sem itens listados.</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/40 rounded-b-3xl">
                    {order.status === "pendente" && (
                      <Button
                        className="w-full h-11 bg-yellow-400 text-zinc-950 font-bold hover:bg-yellow-300"
                        onClick={() => handleStart(order.id)}
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Flame className="h-4 w-4 mr-2" />
                        )}
                        Iniciar Preparo
                      </Button>
                    )}

                    {order.status === "em_preparo" && (
                      <Button
                        className="w-full h-11 bg-green-500 text-zinc-950 font-bold hover:bg-green-400 shadow-lg shadow-green-500/20"
                        onClick={() => handleComplete(order.id)}
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Marcar como Pronto
                      </Button>
                    )}

                    {order.status === "pronto" && order.tipo_atendimento === "delivery" && (
                      <div className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-300">
                        <Send className="h-4 w-4" />
                        Aguardando entregador
                      </div>
                    )}

                    {order.status === "pronto" && order.tipo_atendimento !== "delivery" && (
                      <Button
                        className="w-full h-11 bg-zinc-800 text-zinc-100 font-bold hover:bg-zinc-700 border border-zinc-700"
                        onClick={() => handleDeliver(order.id)}
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2 text-green-400" />
                        )}
                        Entregar (Finalizar)
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {printOrder && (
        <ReceiptPrintModal
          variant="cozinha"
          order={{
            id: printOrder.pedido_id,
            numero_comanda: printOrder.numero_comanda,
            numero_mesa: printOrder.numero_mesa,
            tipo_atendimento: printOrder.tipo_atendimento,
            total: printOrder.total,
            endereco: printOrder.endereco,
            itens: printOrder.itens,
          }}
          onClose={() => setPrintOrder(null)}
        />
      )}
    </div>
  )
}
