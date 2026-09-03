"use client"

import React, { useState } from "react"
import {
  X,
  Banknote,
  QrCode,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Receipt,
  Calculator,
} from "lucide-react"
import { api } from "@/services/api"

interface PaymentModalProps {
  order: {
    id: number
    numero_comanda?: string
    numero_mesa?: string
    tipo_atendimento?: string
    total: number | string
    payment_method?: string
    itens?: Array<{
      produto_nome?: string
      quantidade: number
      preco_unitario: string | number
      subtotal?: string | number
    }>
  }
  onClose: () => void
  onSuccess: (updatedOrder: any) => void
}

export function PaymentModal({ order, onClose, onSuccess }: PaymentModalProps) {
  const orderTotal = Number(order.total) || 0
  const [paymentMethod, setPaymentMethod] = useState<string>(
    order.payment_method && order.payment_method !== "outros"
      ? order.payment_method
      : "dinheiro"
  )
  const [valorRecebido, setValorRecebido] = useState<string>(
    orderTotal.toFixed(2)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successData, setSuccessData] = useState<any>(null)

  const numValorRecebido = parseFloat(valorRecebido.replace(",", ".")) || 0
  const troco = paymentMethod === "dinheiro" ? Math.max(0, numValorRecebido - orderTotal) : 0
  const valorInsuficiente = paymentMethod === "dinheiro" && numValorRecebido < orderTotal

  const handlePreset = (valor: number) => {
    setValorRecebido(valor.toFixed(2))
  }

  const handleConfirmPayment = async () => {
    if (valorInsuficiente) {
      setError(`Valor recebido é inferior ao total de R$ ${orderTotal.toFixed(2)}`)
      return
    }

    setLoading(true)
    setError("")

    try {
      const payload = {
        payment_method: paymentMethod,
        valor_recebido: paymentMethod === "dinheiro" ? numValorRecebido : orderTotal,
        troco: paymentMethod === "dinheiro" ? troco : 0,
      }

      const res = await api.post(`/orders/${order.id}/pay/`, payload)
      setSuccessData(res.data)
      onSuccess(res.data)
    } catch (err: any) {
      console.error("Erro ao registrar pagamento:", err)
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Erro ao processar pagamento."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-5">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-400/20 text-yellow-400">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">
                Fechamento de Conta
              </h2>
              <p className="text-xs text-zinc-400">
                Pedido #{order.id} • Comanda #{order.numero_comanda || "S/N"} •{" "}
                {order.numero_mesa || "Balcão"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 flex items-center space-x-2.5 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successData ? (
          <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-8 ring-emerald-500/10">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div>
              <h3 className="text-xl font-black text-zinc-100">
                Pagamento Registrado!
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                O pedido foi finalizado e a receita adicionada ao fluxo de caixa.
              </p>
            </div>

            <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800/80 p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Total Pago:</span>
                <span className="font-bold text-zinc-200">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(orderTotal)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Forma de Pagamento:</span>
                <span className="font-semibold capitalize text-yellow-400">
                  {successData.payment_method?.replace("_", " ")}
                </span>
              </div>
              {successData.payment_method === "dinheiro" && (
                <>
                  <div className="flex justify-between text-zinc-400">
                    <span>Valor Recebido:</span>
                    <span className="text-zinc-200">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(Number(successData.valor_recebido || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-bold border-t border-zinc-800/80 pt-2">
                    <span>Troco Entregue:</span>
                    <span>
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(Number(successData.troco || 0))}
                    </span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full h-11 rounded-2xl bg-yellow-400 text-zinc-950 font-bold text-sm hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20"
            >
              Concluir e Fechar
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Total Display */}
            <div className="flex items-center justify-between rounded-2xl bg-zinc-950 border border-zinc-800/80 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Total da Conta
              </span>
              <span className="text-2xl font-black text-yellow-400">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(orderTotal)}
              </span>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
                Método de Pagamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("dinheiro")}
                  className={`flex items-center justify-center p-3 rounded-2xl text-xs font-bold border transition-all ${
                    paymentMethod === "dinheiro"
                      ? "bg-yellow-400 text-zinc-950 border-yellow-400 shadow-md shadow-yellow-400/20"
                      : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800/50"
                  }`}
                >
                  <Banknote className="mr-2 h-4 w-4" /> Dinheiro
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("pix")}
                  className={`flex items-center justify-center p-3 rounded-2xl text-xs font-bold border transition-all ${
                    paymentMethod === "pix"
                      ? "bg-yellow-400 text-zinc-950 border-yellow-400 shadow-md shadow-yellow-400/20"
                      : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800/50"
                  }`}
                >
                  <QrCode className="mr-2 h-4 w-4" /> Pix
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("cartao_debito")}
                  className={`flex items-center justify-center p-3 rounded-2xl text-xs font-bold border transition-all ${
                    paymentMethod === "cartao_debito"
                      ? "bg-yellow-400 text-zinc-950 border-yellow-400 shadow-md shadow-yellow-400/20"
                      : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800/50"
                  }`}
                >
                  <CreditCard className="mr-2 h-4 w-4" /> Cartão Débito
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("cartao_credito")}
                  className={`flex items-center justify-center p-3 rounded-2xl text-xs font-bold border transition-all ${
                    paymentMethod === "cartao_credito"
                      ? "bg-yellow-400 text-zinc-950 border-yellow-400 shadow-md shadow-yellow-400/20"
                      : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800/50"
                  }`}
                >
                  <CreditCard className="mr-2 h-4 w-4" /> Cartão Crédito
                </button>
              </div>
            </div>

            {/* Dinheiro specifics: Valor Recebido & Troco */}
            {paymentMethod === "dinheiro" && (
              <div className="rounded-2xl bg-zinc-950/70 border border-zinc-800/80 p-4 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Calculator className="h-4 w-4 text-yellow-400" />
                    Valor Recebido em Dinheiro (R$)
                  </label>
                </div>

                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={valorRecebido}
                  onChange={(e) => setValorRecebido(e.target.value)}
                  className="w-full h-11 rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 text-base font-bold text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-yellow-400"
                  placeholder="0,00"
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handlePreset(orderTotal)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800/80 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
                  >
                    Exato (R$ {orderTotal.toFixed(2)})
                  </button>
                  {orderTotal <= 20 && (
                    <button
                      type="button"
                      onClick={() => handlePreset(20)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800/80 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      R$ 20,00
                    </button>
                  )}
                  {orderTotal <= 50 && (
                    <button
                      type="button"
                      onClick={() => handlePreset(50)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800/80 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      R$ 50,00
                    </button>
                  )}
                  {orderTotal <= 100 && (
                    <button
                      type="button"
                      onClick={() => handlePreset(100)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800/80 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      R$ 100,00
                    </button>
                  )}
                </div>

                {/* Troco Result */}
                <div className="flex items-center justify-between rounded-xl bg-zinc-900 border border-zinc-800/80 p-3 mt-2">
                  <span className="text-xs font-semibold text-zinc-400">
                    Troco a Devolver:
                  </span>
                  <span
                    className={`text-base font-black ${
                      valorInsuficiente
                        ? "text-red-400"
                        : troco > 0
                        ? "text-emerald-400"
                        : "text-zinc-400"
                    }`}
                  >
                    {valorInsuficiente
                      ? "Valor Insuficiente"
                      : new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(troco)}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 h-12 rounded-2xl border border-zinc-800 bg-zinc-950 font-bold text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={loading || valorInsuficiente}
                className="flex-[2] h-12 rounded-2xl bg-yellow-400 text-zinc-950 font-black text-xs hover:bg-yellow-300 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 shadow-lg shadow-yellow-400/20 disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirmar Pagamento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
