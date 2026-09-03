"use client";

import React, { useState, useRef } from "react";
import useSWR, { mutate } from "swr";
import { api, fetcher } from "@/services/api";
import {
  Bike,
  MapPin,
  Phone,
  MessageCircle,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Shield,
  KeyRound,
  PenTool,
  Camera,
  X,
  RefreshCw,
  Wallet,
  Package,
  RotateCcw,
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

export default function EntregadorAppPage() {
  const [activeTab, setActiveTab] = useState<"entregas" | "carteira">("entregas");

  // Modals
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<PedidoEntrega | null>(null);
  const [selectedOrderForFailure, setSelectedOrderForFailure] = useState<PedidoEntrega | null>(null);
  const [failureReason, setFailureReason] = useState("Cliente ausente");
  const [otherReasonText, setOtherReasonText] = useState("");
  const [validationMethod, setValidationMethod] = useState<"pin" | "assinatura" | "foto">("pin");
  const [pinInput, setPinInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [solicitouAcerto, setSolicitouAcerto] = useState(false);

  // Canvas para assinatura
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Data fetching
  const { data: entregas, mutate: mutateEntregas } = useSWR<PedidoEntrega[]>(
    "/orders/minhas-entregas/",
    fetcher,
    { refreshInterval: 5000 }
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

  // Toggle de disponibilidade (Issue #78)
  const handleToggleDisponibilidade = async () => {
    try {
      const res = await api.post("/users/disponibilidade/", {
        is_online: !dispData?.is_online,
      });
      await mutateDisp();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao alterar status de disponibilidade.");
    }
  };

  // Turno Checkin / Checkout (Issue #73)
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
    if (!confirm("Deseja encerrar seu turno e fechar a carteira agora?")) return;
    try {
      await api.post("/core/turnos/checkout/");
      await mutateTurno();
      await mutateDisp();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao encerrar turno.");
    }
  };

  // Deep linking para navegação (Issue #81)
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

  // Prova de Entrega (Issue #79)
  const handleConfirmarEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForDelivery) return;

    setActionLoading(true);
    try {
      let comprovanteUrl = "";
      if (validationMethod === "assinatura") {
        if (!hasSignature) {
          alert("Por favor, peça para o recebedor assinar na tela.");
          setActionLoading(false);
          return;
        }
        comprovanteUrl = canvasRef.current ? canvasRef.current.toDataURL("image/png") : "assinatura_digital_ok";
      } else if (validationMethod === "foto") {
        comprovanteUrl = "https://storage.empresa.com/comprovante_foto_mock.jpg";
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
      alert(err.response?.data?.detail || err.response?.data?.pin || "Erro ao validar entrega.");
    } finally {
      setActionLoading(false);
    }
  };

  // Fluxo de Insucesso (Issue #82)
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
      alert("Insucesso registrado. O pedido foi marcado como 'Retornando à base' e a loja foi alertada!");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao registrar falha.");
    } finally {
      setActionLoading(false);
    }
  };

  // Canvas drawing handlers
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

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Cálculos da Carteira (Issue #80)
  const pedidosDinheiro = (entregas || []).filter(
    (p) => p.payment_method === "dinheiro"
  );
  const totalEmDinheiro = pedidosDinheiro.reduce((sum, p) => sum + Number(p.total), 0);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-zinc-950 text-zinc-100 shadow-2xl pb-24">
      {/* Top Header Mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-4 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-zinc-950 shadow-md">
            <Bike className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-100">Entregador Próprio</h1>
            <p className="text-[11px] text-zinc-400">
              {turnoData?.ativo ? "Turno em andamento" : "Fora de turno"}
            </p>
          </div>
        </div>

        {/* Toggle de Disponibilidade (Issue #78) */}
        <button
          onClick={handleToggleDisponibilidade}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all ${
            dispData?.is_online
              ? "border border-emerald-500/40 bg-emerald-500/20 text-emerald-400 shadow-sm shadow-emerald-500/10"
              : "border border-zinc-700 bg-zinc-800 text-zinc-400"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              dispData?.is_online ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
            }`}
          />
          <span>{dispData?.is_online ? "Disponível" : "Invisível"}</span>
        </button>
      </header>

      {/* Alerta caso esteja sem Turno Aberto */}
      {!turnoData?.ativo && (
        <div className="m-4 flex items-center justify-between rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-3.5">
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-yellow-400 shrink-0" />
            <span className="text-xs text-yellow-200">
              Inicie seu turno para poder receber entregas e ficar online.
            </span>
          </div>
          <button
            onClick={handleCheckin}
            className="shrink-0 rounded-xl bg-yellow-400 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-yellow-300"
          >
            Bater Ponto
          </button>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 space-y-4">
        {activeTab === "entregas" ? (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-yellow-400" />
                Minhas Entregas Ativas ({entregas?.length || 0})
              </h2>
              <span className="text-[11px] text-zinc-500">Máx: 4 simultâneas</span>
            </div>

            {(!entregas || entregas.length === 0) ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-zinc-500">
                <Bike className="h-10 w-10 text-zinc-700 mb-2" />
                <p className="text-sm font-semibold">Nenhuma entrega atribuída no momento</p>
                <p className="text-xs mt-1">Fique disponível para a loja despachar pedidos para você.</p>
              </div>
            ) : (
              entregas.map((pedido) => {
                const isRetornando = pedido.status === "retornando_base";
                return (
                  <div
                    key={pedido.id}
                    className={`rounded-2xl border bg-zinc-900/80 p-4 shadow-sm transition-all ${
                      isRetornando ? "border-red-500/40 bg-red-950/10" : "border-zinc-800"
                    }`}
                  >
                    {/* Header do Card */}
                    <div className="flex items-start justify-between border-b border-zinc-800/60 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-zinc-100">
                            Pedido #{pedido.id}
                          </span>
                          <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
                            {pedido.tipo_atendimento.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-zinc-400">
                          Total: <strong className="text-zinc-100">R$ {Number(pedido.total).toFixed(2)}</strong>
                        </span>
                      </div>

                      {isRetornando ? (
                        <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-[11px] font-bold text-red-400 border border-red-500/30">
                          Retornando à Base
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-300">
                          {pedido.status.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Alerta de Pagamento em Dinheiro e Troco */}
                    {pedido.payment_method === "dinheiro" && (
                      <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/30 p-2.5 text-xs text-amber-200 flex items-center justify-between">
                        <span className="font-semibold flex items-center gap-1.5">
                          <DollarSign className="h-4 w-4 text-amber-400" /> Cobrar em Dinheiro
                        </span>
                        {Number(pedido.troco) > 0 ? (
                          <span className="font-bold text-amber-300">
                            Levar troco: R$ {Number(pedido.troco).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-zinc-400">Sem troco</span>
                        )}
                      </div>
                    )}

                    {/* Endereço de Entrega */}
                    <div className="mt-3 flex items-start gap-2 text-xs text-zinc-300">
                      <MapPin className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-zinc-100">
                          {pedido.endereco?.logradouro}, {pedido.endereco?.numero}
                        </p>
                        <p className="text-zinc-400">
                          {pedido.endereco?.bairro} - {pedido.endereco?.cidade}/{pedido.endereco?.uf}
                        </p>
                        {pedido.endereco?.complemento && (
                          <p className="text-[11px] text-zinc-500">Compl: {pedido.endereco?.complemento}</p>
                        )}
                      </div>
                    </div>

                    {/* Itens do Pedido */}
                    <div className="mt-3 border-t border-zinc-800/60 pt-2.5 text-xs text-zinc-400">
                      <p className="font-semibold text-zinc-300 mb-1">Itens:</p>
                      <ul className="space-y-0.5 pl-2">
                        {pedido.itens.map((item) => (
                          <li key={item.id}>
                            • {item.quantidade}x {item.produto_nome || `Produto #${item.id}`}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Botões de Ação Rápida (Navegação & Comunicação - Issue #81) */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleOpenWaze(pedido.endereco)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-950/30 py-2 text-xs font-bold text-sky-400 hover:bg-sky-900/40"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        <span>Abrir Waze</span>
                      </button>

                      <button
                        onClick={() => handleOpenGoogleMaps(pedido.endereco)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-900/40"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        <span>Google Maps</span>
                      </button>
                    </div>

                    {/* Botões de Finalização ou Falha */}
                    <div className="mt-3 flex items-center gap-2 border-t border-zinc-800/60 pt-3">
                      {!isRetornando && (
                        <button
                          onClick={() => setSelectedOrderForFailure(pedido)}
                          className="flex-1 rounded-xl border border-red-500/30 bg-red-950/20 py-2.5 text-xs font-bold text-red-400 hover:bg-red-900/30"
                        >
                          Falha na Entrega
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedOrderForDelivery(pedido)}
                        className="flex-1 rounded-xl bg-yellow-400 py-2.5 text-xs font-bold text-zinc-950 hover:bg-yellow-300 shadow-md shadow-yellow-400/20"
                      >
                        {isRetornando ? "Devolvido na Base" : "Concluir Entrega"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ABA CARTEIRA (Issue #80) */
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-yellow-400" />
                  Carteira do Turno Atual
                </span>
                <span className="text-xs font-mono text-emerald-400">
                  {turnoData?.ativo ? "Turno Ativo" : "Fechado"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-zinc-400">Total em Dinheiro (Espécie a Repassar):</span>
                <div className="text-3xl font-black font-mono text-yellow-400">
                  R$ {Number(turnoData?.turno?.saldo_dinheiro || totalEmDinheiro).toFixed(2)}
                </div>
                <p className="text-[11px] text-zinc-500">
                  Calculado a partir de {pedidosDinheiro.length} pedido(s) entregue(s) em dinheiro.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs space-y-2 text-zinc-300">
                <div className="flex justify-between">
                  <span>Duração do Turno:</span>
                  <span className="font-semibold">{turnoData?.turno?.duracao_minutos || 0} min</span>
                </div>
                <div className="flex justify-between">
                  <span>Status do Acerto:</span>
                  <span className="font-semibold text-yellow-400">
                    {turnoData?.turno?.acerto_confirmado ? "Confirmado pelo Gerente" : "Pendente de Conferência"}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleCheckout}
                  disabled={!turnoData?.ativo}
                  className="w-full rounded-xl bg-yellow-400 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-yellow-400/20 hover:bg-yellow-300 disabled:opacity-50"
                >
                  Solicitar Acerto &amp; Encerrar Turno
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-md border-t border-zinc-800 bg-zinc-900/95 px-6 py-2.5 backdrop-blur-lg">
        <div className="flex items-center justify-around">
          <button
            onClick={() => setActiveTab("entregas")}
            className={`flex flex-col items-center gap-1 text-xs font-semibold ${
              activeTab === "entregas" ? "text-yellow-400" : "text-zinc-500"
            }`}
          >
            <Package className="h-5 w-5" />
            <span>Entregas</span>
          </button>

          <button
            onClick={() => setActiveTab("carteira")}
            className={`flex flex-col items-center gap-1 text-xs font-semibold ${
              activeTab === "carteira" ? "text-yellow-400" : "text-zinc-500"
            }`}
          >
            <Wallet className="h-5 w-5" />
            <span>Carteira</span>
          </button>
        </div>
      </nav>

      {/* MODAL PROVA DE ENTREGA (Issue #79) */}
      {selectedOrderForDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl animate-in fade-in zoom-in-95">
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
                    O código aparece no app do cliente para segurança contra extravio.
                  </p>
                </div>
              )}

              {validationMethod === "assinatura" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-400">
                      Assinatura na tela do celular:
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
                className="w-full rounded-xl bg-yellow-400 py-3 text-xs font-extrabold uppercase tracking-wider text-zinc-950 shadow-lg shadow-yellow-400/20 hover:bg-yellow-300"
              >
                {actionLoading ? "Validando..." : "Confirmar e Finalizar"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INSUCESSO NA ENTREGA (Issue #82) */}
      {selectedOrderForFailure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl animate-in fade-in zoom-in-95">
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
                  Selecione o motivo do insucesso:
                </label>
                <select
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-xs text-zinc-100 focus:border-yellow-400 focus:outline-none"
                >
                  <option value="Cliente ausente">Cliente ausente / Não atende</option>
                  <option value="Endereço incorreto">Endereço incorreto / Não localizado</option>
                  <option value="Recusado pelo cliente">Recusado pelo cliente</option>
                  <option value="Problema mecânico com a moto">Problema com veículo/acidente</option>
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
                    placeholder="Ex: interfone quebrado e portão trancado..."
                  />
                </div>
              )}

              <p className="text-[11px] text-zinc-500">
                O pedido entrará no status <strong>Retornando à base</strong> e a equipe da loja será alertada para contatar o cliente.
              </p>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full rounded-xl bg-red-600 py-3 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-red-500 shadow-lg shadow-red-600/20"
              >
                {actionLoading ? "Enviando..." : "Confirmar Falha & Retornar à Base"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
