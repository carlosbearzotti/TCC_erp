"use client"

import { notify, askConfirm } from "@/components/ui/feedback";
import React, { useState } from "react"
import useSWR, { mutate } from "swr"
import { api, fetcher } from "@/services/api"
import {
  Search,
  RefreshCw,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Banknote,
  Trash2,
  Plus,
  Minus,
  MapPin,
  Flame,
  ArrowRight,
  Archive,
  Eye,
  Edit,
  XCircle,
  X,
  CreditCard,
  QrCode,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Bike,
  Printer,
} from "lucide-react"
import { PaymentModal } from "@/components/orders/PaymentModal"
import { ReceiptPrintModal } from "@/components/orders/ReceiptPrintModal"
import { Can } from "@/components/Can"

interface Endereco {
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
}

interface ItemPedido {
  id: number
  produto: number
  produto_nome?: string
  quantidade: number
  preco_unitario: string | number
  subtotal: string | number
}

interface Pedido {
  id: number
  status: string
  tipo_atendimento: string
  numero_mesa: string
  numero_comanda: string
  cliente?: number | null
  entregador?: number | null
  entregador_nome?: string | null
  codigo_pin_entrega?: string
  comprovante_entrega_url?: string
  motivo_falha_entrega?: string
  itens: ItemPedido[]
  endereco?: Endereco | null
  total: string | number
  payment_method: string
  valor_recebido?: string | number
  troco?: string | number
  created_at: string
  confirmed_at?: string | null
}

interface Produto {
  id: number
  nome: string
  preco: string | number
  disponibilidade: boolean
  categoria_nome?: string
}

export default function GestaoBalcaoPage() {
  const [search, setSearch] = useState("")
  const [filterTab, setFilterTab] = useState<"ativos" | "abertos" | "prontos" | "finalizados" | "todos">("ativos")

  // Modals state
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Pedido | null>(null)
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Pedido | null>(null)
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<Pedido | null>(null)
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Pedido | null>(null)
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<Pedido | null>(null)
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState<Pedido | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [returnSupplies, setReturnSupplies] = useState(false)
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)
  const [actionSuccessMessage, setActionSuccessMessage] = useState("")

  // SWR data fetching
  const { data: entregadoresDisp, mutate: mutateEntregadores } = useSWR<any[]>(
    "/orders/entregadores-disponiveis/",
    fetcher
  )

  // SWR data fetching
  const { data: pedidos, error, isLoading, isValidating } = useSWR<Pedido[]>(
    "/orders/",
    fetcher,
    { refreshInterval: 5000 }
  )

  const { data: produtos } = useSWR<Produto[]>("/catalog/produtos/", fetcher)

  const allOrders = Array.isArray(pedidos) ? pedidos : []

  // Filter orders by tab
  const filteredOrders = allOrders.filter((order) => {
    // Search filter (mesa, comanda, id)
    const matchesSearch =
      search.trim() === "" ||
      order.numero_comanda?.toLowerCase().includes(search.toLowerCase()) ||
      order.numero_mesa?.toLowerCase().includes(search.toLowerCase()) ||
      order.id.toString().includes(search)

    if (!matchesSearch) return false

    // Tab filter
    if (filterTab === "ativos") {
      return ["criado", "confirmado", "em_preparo", "pronto"].includes(order.status)
    }
    if (filterTab === "abertos") {
      return ["criado", "confirmado", "em_preparo"].includes(order.status)
    }
    if (filterTab === "prontos") {
      return order.status === "pronto"
    }
    if (filterTab === "finalizados") {
      return ["finalizado", "entregue"].includes(order.status)
    }
    return true // 'todos'
  })

  // KPI Calculations
  const activeOrdersCount = allOrders.filter((o) =>
    ["criado", "confirmado", "em_preparo", "pronto"].includes(o.status)
  ).length

  const inPrepCount = allOrders.filter((o) =>
    ["confirmado", "em_preparo"].includes(o.status)
  ).length

  const readyCount = allOrders.filter((o) => o.status === "pronto").length

  const todayRevenue = allOrders
    .filter((o) => ["finalizado", "entregue"].includes(o.status))
    .reduce((acc, o) => acc + Number(o.total || 0), 0)

  // Actions
  const handleCancelOrder = async () => {
    if (!selectedOrderForCancel) return
    setLoadingAction(true)
    try {
      await api.patch(`/orders/${selectedOrderForCancel.id}/`, {
        status: "cancelado",
        cancellation_reason: cancelReason || "Cancelado pelo operador no balcão",
        // Antes do preparo o estoque volta sozinho; depois, só se o operador marcar
        ...(["em_preparo", "pronto", "entregue", "retornando_base"].includes(selectedOrderForCancel.status)
          ? { devolver_insumos: returnSupplies }
          : {}),
      })
      mutate("/orders/")
      setSelectedOrderForCancel(null)
      setCancelReason("")
      setReturnSupplies(false)
      showFeedback("Pedido cancelado com sucesso.")
    } catch (err: any) {
      notify(err.response?.data?.detail || "Erro ao cancelar pedido.")
    } finally {
      setLoadingAction(false)
    }
  }

  const handleResendDelivery = async (orderId: number) => {
    setLoadingAction(true)
    try {
      await api.patch(`/orders/${orderId}/`, { status: "pronto" })
      mutate("/orders/")
      showFeedback(`Pedido #${orderId} liberado: atribua um novo entregador.`)
    } catch (err: any) {
      notify(err.response?.data?.detail || "Erro ao reenviar pedido para entrega.")
    } finally {
      setLoadingAction(false)
    }
  }

  const handleAddItemToOrder = async (produtoId: number) => {
    if (!selectedOrderForEdit) return
    setLoadingAction(true)
    try {
      const res = await api.post(`/orders/${selectedOrderForEdit.id}/add-item/`, {
        produto: produtoId,
        quantidade: 1,
      })
      setSelectedOrderForEdit(res.data)
      mutate("/orders/")
      showFeedback("Item adicionado ao pedido!")
    } catch (err: any) {
      notify(err.response?.data?.detail || "Erro ao adicionar item.")
    } finally {
      setLoadingAction(false)
    }
  }

  const handleRemoveItemFromOrder = async (itemId: number) => {
    if (!selectedOrderForEdit) return
    setLoadingAction(true)
    try {
      const res = await api.post(`/orders/${selectedOrderForEdit.id}/remove-item/`, {
        item_id: itemId,
      })
      setSelectedOrderForEdit(res.data)
      mutate("/orders/")
      showFeedback("Item removido do pedido.")
    } catch (err: any) {
      notify(err.response?.data?.detail || "Erro ao remover item.")
    } finally {
      setLoadingAction(false)
    }
  }

  const handleCloseShift = async () => {
    setLoadingAction(true)
    try {
      const res = await api.post("/orders/close-shift/")
      mutate("/orders/")
      setIsCloseShiftOpen(false)
      showFeedback(res.data.message || "Expediente encerrado e pedidos arquivados.")
    } catch (err: any) {
      notify(err.response?.data?.detail || "Erro ao encerrar expediente.")
    } finally {
      setLoadingAction(false)
    }
  }

  const showFeedback = (msg: string) => {
    setActionSuccessMessage(msg)
    setTimeout(() => setActionSuccessMessage(""), 4000)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "criado":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Aberto
          </span>
        )
      case "confirmado":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Confirmado
          </span>
        )
      case "em_preparo":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1 w-fit">
            <Flame className="h-3 w-3" /> Em Preparo
          </span>
        )
      case "pronto":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit animate-pulse">
            <CheckCircle2 className="h-3 w-3" /> Pronto p/ Entrega
          </span>
        )
      case "entregue":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Entregue
          </span>
        )
      case "finalizado":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Pago / Finalizado
          </span>
        )
      case "cancelado":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            Cancelado
          </span>
        )
      case "retornando_base":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1 w-fit animate-pulse">
            <AlertTriangle className="h-3 w-3" /> Retornando à Base
          </span>
        )
      case "arquivado":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400">
            Arquivado
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 p-6 space-y-6 overflow-y-auto">
      {/* Toast Feedback */}
      {actionSuccessMessage && (
        <div className="fixed top-6 right-6 z-50 rounded-2xl bg-emerald-500 text-zinc-950 font-bold px-4 py-3 shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="h-5 w-5" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Alerta Visual de Falha de Entrega (Issue #82) */}
      {allOrders.filter((o) => o.status === "retornando_base").length > 0 && (
        <div className="rounded-2xl border-2 border-red-500/60 bg-red-950/40 p-4 shadow-xl shadow-red-950/50 animate-pulse">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-red-200">
                Atenção: {allOrders.filter((o) => o.status === "retornando_base").length} pedido(s) retornando à base por falha na entrega!
              </h3>
              <div className="mt-2 space-y-1.5">
                {allOrders.filter((o) => o.status === "retornando_base").map((ped) => (
                  <div key={ped.id} className="flex flex-wrap items-center justify-between text-xs text-red-300 bg-red-900/30 rounded-xl px-3 py-2 border border-red-500/30">
                    <div>
                      <strong>Pedido #{ped.id}</strong> ({ped.endereco?.logradouro}, {ped.endereco?.numero}) — Motivo: <span className="font-semibold text-white">{ped.motivo_falha_entrega || "Não informado"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-400">Entregador: {ped.entregador_nome || `#${ped.entregador}`}</span>
                      <button
                        type="button"
                        onClick={() => handleResendDelivery(ped.id)}
                        disabled={loadingAction}
                        className="rounded-lg border border-yellow-400/60 bg-yellow-400/10 px-2 py-1 text-xs font-bold text-yellow-300 hover:bg-yellow-400 hover:text-zinc-950 disabled:opacity-50"
                      >
                        Reenviar entrega
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-50 flex items-center gap-2.5">
            <Receipt className="h-7 w-7 text-yellow-400" />
            Gestão de Pedidos do Balcão
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Painel desktop central para acompanhamento, controle de comandas e fechamento de contas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => mutate("/orders/")}
            disabled={isValidating}
            className="flex items-center gap-2 px-4 h-11 rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs font-bold transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isValidating ? "animate-spin text-yellow-400" : ""}`} />
            <span>Atualizar</span>
          </button>

          <Can do="FECHAR_CAIXA">
            <button
              onClick={() => setIsCloseShiftOpen(true)}
              className="flex items-center gap-2 px-5 h-11 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-xs font-black transition-all shadow-md active:scale-95"
            >
              <Archive className="h-4 w-4" />
              <span>Encerrar Expediente</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Pedidos Ativos
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-yellow-400/10 text-yellow-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-zinc-50 mt-2">{activeOrdersCount}</p>
          <span className="text-xs text-zinc-400">Mesas e balcões abertos</span>
        </div>

        <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Na Cozinha
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-400 mt-2">{inPrepCount}</p>
          <span className="text-xs text-zinc-400">Em preparação agora</span>
        </div>

        <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Prontos
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400 mt-2">{readyCount}</p>
          <span className="text-xs text-zinc-400">Aguardando entrega</span>
        </div>

        <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Faturamento do Turno
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-400/10 text-purple-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-400 mt-2">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(todayRevenue)}
          </p>
          <span className="text-xs text-zinc-400">Receita de pedidos finalizados</span>
        </div>
      </div>

      {/* Control Bar: Search & Tabs */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por Mesa ou Comanda..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-yellow-400"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-x-auto max-w-full">
          <button
            onClick={() => setFilterTab("ativos")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filterTab === "ativos"
                ? "bg-yellow-400 text-zinc-950 shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Ativos ({activeOrdersCount})
          </button>
          <button
            onClick={() => setFilterTab("abertos")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filterTab === "abertos"
                ? "bg-yellow-400 text-zinc-950 shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Em Aberto ({inPrepCount})
          </button>
          <button
            onClick={() => setFilterTab("prontos")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filterTab === "prontos"
                ? "bg-yellow-400 text-zinc-950 shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Prontos ({readyCount})
          </button>
          <button
            onClick={() => setFilterTab("finalizados")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filterTab === "finalizados"
                ? "bg-yellow-400 text-zinc-950 shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Finalizados
          </button>
          <button
            onClick={() => setFilterTab("todos")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filterTab === "todos"
                ? "bg-yellow-400 text-zinc-950 shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Todos ({allOrders.length})
          </button>
        </div>
      </div>

      {/* Orders Desktop Table */}
      <div className="rounded-3xl bg-zinc-900 border border-zinc-800 shadow-xl overflow-hidden flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3 text-zinc-500">
            <RefreshCw className="h-8 w-8 animate-spin text-yellow-400" />
            <p className="text-sm font-semibold">Carregando pedidos...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center space-y-3 text-zinc-500">
            <Receipt className="h-12 w-12 text-zinc-700" />
            <p className="text-base font-bold text-zinc-300">Nenhum pedido encontrado</p>
            <p className="text-xs text-zinc-500 max-w-sm">
              Não há pedidos correspondentes ao filtro selecionado. Novos pedidos abertos no PDV aparecerão aqui em tempo real.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/70 border-b border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="py-4 px-5">Comanda / Mesa</th>
                  <th className="py-4 px-4">Tipo</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Itens</th>
                  <th className="py-4 px-4">Total</th>
                  <th className="py-4 px-4">Pagamento</th>
                  <th className="py-4 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredOrders.map((order) => {
                  const canPay = !["finalizado", "arquivado", "cancelado"].includes(order.status)
                  const canEdit = !["finalizado", "arquivado", "cancelado"].includes(order.status)
                  const canCancel = !["finalizado", "arquivado", "cancelado"].includes(order.status)

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      {/* Comanda & Mesa */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 font-black text-sm">
                            #{order.numero_comanda || order.id}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-100 text-sm block">
                              {order.numero_mesa || "Balcão"}
                            </span>
                            <span className="text-xs text-zinc-500 font-mono">
                              ID #{order.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-4 px-4">
                        <span className="capitalize font-semibold text-zinc-300">
                          {order.tipo_atendimento}
                        </span>
                        {order.tipo_atendimento === "delivery" && order.endereco && (
                          <div className="flex flex-col gap-0.5 mt-1">
                            <div className="flex items-center gap-1 text-xs text-amber-400" title={`${order.endereco.logradouro}, ${order.endereco.numero}`}>
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[120px]">{order.endereco.bairro}</span>
                            </div>
                            {order.entregador_nome ? (
                              <span className="text-xs text-emerald-400 font-semibold">Moto: {order.entregador_nome}</span>
                            ) : ["confirmado", "em_preparo", "pronto", "retornando_base"].includes(order.status) ? (
                              <button
                                onClick={() => setSelectedOrderForAssign(order)}
                                className="text-xs font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded px-1.5 py-0.5 hover:bg-yellow-400 hover:text-zinc-950 w-fit transition-colors"
                              >
                                + Atribuir Moto
                              </button>
                            ) : null}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">{getStatusBadge(order.status)}</td>

                      {/* Itens */}
                      <td className="py-4 px-4">
                        <span className="font-bold text-zinc-200">
                          {order.itens?.length || 0} item(ns)
                        </span>
                        <p className="text-xs text-zinc-500 truncate max-w-[180px]">
                          {order.itens?.map((i) => `${i.quantidade}x ${i.produto_nome || i.produto}`).join(", ")}
                        </p>
                      </td>

                      {/* Total */}
                      <td className="py-4 px-4 font-black text-yellow-400 text-sm">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(Number(order.total || 0))}
                      </td>

                      {/* Pagamento */}
                      <td className="py-4 px-4">
                        <span className="capitalize font-medium text-zinc-300 block">
                          {order.payment_method?.replace("_", " ")}
                        </span>
                        {order.status === "finalizado" && order.troco && Number(order.troco) > 0 && (
                          <span className="text-xs text-emerald-400 font-bold">
                            Troco: R$ {Number(order.troco).toFixed(2)}
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Ver Detalhes */}
                          <button
                            onClick={() => setSelectedOrderForDetails(order)}
                            title="Ver Detalhes"
                            className="p-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Imprimir Cupom */}
                          <button
                            onClick={() => setSelectedOrderForPrint(order)}
                            title="Imprimir Cupom"
                            className="p-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800 transition-colors"
                          >
                            <Printer className="h-4 w-4" />
                          </button>

                          {/* Editar Itens */}
                          {canEdit && (
                            <button
                              onClick={() => setSelectedOrderForEdit(order)}
                              title="Adicionar / Remover Itens"
                              className="p-2 rounded-xl border border-zinc-800 bg-zinc-950 text-amber-400 hover:text-amber-300 hover:bg-zinc-800 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}

                          {/* Cancelar */}
                          {canCancel && (
                            <Can do="CANCELAR_PEDIDO">
                              <button
                                onClick={() => setSelectedOrderForCancel(order)}
                                title="Cancelar Pedido"
                                className="p-2 rounded-xl border border-zinc-800 bg-zinc-950 text-red-400 hover:text-red-300 hover:bg-zinc-800 transition-colors"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </Can>
                          )}

                          {/* Cobrar / Pagar */}
                          {canPay && (
                            <button
                              onClick={() => setSelectedOrderForPayment(order)}
                              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-yellow-400 text-zinc-950 font-extrabold text-xs hover:bg-yellow-300 active:scale-95 transition-all shadow-md shadow-yellow-400/20"
                            >
                              <Banknote className="h-3.5 w-3.5" />
                              <span>Cobrar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {selectedOrderForPayment && (
        <PaymentModal
          order={selectedOrderForPayment}
          onClose={() => setSelectedOrderForPayment(null)}
          onSuccess={() => {
            mutate("/orders/")
            showFeedback("Pagamento concluído e lançado no fluxo de caixa!")
          }}
        />
      )}

      {/* Details Modal */}
      {selectedOrderForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-100">
                  Detalhes do Pedido #{selectedOrderForDetails.id}
                </h3>
                <p className="text-xs text-zinc-400">
                  Comanda #{selectedOrderForDetails.numero_comanda || "S/N"} • {selectedOrderForDetails.numero_mesa}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderForDetails(null)}
                className="p-2 text-zinc-400 hover:text-zinc-200 rounded-full hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Delivery address if exists */}
            {selectedOrderForDetails.endereco && (
              <div className="mb-4 p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300">
                <span className="font-bold text-yellow-400 block mb-1 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> Endereço de Entrega (Delivery):
                </span>
                <p>{selectedOrderForDetails.endereco.logradouro}, {selectedOrderForDetails.endereco.numero} {selectedOrderForDetails.endereco.complemento ? `- ${selectedOrderForDetails.endereco.complemento}` : ""}</p>
                <p className="text-zinc-400">{selectedOrderForDetails.endereco.bairro} • {selectedOrderForDetails.endereco.cidade}/{selectedOrderForDetails.endereco.uf} (CEP: {selectedOrderForDetails.endereco.cep})</p>
              </div>
            )}

            {/* Itens List */}
            <div className="space-y-2 mb-4 max-h-56 overflow-y-auto">
              {selectedOrderForDetails.itens?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs"
                >
                  <span className="font-bold text-zinc-200">
                    {item.quantidade}x {item.produto_nome || `Item #${item.produto}`}
                  </span>
                  <span className="font-black text-yellow-400">
                    R$ {Number(item.subtotal || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs space-y-1.5">
              <div className="flex justify-between text-zinc-400">
                <span>Status:</span>
                <span>{getStatusBadge(selectedOrderForDetails.status)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Forma de Pagamento:</span>
                <span className="capitalize font-semibold text-zinc-200">{selectedOrderForDetails.payment_method?.replace("_", " ")}</span>
              </div>
              {selectedOrderForDetails.valor_recebido && Number(selectedOrderForDetails.valor_recebido) > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Valor Recebido:</span>
                  <span className="text-zinc-200">R$ {Number(selectedOrderForDetails.valor_recebido).toFixed(2)}</span>
                </div>
              )}
              {selectedOrderForDetails.troco && Number(selectedOrderForDetails.troco) > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Troco:</span>
                  <span>R$ {Number(selectedOrderForDetails.troco).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-yellow-400 pt-2 border-t border-zinc-800">
                <span>Total:</span>
                <span>R$ {Number(selectedOrderForDetails.total || 0).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedOrderForPrint(selectedOrderForDetails)}
              className="w-full mt-4 h-11 rounded-2xl border border-yellow-400/60 bg-yellow-400/10 hover:bg-yellow-400 hover:text-zinc-950 text-yellow-400 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimir Cupom
            </button>

            <button
              onClick={() => setSelectedOrderForDetails(null)}
              className="w-full mt-2 h-11 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {selectedOrderForPrint && (
        <ReceiptPrintModal order={selectedOrderForPrint} onClose={() => setSelectedOrderForPrint(null)} />
      )}

      {/* Edit Items Modal */}
      {selectedOrderForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-100">
                  Editar Itens do Pedido #{selectedOrderForEdit.id}
                </h3>
                <p className="text-xs text-zinc-400">
                  Comanda #{selectedOrderForEdit.numero_comanda || "S/N"} • {selectedOrderForEdit.numero_mesa}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderForEdit(null)}
                className="p-2 text-zinc-400 hover:text-zinc-200 rounded-full hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Current Items */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Itens Atuais no Pedido:
              </span>
              {selectedOrderForEdit.itens?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 border border-zinc-800"
                >
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">
                      {item.quantidade}x {item.produto_nome || `Produto #${item.produto}`}
                    </span>
                    <span className="text-xs text-zinc-400">
                      R$ {Number(item.preco_unitario).toFixed(2)} un. • Subtotal: R$ {Number(item.subtotal).toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveItemFromOrder(item.id)}
                    disabled={loadingAction}
                    title="Remover este item"
                    className="p-2 rounded-xl text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Products Quick List */}
            <div className="border-t border-zinc-800 pt-3">
              <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 block mb-2">
                + Adicionar Produto ao Pedido:
              </span>
              <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1">
                {(Array.isArray(produtos) ? produtos : []).filter((p) => p.disponibilidade).map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => handleAddItemToOrder(prod.id)}
                    disabled={loadingAction}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-yellow-400/50 hover:bg-zinc-800/40 text-left transition-all"
                  >
                    <div className="min-w-0 pr-1">
                      <p className="text-xs font-bold text-zinc-200 truncate">{prod.nome}</p>
                      <p className="text-xs text-yellow-400 font-bold">R$ {Number(prod.preco).toFixed(2)}</p>
                    </div>
                    <Plus className="h-4 w-4 text-yellow-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedOrderForEdit(null)}
              className="w-full mt-4 h-11 rounded-2xl bg-yellow-400 text-zinc-950 font-bold text-xs hover:bg-yellow-300 transition-colors shadow-lg"
            >
              Concluir Edição
            </button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {selectedOrderForCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl relative text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-red-400 ring-8 ring-red-500/10 mb-3">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-black text-zinc-100">
              Cancelar Pedido #{selectedOrderForCancel.id}?
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Esta ação cancelará a comanda #{selectedOrderForCancel.numero_comanda} ({selectedOrderForCancel.numero_mesa}).
            </p>

            <div className="mt-4 text-left">
              <label htmlFor="f-appgestaopage-1" className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1 block">
                Motivo do cancelamento:
              </label>
              <input id="f-appgestaopage-1"
                type="text"
                placeholder="Ex: Cliente desistiu, erro na digitação..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-red-500"
              />
            </div>

            {["em_preparo", "pronto", "entregue", "retornando_base"].includes(selectedOrderForCancel.status) && (
              <label className="mt-3 flex items-start gap-2 text-left text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={returnSupplies}
                  onChange={(e) => setReturnSupplies(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 accent-yellow-400"
                />
                <span>
                  Devolver insumos ao estoque (ingredientes não utilizados). Se desmarcado, o consumo é mantido como perda.
                </span>
              </label>
            )}

            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => { setSelectedOrderForCancel(null); setReturnSupplies(false) }}
                className="flex-1 h-11 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={loadingAction}
                className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-xs transition-colors shadow-lg shadow-red-500/20"
              >
                {loadingAction ? "Cancelando..." : "Confirmar Cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {isCloseShiftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl relative text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 ring-8 ring-amber-500/10 mb-3">
              <Archive className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-black text-zinc-100">
              Encerrar Expediente do Balcão?
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Todos os pedidos finalizados e cancelados serão arquivados, limpando a tela para o próximo turno.
            </p>

            <div className="p-3.5 my-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-left text-xs space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Faturamento a ser fechado:</span>
                <span className="font-bold text-yellow-400">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(todayRevenue)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Pedidos a serem arquivados:</span>
                <span className="font-bold text-zinc-200">
                  {allOrders.filter((o) => ["finalizado", "cancelado"].includes(o.status)).length} pedidos
                </span>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setIsCloseShiftOpen(false)}
                className="flex-1 h-11 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCloseShift}
                disabled={loadingAction}
                className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-xs transition-colors shadow-lg shadow-red-500/20"
              >
                {loadingAction ? "Arquivando..." : "Sim, Encerrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Atribuir Entregador (Issues #75 e #78) */}
      {selectedOrderForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Bike className="h-5 w-5 text-yellow-400" />
                <h3 className="text-base font-bold text-zinc-100">
                  Despachar Pedido #{selectedOrderForAssign.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrderForAssign(null)}
                className="rounded-lg p-1 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-3">
              Selecione um entregador próprio disponível (online e dentro do limite simultâneo):
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {(!Array.isArray(entregadoresDisp) || entregadoresDisp.length === 0) ? (
                <div className="p-4 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                  Nenhum entregador cadastrado no sistema.
                </div>
              ) : (
                entregadoresDisp.map((ent: any) => (
                  <div
                    key={ent.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      ent.disponivel_para_atribuir
                        ? "border-zinc-800 bg-zinc-950/60 hover:border-yellow-400/50"
                        : "border-zinc-900 bg-zinc-950/20 opacity-50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-100">{ent.nome}</span>
                        <span
                          className={`h-2 w-2 rounded-full ${
                            ent.is_online ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
                          }`}
                        />
                      </div>
                      <p className="text-xs text-zinc-400">
                        {ent.is_online ? "Online" : "Offline / Em Pausa"} • {ent.entregas_ativas}/{ent.limite_maximo} ativas
                      </p>
                    </div>

                    <button
                      disabled={!ent.disponivel_para_atribuir || loadingAction}
                      onClick={async () => {
                        setLoadingAction(true);
                        try {
                          await api.post(`/orders/${selectedOrderForAssign.id}/atribuir-entregador/`, {
                            entregador_id: ent.id,
                          });
                          await mutate("/orders/");
                          await mutateEntregadores();
                          setSelectedOrderForAssign(null);
                          showFeedback(`Pedido atribuído ao entregador ${ent.nome} com sucesso!`);
                        } catch (err: any) {
                          notify(err.response?.data?.entregador_id || err.response?.data?.detail || "Erro ao atribuir entregador.");
                        } finally {
                          setLoadingAction(false);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-yellow-400 text-zinc-950 font-bold text-xs hover:bg-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                    >
                      {loadingAction ? "Atribuindo..." : "Selecionar"}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedOrderForAssign(null)}
                className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 text-xs font-semibold hover:bg-zinc-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
