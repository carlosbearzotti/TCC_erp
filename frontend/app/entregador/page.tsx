"use client";

import React, { useState, useRef } from "react";
import useSWR, { mutate } from "swr";
import { api, fetcher } from "@/services/api";
import {
  Home,
  Clock,
  Wallet,
  User,
  Search,
  MapPin,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  Shield,
  Phone,
  Power,
  RefreshCw,
  Plus,
  X,
  Camera,
  ChevronRight,
  Package,
  DollarSign,
  Bike,
} from "lucide-react";

interface Endereco {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
}

interface ItemPedido {
  id: number;
  produto_nome?: string;
  quantidade: number;
  preco_unitario: string | number;
  subtotal: string | number;
}

interface PedidoEntrega {
  id: number;
  status: string;
  tipo_atendimento: string;
  cliente?: number | null;
  itens: ItemPedido[];
  endereco?: Endereco | null;
  total: string | number;
  payment_method: string;
  valor_recebido?: string | number;
  troco?: string | number;
  codigo_pin_entrega?: string;
  comprovante_entrega_url?: string;
  motivo_falha_entrega?: string;
  created_at: string;
}

interface TurnoResponse {
  ativo: boolean;
  turno: {
    id: number;
    inicio: string;
    duracao_minutos: number;
    saldo_dinheiro: string | number;
    acerto_confirmado: boolean;
  } | null;
}

interface DisponibilidadeResponse {
  is_online: boolean;
  role: string;
}

export default function EntregadorApp() {
  const [activeTab, setActiveTab] = useState<"home" | "orders" | "cart" | "profile">("home");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Modais de Ação
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<PedidoEntrega | null>(null);
  const [selectedOrderForFailure, setSelectedOrderForFailure] = useState<PedidoEntrega | null>(null);
  const [failureReason, setFailureReason] = useState("Cliente ausente");
  const [otherReasonText, setOtherReasonText] = useState("");
  const [validationMethod, setValidationMethod] = useState<"pin" | "assinatura" | "foto">("pin");
  const [pinInput, setPinInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Canvas Assinatura
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Data Fetching
  const { data: entregas, mutate: mutateEntregas } = useSWR<PedidoEntrega[]>(
    "/orders/minhas-entregas/",
    fetcher,
    { refreshInterval: 5000 }
  );

  const { data: allOrders } = useSWR<PedidoEntrega[]>(
    "/orders/",
    fetcher,
    { refreshInterval: 10000 }
  );

  const { data: turnoData, mutate: mutateTurno } = useSWR<TurnoResponse>(
    "/core/turnos/ativo/",
    fetcher,
    { refreshInterval: 10000 }
  );

  const { data: dispData, mutate: mutateDisp } = useSWR<DisponibilidadeResponse>(
    "/users/disponibilidade/",
    fetcher,
    { refreshInterval: 10000 }
  );

  // Filtros de Pedidos
  const activeOrders = (entregas || []).filter(
    (p) => ["confirmado", "em_preparo", "pronto", "retornando_base"].includes(p.status)
  );

  const completedOrders = (allOrders || []).filter(
    (p) => ["entregue", "finalizado"].includes(p.status) && p.tipo_atendimento === "delivery"
  );

  const filteredActiveOrders = activeOrders.filter((p) => {
    const matchStatus = filterStatus === null || p.status === filterStatus;
    const matchSearch =
      p.id.toString().includes(search) ||
      (p.endereco?.logradouro && p.endereco.logradouro.toLowerCase().includes(search.toLowerCase())) ||
      (p.endereco?.bairro && p.endereco.bairro.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  // Ações de Turno e Disponibilidade
  const handleToggleDisponibilidade = async () => {
    try {
      await api.post("/users/disponibilidade/", {
        is_online: !dispData?.is_online,
      });
      await mutateDisp();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao alterar disponibilidade.");
    }
  };

  const handleCheckin = async () => {
    try {
      await api.post("/core/turnos/checkin/");
      await mutateTurno();
      await mutateDisp();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao iniciar turno.");
    }
  };

  const handleCheckout = async () => {
    if (!confirm("Deseja encerrar seu turno e fechar o caixa de hoje?")) return;
    try {
      await api.post("/core/turnos/checkout/");
      await mutateTurno();
      await mutateDisp();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao encerrar turno.");
    }
  };

  // Navegação Waze / Maps
  const formatEndereco = (end?: Endereco | null) => {
    if (!end) return "";
    return `${end.logradouro}, ${end.numero} - ${end.bairro}, ${end.cidade} - ${end.uf}`;
  };

  const handleOpenWaze = (end?: Endereco | null) => {
    const q = encodeURIComponent(formatEndereco(end));
    window.open(`https://waze.com/ul?q=${q}&navigate=yes`, "_blank");
  };

  const handleOpenGoogleMaps = (end?: Endereco | null) => {
    const q = encodeURIComponent(formatEndereco(end));
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
  };

  // Prova de Entrega (POD)
  const handleConfirmarEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForDelivery) return;

    setActionLoading(true);
    try {
      let comprovanteUrl = "";
      if (validationMethod === "assinatura") {
        if (!hasSignature) {
          alert("Por favor, peça ao cliente para assinar na tela.");
          setActionLoading(false);
          return;
        }
        comprovanteUrl = canvasRef.current ? canvasRef.current.toDataURL("image/png") : "assinatura_ok";
      } else if (validationMethod === "foto") {
        comprovanteUrl = "https://storage.empresa.com/comprovante_foto.jpg";
      }

      await api.post(`/orders/${selectedOrderForDelivery.id}/confirmar-entrega/`, {
        metodo_validacao: validationMethod,
        pin: pinInput,
        comprovante_url: comprovanteUrl,
      });

      await mutateEntregas();
      await mutateTurno();
      setSelectedOrderForDelivery(null);
      setPinInput("");
      setHasSignature(false);
      alert("Entrega confirmada com sucesso!");
    } catch (err: any) {
      alert(err.response?.data?.detail || err.response?.data?.pin || "Erro ao confirmar entrega.");
    } finally {
      setActionLoading(false);
    }
  };

  // Falha na Entrega
  const handleReportarFalha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForFailure) return;

    setActionLoading(true);
    try {
      const motivoFinal = failureReason === "Outro" ? otherReasonText : failureReason;
      await api.post(`/orders/${selectedOrderForFailure.id}/falha-entrega/`, {
        motivo: motivoFinal,
      });

      await mutateEntregas();
      setSelectedOrderForFailure(null);
      setOtherReasonText("");
      alert("Falha registrada. O pedido agora consta como 'Retornando à base'!");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao reportar falha.");
    } finally {
      setActionLoading(false);
    }
  };

  // Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 2.5;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Carteira
  const pedidosDinheiro = (entregas || []).filter((p) => p.payment_method === "dinheiro");
  const totalEmDinheiro = pedidosDinheiro.reduce((sum, p) => sum + Number(p.total), 0);

  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-950 p-0 sm:p-6">
      {/* Moldura do Smartphone (Exatamente o mesmo modelo do App Cliente) */}
      <div className="relative flex h-full max-h-230 w-full max-w-md flex-col overflow-hidden rounded-none sm:rounded-[40px] border-0 sm:border-8 sm:border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/80">
        
        {/* Top Notch Bar */}
        <div className="flex items-center justify-between bg-zinc-950 px-6 pt-3 pb-2 text-[11px] font-semibold text-zinc-400">
          <span>09:41</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-400" />
            <span className="h-2 w-2 rounded-full bg-zinc-400" />
            <span className="h-2 w-3 rounded-sm border border-zinc-400 bg-zinc-400" />
          </div>
        </div>

        {/* Dynamic App Content */}
        <div className="flex-1 overflow-y-auto pb-20">

          {/* TAB 1: HOME (ENTREGAS ATIVAS) */}
          {activeTab === "home" && (
            <div className="space-y-4 px-4 pt-2">
              
              {/* Header do Entregador */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 font-bold text-zinc-950 shadow-md shadow-yellow-400/20">
                    <Bike className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[15px] font-black text-zinc-100">Entregador Próprio</p>
                    <p className="text-xs text-zinc-400">
                      {turnoData?.ativo ? "Em turno" : "Fora de turno"}
                    </p>
                  </div>
                </div>

                {/* Botão de Disponibilidade (Pílula) */}
                <button
                  onClick={handleToggleDisponibilidade}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all ${
                    dispData?.is_online
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-sm"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      dispData?.is_online ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                    }`}
                  />
                  <span>{dispData?.is_online ? "Visível" : "Invisível"}</span>
                </button>
              </div>

              {/* Banner de Turno / Ponto */}
              {!turnoData?.ativo ? (
                <div className="flex items-center justify-between rounded-2xl border border-yellow-400 bg-zinc-900 p-4 shadow-sm mt-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400/20 shrink-0">
                      <Clock className="h-5 w-5 text-yellow-400" />
                    </div>
                    <span className="text-[11px] leading-snug text-zinc-300 max-w-35">
                      Inicie seu turno para poder receber entregas e ficar online.
                    </span>
                  </div>
                  <button
                    onClick={handleCheckin}
                    className="shrink-0 rounded-xl bg-yellow-400 px-4 py-2.5 text-xs font-black text-zinc-950 hover:bg-yellow-300 shadow-sm"
                  >
                    Bater Ponto
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-[11px] mt-4">
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    Turno em andamento: <strong>{turnoData.turno?.duracao_minutos || 0} min</strong>
                  </span>
                  <button
                    onClick={handleCheckout}
                    className="text-red-400 font-semibold hover:underline px-2"
                  >
                    Encerrar Ponto
                  </button>
                </div>
              )}

              {/* Barra de Busca */}
              <div className="relative mt-4">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar entrega, rua ou pedido..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/90 pl-10 pr-4 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                />
              </div>

              {/* Filtros em Pílula */}
              <div className="mt-3">
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    onClick={() => setFilterStatus(null)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      filterStatus === null
                        ? "bg-yellow-400 text-zinc-950 shadow-md shadow-yellow-400/20"
                        : "border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <span>✨ Todas ({activeOrders.length})</span>
                  </button>
                  <button
                    onClick={() => setFilterStatus("pronto")}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      filterStatus === "pronto"
                        ? "bg-yellow-400 text-zinc-950 shadow-md shadow-yellow-400/20"
                        : "border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <span>📦 Prontas</span>
                  </button>
                  <button
                    onClick={() => setFilterStatus("em_preparo")}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      filterStatus === "em_preparo"
                        ? "bg-yellow-400 text-zinc-950 shadow-md shadow-yellow-400/20"
                        : "border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <span>🍳 Cozinha</span>
                  </button>
                  <button
                    onClick={() => setFilterStatus("retornando_base")}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      filterStatus === "retornando_base"
                        ? "bg-yellow-400 text-zinc-950 shadow-md shadow-yellow-400/20"
                        : "border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <span>🔄 Retorno</span>
                  </button>
                </div>
              </div>

              {/* Lista de Entregas Designadas */}
              <div className="mt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="flex items-center text-xs font-black tracking-wide text-zinc-100 uppercase">
                    <Package className="mr-2 h-4 w-4 text-yellow-400" /> MINHAS ENTREGAS ATIVAS ({activeOrders.length})
                  </h4>
                  <span className="text-[10px] font-medium text-zinc-500">
                    Máx: 4 simultâneas
                  </span>
                </div>

                {activeOrders.length === 0 ? (
                  <div className="flex h-56 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-800/80 bg-zinc-900/30 p-6 text-center text-zinc-500">
                    <Bike className="h-12 w-12 text-zinc-700 mb-4 opacity-60" />
                    <p className="font-bold text-[15px] text-zinc-300">Nenhuma entrega atribuída no momento</p>
                    <p className="text-xs text-zinc-500 mt-2 max-w-55 leading-relaxed">
                      Fique disponível para a loja despachar pedidos para você.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredActiveOrders.map((pedido) => {
                      const isRetornando = pedido.status === "retornando_base";
                      return (
                        <div
                          key={pedido.id}
                          className={`rounded-2xl border p-4 transition-all ${
                            isRetornando
                              ? "border-red-500/40 bg-red-950/20"
                              : "border-zinc-800/80 bg-zinc-900 hover:border-zinc-700"
                          }`}
                        >
                          <div className="flex items-start justify-between border-b border-zinc-800/60 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold text-zinc-100">
                                  Pedido #{pedido.id}
                                </span>
                                <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
                                  DELIVERY
                                </span>
                              </div>
                              <span className="text-xs font-medium text-zinc-400">
                                Total: <strong className="text-zinc-100">R$ {Number(pedido.total).toFixed(2)}</strong>
                              </span>
                            </div>

                            {isRetornando ? (
                              <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/30">
                                Retornando
                              </span>
                            ) : (
                              <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                                {pedido.status.toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Alerta de Troco */}
                          {pedido.payment_method === "dinheiro" && (
                            <div className="mt-2.5 rounded-xl border border-amber-500/30 bg-amber-950/30 p-2 text-xs text-amber-200 flex items-center justify-between">
                              <span className="font-semibold flex items-center gap-1 text-[11px]">
                                <DollarSign className="h-3.5 w-3.5 text-amber-400" /> Cobrar Dinheiro
                              </span>
                              {Number(pedido.troco) > 0 ? (
                                <span className="font-bold text-amber-300 text-[11px]">
                                  Troco: R$ {Number(pedido.troco).toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-zinc-400 text-[11px]">Sem troco</span>
                              )}
                            </div>
                          )}

                          {/* Endereço */}
                          <div className="mt-3 flex items-start gap-2 text-xs text-zinc-300">
                            <MapPin className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-zinc-100">
                                {pedido.endereco?.logradouro}, {pedido.endereco?.numero}
                              </p>
                              <p className="text-zinc-400 text-[11px]">
                                {pedido.endereco?.bairro} - {pedido.endereco?.cidade}/{pedido.endereco?.uf}
                              </p>
                              {pedido.endereco?.complemento && (
                                <p className="text-[10px] text-zinc-500">Compl: {pedido.endereco?.complemento}</p>
                              )}
                            </div>
                          </div>

                          {/* Ações Rápidas de Navegação */}
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleOpenWaze(pedido.endereco)}
                              className="flex items-center justify-center gap-1 rounded-xl border border-sky-500/30 bg-sky-950/30 py-2 text-xs font-bold text-sky-400 hover:bg-sky-900/40"
                            >
                              <Navigation className="h-3.5 w-3.5" />
                              <span>Waze</span>
                            </button>

                            <button
                              onClick={() => handleOpenGoogleMaps(pedido.endereco)}
                              className="flex items-center justify-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-950/30 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-900/40"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              <span>Maps</span>
                            </button>
                          </div>

                          {/* Botões de Conclusão / Falha */}
                          <div className="mt-3 flex items-center gap-2 border-t border-zinc-800/60 pt-3">
                            {!isRetornando && (
                              <button
                                onClick={() => setSelectedOrderForFailure(pedido)}
                                className="flex-1 rounded-xl border border-red-500/30 bg-red-950/20 py-2.5 text-xs font-bold text-red-400 hover:bg-red-900/30"
                              >
                                Falha
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedOrderForDelivery(pedido)}
                              className="flex-1 rounded-xl bg-yellow-400 py-2.5 text-xs font-black text-zinc-950 hover:bg-yellow-300 shadow-md shadow-yellow-400/20"
                            >
                              {isRetornando ? "Devolver na Loja" : "Concluir Entrega"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PEDIDOS (HISTÓRICO CONCLUÍDO) */}
          {activeTab === "orders" && (
            <div className="px-4 pt-2 space-y-3">
              <h3 className="text-sm font-bold text-zinc-100">Histórico de Entregas</h3>
              {completedOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500 text-xs">
                  <Clock className="h-10 w-10 text-zinc-700 opacity-40 mb-2" />
                  <p>Nenhuma entrega finalizada ainda.</p>
                </div>
              ) : (
                completedOrders.slice(0, 10).map((ord) => (
                  <div key={ord.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-yellow-400">Pedido #{ord.id}</span>
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 capitalize">
                        • {ord.status}
                      </span>
                    </div>
                    <p className="text-zinc-400 truncate text-[11px]">
                      {ord.endereco?.logradouro}, {ord.endereco?.numero} - {ord.endereco?.bairro}
                    </p>
                    <div className="flex justify-between text-zinc-400 pt-1 border-t border-zinc-800/60">
                      <span>Total:</span>
                      <span className="font-bold text-zinc-100">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(ord.total))}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: CARTEIRA / RESUMO DE CAIXA */}
          {activeTab === "cart" && (
            <div className="px-4 pt-2 space-y-4">
              <h3 className="text-sm font-bold text-zinc-100">Resumo de Caixa do Turno</h3>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Wallet className="h-4 w-4 text-yellow-400" />
                    Saldo a Repassar
                  </span>
                  <span className="text-xs font-mono text-emerald-400">
                    {turnoData?.ativo ? "Turno Ativo" : "Fechado"}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-zinc-400">Total em Dinheiro Retido:</span>
                  <div className="text-3xl font-black font-mono text-yellow-400">
                    R$ {Number(turnoData?.turno?.saldo_dinheiro || totalEmDinheiro).toFixed(2)}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Calculado a partir de {pedidosDinheiro.length} pedido(s) pagos em espécie.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs space-y-2 text-zinc-300">
                  <div className="flex justify-between">
                    <span>Tempo de Turno:</span>
                    <span className="font-semibold">{turnoData?.turno?.duracao_minutos || 0} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Acerto com a Gerência:</span>
                    <span className="font-semibold text-yellow-400">
                      {turnoData?.turno?.acerto_confirmado ? "Confirmado" : "Pendente"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={!turnoData?.ativo}
                  className="w-full rounded-2xl bg-yellow-400 py-3.5 text-center text-xs font-black text-zinc-950 shadow-lg shadow-yellow-400/20 disabled:opacity-40"
                >
                  Solicitar Acerto &amp; Fechar Caixa
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: CONTA / PERFIL */}
          {activeTab === "profile" && (
            <div className="px-4 pt-2 space-y-4 text-xs">
              <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400 text-lg font-black text-zinc-950">
                  🛵
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-100">Entregador Próprio</p>
                  <p className="text-[11px] text-zinc-400">
                    {dispData?.is_online ? "Status: Online (Disponível)" : "Status: Pausa (Invisível)"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
                <div
                  onClick={turnoData?.ativo ? handleCheckout : handleCheckin}
                  className="p-3.5 flex justify-between items-center text-zinc-200 cursor-pointer hover:bg-zinc-800/50"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Power className="h-4 w-4 text-yellow-400" />
                    {turnoData?.ativo ? "Encerrar Ponto / Turno" : "Bater Ponto / Iniciar"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-500" />
                </div>

                <div
                  onClick={handleToggleDisponibilidade}
                  className="p-3.5 flex justify-between items-center text-zinc-200 cursor-pointer hover:bg-zinc-800/50"
                >
                  <span>Alternar Disponibilidade</span>
                  <span className={`text-xs font-bold ${dispData?.is_online ? "text-emerald-400" : "text-zinc-500"}`}>
                    {dispData?.is_online ? "Online" : "Pausa"}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* BOTTOM NAVIGATION BAR (Exatamente igual ao App do Cliente) */}
        <nav className="absolute bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t border-zinc-800/80 bg-zinc-950/95 px-4 backdrop-blur-md">
          {[
            { id: "home", label: "Entregas", icon: Package },
            { id: "orders", label: "Histórico", icon: Clock },
            { id: "cart", label: "Carteira", icon: Wallet, badge: pedidosDinheiro.length },
            { id: "profile", label: "Conta", icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex flex-col items-center gap-1 transition-colors ${
                  isActive ? "text-yellow-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-[11px]">{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-[9px] font-bold text-zinc-950">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* MODAL PROVA DE ENTREGA (POD) */}
        {selectedOrderForDelivery && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center p-0 sm:p-4">
            <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-4xl sm:rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-yellow-400" />
                  Prova de Entrega (Pedido #{selectedOrderForDelivery.id})
                </h3>
                <button
                  onClick={() => setSelectedOrderForDelivery(null)}
                  className="rounded-lg p-1 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Seletor de Método de Comprovação */}
              <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                <button
                  type="button"
                  onClick={() => setValidationMethod("pin")}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    validationMethod === "pin" ? "bg-yellow-400 text-zinc-950" : "text-zinc-400"
                  }`}
                >
                  Código PIN
                </button>
                <button
                  type="button"
                  onClick={() => setValidationMethod("assinatura")}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    validationMethod === "assinatura" ? "bg-yellow-400 text-zinc-950" : "text-zinc-400"
                  }`}
                >
                  Assinatura
                </button>
                <button
                  type="button"
                  onClick={() => setValidationMethod("foto")}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    validationMethod === "foto" ? "bg-yellow-400 text-zinc-950" : "text-zinc-400"
                  }`}
                >
                  Foto
                </button>
              </div>

              <form onSubmit={handleConfirmarEntrega} className="mt-4 space-y-4">
                {validationMethod === "pin" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-zinc-400">
                      Digite o PIN de 4 dígitos informado pelo cliente:
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      required
                      placeholder="Ex: 1234"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      className="w-full text-center text-2xl font-extrabold tracking-widest font-mono rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-yellow-400 focus:border-yellow-400 focus:outline-none"
                    />
                    <p className="text-[11px] text-zinc-500 text-center">
                      Código exibido na tela do cliente para segurança.
                    </p>
                  </div>
                )}

                {validationMethod === "assinatura" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-400">
                        Assinatura na tela do aparelho:
                      </label>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-[11px] font-semibold text-yellow-400 hover:underline"
                      >
                        Limpar
                      </button>
                    </div>

                    <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-1">
                      <canvas
                        ref={canvasRef}
                        width={300}
                        height={120}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full touch-none cursor-crosshair rounded-lg bg-zinc-950"
                      />
                    </div>
                  </div>
                )}

                {validationMethod === "foto" && (
                  <div className="space-y-2 text-center">
                    <label className="block text-xs font-medium text-zinc-400">
                      Foto do pacote na porta ou entregue:
                    </label>
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-950/60 p-6">
                      <Camera className="h-8 w-8 text-yellow-400 mb-2" />
                      <span className="text-xs text-zinc-400 font-semibold">Tirar Foto com a Câmera</span>
                      <span className="text-[10px] text-zinc-500 mt-1">(Simulação ativa para o teste)</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full rounded-2xl bg-yellow-400 py-3 text-xs font-black text-zinc-950 shadow-lg shadow-yellow-400/20 hover:bg-yellow-300"
                >
                  {actionLoading ? "Validando..." : "Confirmar e Finalizar"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL FALHA NA ENTREGA */}
        {selectedOrderForFailure && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center p-0 sm:p-4">
            <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Falha na Entrega (Pedido #{selectedOrderForFailure.id})
                </h3>
                <button
                  onClick={() => setSelectedOrderForFailure(null)}
                  className="rounded-lg p-1 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleReportarFalha} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Selecione o motivo:
                  </label>
                  <select
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-xs text-zinc-100 focus:border-yellow-400 focus:outline-none"
                  >
                    <option value="Cliente ausente">Cliente ausente / Não atende</option>
                    <option value="Endereço incorreto">Endereço incorreto / Não localizado</option>
                    <option value="Recusado pelo cliente">Recusado pelo cliente</option>
                    <option value="Problema mecânico com a moto">Problema mecânico / veículo</option>
                    <option value="Outro">Outro motivo</option>
                  </select>
                </div>

                {failureReason === "Outro" && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Descreva o ocorrido:
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={otherReasonText}
                      onChange={(e) => setOtherReasonText(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-yellow-400 focus:outline-none"
                      placeholder="Ex: interfone estragado e portão trancado..."
                    />
                  </div>
                )}

                <p className="text-[11px] text-zinc-500">
                  O pedido entrará no status <strong>Retornando à base</strong> e alertará a loja.
                </p>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full rounded-2xl bg-red-600 py-3 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-red-500 shadow-lg shadow-red-600/20"
                >
                  {actionLoading ? "Enviando..." : "Confirmar Falha & Retornar à Base"}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
