"use client"

import React from "react"
import { Printer, X } from "lucide-react"
import { useBranding } from "../../hooks/useBranding"

export interface ReceiptOrder {
  id: number
  numero_comanda?: string
  numero_mesa?: string
  tipo_atendimento?: string
  total: number | string
  payment_method?: string
  valor_recebido?: number | string | null
  troco?: number | string | null
  created_at?: string
  endereco?: {
    cep: string
    logradouro: string
    numero: string
    complemento?: string
    bairro: string
    cidade: string
    uf: string
  } | null
  itens?: Array<{
    produto_nome?: string
    produto?: number
    quantidade: number
    preco_unitario: string | number
    subtotal?: string | number
  }>
}

interface ReceiptPrintModalProps {
  order: ReceiptOrder
  /** "cliente" imprime o cupom completo; "cozinha" omite valores. */
  variant?: "cliente" | "cozinha"
  onClose: () => void
}

const brl = (v: number | string | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0)

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao_debito: "Cartão de Débito",
  cartao_credito: "Cartão de Crédito",
  outros: "Não informado",
}

export function ReceiptPrintModal({ order, variant = "cliente", onClose }: ReceiptPrintModalProps) {
  const { nome: brandName } = useBranding()
  const [paper, setPaper] = React.useState<"80mm" | "58mm">("80mm")
  const cozinha = variant === "cozinha"
  const itens = order.itens ?? []
  const total = Number(order.total) || 0
  const isDelivery = order.tipo_atendimento === "delivery"
  const local = isDelivery
    ? "DELIVERY"
    : order.numero_mesa
    ? `Mesa ${order.numero_mesa}`
    : "BALCÃO"
  const emitidoEm = new Date().toLocaleString("pt-BR")
  const comanda = order.numero_comanda || String(order.id).padStart(4, "0")
  const metodo = order.payment_method || "outros"
  const recebido = Number(order.valor_recebido) || 0
  const troco = Number(order.troco) || 0

  // Código de barras simulado, derivado do ID do pedido
  const barras = String(order.id).padStart(8, "0").split("").flatMap((d, i) => {
    const n = Number(d)
    return [1 + ((n + i) % 3), 1 + (n % 2)]
  })

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:static print:bg-white print:p-0 print:backdrop-blur-none">
      <style>{`
        @media print {
          @page { size: ${paper} auto; margin: 0; }
          body * { visibility: hidden !important; }
          #receipt-print, #receipt-print * { visibility: visible !important; }
          #receipt-print { position: absolute; left: 0; top: 0; width: ${paper}; box-shadow: none !important; }
        }
      `}</style>

      <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-5 shadow-2xl max-h-[92vh] flex flex-col print:max-h-none print:border-0 print:bg-transparent print:p-0 print:shadow-none">
        <div className="flex items-center justify-between pb-3 print:hidden">
          <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Printer className="h-4 w-4 text-yellow-400" />
            {cozinha ? "Imprimir Comanda" : "Imprimir Cupom"}
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 pb-3 print:hidden">
          {(["80mm", "58mm"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPaper(p)}
              className={`flex-1 rounded-xl border px-3 py-1.5 text-xs font-bold ${
                paper === p ? "bg-yellow-400 text-zinc-950 border-yellow-400" : "bg-zinc-950 text-zinc-300 border-zinc-800"
              }`}
            >
              Papel {p}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto rounded-xl bg-zinc-200 p-3 print:overflow-visible print:bg-transparent print:p-0">
          <div
            id="receipt-print"
            style={{ width: paper, fontFamily: "'Courier New', monospace", fontSize: paper === "58mm" ? 10 : 12 }}
            className="mx-auto bg-white p-3 text-black shadow"
          >
            <div className="text-center">
              <div className="font-bold" style={{ fontSize: "1.2em" }}>{brandName}</div>
              <div>CNPJ 12.345.678/0001-90</div>
              <div>{emitidoEm}</div>
            </div>
            <hr className="my-2 border-t border-dashed border-black" />
            <div className="text-center">
              <div className="font-black" style={{ fontSize: "2em" }}>#{comanda}</div>
              <div className="font-bold">{local}</div>
              <div>Pedido {order.id}{cozinha ? " - VIA COZINHA" : ""}</div>
            </div>

            {isDelivery && order.endereco && (
              <div className="my-2 border-2 border-black p-1.5">
                <div className="font-bold">ENTREGAR EM:</div>
                <div>{order.endereco.logradouro}, {order.endereco.numero}</div>
                {order.endereco.complemento && <div>Compl.: {order.endereco.complemento}</div>}
                <div>{order.endereco.bairro}</div>
                <div>{order.endereco.cidade}/{order.endereco.uf}</div>
                <div>CEP {order.endereco.cep}</div>
              </div>
            )}

            <hr className="my-2 border-t border-dashed border-black" />
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-left">
                  <th>Qtd</th>
                  <th>Item</th>
                  {!cozinha && <th className="text-right">Unit</th>}
                  {!cozinha && <th className="text-right">Sub</th>}
                </tr>
              </thead>
              <tbody>
                {itens.map((it, idx) => (
                  <tr key={idx} className="align-top">
                    <td>{it.quantidade}x</td>
                    <td>{it.produto_nome || `Item #${it.produto ?? idx + 1}`}</td>
                    {!cozinha && <td className="text-right">{Number(it.preco_unitario).toFixed(2)}</td>}
                    {!cozinha && (
                      <td className="text-right">
                        {(Number(it.subtotal) || Number(it.preco_unitario) * it.quantidade).toFixed(2)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {!cozinha && (
              <>
                <hr className="my-2 border-t border-dashed border-black" />
                <div className="flex justify-between font-bold" style={{ fontSize: "1.2em" }}>
                  <span>TOTAL</span>
                  <span>{brl(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pagamento</span>
                  <span>{PAYMENT_LABELS[metodo] ?? metodo}</span>
                </div>
                {metodo === "dinheiro" && (
                  <>
                    <div className="flex justify-between">
                      <span>Recebido</span>
                      <span>{brl(recebido || total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Troco</span>
                      <span>{brl(troco)}</span>
                    </div>
                  </>
                )}
                <hr className="my-2 border-t border-dashed border-black" />
                <div className="text-center">
                  <div className="font-bold">Obrigado pela preferência!</div>
                  <div>Volte sempre</div>
                  <div className="mt-2 flex h-10 items-stretch justify-center" aria-hidden>
                    {barras.map((w, i) => (
                      <span key={i} style={{ width: w * 1.5, background: i % 2 === 0 ? "#000" : "transparent" }} />
                    ))}
                  </div>
                  <div style={{ letterSpacing: 2 }}>{String(order.id).padStart(8, "0")}</div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-2xl border border-zinc-800 bg-zinc-950 text-xs font-bold text-zinc-400 hover:bg-zinc-800"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-[2] h-11 rounded-2xl bg-yellow-400 text-xs font-black text-zinc-950 hover:bg-yellow-300 flex items-center justify-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}
